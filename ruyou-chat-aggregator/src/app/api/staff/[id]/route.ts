import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/require-user";
import { jsonError, parseJson } from "@/lib/api/server";
import { deleteStaff, updateStaff } from "@/lib/services/staff.service";
import { updateStaffSchema } from "@/lib/validation/scheduling";
type Params = { params: Promise<{ id: string }> };
export async function PATCH(request: Request, { params }: Params) { const auth = await requireUser(); if (auth.error) return auth.error; let body: unknown; try { body = await request.json(); } catch { return jsonError("Некорректный JSON"); } const parsed = parseJson(updateStaffSchema, body); if (parsed.error) return parsed.error; const result = await updateStaff((await params).id, parsed.data); return result ? NextResponse.json(result) : jsonError("Сотрудник не найден", 404); }
export async function DELETE(_request: Request, { params }: Params) { const auth = await requireUser(); if (auth.error) return auth.error; const result = await deleteStaff((await params).id); return result ? NextResponse.json(result) : jsonError("Сотрудник не найден", 404); }
