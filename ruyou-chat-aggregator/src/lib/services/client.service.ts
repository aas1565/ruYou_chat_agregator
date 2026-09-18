import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { findOrCreateClient } from "@/lib/services/identity.service";
import { normalizeEmail, normalizePhone, matchesSearch } from "@/lib/utils";
import type { Channel, ClientStatus } from "@/lib/constants";
import type { ClientListItem, ClientProfileDto, Paginated } from "@/lib/types";
import type { ConversationListItem, LeadListItem } from "@/lib/types";
import { getAppTimezone } from "@/lib/services/scheduling.service";

const clientInclude = {
  contacts: true,
  identities: true,
  notes: {
    include: { author: true },
    orderBy: { createdAt: "desc" as const },
  },
  conversations: {
    orderBy: { lastMessageAt: "desc" as const },
    include: {
      client: { select: { id: true, firstName: true, lastName: true } },
    },
  },
  leads: {
    orderBy: { updatedAt: "desc" as const },
    include: {
      client: { select: { id: true, firstName: true, lastName: true } },
      assignee: { select: { id: true, name: true } },
      conversation: { select: { channel: true } },
    },
  },
  appointments: {
    orderBy: { startAt: "desc" as const },
    include: {
      service: true,
      staff: true,
      lead: { select: { id: true, shortId: true, title: true } },
      conversation: { select: { id: true, channel: true } },
    },
  },
} satisfies Prisma.ClientInclude;

function mapConversation(row: {
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
    channel: row.channel as ConversationListItem["channel"],
    status: row.status as ConversationListItem["status"],
    handlerType: row.handlerType as ConversationListItem["handlerType"],
    unreadCount: row.unreadCount,
    lastMessageAt: row.lastMessageAt.toISOString(),
    lastMessageText: row.lastMessageText,
    client: row.client,
  };
}

function mapLead(row: {
  id: string;
  shortId: number;
  title: string;
  status: string;
  funnel: string;
  createdAt: Date;
  updatedAt: Date;
  client: { id: string; firstName: string; lastName: string | null };
  assignee: { id: string; name: string } | null;
  conversation?: { channel: string } | null;
}): LeadListItem {
  return {
    id: row.id,
    shortId: row.shortId,
    title: row.title,
    status: row.status as LeadListItem["status"],
    funnel: row.funnel as LeadListItem["funnel"],
    channel: (row.conversation?.channel as LeadListItem["channel"]) ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    client: row.client,
    assignee: row.assignee,
  };
}

export function mapClientProfile(client: Prisma.ClientGetPayload<{ include: typeof clientInclude }>): ClientProfileDto {
  return {
    id: client.id,
    firstName: client.firstName,
    lastName: client.lastName,
    phone: client.phone,
    email: client.email,
    telegram: client.telegram,
    whatsapp: client.whatsapp,
    vk: client.vk,
    firstChannel: client.firstChannel as Channel,
    firstContactAt: client.firstContactAt.toISOString(),
    lastContactAt: client.lastContactAt.toISOString(),
    contactCount: client.contactCount,
    status: client.status as ClientStatus,
    contacts: client.contacts.map((c) => ({ id: c.id, type: c.type, value: c.value })),
    identities: client.identities.map((i) => ({
      id: i.id,
      channel: i.channel as Channel,
      externalId: i.externalId,
      displayName: i.displayName,
    })),
    notes: client.notes.map((n) => ({
      id: n.id,
      text: n.text,
      createdAt: n.createdAt.toISOString(),
      author: { id: n.author.id, name: n.author.name },
    })),
    conversations: client.conversations.map(mapConversation),
    leads: client.leads.map(mapLead),
    appointments: client.appointments.map((item) => ({
      id: item.id,
      timezone: getAppTimezone(),
      client: { id: client.id, name: [client.firstName, client.lastName].filter(Boolean).join(" "), phone: client.phone },
      service: { id: item.service.id, name: item.service.name, durationMinutes: item.service.durationMinutes, priceText: item.service.priceText },
      staff: { id: item.staff.id, name: item.staff.name, specialization: item.staff.specialization },
      lead: item.lead,
      conversation: item.conversation,
      startAt: item.startAt.toISOString(),
      endAt: item.endAt.toISOString(),
      status: item.status,
      source: item.source,
      comment: item.comment,
      cancellationReason: item.cancellationReason,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    })),
  };
}

export async function getClientById(id: string) {
  const client = await prisma.client.findUnique({
    where: { id },
    include: clientInclude,
  });
  return client ? mapClientProfile(client) : null;
}

export async function listClients(params: {
  q?: string;
  channel?: Channel;
  status?: ClientStatus;
  sort?: "lastContactAt" | "firstName" | "contactCount" | "createdAt";
  order?: "asc" | "desc";
  page?: number;
  pageSize?: number;
}): Promise<Paginated<ClientListItem>> {
  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? 12;
  const order = params.order ?? "desc";
  const sort = params.sort ?? "lastContactAt";

  const where: Prisma.ClientWhereInput = {};
  if (params.status) where.status = params.status;
  if (params.channel) where.firstChannel = params.channel;

  const rows = await prisma.client.findMany({
    where,
    orderBy: { [sort]: order },
  });

  const filtered = params.q
    ? rows.filter((row) =>
        matchesSearch(params.q!, row.firstName, row.lastName, row.phone, row.email, row.telegram),
      )
    : rows;

  const total = filtered.length;
  const items = filtered.slice((page - 1) * pageSize, page * pageSize);

  return {
    items: items.map((row) => ({
      id: row.id,
      firstName: row.firstName,
      lastName: row.lastName,
      phone: row.phone,
      email: row.email,
      firstChannel: row.firstChannel as Channel,
      lastContactAt: row.lastContactAt.toISOString(),
      contactCount: row.contactCount,
      status: row.status as ClientStatus,
    })),
    total,
    page,
    pageSize,
  };
}

export async function createClient(input: {
  firstName: string;
  lastName?: string | null;
  phone?: string | null;
  email?: string | null;
  telegram?: string | null;
  whatsapp?: string | null;
  vk?: string | null;
  firstChannel: Channel;
  externalId?: string | null;
  authorId?: string;
  note?: string | null;
}) {
  const { client } = await findOrCreateClient({
    firstName: input.firstName,
    lastName: input.lastName,
    phone: input.phone,
    email: input.email,
    telegram: input.telegram,
    whatsapp: input.whatsapp,
    vk: input.vk,
    channel: input.firstChannel,
    externalId: input.externalId,
  });

  if (input.note && input.authorId) {
    await prisma.managerNote.create({
      data: { clientId: client.id, authorId: input.authorId, text: input.note },
    });
  }

  return getClientById(client.id);
}

export async function updateClient(
  id: string,
  input: {
    firstName?: string;
    lastName?: string | null;
    phone?: string | null;
    email?: string | null;
    telegram?: string | null;
    whatsapp?: string | null;
    vk?: string | null;
    status?: ClientStatus;
    note?: string;
    authorId?: string;
  },
) {
  const existing = await prisma.client.findUnique({ where: { id } });
  if (!existing) return null;

  const phone = input.phone != null ? (input.phone ? normalizePhone(input.phone) : null) : undefined;
  const email = input.email != null ? (input.email ? normalizeEmail(input.email) : null) : undefined;

  await prisma.client.update({
    where: { id },
    data: {
      firstName: input.firstName,
      lastName: input.lastName,
      phone,
      email,
      telegram: input.telegram,
      whatsapp: input.whatsapp,
      vk: input.vk,
      status: input.status,
    },
  });

  if (phone) {
    await prisma.clientContact.upsert({
      where: { type_value: { type: "PHONE", value: phone } },
      update: { clientId: id },
      create: { clientId: id, type: "PHONE", value: phone },
    });
  }
  if (email) {
    await prisma.clientContact.upsert({
      where: { type_value: { type: "EMAIL", value: email } },
      update: { clientId: id },
      create: { clientId: id, type: "EMAIL", value: email },
    });
  }

  if (input.note && input.authorId) {
    await prisma.managerNote.create({
      data: { clientId: id, authorId: input.authorId, text: input.note },
    });
  }

  return getClientById(id);
}

export async function addNote(params: {
  authorId: string;
  text: string;
  clientId?: string;
  leadId?: string;
}) {
  return prisma.managerNote.create({
    data: {
      authorId: params.authorId,
      text: params.text,
      clientId: params.clientId,
      leadId: params.leadId,
    },
    include: { author: true },
  });
}
