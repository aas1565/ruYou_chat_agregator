import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/require-user";
import { listConversations } from "@/lib/services/conversation.service";
import { conversationListQuerySchema } from "@/lib/validation/conversation";
import { parseSearchParams } from "@/lib/api/server";

export async function GET(request: NextRequest) {
  const auth = await requireUser();
  if (auth.error) return auth.error;

  const parsed = parseSearchParams(conversationListQuerySchema, request.nextUrl.searchParams);
  if (parsed.error) return parsed.error;

  const items = await listConversations(parsed.data);
  return NextResponse.json({ items });
}
