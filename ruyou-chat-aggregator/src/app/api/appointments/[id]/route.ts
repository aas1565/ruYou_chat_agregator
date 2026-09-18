import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/require-user";
import { getAppointment } from "@/lib/services/appointment.service";
import { jsonError } from "@/lib/api/server";
type Params = { params: Promise<{ id: string }> };
export async function GET(_request: Request, { params }: Params) { const auth = await requireUser(); if (auth.error) return auth.error; const item = await getAppointment((await params).id); return item ? NextResponse.json(item) : jsonError("Запись не найдена", 404); }
