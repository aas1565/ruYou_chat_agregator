import { NextResponse } from "next/server";
import { z } from "zod";

export function jsonError(message: string, status = 400, details?: unknown) {
  return NextResponse.json({ error: message, details }, { status });
}

export function parseJson<T>(schema: z.ZodType<T>, data: unknown) {
  const result = schema.safeParse(data);
  if (!result.success) {
    return { error: jsonError("Некорректные данные", 400, result.error.flatten()), data: null };
  }
  return { error: null, data: result.data };
}

export function parseSearchParams<T>(schema: z.ZodType<T>, searchParams: URLSearchParams) {
  const raw = Object.fromEntries(searchParams.entries());
  const result = schema.safeParse(raw);
  if (!result.success) {
    return { error: jsonError("Некорректные параметры запроса", 400, result.error.flatten()), data: null };
  }
  return { error: null, data: result.data };
}
