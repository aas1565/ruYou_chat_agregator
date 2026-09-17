import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/require-user";
import { createOperatorMessage } from "@/lib/services/message.service";
import { createMessageSchema } from "@/lib/validation/conversation";
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

  const parsed = parseJson(createMessageSchema, body);
  if (parsed.error) return parsed.error;

  const { id } = await params;
  const detail = await createOperatorMessage({
    conversationId: id,
    text: parsed.data.text,
    userId: auth.user.id,
  });
  if (!detail) return jsonError("Диалог не найден", 404);
  return NextResponse.json(detail);
}
