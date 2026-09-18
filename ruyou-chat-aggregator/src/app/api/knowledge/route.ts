import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/require-user";
import { jsonError, parseJson, parseSearchParams } from "@/lib/api/server";
import {
  createKnowledgeEntry,
  listKnowledgeEntries,
} from "@/lib/services/knowledge.service";
import {
  createKnowledgeEntrySchema,
  knowledgeListQuerySchema,
} from "@/lib/validation/knowledge";

export async function GET(request: NextRequest) {
  const auth = await requireUser();
  if (auth.error) return auth.error;

  const parsed = parseSearchParams(knowledgeListQuerySchema, request.nextUrl.searchParams);
  if (parsed.error) return parsed.error;

  const items = await listKnowledgeEntries(parsed.data);
  return NextResponse.json({ items });
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

  const parsed = parseJson(createKnowledgeEntrySchema, body);
  if (parsed.error) return parsed.error;

  const item = await createKnowledgeEntry(parsed.data);
  return NextResponse.json(item, { status: 201 });
}
