import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/require-user";
import { jsonError, parseJson } from "@/lib/api/server";
import { cancelAppointment } from "@/lib/services/appointment.service";
import { cancelSchema } from "@/lib/validation/scheduling";
type Params = { params: Promise<{ id: string }> };
export async function POST(request: Request, { params }: Params) { const auth = await requireUser(); if (auth.error) return auth.error; let body: unknown; try { body = await request.json(); } catch { return jsonError("Некорректный JSON"); } const parsed = parseJson(cancelSchema, body); if (parsed.error) return parsed.error; try { return NextResponse.json(await cancelAppointment({ id: (await params).id, actorType: "OPERATOR", actorUserId: auth.user.id, reason: parsed.data.reason })); } catch { return jsonError("Запись не найдена", 404); } }
