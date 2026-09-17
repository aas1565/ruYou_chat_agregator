import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getClientById } from "@/lib/services/client.service";
import { FUNNEL_STATUSES, type Channel, type LeadFunnel, type LeadStatus } from "@/lib/constants";
import type { LeadDetailDto, LeadListItem, Paginated } from "@/lib/types";
import { mapConversationListItem } from "@/lib/services/conversation.service";
import { matchesSearch } from "@/lib/utils";

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
    status: row.status as LeadStatus,
    funnel: row.funnel as LeadFunnel,
    channel: (row.conversation?.channel as Channel) ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    client: row.client,
    assignee: row.assignee,
  };
}

export async function listLeads(params: {
  q?: string;
  status?: LeadStatus;
  channel?: Channel;
  sort?: "createdAt" | "updatedAt" | "status" | "shortId";
  order?: "asc" | "desc";
}): Promise<Paginated<LeadListItem>> {
  const where: Prisma.LeadWhereInput = {};
  if (params.status) where.status = params.status;
  if (params.channel) where.conversation = { channel: params.channel };

  const sort = params.sort ?? "updatedAt";
  const order = params.order ?? "desc";

  const rows = await prisma.lead.findMany({
    where,
    orderBy: { [sort]: order },
    include: {
      client: { select: { id: true, firstName: true, lastName: true } },
      assignee: { select: { id: true, name: true } },
      conversation: { select: { channel: true } },
    },
  });

  const filtered = params.q
    ? rows.filter((row) =>
        matchesSearch(params.q!, row.title, row.client.firstName, row.client.lastName),
      )
    : rows;

  return {
    items: filtered.map(mapLead),
    total: filtered.length,
    page: 1,
    pageSize: filtered.length,
  };
}

export async function getLeadById(id: string): Promise<LeadDetailDto | null> {
  const lead = await prisma.lead.findUnique({
    where: { id },
    include: {
      client: { select: { id: true, firstName: true, lastName: true } },
      assignee: { select: { id: true, name: true } },
      conversation: {
        include: {
          client: { select: { id: true, firstName: true, lastName: true } },
        },
      },
      statusHistory: {
        orderBy: { createdAt: "asc" },
        include: { changedBy: { select: { id: true, name: true } } },
      },
      notes: {
        orderBy: { createdAt: "desc" },
        include: { author: true },
      },
    },
  });

  if (!lead) return null;
  const client = await getClientById(lead.clientId);
  if (!client) return null;

  return {
    lead: {
      ...mapLead({ ...lead, conversation: lead.conversation }),
      conversationId: lead.conversationId,
    },
    client,
    conversation: lead.conversation ? mapConversationListItem(lead.conversation) : null,
    statusHistory: lead.statusHistory.map((item) => ({
      id: item.id,
      fromStatus: (item.fromStatus as LeadStatus | null) ?? null,
      toStatus: item.toStatus as LeadStatus,
      createdAt: item.createdAt.toISOString(),
      changedBy: item.changedBy,
    })),
    notes: lead.notes.map((note) => ({
      id: note.id,
      text: note.text,
      createdAt: note.createdAt.toISOString(),
      author: { id: note.author.id, name: note.author.name },
    })),
  };
}

export async function createLead(params: {
  clientId: string;
  conversationId?: string | null;
  title: string;
  funnel?: LeadFunnel;
  status?: LeadStatus;
  assigneeId?: string | null;
  changedById?: string;
}) {
  const client = await prisma.client.findUnique({ where: { id: params.clientId } });
  if (!client) throw new Error("CLIENT_NOT_FOUND");

  if (params.conversationId) {
    const conversation = await prisma.conversation.findUnique({
      where: { id: params.conversationId },
    });
    if (!conversation) throw new Error("CONVERSATION_NOT_FOUND");
    if (conversation.clientId !== params.clientId) {
      throw new Error("CONVERSATION_CLIENT_MISMATCH");
    }
  }

  const funnel = params.funnel ?? "SERVICE";
  const status = params.status ?? "NEW";
  const allowed = FUNNEL_STATUSES[funnel];
  if (!allowed.includes(status)) {
    throw new Error("INVALID_STATUS_FOR_FUNNEL");
  }

  const last = await prisma.lead.findFirst({
    orderBy: { shortId: "desc" },
    select: { shortId: true },
  });

  const lead = await prisma.lead.create({
    data: {
      shortId: (last?.shortId ?? 1000) + 1,
      clientId: params.clientId,
      conversationId: params.conversationId ?? null,
      title: params.title,
      funnel,
      status,
      assigneeId: params.assigneeId ?? params.changedById ?? null,
      statusHistory: {
        create: {
          fromStatus: null,
          toStatus: status,
          changedById: params.changedById,
        },
      },
    },
  });

  return getLeadById(lead.id);
}

export async function changeLeadStatus(params: {
  leadId: string;
  status: LeadStatus;
  changedById: string;
}) {
  const lead = await prisma.lead.findUnique({ where: { id: params.leadId } });
  if (!lead) return null;

  const allowed = FUNNEL_STATUSES[lead.funnel as LeadFunnel];
  if (!allowed.includes(params.status)) {
    throw new Error("INVALID_STATUS_FOR_FUNNEL");
  }

  if (lead.status === params.status) {
    return getLeadById(lead.id);
  }

  await prisma.$transaction([
    prisma.lead.update({
      where: { id: lead.id },
      data: { status: params.status },
    }),
    prisma.leadStatusHistory.create({
      data: {
        leadId: lead.id,
        fromStatus: lead.status,
        toStatus: params.status,
        changedById: params.changedById,
      },
    }),
  ]);

  return getLeadById(lead.id);
}

export async function updateLead(
  id: string,
  params: { title?: string; assigneeId?: string | null },
) {
  const existing = await prisma.lead.findUnique({ where: { id } });
  if (!existing) return null;
  await prisma.lead.update({
    where: { id },
    data: {
      title: params.title,
      assigneeId: params.assigneeId,
    },
  });
  return getLeadById(id);
}
