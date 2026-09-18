import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyPassword } from "@/lib/auth/password";
import { createSession, toPublicUser } from "@/lib/auth/session";
import { loginSchema } from "@/lib/validation/auth";
import { parseJson } from "@/lib/api/server";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Некорректный JSON" }, { status: 400 });
  }

  const parsed = parseJson(loginSchema, body);
  if (parsed.error) return parsed.error;

  const email = parsed.data.email.trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
    return NextResponse.json({ error: "Неверный логин или пароль" }, { status: 401 });
  }

  await createSession(user.id);
  return NextResponse.json({ user: toPublicUser(user) });
}
