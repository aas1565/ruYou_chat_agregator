import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import type { PublicUser } from "@/lib/types";

export async function requireUser(): Promise<
  { user: PublicUser; error?: undefined } | { user?: undefined; error: NextResponse }
> {
  const user = await getCurrentUser();
  if (!user) {
    return {
      error: NextResponse.json({ error: "Необходима авторизация" }, { status: 401 }),
    };
  }
  return { user };
}
