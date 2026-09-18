import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/require-user";
import { createLead, listLeads } from "@/lib/services/lead.service";
import { createLeadSchema, leadListQuerySchema } from "@/lib/validation/lead";
import { jsonError, parseJson, parseSearchParams } from "@/lib/api/server";

export async function GET(request: NextRequest) {
  const auth = await requireUser();
  if (auth.error) return auth.error;

  const parsed = parseSearchParams(leadListQuerySchema, request.nextUrl.searchParams);
  if (parsed.error) return parsed.error;

  const result = await listLeads(parsed.data);
  return NextResponse.json(result);
}

export async function POST(request: Request) {
  const auth = await requireUser();
  if (auth.error) return auth.error;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Некорректный JSON");
  }

  const parsed = parseJson(createLeadSchema, body);
  if (parsed.error) return parsed.error;

  try {
    const lead = await createLead({
      ...parsed.data,
      changedById: auth.user.id,
    });
    return NextResponse.json(lead, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "LEAD_ERROR";
    if (message === "CLIENT_NOT_FOUND") return jsonError("Клиент не найден", 404);
    if (message === "CONVERSATION_NOT_FOUND") return jsonError("Диалог не найден", 404);
    if (message === "CONVERSATION_CLIENT_MISMATCH") {
      return jsonError("Диалог не принадлежит этому клиенту");
    }
    if (message === "INVALID_STATUS_FOR_FUNNEL") {
      return jsonError("Статус не подходит для выбранной воронки");
    }
    return jsonError("Не удалось создать заявку", 500);
  }
}
