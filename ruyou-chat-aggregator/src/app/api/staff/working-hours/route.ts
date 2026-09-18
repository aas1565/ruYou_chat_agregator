import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/require-user";
import { jsonError, parseJson } from "@/lib/api/server";
import { upsertWorkingHours } from "@/lib/services/staff.service";
import { workingHoursSchema } from "@/lib/validation/scheduling";
import { prisma } from "@/lib/db";
import { z } from "zod";
export async function GET(request: Request) { const auth = await requireUser(); if (auth.error) return auth.error; const staffId = new URL(request.url).searchParams.get("staffId"); if (!staffId || !z.string().min(1).safeParse(staffId).success) return jsonError("Укажите staffId"); return NextResponse.json({ items: await prisma.staffWorkingHours.findMany({ where: { staffId }, orderBy: { dayOfWeek: "asc" } }) }); }
export async function POST(request: Request) { const auth = await requireUser(); if (auth.error) return auth.error; let body: unknown; try { body = await request.json(); } catch { return jsonError("Некорректный JSON"); } const parsed = parseJson(workingHoursSchema, body); if (parsed.error) return parsed.error; return NextResponse.json(await upsertWorkingHours(parsed.data)); }
