import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/require-user";
import { getClientById, updateClient } from "@/lib/services/client.service";
import { updateClientSchema } from "@/lib/validation/client";
import { jsonError, parseJson } from "@/lib/api/server";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const auth = await requireUser();
  if (auth.error) return auth.error;
  const { id } = await params;
  const client = await getClientById(id);
  if (!client) return jsonError("Клиент не найден", 404);
  return NextResponse.json(client);
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

  const parsed = parseJson(updateClientSchema, body);
  if (parsed.error) return parsed.error;

  const { id } = await params;
  const client = await updateClient(id, {
    ...parsed.data,
    email: parsed.data.email ? parsed.data.email : parsed.data.email === "" ? null : parsed.data.email,
    authorId: auth.user.id,
  });
  if (!client) return jsonError("Клиент не найден", 404);
  return NextResponse.json(client);
}
