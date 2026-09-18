import { prisma } from "@/lib/db";
import { createAppointment } from "@/lib/services/appointment.service";
import { getActiveBookingState, saveBookingState } from "@/lib/services/booking-state.service";
import { getAvailability, formatLocalTime, addLocalDays, getLocalDate } from "@/lib/services/scheduling.service";
import { parseBookingIntent } from "@/lib/ai/booking-intent.service";

function timeLabel(value: string) { return value.slice(0, 5); }
function optionsText(options: Array<{ time: string; staff: { name: string } }>) {
  return options.slice(0, 5).map((item) => `${item.time} (${item.staff.name})`).join(", ");
}

async function ensureServiceLead(conversationId: string, clientId: string, serviceName: string) {
  const existing = await prisma.lead.findFirst({ where: { conversationId, funnel: "SERVICE", status: { not: "COMPLETED" } }, orderBy: { updatedAt: "desc" } });
  if (existing) return existing;
  const last = await prisma.lead.findFirst({ orderBy: { shortId: "desc" }, select: { shortId: true } });
  return prisma.lead.create({ data: { shortId: (last?.shortId ?? 1000) + 1, clientId, conversationId, title: `Запись: ${serviceName}`, funnel: "SERVICE", status: "AI_PROCESSING", statusHistory: { create: { toStatus: "AI_PROCESSING" } } } });
}

function requestedOptions(options: Awaited<ReturnType<typeof getAvailability>>, intent: ReturnType<typeof parseBookingIntent>) {
  return options.filter((item) => {
    if (intent.requestedTime && item.time === intent.requestedTime) return true;
    if (intent.requestedTime && item.time !== intent.requestedTime) return false;
    const hour = Number(item.time.slice(0, 2));
    if (intent.requestedTimePeriod === "MORNING") return hour < 12;
    if (intent.requestedTimePeriod === "AFTERNOON") return hour >= 12 && hour < 18;
    if (intent.requestedTimePeriod === "EVENING") return hour >= 18;
    return true;
  });
}

export async function processBookingWorkflow(params: { conversationId: string; clientId: string; text: string }) {
  const state = await getActiveBookingState(params.conversationId);
  const services = await prisma.service.findMany({ where: { isActive: true }, select: { id: true, name: true } });
  const intent = parseBookingIntent(params.text, services.map((item) => item.name), Boolean(state));
  const hasBookingLanguage = ["BOOKING_CREATE", "BOOKING_CONFIRM", "BOOKING_CANCEL", "BOOKING_RESCHEDULE", "OPERATOR_REQUEST"].includes(intent.intent);
  const hasStateInput = Boolean(state && (/^\s*\d{1,2}:\d{2}\s*$/.test(params.text) || intent.confirmed || /^(нет|не надо|отмена)/i.test(params.text)));
  if (!hasBookingLanguage && !hasStateInput && !state) return null;
  if (intent.intent === "OPERATOR_REQUEST") return "__OPERATOR_HANDOFF__";

  if (intent.intent === "BOOKING_CANCEL") {
    const appointments = await prisma.appointment.findMany({ where: { clientId: params.clientId, status: { in: ["CONFIRMED", "PENDING"] }, startAt: { gt: new Date() } }, orderBy: { startAt: "asc" }, include: { service: true, staff: true } });
    if (appointments.length === 0) return "У вас нет активных будущих записей.";
    if (appointments.length > 1 && !state?.appointmentId) return `У вас несколько записей. Уточните, какую отменить: ${appointments.slice(0, 4).map((item) => `${formatLocalTime(item.startAt)} — ${item.service.name}`).join(", ")}.`;
    const target = appointments.find((item) => item.id === state?.appointmentId) ?? appointments[0];
    if (!state || state.status !== "AWAITING_CONFIRMATION" || state.appointmentId !== target.id) {
      await saveBookingState({ conversationId: params.conversationId, clientId: params.clientId, appointmentId: target.id, status: "AWAITING_CONFIRMATION" });
      return `Отменить запись на ${target.service.name} ${target.startAt.toLocaleDateString("ru-RU")} в ${formatLocalTime(target.startAt)} у ${target.staff.name}?`;
    }
    if (!intent.confirmed) return "Хорошо, запись оставляю без изменений.";
    await prisma.$transaction(async (tx) => {
      const current = await tx.appointment.findUnique({ where: { id: target.id } });
      if (!current || current.status === "CANCELLED") return;
      await tx.appointment.update({ where: { id: target.id }, data: { status: "CANCELLED", cancellationReason: "Отмена через AI" } });
      await tx.appointmentHistory.create({ data: { appointmentId: target.id, action: "CANCELLED", oldStatus: current.status, newStatus: "CANCELLED", actorType: "AI", reason: "Отмена через AI" } });
    });
    await saveBookingState({ conversationId: params.conversationId, clientId: params.clientId, appointmentId: target.id, status: "COMPLETED" });
    return "Готово, запись отменена. Если захотите, я помогу выбрать новое время.";
  }

  if (intent.intent === "BOOKING_RESCHEDULE") {
    const appointments = await prisma.appointment.findMany({ where: { clientId: params.clientId, status: { in: ["CONFIRMED", "PENDING"] }, startAt: { gt: new Date() } }, orderBy: { startAt: "asc" }, include: { service: true, staff: true } });
    if (appointments.length === 0) return "У вас нет активных будущих записей для переноса.";
    if (appointments.length > 1 && !state?.appointmentId) return "У вас несколько будущих записей. Уточните, какую именно перенести.";
    const target = appointments.find((item) => item.id === state?.appointmentId) ?? appointments[0];
    const date = intent.requestedDate;
    if (!date) { await saveBookingState({ conversationId: params.conversationId, clientId: params.clientId, serviceId: target.serviceId, staffId: target.staffId, appointmentId: target.id, status: "COLLECTING" }); return "На какой день перенести запись?"; }
    const options = requestedOptions(await getAvailability({ serviceId: target.serviceId, staffId: target.staffId, date, excludeAppointmentId: target.id }), intent);
    if (options.length === 0) return "На этот день свободных вариантов нет. Назовите другую дату.";
    if (!state || state.status !== "AWAITING_CONFIRMATION" || state.requestedDate !== date) { await saveBookingState({ conversationId: params.conversationId, clientId: params.clientId, serviceId: target.serviceId, staffId: target.staffId, appointmentId: target.id, requestedDate: date, selectedStartAt: new Date(options[0].startAt), status: "AWAITING_CONFIRMATION" }); return `На ${new Date(`${date}T12:00:00Z`).toLocaleDateString("ru-RU")} доступно ${optionsText(options)}. Перенести на ${options[0].time}?`; }
    if (!intent.confirmed) return "Хорошо, перенос отменён.";
    try {
      await prisma.$transaction(async (tx) => {
        const current = await tx.appointment.findUnique({ where: { id: target.id } });
        if (!current) throw new Error("APPOINTMENT_NOT_FOUND");
        const startAt = state.selectedStartAt ?? new Date(options[0].startAt);
        const endAt = new Date(startAt.getTime() + target.service.durationMinutes * 60_000);
        const conflict = await tx.appointment.findFirst({ where: { id: { not: target.id }, staffId: target.staffId, status: { in: ["CONFIRMED", "PENDING"] }, startAt: { lt: endAt }, endAt: { gt: startAt } } });
        if (conflict) throw new Error("SLOT_CONFLICT");
        await tx.appointment.update({ where: { id: target.id }, data: { startAt, endAt } });
        await tx.appointmentHistory.create({ data: { appointmentId: target.id, action: "RESCHEDULED", fromStartAt: current.startAt, toStartAt: startAt, actorType: "AI" } });
      });
      await saveBookingState({ conversationId: params.conversationId, clientId: params.clientId, appointmentId: target.id, status: "COMPLETED" });
      return "Готово, запись перенесена на новое время.";
    } catch (error) { if (error instanceof Error && error.message === "SLOT_CONFLICT") return "Выбранное время уже заняли. Напишите «перенести» — я предложу новые варианты."; throw error; }
  }

  const service = serviceFromIntent(services, intent.serviceName, state?.serviceId);
  if (!service) {
    await saveBookingState({ conversationId: params.conversationId, clientId: params.clientId, status: "COLLECTING" });
    return `Какую услугу нужно забронировать? Доступны: ${services.map((item) => item.name).join(", ")}.`;
  }
  const date = intent.requestedDate ?? state?.requestedDate;
  if (!date) { await saveBookingState({ conversationId: params.conversationId, clientId: params.clientId, serviceId: service.id, status: "COLLECTING" }); return `На какой день записать на услугу «${service.name}»?`; }
  const allOptions = await getAvailability({ serviceId: service.id, date, staffId: state?.staffId });
  const options = requestedOptions(allOptions, intent);
  if (state?.status === "SLOT_OFFERED" || state?.status === "COLLECTING") {
    const chosen = intent.requestedTime ? options.find((item) => item.time === intent.requestedTime) : null;
    if (chosen) {
      await saveBookingState({ conversationId: params.conversationId, clientId: params.clientId, serviceId: service.id, staffId: chosen.staff.id, requestedDate: date, selectedStartAt: new Date(chosen.startAt), status: "AWAITING_CONFIRMATION" });
      return `Подтвердить запись на ${service.name} ${new Date(`${date}T12:00:00Z`).toLocaleDateString("ru-RU")} в ${chosen.time}?`;
    }
  }
  if (state?.status === "AWAITING_CONFIRMATION" && state.selectedStartAt) {
    if (!intent.confirmed) return "Хорошо, запись не создаю.";
    try {
      const lead = await ensureServiceLead(params.conversationId, params.clientId, service.name);
      const item = await createAppointment({ clientId: params.clientId, serviceId: service.id, staffId: state.staffId!, startAt: state.selectedStartAt, leadId: lead.id, conversationId: params.conversationId, source: "AI", actorType: "AI" });
      if (!item) throw new Error("APPOINTMENT_ERROR");
      await saveBookingState({ conversationId: params.conversationId, clientId: params.clientId, serviceId: service.id, staffId: state.staffId, requestedDate: date, selectedStartAt: state.selectedStartAt, appointmentId: item.id, status: "COMPLETED" });
      return `Готово. Вы записаны на ${service.name} ${new Date(state.selectedStartAt).toLocaleDateString("ru-RU")} в ${formatLocalTime(state.selectedStartAt)}.`;
    } catch (error) { if (error instanceof Error && error.message === "SLOT_CONFLICT") { const fresh = await getAvailability({ serviceId: service.id, date }); await saveBookingState({ conversationId: params.conversationId, clientId: params.clientId, serviceId: service.id, requestedDate: date, selectedStartAt: null, status: "SLOT_OFFERED" }); return `Выбранное время уже заняли. Сейчас доступны: ${optionsText(fresh)}. Какое время выбрать?`; } throw error; }
  }
  if (options.length === 0) return "На выбранную дату подходящих слотов нет. Назовите другой день, и я проверю расписание.";
  await saveBookingState({ conversationId: params.conversationId, clientId: params.clientId, serviceId: service.id, requestedDate: date, status: "SLOT_OFFERED" });
  return `На ${new Date(`${date}T12:00:00Z`).toLocaleDateString("ru-RU")} свободны: ${optionsText(options)}. Какое время вам подходит?`;
}

function serviceFromIntent(services: Array<{ id: string; name: string }>, name: string | null, stateServiceId?: string | null) {
  return (stateServiceId ? services.find((item) => item.id === stateServiceId) : null) ?? (name ? services.find((item) => item.name.toLocaleLowerCase("ru-RU") === name.toLocaleLowerCase("ru-RU")) : null);
}
