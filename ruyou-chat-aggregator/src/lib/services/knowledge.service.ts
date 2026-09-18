import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import type { KnowledgeEntryType } from "@/lib/constants";
import type { KnowledgeEntryDto } from "@/lib/types";

function parseMetadata(value: string | null): Record<string, unknown> | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    return null;
  } catch {
    return null;
  }
}

export function mapKnowledgeEntry(row: {
  id: string;
  type: string;
  title: string;
  content: string;
  metadata: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}): KnowledgeEntryDto {
  return {
    id: row.id,
    type: row.type as KnowledgeEntryType,
    title: row.title,
    content: row.content,
    metadata: parseMetadata(row.metadata),
    isActive: row.isActive,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function listKnowledgeEntries(params: {
  type?: KnowledgeEntryType;
  q?: string;
  active?: boolean;
}): Promise<KnowledgeEntryDto[]> {
  const where: Prisma.KnowledgeEntryWhereInput = {};
  if (params.type) where.type = params.type;
  if (params.active !== undefined) where.isActive = params.active;

  const rows = await prisma.knowledgeEntry.findMany({
    where,
    orderBy: [{ type: "asc" }, { updatedAt: "desc" }],
  });

  const query = params.q?.trim().toLocaleLowerCase("ru-RU");
  const filtered = query
    ? rows.filter(
        (row) =>
          row.title.toLocaleLowerCase("ru-RU").includes(query) ||
          row.content.toLocaleLowerCase("ru-RU").includes(query),
      )
    : rows;

  return filtered.map(mapKnowledgeEntry);
}

export async function getKnowledgeEntry(id: string): Promise<KnowledgeEntryDto | null> {
  const row = await prisma.knowledgeEntry.findUnique({ where: { id } });
  return row ? mapKnowledgeEntry(row) : null;
}

export async function createKnowledgeEntry(params: {
  type: KnowledgeEntryType;
  title: string;
  content: string;
  metadata?: Record<string, unknown> | null;
  isActive?: boolean;
}): Promise<KnowledgeEntryDto> {
  const row = await prisma.knowledgeEntry.create({
    data: {
      type: params.type,
      title: params.title,
      content: params.content,
      metadata: params.metadata ? JSON.stringify(params.metadata) : null,
      isActive: params.isActive ?? true,
    },
  });
  return mapKnowledgeEntry(row);
}

export async function updateKnowledgeEntry(
  id: string,
  params: {
    type?: KnowledgeEntryType;
    title?: string;
    content?: string;
    metadata?: Record<string, unknown> | null;
    isActive?: boolean;
  },
): Promise<KnowledgeEntryDto | null> {
  const existing = await prisma.knowledgeEntry.findUnique({ where: { id } });
  if (!existing) return null;

  const data: Prisma.KnowledgeEntryUpdateInput = {};
  if (params.type !== undefined) data.type = params.type;
  if (params.title !== undefined) data.title = params.title;
  if (params.content !== undefined) data.content = params.content;
  if (params.isActive !== undefined) data.isActive = params.isActive;
  if (params.metadata !== undefined) {
    data.metadata = params.metadata ? JSON.stringify(params.metadata) : null;
  }

  const row = await prisma.knowledgeEntry.update({ where: { id }, data });
  return mapKnowledgeEntry(row);
}

export async function deleteKnowledgeEntry(id: string): Promise<boolean> {
  const existing = await prisma.knowledgeEntry.findUnique({ where: { id } });
  if (!existing) return false;
  await prisma.knowledgeEntry.delete({ where: { id } });
  return true;
}
