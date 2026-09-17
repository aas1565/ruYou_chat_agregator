import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/require-user";
import { getConversationDetail, markConversationRead } from "@/lib/services/conversation.service";
import { jsonError } from "@/lib/api/server";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const auth = await requireUser();
  if (auth.error) return auth.error;

  const { id } = await params;
  const detail = await getConversationDetail(id);
  if (!detail) return jsonError("Диалог не найден", 404);

  await markConversationRead(id);
  const updated = await getConversationDetail(id);
  return NextResponse.json(updated);
}
