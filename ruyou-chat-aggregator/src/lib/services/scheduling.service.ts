import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

export const ACTIVE_APPOINTMENT_STATUSES = ["CONFIRMED", "PENDING"] as const;
export const DEFAULT_TIMEZONE = "Europe/Moscow";
export const SLOT_STEP_MINUTES = Number(process.env.SCHEDULING_SLOT_STEP_MINUTES || 30);

export type AvailabilitySlot = {
  startAt: string;
  endAt: string;
  date: string;
  time: string;
  staff: { id: string; name: string; specialization: string };
  service: { id: string; name: string; durationMinutes: number };
};

export function getAppTimezone() {
  return process.env.APP_TIMEZONE?.trim() || DEFAULT_TIMEZONE;
}

function localParts(date: Date, timeZone = getAppTimezone()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
    hour: Number(values.hour),
    minute: Number(values.minute),
    second: Number(values.second),
  };
}

export function getLocalDate(date = new Date(), timeZone = getAppTimezone()) {
  const parts = localParts(date, timeZone);
  return `${parts.year.toString().padStart(4, "0")}-${parts.month.toString().padStart(2, "0")}-${parts.day
    .toString()
    .padStart(2, "0")}`;
}

export function addLocalDays(dateText: string, days: number) {
  const date = new Date(`${dateText}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function parseTimeMinutes(value: string) {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

/** Converts a company-local calendar time to an absolute UTC instant. */
export function zonedDateTimeToUtc(dateText: string, timeText: string, timeZone = getAppTimezone()) {
  const minutes = parseTimeMinutes(timeText);
  if (minutes === null) throw new Error("INVALID_TIME");
  const [year, month, day] = dateText.split("-").map(Number);
  const guess = Date.UTC(year, month - 1, day, Math.floor(minutes / 60), minutes % 60);
  const first = localParts(new Date(guess), timeZone);
  const firstAsUtc = Date.UTC(first.year, first.month - 1, first.day, first.hour, first.minute, first.second);
  const corrected = guess - (firstAsUtc - guess);
  const second = localParts(new Date(corrected), timeZone);
  const secondAsUtc = Date.UTC(second.year, second.month - 1, second.day, second.hour, second.minute, second.second);
  return new Date(corrected - (secondAsUtc - guess));
}

export function formatLocalTime(date: Date, timeZone = getAppTimezone()) {
  const parts = localParts(date, timeZone);
  return `${parts.hour.toString().padStart(2, "0")}:${parts.minute.toString().padStart(2, "0")}`;
}

function dateWeekday(dateText: string) {
  return new Date(`${dateText}T12:00:00Z`).getUTCDay();
}

type SchedulingDb = typeof prisma | Prisma.TransactionClient;

async function staffCanWorkAt(db: SchedulingDb, staffId: string, date: string, startMinutes: number, endMinutes: number) {
  const hours = await db.staffWorkingHours.findUnique({ where: { staffId_dayOfWeek: { staffId, dayOfWeek: dateWeekday(date) } } });
  const exceptions = await db.scheduleException.findMany({ where: { staffId, date } });
  if (exceptions.some((exception) => exception.type === "DAY_OFF")) return false;

  let ranges = hours?.isWorkingDay ? [{ start: parseTimeMinutes(hours.startTime)!, end: parseTimeMinutes(hours.endTime)! }] : [];
  const custom = exceptions.filter((exception) => exception.type === "CUSTOM_HOURS");
  if (custom.length > 0) {
    ranges = custom.flatMap((exception) => {
      const start = exception.startTime ? parseTimeMinutes(exception.startTime) : null;
      const end = exception.endTime ? parseTimeMinutes(exception.endTime) : null;
      return start !== null && end !== null ? [{ start, end }] : [];
    });
  }
  if (!ranges.some((range) => startMinutes >= range.start && endMinutes <= range.end)) return false;
  return !exceptions.some((exception) => {
    if (exception.type !== "BLOCKED_TIME" || !exception.startTime || !exception.endTime) return false;
    const start = parseTimeMinutes(exception.startTime);
    const end = parseTimeMinutes(exception.endTime);
    return start !== null && end !== null && startMinutes < end && endMinutes > start;
  });
}

export async function assertSlotAvailable(params: {
  db?: SchedulingDb;
  serviceId: string;
  staffId: string;
  startAt: Date;
  endAt: Date;
  excludeAppointmentId?: string;
}) {
  const db = params.db ?? prisma;
  const service = await db.service.findUnique({ where: { id: params.serviceId } });
  const staff = await db.staffMember.findUnique({ where: { id: params.staffId } });
  if (!service || !service.isActive) throw new Error("SERVICE_NOT_FOUND");
  if (!staff || !staff.isActive) throw new Error("STAFF_NOT_FOUND");
  const relation = await db.staffService.findUnique({ where: { staffId_serviceId: { staffId: params.staffId, serviceId: params.serviceId } } });
  if (!relation) throw new Error("STAFF_SERVICE_MISMATCH");
  if (params.startAt <= new Date() || params.endAt <= params.startAt) throw new Error("PAST_APPOINTMENT");

  const date = getLocalDate(params.startAt);
  const parts = localParts(params.startAt);
  const endParts = localParts(params.endAt);
  if (!(await staffCanWorkAt(db, params.staffId, date, parts.hour * 60 + parts.minute, endParts.hour * 60 + endParts.minute))) {
    throw new Error("OUTSIDE_WORKING_HOURS");
  }

  const conflict = await db.appointment.findFirst({
    where: {
      staffId: params.staffId,
      status: { in: [...ACTIVE_APPOINTMENT_STATUSES] },
      ...(params.excludeAppointmentId ? { id: { not: params.excludeAppointmentId } } : {}),
      startAt: { lt: params.endAt },
      endAt: { gt: params.startAt },
    },
    select: { id: true },
  });
  if (conflict) throw new Error("SLOT_CONFLICT");
  return { service, staff };
}

export async function getAvailability(params: { serviceId: string; date: string; staffId?: string | null; excludeAppointmentId?: string }) {
  const service = await prisma.service.findUnique({ where: { id: params.serviceId } });
  if (!service || !service.isActive) throw new Error("SERVICE_NOT_FOUND");
  const staff = await prisma.staffMember.findMany({
    where: {
      isActive: true,
      ...(params.staffId ? { id: params.staffId } : {}),
      services: { some: { serviceId: service.id } },
    },
    include: { services: true },
    orderBy: { name: "asc" },
  });
  const result: AvailabilitySlot[] = [];
  const now = new Date();
  const today = getLocalDate(now);
  for (const member of staff) {
    const hours = await prisma.staffWorkingHours.findUnique({ where: { staffId_dayOfWeek: { staffId: member.id, dayOfWeek: dateWeekday(params.date) } } });
    const exceptions = await prisma.scheduleException.findMany({ where: { staffId: member.id, date: params.date } });
    if (!hours?.isWorkingDay || exceptions.some((item) => item.type === "DAY_OFF")) continue;
    let ranges = [{ start: parseTimeMinutes(hours.startTime)!, end: parseTimeMinutes(hours.endTime)! }];
    const custom = exceptions.filter((item) => item.type === "CUSTOM_HOURS");
    if (custom.length > 0) {
      ranges = custom.flatMap((item) => {
        const start = item.startTime ? parseTimeMinutes(item.startTime) : null;
        const end = item.endTime ? parseTimeMinutes(item.endTime) : null;
        return start !== null && end !== null ? [{ start, end }] : [];
      });
    }
    const blocked = exceptions.flatMap((item) => {
      if (item.type !== "BLOCKED_TIME" || !item.startTime || !item.endTime) return [];
      const start = parseTimeMinutes(item.startTime);
      const end = parseTimeMinutes(item.endTime);
      return start !== null && end !== null ? [{ start, end }] : [];
    });
    const appointments = await prisma.appointment.findMany({
      where: { staffId: member.id, status: { in: [...ACTIVE_APPOINTMENT_STATUSES] }, ...(params.excludeAppointmentId ? { id: { not: params.excludeAppointmentId } } : {}), startAt: { lt: zonedDateTimeToUtc(params.date, "23:59") }, endAt: { gt: zonedDateTimeToUtc(params.date, "00:00") } },
      select: { startAt: true, endAt: true },
    });
    for (const range of ranges) {
      for (let startMinutes = range.start; startMinutes + service.durationMinutes <= range.end; startMinutes += SLOT_STEP_MINUTES) {
        const endMinutes = startMinutes + service.durationMinutes;
        if (blocked.some((item) => startMinutes < item.end && endMinutes > item.start)) continue;
        const startText = `${Math.floor(startMinutes / 60).toString().padStart(2, "0")}:${(startMinutes % 60).toString().padStart(2, "0")}`;
        const endText = `${Math.floor(endMinutes / 60).toString().padStart(2, "0")}:${(endMinutes % 60).toString().padStart(2, "0")}`;
        const startAt = zonedDateTimeToUtc(params.date, startText);
        const endAt = zonedDateTimeToUtc(params.date, endText);
        if (params.date < today || startAt <= now) continue;
        if (appointments.some((item) => startAt < item.endAt && endAt > item.startAt)) continue;
        result.push({ startAt: startAt.toISOString(), endAt: endAt.toISOString(), date: params.date, time: startText, staff: { id: member.id, name: member.name, specialization: member.specialization }, service: { id: service.id, name: service.name, durationMinutes: service.durationMinutes } });
      }
    }
  }
  return result.sort((a, b) => a.startAt.localeCompare(b.startAt) || a.staff.name.localeCompare(b.staff.name));
}

export function parseDateInput(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
}
