import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/require-user";
import { jsonError, parseJson, parseSearchParams } from "@/lib/api/server";
import { createAppointment, listAppointments } from "@/lib/services/appointment.service";
import { createAppointmentSchema, appointmentListQuerySchema } from "@/lib/validation/scheduling";
export async function GET(request: NextRequest) { const auth = await requireUser(); if (auth.error) return auth.error; const parsed = parseSearchParams(appointmentListQuerySchema, request.nextUrl.searchParams); if (parsed.error) return parsed.error; return NextResponse.json({ items: await listAppointments(parsed.data) }); }
export async function POST(request: Request) {
  const auth = await requireUser(); if (auth.error) return auth.error; let body: unknown; try { body = await request.json(); } catch { return jsonError("Некорректный JSON"); }
  const parsed = parseJson(createAppointmentSchema, body); if (parsed.error) return parsed.error;
  try { const item = await createAppointment({ ...parsed.data, startAt: new Date(parsed.data.startAt), source: parsed.data.source, actorType: "OPERATOR", actorUserId: auth.user.id }); return NextResponse.json(item, { status: 201 }); }
  catch (error) { const code = error instanceof Error ? error.message : ""; const messages: Record<string, string> = { CLIENT_NOT_FOUND: "Клиент не найден", SERVICE_NOT_FOUND: "Услуга не найдена или выключена", STAFF_NOT_FOUND: "Сотрудник не найден или выключен", STAFF_SERVICE_MISMATCH: "Сотрудник не оказывает выбранную услугу", SLOT_CONFLICT: "Это время уже занято", OUTSIDE_WORKING_HOURS: "Время вне рабочего графика", PAST_APPOINTMENT: "Нельзя записать в прошлое", CONVERSATION_CLIENT_MISMATCH: "Диалог не принадлежит клиенту", LEAD_CLIENT_MISMATCH: "Заявка не принадлежит клиенту" }; return jsonError(messages[code] || "Не удалось создать запись", code === "SLOT_CONFLICT" ? 409 : 400); }
}
