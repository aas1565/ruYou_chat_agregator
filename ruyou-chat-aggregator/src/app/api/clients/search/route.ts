import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/require-user";
import { getClientById } from "@/lib/services/client.service";
import { findMatchingClient } from "@/lib/services/identity.service";
import { clientSearchSchema } from "@/lib/validation/client";
import { jsonError, parseSearchParams } from "@/lib/api/server";

export async function GET(request: NextRequest) {
  const auth = await requireUser();
  if (auth.error) return auth.error;

  const parsed = parseSearchParams(clientSearchSchema, request.nextUrl.searchParams);
  if (parsed.error) return parsed.error;

  if (!parsed.data.phone && !parsed.data.email && !parsed.data.externalId) {
    return jsonError("Укажите телефон, email или externalId");
  }

  const match = await findMatchingClient({
    firstName: "",
    phone: parsed.data.phone,
    email: parsed.data.email,
    channel: parsed.data.channel ?? "OTHER",
    externalId: parsed.data.externalId,
  });

  if (!match) return NextResponse.json({ client: null });
  const client = await getClientById(match.id);
  return NextResponse.json({ client });
}
