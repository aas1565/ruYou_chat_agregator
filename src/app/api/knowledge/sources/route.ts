import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/require-user";
import { jsonError, parseJson } from "@/lib/api/server";
import {
  createKnowledgeSourceFromFile,
  createKnowledgeSourceFromUrl,
  listKnowledgeSources,
} from "@/lib/services/knowledge-source.service";
import { createKnowledgeUrlSchema } from "@/lib/validation/knowledge";

export async function GET() {
  const auth = await requireUser();
  if (auth.error) return auth.error;

  const items = await listKnowledgeSources();
  return NextResponse.json({ items });
}

export async function POST(request: Request) {
  const auth = await requireUser();
  if (auth.error) return auth.error;

  const contentType = request.headers.get("content-type") || "";

  try {
    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      const file = form.get("file");
      const name = form.get("name");

      if (!(file instanceof File)) {
        return jsonError("Файл обязателен");
      }

      const item = await createKnowledgeSourceFromFile({
        file,
        name: typeof name === "string" ? name : undefined,
      });
      return NextResponse.json(item, { status: 201 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return jsonError("Некорректный JSON");
    }

    const parsed = parseJson(createKnowledgeUrlSchema, body);
    if (parsed.error) return parsed.error;

    const item = await createKnowledgeSourceFromUrl(parsed.data);
    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Не удалось создать источник";
    return jsonError(message, 400);
  }
}
