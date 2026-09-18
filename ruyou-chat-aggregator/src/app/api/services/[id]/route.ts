import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/require-user";
import { jsonError, parseJson } from "@/lib/api/server";
import { deleteService, updateService } from "@/lib/services/service.service";
import { updateServiceSchema } from "@/lib/validation/scheduling";

type Params = { params: Promise<{ id: string }> };
export async function PATCH(request: Request, { params }: Params) { const auth = await requireUser(); if (auth.error) return auth.error; let body: unknown; try { body = await request.json(); } catch { return jsonError("Некорректный JSON"); } const parsed = parseJson(updateServiceSchema, body); if (parsed.error) return parsed.error; const result = await updateService((await params).id, parsed.data); return result ? NextResponse.json(result) : jsonError("Услуга не найдена", 404); }
export async function DELETE(_request: Request, { params }: Params) { const auth = await requireUser(); if (auth.error) return auth.error; const result = await deleteService((await params).id); return result ? NextResponse.json(result) : jsonError("Услуга не найдена", 404); }
