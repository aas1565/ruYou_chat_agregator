import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/require-user";
import { jsonError, parseJson } from "@/lib/api/server";
import {
  deleteKnowledgeEntry,
  getKnowledgeEntry,
  updateKnowledgeEntry,
} from "@/lib/services/knowledge.service";
import { updateKnowledgeEntrySchema } from "@/lib/validation/knowledge";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const auth = await requireUser();
  if (auth.error) return auth.error;

  const { id } = await params;
  const item = await getKnowledgeEntry(id);
  if (!item) return jsonError("Запись не найдена", 404);
  return NextResponse.json(item);
}

export async function PATCH(request: Request, { params }: Params) {
  const auth = await requireUser();
  if (auth.error) return auth.error;

  const { id } = await params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Некорректный JSON");
  }

  const parsed = parseJson(updateKnowledgeEntrySchema, body);
  if (parsed.error) return parsed.error;

  const item = await updateKnowledgeEntry(id, parsed.data);
  if (!item) return jsonError("Запись не найдена", 404);
  return NextResponse.json(item);
}

export async function DELETE(_request: Request, { params }: Params) {
  const auth = await requireUser();
  if (auth.error) return auth.error;

  const { id } = await params;
  const deleted = await deleteKnowledgeEntry(id);
  if (!deleted) return jsonError("Запись не найдена", 404);
  return new NextResponse(null, { status: 204 });
}
