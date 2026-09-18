import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/db";
import {
  KNOWLEDGE_ALLOWED_MIME,
  KNOWLEDGE_MAX_FILE_SIZE,
  type KnowledgeSourceStatus,
  type KnowledgeSourceType,
} from "@/lib/constants";
import type { KnowledgeChunkDto, KnowledgeSourceDto } from "@/lib/types";
import {
  extractTextFromDocx,
  extractTextFromPdf,
  extractTextFromXlsx,
  splitIntoChunks,
} from "@/lib/services/knowledge-parser.service";
import { fetchPublicPageText } from "@/lib/services/knowledge-url.service";

const UPLOAD_ROOT = path.join(process.cwd(), "data", "uploads", "knowledge");

function mapChunk(row: {
  id: string;
  sourceId: string;
  content: string;
  position: number;
  createdAt: Date;
}): KnowledgeChunkDto {
  return {
    id: row.id,
    sourceId: row.sourceId,
    content: row.content,
    position: row.position,
    createdAt: row.createdAt.toISOString(),
  };
}

export function mapKnowledgeSource(
  row: {
    id: string;
    type: string;
    name: string;
    originalFileName: string | null;
    url: string | null;
    status: string;
    errorMessage: string | null;
    createdAt: Date;
    updatedAt: Date;
    _count?: { chunks: number };
    chunks?: Array<{
      id: string;
      sourceId: string;
      content: string;
      position: number;
      createdAt: Date;
    }>;
  },
  includeChunks = false,
): KnowledgeSourceDto {
  return {
    id: row.id,
    type: row.type as KnowledgeSourceType,
    name: row.name,
    originalFileName: row.originalFileName,
    url: row.url,
    status: row.status as KnowledgeSourceStatus,
    errorMessage: row.errorMessage,
    chunkCount: row._count?.chunks ?? row.chunks?.length ?? 0,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    chunks: includeChunks && row.chunks ? row.chunks.map(mapChunk) : undefined,
  };
}

function extensionToType(filename: string): KnowledgeSourceType | null {
  const ext = path.extname(filename).toLowerCase();
  if (ext === ".pdf") return "PDF";
  if (ext === ".docx") return "DOCX";
  if (ext === ".xlsx") return "XLSX";
  return null;
}

export function validateUploadedFile(file: File): {
  type: KnowledgeSourceType;
  bufferPromise: Promise<Buffer>;
} {
  if (!file || typeof file.name !== "string") {
    throw new Error("Файл не передан");
  }
  if (file.size <= 0) {
    throw new Error("Файл пустой");
  }
  if (file.size > KNOWLEDGE_MAX_FILE_SIZE) {
    throw new Error("Размер файла превышает 10 МБ");
  }

  const type = extensionToType(file.name);
  if (!type) {
    throw new Error("Разрешены только файлы PDF, DOCX и XLSX");
  }

  const allowed = KNOWLEDGE_ALLOWED_MIME[type as "PDF" | "DOCX" | "XLSX"];
  const mime = (file.type || "application/octet-stream").toLowerCase();
  if (mime && !allowed.includes(mime) && mime !== "application/octet-stream") {
    throw new Error(`Недопустимый MIME type для ${type}`);
  }

  return {
    type,
    bufferPromise: file.arrayBuffer().then((data) => Buffer.from(data)),
  };
}

async function saveChunks(sourceId: string, text: string) {
  const chunks = splitIntoChunks(text);
  if (chunks.length === 0) {
    throw new Error("Не удалось разбить документ на фрагменты");
  }

  await prisma.knowledgeChunk.createMany({
    data: chunks.map((content, index) => ({
      sourceId,
      content,
      position: index,
    })),
  });
}

async function markFailed(sourceId: string, error: unknown) {
  const message =
    error instanceof Error ? error.message : "Не удалось обработать источник";
  await prisma.knowledgeSource.update({
    where: { id: sourceId },
    data: {
      status: "FAILED",
      errorMessage: message.slice(0, 1000),
    },
  });
}

async function processFileSource(sourceId: string, type: KnowledgeSourceType, buffer: Buffer) {
  try {
    let text = "";
    if (type === "PDF") text = await extractTextFromPdf(buffer);
    else if (type === "DOCX") text = await extractTextFromDocx(buffer);
    else text = await extractTextFromXlsx(buffer);

    await saveChunks(sourceId, text);
    await prisma.knowledgeSource.update({
      where: { id: sourceId },
      data: { status: "READY", errorMessage: null },
    });
  } catch (error) {
    await markFailed(sourceId, error);
  }
}

export async function listKnowledgeSources(): Promise<KnowledgeSourceDto[]> {
  const rows = await prisma.knowledgeSource.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { chunks: true } } },
  });
  return rows.map((row) => mapKnowledgeSource(row));
}

export async function getKnowledgeSource(id: string): Promise<KnowledgeSourceDto | null> {
  const row = await prisma.knowledgeSource.findUnique({
    where: { id },
    include: {
      chunks: { orderBy: { position: "asc" } },
      _count: { select: { chunks: true } },
    },
  });
  return row ? mapKnowledgeSource(row, true) : null;
}

export async function createKnowledgeSourceFromFile(params: {
  file: File;
  name?: string;
}): Promise<KnowledgeSourceDto> {
  const { type, bufferPromise } = validateUploadedFile(params.file);
  const buffer = await bufferPromise;

  const source = await prisma.knowledgeSource.create({
    data: {
      type,
      name: params.name?.trim() || params.file.name,
      originalFileName: params.file.name,
      status: "PROCESSING",
    },
  });

  const dir = path.join(UPLOAD_ROOT, source.id);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, params.file.name), buffer);

  await processFileSource(source.id, type, buffer);

  const refreshed = await getKnowledgeSource(source.id);
  if (!refreshed) throw new Error("SOURCE_NOT_FOUND");
  return refreshed;
}

export async function createKnowledgeSourceFromUrl(params: {
  url: string;
  name?: string;
}): Promise<KnowledgeSourceDto> {
  const source = await prisma.knowledgeSource.create({
    data: {
      type: "URL",
      name: params.name?.trim() || params.url,
      url: params.url,
      status: "PROCESSING",
    },
  });

  try {
    const page = await fetchPublicPageText(params.url);
    await prisma.knowledgeSource.update({
      where: { id: source.id },
      data: {
        name: params.name?.trim() || page.title || params.url,
        url: page.url,
      },
    });
    await saveChunks(source.id, page.text);
    await prisma.knowledgeSource.update({
      where: { id: source.id },
      data: { status: "READY", errorMessage: null },
    });
  } catch (error) {
    await markFailed(source.id, error);
  }

  const refreshed = await getKnowledgeSource(source.id);
  if (!refreshed) throw new Error("SOURCE_NOT_FOUND");
  return refreshed;
}

export async function deleteKnowledgeSource(id: string): Promise<boolean> {
  const existing = await prisma.knowledgeSource.findUnique({ where: { id } });
  if (!existing) return false;
  await prisma.knowledgeSource.delete({ where: { id } });
  return true;
}
