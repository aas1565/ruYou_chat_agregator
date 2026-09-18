import { prisma } from "@/lib/db";
import { buildAiContext } from "@/lib/ai/ai-context.service";
import { completeAiChat, getConfiguredAiModel, parseAiAnswer } from "@/lib/ai/ai.service";
import { retrieveKnowledge } from "@/lib/services/knowledge-retrieval.service";
import { getConversationDetail } from "@/lib/services/conversation.service";
import type { LeadFunnel, LeadStatus } from "@/lib/constants";
import { FUNNEL_STATUSES } from "@/lib/constants";
import { processBookingWorkflow } from "@/lib/ai/booking-workflow.service";
import { applyClosureAnswer, recordAiMessage, resetClosureState } from "@/lib/services/conversation-closure.service";

const OPERATOR_HANDOFF_TEXT = "Перевожу на оператора для более качественного ответа";
const AI_UNAVAILABLE_TEXT = "AI временно недоступен. Требуется ответ оператора.";

async function setLeadOperatorRequired(conversationId: string) {
  const leads = await prisma.lead.findMany({
    where: {
      conversationId,
      status: { in: ["NEW", "AI_PROCESSING"] },
    },
  });

  for (const lead of leads) {
    const funnel = lead.funnel as LeadFunnel;
    const allowed = FUNNEL_STATUSES[funnel] ?? [];
    if (!allowed.includes("OPERATOR_REQUIRED" as LeadStatus)) continue;

    await prisma.$transaction([
      prisma.lead.update({
        where: { id: lead.id },
        data: { status: "OPERATOR_REQUIRED" },
      }),
      prisma.leadStatusHistory.create({
        data: {
          leadId: lead.id,
          fromStatus: lead.status,
          toStatus: "OPERATOR_REQUIRED",
          changedById: null,
        },
      }),
    ]);
  }
}

async function setLeadAiProcessing(conversationId: string) {
  const leads = await prisma.lead.findMany({
    where: {
      conversationId,
      status: "NEW",
      funnel: "SERVICE",
    },
  });

  for (const lead of leads) {
    await prisma.$transaction([
      prisma.lead.update({
        where: { id: lead.id },
        data: { status: "AI_PROCESSING" },
      }),
      prisma.leadStatusHistory.create({
        data: {
          leadId: lead.id,
          fromStatus: lead.status,
          toStatus: "AI_PROCESSING",
          changedById: null,
        },
      }),
    ]);
  }
}

async function handoffToOperator(params: {
  conversationId: string;
  channel: string;
  systemText: string;
  clientId: string;
}) {
  const now = new Date();
  await prisma.$transaction([
    prisma.message.create({
      data: {
        conversationId: params.conversationId,
        senderType: "SYSTEM",
        text: params.systemText,
        channel: params.channel,
        deliveryStatus: "SENT",
        createdAt: now,
      },
    }),
    prisma.conversation.update({
      where: { id: params.conversationId },
      data: {
        handlerType: "OPERATOR",
        lastMessageAt: now,
        lastMessageText: params.systemText,
        status: "OPEN",
      },
    }),
  ]);

  await setLeadOperatorRequired(params.conversationId);
}

function safeLogError(scope: string, error: unknown) {
  const message = error instanceof Error ? error.message : "Unknown error";
  // Never log API keys or full request payloads
  console.error(`[ai-response] ${scope}: ${message}`);
}

export async function processAiReplyForInbound(params: {
  conversationId: string;
  clientMessageId: string;
  clientMessageText: string;
  clientMessageCreatedAt: Date;
}): Promise<void> {
  const conversation = await prisma.conversation.findUnique({
    where: { id: params.conversationId },
  });

  if (!conversation) return;

  // Operator has priority: do not auto-reply when operator owns the dialog
  if (conversation.handlerType === "OPERATOR") {
    return;
  }

  if (await applyClosureAnswer({ conversationId: conversation.id, text: params.clientMessageText })) {
    return;
  }

  // Scheduling owns booking facts. The general-purpose LLM is only used for
  // informational answers and never gets an opportunity to invent a slot.
  try {
    const bookingAnswer = await processBookingWorkflow({
      conversationId: conversation.id,
      clientId: conversation.clientId,
      text: params.clientMessageText,
    });
    if (bookingAnswer) {
      if (bookingAnswer === "__OPERATOR_HANDOFF__") {
        await handoffToOperator({
          conversationId: conversation.id,
          channel: conversation.channel,
          systemText: OPERATOR_HANDOFF_TEXT,
          clientId: conversation.clientId,
        });
        return;
      }
      const latestClient = await prisma.message.findFirst({
        where: { conversationId: conversation.id, senderType: "CLIENT" },
        orderBy: { createdAt: "desc" },
        select: { id: true },
      });
      const fresh = await prisma.conversation.findUnique({ where: { id: conversation.id }, select: { handlerType: true } });
      if (!latestClient || latestClient.id !== params.clientMessageId || fresh?.handlerType === "OPERATOR") return;
      const now = new Date();
      const aiMessage = await prisma.message.create({ data: { conversationId: conversation.id, senderType: "AI", text: bookingAnswer, channel: conversation.channel, deliveryStatus: "SENT", createdAt: now } });
      await prisma.conversation.update({ where: { id: conversation.id }, data: { lastMessageAt: now, lastMessageText: bookingAnswer, status: "OPEN", handlerType: "AI" } });
      await prisma.client.update({ where: { id: conversation.clientId }, data: { lastContactAt: now } });
      await recordAiMessage(conversation.id, now);
      await prisma.aiResponseLog.create({ data: { conversationId: conversation.id, clientMessageId: params.clientMessageId, aiMessageId: aiMessage.id, model: "scheduling", canAnswer: true, latencyMs: 0 } });
      return;
    }
  } catch (error) {
    safeLogError("booking-workflow", error);
    await handoffToOperator({ conversationId: conversation.id, channel: conversation.channel, systemText: OPERATOR_HANDOFF_TEXT, clientId: conversation.clientId });
    return;
  }

  await setLeadAiProcessing(conversation.id);

  const history = await prisma.message.findMany({
    where: {
      conversationId: conversation.id,
      id: { not: params.clientMessageId },
    },
    orderBy: { createdAt: "asc" },
    take: 40,
    select: { senderType: true, text: true },
  });

  let knowledge;
  try {
    knowledge = await retrieveKnowledge(params.clientMessageText);
  } catch (error) {
    safeLogError("retrieval", error);
    knowledge = { entries: [], chunks: [], scoreById: {} };
  }

  const messages = buildAiContext({
    clientMessage: params.clientMessageText,
    history,
    knowledge,
  });

  const entryIds = knowledge.entries.map((item) => item.id);
  const chunkIds = knowledge.chunks.map((item) => item.id);
  const sourceIds = Array.from(new Set(knowledge.chunks.map((item) => item.sourceId)));

  try {
    const completion = await completeAiChat(messages);
    const answer = parseAiAnswer(completion.content);

    // Stale response guard: only persist if this client message is still the latest CLIENT message
    const latestClient = await prisma.message.findFirst({
      where: {
        conversationId: conversation.id,
        senderType: "CLIENT",
      },
      orderBy: { createdAt: "desc" },
      select: { id: true, createdAt: true },
    });

    if (!latestClient || latestClient.id !== params.clientMessageId) {
      await prisma.aiResponseLog.create({
        data: {
          conversationId: conversation.id,
          clientMessageId: params.clientMessageId,
          model: completion.model,
          canAnswer: answer.canAnswer,
          latencyMs: completion.latencyMs,
          knowledgeEntryIds: JSON.stringify(entryIds),
          knowledgeChunkIds: JSON.stringify(chunkIds),
          sourceIds: JSON.stringify(sourceIds),
          error: "STALE_CLIENT_MESSAGE",
        },
      });
      return;
    }

    // Re-check handler ownership before writing AI reply
    const fresh = await prisma.conversation.findUnique({
      where: { id: conversation.id },
      select: { handlerType: true },
    });
    if (!fresh || fresh.handlerType === "OPERATOR") {
      return;
    }

    if (!answer.canAnswer || !answer.answer) {
      await handoffToOperator({
        conversationId: conversation.id,
        channel: conversation.channel,
        systemText: OPERATOR_HANDOFF_TEXT,
        clientId: conversation.clientId,
      });

      await prisma.aiResponseLog.create({
        data: {
          conversationId: conversation.id,
          clientMessageId: params.clientMessageId,
          model: completion.model,
          canAnswer: false,
          latencyMs: completion.latencyMs,
          knowledgeEntryIds: JSON.stringify(entryIds),
          knowledgeChunkIds: JSON.stringify(chunkIds),
          sourceIds: JSON.stringify(sourceIds),
          error: answer.reason || "INSUFFICIENT_KNOWLEDGE",
        },
      });
      return;
    }

    const now = new Date();
    const aiMessage = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        senderType: "AI",
        text: answer.answer,
        channel: conversation.channel,
        deliveryStatus: "SENT",
        createdAt: now,
      },
    });

    await prisma.conversation.update({
      where: { id: conversation.id },
      data: {
        handlerType: "AI",
        lastMessageAt: now,
        lastMessageText: answer.answer,
        status: "OPEN",
      },
    });

    await prisma.client.update({
      where: { id: conversation.clientId },
      data: { lastContactAt: now },
    });
    await recordAiMessage(conversation.id, now);

    await prisma.aiResponseLog.create({
      data: {
        conversationId: conversation.id,
        clientMessageId: params.clientMessageId,
        aiMessageId: aiMessage.id,
        model: completion.model || getConfiguredAiModel(),
        canAnswer: true,
        latencyMs: completion.latencyMs,
        knowledgeEntryIds: JSON.stringify(entryIds),
        knowledgeChunkIds: JSON.stringify(chunkIds),
        sourceIds: JSON.stringify(sourceIds),
      },
    });
  } catch (error) {
    safeLogError("completion", error);

    const latestClient = await prisma.message.findFirst({
      where: {
        conversationId: conversation.id,
        senderType: "CLIENT",
      },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });

    if (latestClient?.id === params.clientMessageId) {
      await handoffToOperator({
        conversationId: conversation.id,
        channel: conversation.channel,
        systemText: AI_UNAVAILABLE_TEXT,
        clientId: conversation.clientId,
      });
    }

    await prisma.aiResponseLog.create({
      data: {
        conversationId: conversation.id,
        clientMessageId: params.clientMessageId,
        model: getConfiguredAiModel(),
        canAnswer: false,
        knowledgeEntryIds: JSON.stringify(entryIds),
        knowledgeChunkIds: JSON.stringify(chunkIds),
        sourceIds: JSON.stringify(sourceIds),
        error: error instanceof Error ? error.message.slice(0, 500) : "AI_UNAVAILABLE",
      },
    });
  }
}

export async function getConversationAfterAi(conversationId: string) {
  return getConversationDetail(conversationId);
}
