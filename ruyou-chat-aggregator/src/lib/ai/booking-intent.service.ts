import { z } from "zod";
import { addLocalDays, getAppTimezone, getLocalDate } from "@/lib/services/scheduling.service";

export const bookingIntentSchema = z.object({
  intent: z.enum(["GENERAL_QUESTION", "BOOKING_CREATE", "BOOKING_CONFIRM", "BOOKING_RESCHEDULE", "BOOKING_CANCEL", "OPERATOR_REQUEST", "UNKNOWN"]),
  serviceName: z.string().nullable(),
  requestedDate: z.string().nullable(),
  requestedTime: z.string().nullable(),
  requestedTimePeriod: z.enum(["MORNING", "AFTERNOON", "EVENING"]).nullable(),
  staffName: z.string().nullable(),
  confirmed: z.boolean(),
  missingInformation: z.array(z.string()),
});
export type BookingIntent = z.infer<typeof bookingIntentSchema>;

function dateFromText(text: string) {
  const lower = text.toLocaleLowerCase("ru-RU");
  const today = getLocalDate(new Date(), getAppTimezone());
  if (/послезавтра/.test(lower)) return addLocalDays(today, 2);
  if (/завтра/.test(lower)) return addLocalDays(today, 1);
  if (/сегодня/.test(lower)) return today;
  const iso = lower.match(/\b(20\d{2})-(\d{2})-(\d{2})\b/);
  if (iso) return iso[0];
  const weekdays = ["воскресень", "понедельник", "вторник", "среду", "среда", "четверг", "пятниц", "суббот"];
  const found = weekdays.findIndex((day) => lower.includes(day));
  if (found >= 0) {
    const target = found === 0 ? 0 : found === 3 || found === 4 ? 3 : found === 5 ? 4 : found === 6 ? 5 : found === 7 ? 6 : found;
    const now = new Date(`${today}T12:00:00Z`);
    const current = now.getUTCDay();
    let delta = (target - current + 7) % 7;
    if (delta === 0) delta = 7;
    return addLocalDays(today, delta);
  }
  return null;
}

export function parseBookingIntent(text: string, serviceNames: string[], hasState: boolean): BookingIntent {
  const lower = text.toLocaleLowerCase("ru-RU");
  const serviceName = serviceNames.find((name) => {
    const normalized = name.toLocaleLowerCase("ru-RU");
    if (lower.includes(normalized)) return true;
    return normalized.split(/\s+/).some((token) => token.length >= 5 && lower.includes(token.slice(0, -1)));
  }) ?? null;
  const timeMatch = lower.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/);
  const period = /вечер|вечером|после\s*18|после\s*19/.test(lower) ? "EVENING" : /утр|до\s*14/.test(lower) ? "MORNING" : /днём|день|после\s*12/.test(lower) ? "AFTERNOON" : null;
  const confirmed = /^(да|ага|подтверждаю|подтвердить|ок|хорошо|давайте)[!.\s]*$/i.test(lower.trim());
  const negative = /^(нет|не надо|отмена|отменить)[!.\s]*$/i.test(lower.trim());
  const date = dateFromText(lower);
  let intent: BookingIntent["intent"] = "GENERAL_QUESTION";
  if (/оператор|человеку|менеджер/.test(lower)) intent = "OPERATOR_REQUEST";
  else if (/отмен(ить|а)|не приду/.test(lower)) intent = "BOOKING_CANCEL";
  else if (/перенес|перенести|другой день|изменить запись/.test(lower)) intent = "BOOKING_RESCHEDULE";
  else if (hasState && (confirmed || negative)) intent = "BOOKING_CONFIRM";
  else if (/запис|записаться|запишите|хочу попасть|свободн.*окн|приеду/.test(lower)) intent = "BOOKING_CREATE";
  return bookingIntentSchema.parse({ intent, serviceName, requestedDate: date, requestedTime: timeMatch ? `${timeMatch[1].padStart(2, "0")}:${timeMatch[2]}` : null, requestedTimePeriod: period, staffName: null, confirmed: confirmed && !negative, missingInformation: [] });
}
