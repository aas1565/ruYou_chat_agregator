import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/require-user";
import { parseSearchParams, jsonError } from "@/lib/api/server";
import { getAvailability } from "@/lib/services/scheduling.service";
import { availabilityQuerySchema } from "@/lib/validation/scheduling";
export async function GET(request: NextRequest) { const auth = await requireUser(); if (auth.error) return auth.error; const parsed = parseSearchParams(availabilityQuerySchema, request.nextUrl.searchParams); if (parsed.error) return parsed.error; try { return NextResponse.json({ items: await getAvailability(parsed.data) }); } catch (error) { return jsonError(error instanceof Error && error.message === "SERVICE_NOT_FOUND" ? "Услуга не найдена" : "Не удалось рассчитать свободные слоты", 400); } }
