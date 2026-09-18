import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getClientById } from "@/lib/services/client.service";
import type { Channel, ConversationStatus, HandlerType, MessageSender } from "@/lib/constants";
import type { ConversationDetail, ConversationListItem, MessageDto } from "@/lib/types";
import { matchesSearch } from "@/lib/utils";

export function mapConversationListItem(row: {
  id: string;
  channel: string;
  status: string;
  handlerType: string;
  unreadCount: number;
  lastMessageAt: Date;
  lastMessageText: string;
  client: { id: string; firstName: string; lastName: string | null };
}): ConversationListItem {
  return {
    id: row.id,
    channel: row.channel as Channel,
    status: row.status as ConversationStatus,
    handlerType: row.handlerType as HandlerType,
    unreadCount: row.unreadCount,
    lastMessageAt: row.lastMessageAt.toISOString(),
    lastMessageText: row.lastMessageText,
    client: row.client,
  };
}

export function mapMessage(row: {
  id: string;
  senderType: string;
  text: string;
  channel: string;
  deliveryStatus: string;
  createdAt: Date;
  senderUser: { name: string } | null;
  conversation?: { client: { firstName: string; lastName: string | null } };
}): MessageDto {
  const senderType = row.senderType as MessageSender;
  let senderName = "Система";
  if (senderType === "CLIENT") {
    const client = row.conversation?.client;
    senderName = client ? [client.firstName, client.lastName].filter(Boolean).join(" ") : "Клиент";
  } else if (senderType === "AI") {
    senderName = "AI-ассистент";
  } else if (senderType === "OPERATOR") {
    senderName = row.senderUser?.name ?? "Оператор";
  }

  return {
    id: row.id,
    senderType,
    senderName,
    text: row.text,
    channel: row.channel as Channel,
    deliveryStatus: row.deliveryStatus as MessageDto["deliveryStatus"],
    createdAt: row.createdAt.toISOString(),
  };
}

export async function listConversations(params: {
  q?: string;
  channel?: Channel;
  status?: ConversationStatus;
  filter?: "all" | "unread" | "operator";
}) {
  const where: Prisma.ConversationWhereInput = {};
  if (params.channel) where.channel = params.channel;
  if (params.status) where.status = params.status;
  if (params.filter === "unread") where.unreadCount = { gt: 0 };
  if (params.filter === "operator") where.handlerType = "OPERATOR";

  const rows = await prisma.conversation.findMany({
    where,
    orderBy: { lastMessageAt: "desc" },
    include: {
      client: { select: { id: true, firstName: true, lastName: true, phone: true } },
      messages: { select: { text: true } },
    },
  });

  const filtered = params.q
    ? rows.filter((row) =>
        matchesSearch(
          params.q!,
          row.client.firstName,
          row.client.lastName,
          row.client.phone,
          row.lastMessageText,
          ...row.messages.map((message) => message.text),
        ),
      )
    : rows;

  return filtered.map(mapConversationListItem);
}

export async function getConversationDetail(id: string): Promise<ConversationDetail | null> {
  const conversation = await prisma.conversation.findUnique({
    where: { id },
    include: {
      client: { select: { id: true, firstName: true, lastName: true } },
      messages: {
        orderBy: { createdAt: "asc" },
        include: { senderUser: { select: { name: true } } },
      },
      leads: {
        orderBy: { updatedAt: "desc" },
        include: {
          client: { select: { id: true, firstName: true, lastName: true } },
          assignee: { select: { id: true, name: true } },
          conversation: { select: { channel: true } },
        },
      },
    },
  });

  if (!conversation) return null;

  const client = await getClientById(conversation.clientId);
  if (!client) return null;

  return {
    conversation: {
      ...mapConversationListItem(conversation),
      createdAt: conversation.createdAt.toISOString(),
    },
    client,
    messages: conversation.messages.map((message) =>
      mapMessage({ ...message, conversation: { client: conversation.client } }),
    ),
    leads: conversation.leads.map((lead) => ({
      id: lead.id,
      shortId: lead.shortId,
      title: lead.title,
      status: lead.status as ConversationDetail["leads"][number]["status"],
      funnel: lead.funnel as ConversationDetail["leads"][number]["funnel"],
      channel: (lead.conversation?.channel as ConversationDetail["leads"][number]["channel"]) ?? null,
      createdAt: lead.createdAt.toISOString(),
      updatedAt: lead.updatedAt.toISOString(),
      client: lead.client,
      assignee: lead.assignee,
    })),
  };
}

export async function markConversationRead(id: string) {
  await prisma.conversation.update({
    where: { id },
    data: { unreadCount: 0 },
  });
  return getConversationDetail(id);
}
