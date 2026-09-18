import { prisma } from "@/lib/db";
import type { KnowledgeEntryType, KnowledgeSourceType } from "@/lib/constants";
import type { KnowledgeChunkDto, KnowledgeEntryDto, KnowledgeRetrievalResult } from "@/lib/types";
import { mapKnowledgeEntry } from "@/lib/services/knowledge.service";

const STOP_WORDS = new Set([
  "и",
  "в",
  "во",
  "на",
  "по",
  "к",
  "ко",
  "с",
  "со",
  "у",
  "о",
  "об",
  "от",
  "до",
  "за",
  "из",
  "для",
  "при",
  "это",
  "как",
  "что",
  "чем",
  "или",
  "ли",
  "же",
  "бы",
  "не",
  "нет",
  "да",
  "а",
  "но",
  "то",
  "ты",
  "вы",
  "мы",
  "он",
  "она",
  "они",
  "мне",
  "меня",
  "вас",
  "вам",
  "есть",
  "быть",
  "можно",
  "нужно",
  "пожалуйста",
  "подскажите",
  "скажите",
  "здравствуйте",
  "добрый",
  "день",
  "вечер",
  "утро",
  "the",
  "a",
  "an",
  "and",
  "or",
  "to",
  "of",
  "in",
  "is",
  "are",
  "you",
  "your",
]);

const TYPE_BOOST: Partial<Record<KnowledgeEntryType, string[]>> = {
  WORKING_HOURS: ["работа", "режим", "час", "открыт", "закрыт", "график", "доскольк", "когда"],
  ADDRESS: ["адрес", "где", "наход", "локац", "проезд", "улиц"],
  SERVICE: ["услуг", "сервис", "делаете", "шиномонтаж", "ремонт"],
  PRICE: ["цена", "стоим", "сколько", "прайс", "руб"],
  FAQ: ["можно", "как", "вопрос"],
  PROMOTION: ["акци", "скидк", "спецпредлож"],
  EMPLOYEE: ["мастер", "сотрудник", "специалист", "кто"],
  SCHEDULE: ["расписан", "слот", "запис"],
  CANCELLATION_POLICY: ["отмен", "перенос", "правил"],
  COMPANY: ["компани", "о вас", "кто вы"],
};

export function extractKeywords(text: string): string[] {
  const tokens = text
    .toLocaleLowerCase("ru-RU")
    .replace(/[^a-zа-яё0-9\s-]/gi, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 3 && !STOP_WORDS.has(token));

  return Array.from(new Set(tokens)).slice(0, 40);
}

function scoreText(haystack: string, keywords: string[]): number {
  if (!haystack || keywords.length === 0) return 0;
  const normalized = haystack.toLocaleLowerCase("ru-RU");
  let score = 0;
  for (const keyword of keywords) {
    if (normalized.includes(keyword)) {
      score += keyword.length >= 5 ? 3 : 2;
    }
  }
  return score;
}

function scoreEntry(
  entry: { type: string; title: string; content: string },
  keywords: string[],
  query: string,
): number {
  let score =
    scoreText(entry.title, keywords) * 2 +
    scoreText(entry.content, keywords) +
    scoreText(`${entry.title} ${entry.content}`, extractKeywords(query)) * 0.5;

  const boosts = TYPE_BOOST[entry.type as KnowledgeEntryType] ?? [];
  const queryLower = query.toLocaleLowerCase("ru-RU");
  for (const boost of boosts) {
    if (queryLower.includes(boost)) score += 4;
  }

  // Always keep a light presence for company/hours/address when query is short
  if (["COMPANY", "WORKING_HOURS", "ADDRESS"].includes(entry.type) && keywords.length <= 2) {
    score += 1;
  }

  return score;
}

export async function retrieveKnowledge(query: string, limit = 8): Promise<KnowledgeRetrievalResult> {
  const keywords = extractKeywords(query);
  const scoreById: Record<string, number> = {};

  const entriesRaw = await prisma.knowledgeEntry.findMany({
    where: { isActive: true },
    orderBy: { updatedAt: "desc" },
  });

  const scoredEntries = entriesRaw
    .map((entry) => ({
      entry: mapKnowledgeEntry(entry),
      score: scoreEntry(entry, keywords, query),
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);

  // Ensure internal instructions with any keyword overlap are included preferentially for AI context
  const internal = scoredEntries.filter((item) => item.entry.type === "INTERNAL_INSTRUCTION");
  const publicEntries = scoredEntries.filter((item) => item.entry.type !== "INTERNAL_INSTRUCTION");
  const selectedEntries = [...publicEntries.slice(0, Math.max(1, limit - 2)), ...internal.slice(0, 2)]
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  for (const item of selectedEntries) {
    scoreById[item.entry.id] = item.score;
  }

  const chunksRaw = await prisma.knowledgeChunk.findMany({
    where: { source: { status: "READY" } },
    include: { source: { select: { name: true, type: true } } },
    take: 400,
    orderBy: { createdAt: "desc" },
  });

  const scoredChunks = chunksRaw
    .map((chunk) => {
      const score = scoreText(chunk.content, keywords);
      return {
        chunk: {
          id: chunk.id,
          sourceId: chunk.sourceId,
          content: chunk.content,
          position: chunk.position,
          createdAt: chunk.createdAt.toISOString(),
          sourceName: chunk.source.name,
          sourceType: chunk.source.type as KnowledgeSourceType,
        } satisfies KnowledgeChunkDto & { sourceName: string; sourceType: KnowledgeSourceType },
        score,
      };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.max(3, Math.floor(limit / 2)));

  for (const item of scoredChunks) {
    scoreById[item.chunk.id] = item.score;
  }

  // Fallback: if nothing matched, return compact core company facts
  let entries: KnowledgeEntryDto[] = selectedEntries.map((item) => item.entry);
  if (entries.length === 0) {
    entries = entriesRaw
      .filter((row) =>
        ["COMPANY", "WORKING_HOURS", "ADDRESS", "SERVICE", "FAQ"].includes(row.type),
      )
      .slice(0, 5)
      .map(mapKnowledgeEntry);
  }

  return {
    entries,
    chunks: scoredChunks.map((item) => item.chunk),
    scoreById,
  };
}
