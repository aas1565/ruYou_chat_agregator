import { prisma } from "@/lib/db";
import { getConversationDetail } from "@/lib/services/conversation.service";

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

  return getConversationDetail(conversation.id);
}
