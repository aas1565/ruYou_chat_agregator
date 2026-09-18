import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/require-user";
import { jsonError, parseJson } from "@/lib/api/server";
import { createScheduleException } from "@/lib/services/staff.service";
import { exceptionSchema } from "@/lib/validation/scheduling";
export async function POST(request: Request) { const auth = await requireUser(); if (auth.error) return auth.error; let body: unknown; try { body = await request.json(); } catch { return jsonError("Некорректный JSON"); } const parsed = parseJson(exceptionSchema, body); if (parsed.error) return parsed.error; return NextResponse.json(await createScheduleException(parsed.data), { status: 201 }); }
