import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/require-user";
import { addNote, getClientById } from "@/lib/services/client.service";
import { getLeadById } from "@/lib/services/lead.service";
import { noteSchema } from "@/lib/validation/client";
import { jsonError, parseJson } from "@/lib/api/server";

export async function POST(request: Request) {
  const auth = await requireUser();
  if (auth.error) return auth.error;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Некорректный JSON");
  }

  const parsed = parseJson(noteSchema, body);
  if (parsed.error) return parsed.error;
  if (!parsed.data.clientId && !parsed.data.leadId) {
    return jsonError("Укажите клиента или заявку");
  }

  const note = await addNote({
    authorId: auth.user.id,
    text: parsed.data.text,
    clientId: parsed.data.clientId,
    leadId: parsed.data.leadId,
  });

  if (parsed.data.leadId) {
    const lead = await getLeadById(parsed.data.leadId);
    return NextResponse.json({ note, lead });
  }

  const client = parsed.data.clientId ? await getClientById(parsed.data.clientId) : null;
  return NextResponse.json({ note, client });
}
