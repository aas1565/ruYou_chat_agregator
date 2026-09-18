import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { assertSlotAvailable, getAvailability, formatLocalTime, getAppTimezone, zonedDateTimeToUtc, addLocalDays } from "@/lib/services/scheduling.service";
import type { AppointmentDto } from "@/lib/types";

let appointmentLock: Promise<void> = Promise.resolve();
async function withAppointmentLock<T>(work: () => Promise<T>) {
  const previous = appointmentLock;
  let release!: () => void;
  appointmentLock = new Promise<void>((resolve) => { release = resolve; });
  await previous;
  try { return await work(); } finally { release(); }
}

function mapAppointment(row: Prisma.AppointmentGetPayload<{ include: { client: true; service: true; staff: true; lead: { select: { id: true; shortId: true; title: true } }; conversation: { select: { id: true; channel: true } } } }>): AppointmentDto {
  return {
    id: row.id,
    timezone: getAppTimezone(),
    client: { id: row.client.id, name: [row.client.firstName, row.client.lastName].filter(Boolean).join(" "), phone: row.client.phone },
    service: { id: row.service.id, name: row.service.name, durationMinutes: row.service.durationMinutes, priceText: row.service.priceText },
    staff: { id: row.staff.id, name: row.staff.name, specialization: row.staff.specialization },
    lead: row.lead,
    conversation: row.conversation,
    startAt: row.startAt.toISOString(), endAt: row.endAt.toISOString(), status: row.status, source: row.source,
    comment: row.comment, cancellationReason: row.cancellationReason, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString(),
  };
}

const appointmentInclude = {
  client: true,
  service: true,
  staff: true,
  lead: { select: { id: true, shortId: true, title: true } },
  conversation: { select: { id: true, channel: true } },
} satisfies Prisma.AppointmentInclude;

export async function listAppointments(params: { date?: string; from?: Date; to?: Date; clientId?: string }) {
  const where: Prisma.AppointmentWhereInput = {
    ...(params.clientId ? { clientId: params.clientId } : {}),
    ...(params.date ? { startAt: { lt: zonedDateTimeToUtc(addLocalDays(params.date, 1), "00:00") }, endAt: { gt: zonedDateTimeToUtc(params.date, "00:00") } } : {}),
    ...(params.from || params.to ? { startAt: { ...(params.from ? { gte: params.from } : {}), ...(params.to ? { lt: params.to } : {}) } } : {}),
  };
  const rows = await prisma.appointment.findMany({ where, orderBy: { startAt: "asc" }, include: appointmentInclude });
  return rows.map(mapAppointment);
}

export async function getAppointment(id: string) {
  const row = await prisma.appointment.findUnique({ where: { id }, include: { ...appointmentInclude, history: { orderBy: { createdAt: "asc" } } } });
  return row ? { ...mapAppointment(row), history: row.history.map((item) => ({ ...item, fromStartAt: item.fromStartAt?.toISOString() ?? null, toStartAt: item.toStartAt?.toISOString() ?? null, createdAt: item.createdAt.toISOString() })) } : null;
}

export async function createAppointment(params: { clientId: string; serviceId: string; staffId: string; startAt: Date; leadId?: string | null; conversationId?: string | null; comment?: string | null; source: string; actorType?: string; actorUserId?: string | null }) {
  return withAppointmentLock(async () => {
    const id = await prisma.$transaction(async (tx) => {
    const client = await tx.client.findUnique({ where: { id: params.clientId } });
    if (!client) throw new Error("CLIENT_NOT_FOUND");
    const service = await tx.service.findUnique({ where: { id: params.serviceId } });
    if (!service || !service.isActive) throw new Error("SERVICE_NOT_FOUND");
    const endAt = new Date(params.startAt.getTime() + service.durationMinutes * 60_000);
    await assertSlotAvailable({ db: tx, serviceId: params.serviceId, staffId: params.staffId, startAt: params.startAt, endAt });
    if (params.conversationId) {
      const conversation = await tx.conversation.findUnique({ where: { id: params.conversationId } });
      if (!conversation || conversation.clientId !== params.clientId) throw new Error("CONVERSATION_CLIENT_MISMATCH");
    }
    if (params.leadId) {
      const lead = await tx.lead.findUnique({ where: { id: params.leadId } });
      if (!lead || lead.clientId !== params.clientId) throw new Error("LEAD_CLIENT_MISMATCH");
    }
    const appointment = await tx.appointment.create({ data: { clientId: params.clientId, serviceId: params.serviceId, staffId: params.staffId, startAt: params.startAt, endAt, leadId: params.leadId ?? null, conversationId: params.conversationId ?? null, comment: params.comment ?? null, source: params.source, history: { create: { action: "CREATED", toStartAt: params.startAt, newStatus: "CONFIRMED", actorType: params.actorType ?? params.source, actorUserId: params.actorUserId ?? null } } } });
    if (params.leadId) await markLeadBooking(tx, params.leadId, params.actorUserId ?? null);
      return appointment.id;
    });
    return getAppointment(id);
  });
}

async function markLeadBooking(tx: Prisma.TransactionClient, leadId: string, changedById: string | null) {
  const lead = await tx.lead.findUnique({ where: { id: leadId } });
  if (!lead || lead.funnel !== "SERVICE" || lead.status === "BOOKING_CREATED") return;
  await tx.lead.update({ where: { id: leadId }, data: { status: "BOOKING_CREATED" } });
  await tx.leadStatusHistory.create({ data: { leadId, fromStatus: lead.status, toStatus: "BOOKING_CREATED", changedById } });
}

export async function rescheduleAppointment(params: { id: string; startAt: Date; actorType: string; actorUserId?: string | null; reason?: string | null }) {
  return withAppointmentLock(async () => {
    await prisma.$transaction(async (tx) => {
    const current = await tx.appointment.findUnique({ where: { id: params.id }, include: { service: true } });
    if (!current) throw new Error("APPOINTMENT_NOT_FOUND");
    if (current.status === "CANCELLED") throw new Error("APPOINTMENT_CANCELLED");
    const endAt = new Date(params.startAt.getTime() + current.service.durationMinutes * 60_000);
    await assertSlotAvailable({ db: tx, serviceId: current.serviceId, staffId: current.staffId, startAt: params.startAt, endAt, excludeAppointmentId: current.id });
    await tx.appointment.update({ where: { id: current.id }, data: { startAt: params.startAt, endAt } });
    await tx.appointmentHistory.create({ data: { appointmentId: current.id, action: "RESCHEDULED", fromStartAt: current.startAt, toStartAt: params.startAt, actorType: params.actorType, actorUserId: params.actorUserId ?? null, reason: params.reason ?? null } });
    });
    return getAppointment(params.id);
  });
}

export async function cancelAppointment(params: { id: string; actorType: string; actorUserId?: string | null; reason?: string | null }) {
  const id = await prisma.$transaction(async (tx) => {
    const current = await tx.appointment.findUnique({ where: { id: params.id } });
    if (!current) throw new Error("APPOINTMENT_NOT_FOUND");
    if (current.status === "CANCELLED") return current.id;
    await tx.appointment.update({ where: { id: current.id }, data: { status: "CANCELLED", cancellationReason: params.reason ?? null } });
    await tx.appointmentHistory.create({ data: { appointmentId: current.id, action: "CANCELLED", fromStartAt: current.startAt, oldStatus: current.status, newStatus: "CANCELLED", actorType: params.actorType, actorUserId: params.actorUserId ?? null, reason: params.reason ?? null } });
    return current.id;
  });
  return getAppointment(id);
}

export async function getSuggestedSlotsForAppointment(id: string, date: string) {
  const appointment = await prisma.appointment.findUnique({ where: { id }, select: { serviceId: true, staffId: true } });
  if (!appointment) throw new Error("APPOINTMENT_NOT_FOUND");
  return getAvailability({ serviceId: appointment.serviceId, staffId: appointment.staffId, date, excludeAppointmentId: id });
}

export { formatLocalTime };
