import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/require-user";
import { jsonError } from "@/lib/api/server";
import {
  deleteKnowledgeSource,
  getKnowledgeSource,
} from "@/lib/services/knowledge-source.service";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const auth = await requireUser();
  if (auth.error) return auth.error;

  const { id } = await params;
  const item = await getKnowledgeSource(id);
  if (!item) return jsonError("Источник не найден", 404);
  return NextResponse.json(item);
}

export async function DELETE(_request: Request, { params }: Params) {
  const auth = await requireUser();
  if (auth.error) return auth.error;

  const { id } = await params;
  const deleted = await deleteKnowledgeSource(id);
  if (!deleted) return jsonError("Источник не найден", 404);
  return new NextResponse(null, { status: 204 });
}
