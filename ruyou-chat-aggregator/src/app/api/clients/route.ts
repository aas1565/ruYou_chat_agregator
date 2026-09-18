import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/require-user";
import { createClient, listClients } from "@/lib/services/client.service";
import { clientListQuerySchema, createClientSchema } from "@/lib/validation/client";
import { jsonError, parseJson, parseSearchParams } from "@/lib/api/server";

export async function GET(request: NextRequest) {
  const auth = await requireUser();
  if (auth.error) return auth.error;

  const parsed = parseSearchParams(clientListQuerySchema, request.nextUrl.searchParams);
  if (parsed.error) return parsed.error;

  const result = await listClients(parsed.data);
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

  const parsed = parseJson(createClientSchema, body);
  if (parsed.error) return parsed.error;

  const email = parsed.data.email ? parsed.data.email : null;
  const client = await createClient({
    ...parsed.data,
    email,
    authorId: auth.user.id,
  });
  return NextResponse.json(client, { status: 201 });
}
