import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/require-user";
import { CHANNELS } from "@/lib/constants";
import { findOrCreateClient } from "@/lib/services/identity.service";
import { getConversationDetail } from "@/lib/services/conversation.service";
import { createLead } from "@/lib/services/lead.service";
import { processAiReplyForInbound } from "@/lib/ai/ai-response.service";
import { jsonError, parseJson } from "@/lib/api/server";

const inboundSchema = z.object({
  channel: z.enum(CHANNELS),
  externalId: z.string().trim().min(1).max(160),
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().max(80).optional().nullable(),
  phone: z.string().trim().max(32).optional().nullable(),
  email: z.string().trim().max(160).optional().nullable(),
  telegram: z.string().trim().max(80).optional().nullable(),
  whatsapp: z.string().trim().max(80).optional().nullable(),
  vk: z.string().trim().max(120).optional().nullable(),
  text: z.string().trim().min(1).max(4000),
  createLead: z.boolean().optional(),
  leadTitle: z.string().trim().max(200).optional(),
});

export async function POST(request: Request) {
  const auth = await requireUser();
  if (auth.error) return auth.error;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Некорректный JSON");
  }

  const parsed = parseJson(inboundSchema, body);
  if (parsed.error) return parsed.error;

  const { client, created } = await findOrCreateClient(parsed.data);
  const now = new Date();

  let conversation = await prisma.conversation.findFirst({
    where: {
      clientId: client.id,
      channel: parsed.data.channel,
      status: { not: "CLOSED" },
    },
    orderBy: { lastMessageAt: "desc" },
  });

  if (!conversation) {
    conversation = await prisma.conversation.create({
      data: {
        clientId: client.id,
        channel: parsed.data.channel,
        status: "OPEN",
        handlerType: "AI",
        unreadCount: 1,
        lastMessageAt: now,
        lastMessageText: parsed.data.text,
      },
    });
  } else {
    conversation = await prisma.conversation.update({
      where: { id: conversation.id },
      data: {
        lastMessageAt: now,
        lastMessageText: parsed.data.text,
        unreadCount: { increment: 1 },
        status: "OPEN",
      },
    });
  }

  const clientMessage = await prisma.message.create({
    data: {
      conversationId: conversation.id,
      senderType: "CLIENT",
      text: parsed.data.text,
      channel: parsed.data.channel,
      deliveryStatus: "DELIVERED",
      createdAt: now,
    },
  });

  let lead = null;
  if (parsed.data.createLead) {
    lead = await createLead({
      clientId: client.id,
      conversationId: conversation.id,
      title: parsed.data.leadTitle || parsed.data.text.slice(0, 80),
      changedById: auth.user.id,
    });
  }

  // AI pipeline is best-effort and must not break inbound persistence
  try {
    await processAiReplyForInbound({
      conversationId: conversation.id,
      clientMessageId: clientMessage.id,
      clientMessageText: parsed.data.text,
      clientMessageCreatedAt: clientMessage.createdAt,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI pipeline failed";
    console.error(`[inbound] AI pipeline: ${message}`);
  }

  const detail = await getConversationDetail(conversation.id);
  return NextResponse.json({ clientCreated: created, conversation: detail, lead }, { status: 201 });
}
