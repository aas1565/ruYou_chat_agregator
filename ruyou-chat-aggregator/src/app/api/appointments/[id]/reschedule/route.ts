import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/require-user";
import { jsonError, parseJson } from "@/lib/api/server";
import { rescheduleAppointment } from "@/lib/services/appointment.service";
import { rescheduleSchema } from "@/lib/validation/scheduling";
type Params = { params: Promise<{ id: string }> };
export async function POST(request: Request, { params }: Params) { const auth = await requireUser(); if (auth.error) return auth.error; let body: unknown; try { body = await request.json(); } catch { return jsonError("Некорректный JSON"); } const parsed = parseJson(rescheduleSchema, body); if (parsed.error) return parsed.error; try { const item = await rescheduleAppointment({ id: (await params).id, startAt: new Date(parsed.data.startAt), actorType: "OPERATOR", actorUserId: auth.user.id, reason: parsed.data.reason }); return NextResponse.json(item); } catch (error) { const code = error instanceof Error ? error.message : ""; return jsonError(code === "SLOT_CONFLICT" ? "Это время уже занято" : code === "PAST_APPOINTMENT" ? "Нельзя перенести в прошлое" : "Не удалось перенести запись", code === "SLOT_CONFLICT" ? 409 : 400); } }
