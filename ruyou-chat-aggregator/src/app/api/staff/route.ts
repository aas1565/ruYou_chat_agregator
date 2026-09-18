import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/require-user";
import { jsonError, parseJson } from "@/lib/api/server";
import { createStaff, listStaff } from "@/lib/services/staff.service";
import { createStaffSchema } from "@/lib/validation/scheduling";
export async function GET() { const auth = await requireUser(); if (auth.error) return auth.error; return NextResponse.json({ items: await listStaff() }); }
export async function POST(request: Request) { const auth = await requireUser(); if (auth.error) return auth.error; let body: unknown; try { body = await request.json(); } catch { return jsonError("Некорректный JSON"); } const parsed = parseJson(createStaffSchema, body); if (parsed.error) return parsed.error; return NextResponse.json(await createStaff(parsed.data), { status: 201 }); }
