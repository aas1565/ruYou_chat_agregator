import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/require-user";
import { getLeadById, updateLead } from "@/lib/services/lead.service";
import { updateLeadSchema } from "@/lib/validation/lead";
import { jsonError, parseJson } from "@/lib/api/server";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const auth = await requireUser();
  if (auth.error) return auth.error;
  const { id } = await params;
  const lead = await getLeadById(id);
  if (!lead) return jsonError("Заявка не найдена", 404);
  return NextResponse.json(lead);
}

export async function PATCH(request: Request, { params }: Params) {
  const auth = await requireUser();
  if (auth.error) return auth.error;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Некорректный JSON");
  }

  const parsed = parseJson(updateLeadSchema, body);
  if (parsed.error) return parsed.error;

  const { id } = await params;
  const lead = await updateLead(id, parsed.data);
  if (!lead) return jsonError("Заявка не найдена", 404);
  return NextResponse.json(lead);
}
