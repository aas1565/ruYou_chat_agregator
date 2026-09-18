import { prisma } from "@/lib/db";
import { processAiReplyForInbound } from "@/lib/ai/ai-response.service";
import { getConversationDetail } from "@/lib/services/conversation.service";
import { applyClosureAnswer, resetClosureState } from "@/lib/services/conversation-closure.service";

export async function createOperatorMessage(params: {
  conversationId: string;
  text: string;
  userId: string;
}) {
  const conversation = await prisma.conversation.findUnique({
    where: { id: params.conversationId },
  });
  if (!conversation) return null;

  const now = new Date();
  await prisma.$transaction([
    prisma.message.create({
      data: {
        conversationId: conversation.id,
        senderType: "OPERATOR",
        senderUserId: params.userId,
        text: params.text,
        channel: conversation.channel,
        deliveryStatus: "SENT",
        createdAt: now,
      },
    }),
    prisma.conversation.update({
      where: { id: conversation.id },
      data: {
        lastMessageAt: now,
        lastMessageText: params.text,
        handlerType: "OPERATOR",
        unreadCount: 0,
        status: conversation.status === "CLOSED" ? "OPEN" : conversation.status,
      },
    }),
    prisma.client.update({
      where: { id: conversation.clientId },
      data: { lastContactAt: now },
    }),
  ]);
  await resetClosureState(conversation.id);

  return getConversationDetail(conversation.id);
}

/**
 * Creates a client-side message from the inbox test mode and runs the same AI
 * pipeline as a real inbound message. This lets an operator test the assistant
 * without creating a second client or leaving the current conversation.
 */
export async function createClientMessageForTesting(params: {
  conversationId: string;
  text: string;
}) {
  const conversation = await prisma.conversation.findUnique({
    where: { id: params.conversationId },
  });
  if (!conversation) return null;

  const now = new Date();
  const clientMessage = await prisma.message.create({
    data: {
      conversationId: conversation.id,
      senderType: "CLIENT",
      text: params.text,
      channel: conversation.channel,
      deliveryStatus: "DELIVERED",
      createdAt: now,
    },
  });

  await prisma.conversation.update({
    where: { id: conversation.id },
    data: {
      lastMessageAt: now,
      lastMessageText: params.text,
      handlerType: "AI",
      unreadCount: 0,
      status: "OPEN",
    },
  });

  if (await applyClosureAnswer({ conversationId: conversation.id, text: params.text })) {
    return getConversationDetail(conversation.id);
  }

  await processAiReplyForInbound({
    conversationId: conversation.id,
    clientMessageId: clientMessage.id,
    clientMessageText: params.text,
    clientMessageCreatedAt: clientMessage.createdAt,
  });

  return getConversationDetail(conversation.id);
}
