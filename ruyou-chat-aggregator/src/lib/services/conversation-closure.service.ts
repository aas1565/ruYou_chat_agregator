import { prisma } from "@/lib/db";

export const CLOSURE_PROMPT_TEXT = "Остались ли у вас еще какие то вопросы?";
const CLOSURE_IDLE_MINUTES = 10;
const CLOSURE_POLL_MS = 60_000;

type ClosureAnswer = "YES" | "NO" | "OTHER";

function classifyAnswer(text: string): ClosureAnswer {
  const normalized = text.trim().toLocaleLowerCase("ru-RU").replace(/[!?.,;:]+$/gu, "").trim();
  if (normalized === "да") return "YES";
  if (normalized === "нет") return "NO";
  return "OTHER";
}

export async function applyClosureAnswer(params: { conversationId: string; text: string }) {
  const state = await prisma.conversationClosureState.findUnique({ where: { conversationId: params.conversationId } });
  if (!state || state.status !== "AWAITING_ANSWER") return false;

  const answer = classifyAnswer(params.text);
  if (answer === "OTHER") return false;

  const nextStatus = answer === "NO" ? "CLOSED" : "PENDING";
  await prisma.$transaction([
    prisma.conversation.update({ where: { id: params.conversationId }, data: { status: nextStatus } }),
    prisma.conversationClosureState.update({
      where: { id: state.id },
      data: { status: answer === "NO" ? "CLOSED" : "WAITING", resolvedAt: new Date() },
    }),
  ]);
  return true;
}

export async function recordAiMessage(conversationId: string, createdAt: Date) {
  const state = await prisma.conversationClosureState.findUnique({ where: { conversationId } });
  if (state?.status === "AWAITING_ANSWER") return state;
  return prisma.conversationClosureState.upsert({
    where: { conversationId },
    update: { status: "IDLE", lastAiMessageAt: createdAt, promptSentAt: null, promptMessageId: null, resolvedAt: null },
    create: { conversationId, status: "IDLE", lastAiMessageAt: createdAt },
  });
}

export async function resetClosureState(conversationId: string) {
  const state = await prisma.conversationClosureState.findUnique({ where: { conversationId } });
  if (!state || state.status === "CLOSED") return state;
  return prisma.conversationClosureState.update({ where: { id: state.id }, data: { status: "IDLE", promptSentAt: null, promptMessageId: null, resolvedAt: null } });
}

async function promptOneDueConversation(conversationId: string, cutoff: Date) {
  return prisma.$transaction(async (tx) => {
    const conversation = await tx.conversation.findUnique({
      where: { id: conversationId },
      include: { messages: { orderBy: { createdAt: "desc" }, take: 1 } },
    });
    if (!conversation || conversation.handlerType !== "AI" || conversation.status === "CLOSED" || conversation.status === "PENDING") return false;
    const latest = conversation.messages[0];
    if (!latest || latest.senderType !== "AI" || latest.createdAt > cutoff) return false;

    const state = await tx.conversationClosureState.findUnique({ where: { conversationId } });
    if (state?.status === "AWAITING_ANSWER" || state?.status === "CLOSED" || state?.status === "WAITING") return false;
    if (state?.lastAiMessageAt && state.lastAiMessageAt.getTime() !== latest.createdAt.getTime()) return false;

    const now = new Date();
    const prompt = await tx.message.create({
      data: {
        conversationId,
        senderType: "AI",
        text: CLOSURE_PROMPT_TEXT,
        channel: conversation.channel,
        deliveryStatus: "SENT",
        createdAt: now,
      },
    });
    await tx.conversation.update({ where: { id: conversationId }, data: { lastMessageAt: now, lastMessageText: CLOSURE_PROMPT_TEXT } });
    await tx.conversationClosureState.upsert({
      where: { conversationId },
      update: { status: "AWAITING_ANSWER", lastAiMessageAt: latest.createdAt, promptSentAt: now, promptMessageId: prompt.id, resolvedAt: null },
      create: { conversationId, status: "AWAITING_ANSWER", lastAiMessageAt: latest.createdAt, promptSentAt: now, promptMessageId: prompt.id },
    });
    return true;
  });
}

export async function processDueConversationClosures(now = new Date()) {
  await normalizeLegacyStatuses();
  const cutoff = new Date(now.getTime() - CLOSURE_IDLE_MINUTES * 60_000);
  const candidates = await prisma.conversation.findMany({
    where: { handlerType: "AI", status: { notIn: ["CLOSED", "PENDING"] }, messages: { some: { senderType: "AI", createdAt: { lte: cutoff } } } },
    select: { id: true },
    take: 100,
  });
  let prompted = 0;
  for (const candidate of candidates) if (await promptOneDueConversation(candidate.id, cutoff)) prompted += 1;
  return prompted;
}

async function normalizeLegacyStatuses() {
  const legacy = await prisma.conversation.findMany({
    where: { status: { in: ["CLOSED", "PENDING"] } },
    select: { id: true, status: true, closureState: { select: { status: true } } },
  });
  for (const conversation of legacy) {
    const valid = conversation.status === "CLOSED"
      ? conversation.closureState?.status === "CLOSED"
      : conversation.closureState?.status === "WAITING";
    if (!valid) await prisma.conversation.update({ where: { id: conversation.id }, data: { status: "OPEN" } });
  }
}

const workerGlobal = globalThis as typeof globalThis & { __ruyouClosureWorkerStarted?: boolean };

export function startConversationClosureWorker() {
  if (workerGlobal.__ruyouClosureWorkerStarted || process.env.NODE_ENV === "test") return;
  workerGlobal.__ruyouClosureWorkerStarted = true;
  void processDueConversationClosures().catch((error) => console.error("[conversation-closure] initial run failed", error));
  const timer = setInterval(() => {
    void processDueConversationClosures().catch((error) => console.error("[conversation-closure] poll failed", error));
  }, CLOSURE_POLL_MS);
  timer.unref?.();
}
