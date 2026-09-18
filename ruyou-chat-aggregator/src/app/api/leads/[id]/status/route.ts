import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/require-user";
import { changeLeadStatus } from "@/lib/services/lead.service";
import { updateLeadStatusSchema } from "@/lib/validation/lead";
import { jsonError, parseJson } from "@/lib/api/server";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const auth = await requireUser();
  if (auth.error) return auth.error;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Некорректный JSON");
  }

  const parsed = parseJson(updateLeadStatusSchema, body);
  if (parsed.error) return parsed.error;

  const { id } = await params;
  try {
    const lead = await changeLeadStatus({
      leadId: id,
      status: parsed.data.status,
      changedById: auth.user.id,
    });
    if (!lead) return jsonError("Заявка не найдена", 404);
    return NextResponse.json(lead);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "INVALID_STATUS_FOR_FUNNEL") {
      return jsonError("Статус не подходит для выбранной воронки");
    }
    return jsonError("Не удалось изменить статус", 500);
  }
}
