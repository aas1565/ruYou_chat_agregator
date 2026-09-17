import { prisma } from "@/lib/db";
import { normalizeEmail, normalizePhone } from "@/lib/utils";
import type { Channel } from "@/lib/constants";

export type IdentityMatchInput = {
  firstName: string;
  lastName?: string | null;
  phone?: string | null;
  email?: string | null;
  telegram?: string | null;
  whatsapp?: string | null;
  vk?: string | null;
  channel: Channel;
  externalId?: string | null;
};

function normalizedPhone(value?: string | null) {
  if (!value) return null;
  const digits = normalizePhone(value);
  return digits.length >= 10 ? digits : null;
}

function normalizedEmail(value?: string | null) {
  if (!value) return null;
  const email = normalizeEmail(value);
  return email.includes("@") ? email : null;
}

async function attachContact(clientId: string, type: string, value: string) {
  await prisma.clientContact.upsert({
    where: { type_value: { type, value } },
    update: { clientId },
    create: { clientId, type, value },
  });
}

async function attachIdentity(
  clientId: string,
  channel: Channel,
  externalId: string,
  displayName?: string | null,
) {
  await prisma.channelIdentity.upsert({
    where: { channel_externalId: { channel, externalId } },
    update: { clientId, displayName: displayName ?? undefined },
    create: { clientId, channel, externalId, displayName: displayName ?? undefined },
  });
}

export async function findMatchingClient(input: IdentityMatchInput) {
  const phone = normalizedPhone(input.phone);
  const email = normalizedEmail(input.email);
  const externalId = input.externalId?.trim() || null;

  if (externalId) {
    const identity = await prisma.channelIdentity.findUnique({
      where: { channel_externalId: { channel: input.channel, externalId } },
      include: { client: true },
    });
    if (identity) return identity.client;
  }

  if (phone) {
    const contact = await prisma.clientContact.findUnique({
      where: { type_value: { type: "PHONE", value: phone } },
      include: { client: true },
    });
    if (contact) return contact.client;
  }

  if (email) {
    const contact = await prisma.clientContact.findUnique({
      where: { type_value: { type: "EMAIL", value: email } },
      include: { client: true },
    });
    if (contact) return contact.client;
  }

  return null;
}

async function syncClientLinks(
  clientId: string,
  input: IdentityMatchInput,
  phone: string | null,
  email: string | null,
) {
  const displayName = [input.firstName, input.lastName].filter(Boolean).join(" ");
  if (phone) await attachContact(clientId, "PHONE", phone);
  if (email) await attachContact(clientId, "EMAIL", email);
  if (input.telegram) await attachContact(clientId, "TELEGRAM", input.telegram);
  const whatsapp = input.whatsapp || (input.channel === "WHATSAPP" ? phone : null);
  if (whatsapp) await attachContact(clientId, "WHATSAPP", whatsapp);
  if (input.vk) await attachContact(clientId, "VK", input.vk);
  if (input.externalId) {
    await attachIdentity(clientId, input.channel, input.externalId, displayName);
  }
}

export async function findOrCreateClient(input: IdentityMatchInput) {
  const existing = await findMatchingClient(input);
  const now = new Date();
  const phone = normalizedPhone(input.phone);
  const email = normalizedEmail(input.email);
  const whatsapp = input.whatsapp || (input.channel === "WHATSAPP" ? phone : null);

  if (existing) {
    const client = await prisma.client.update({
      where: { id: existing.id },
      data: {
        lastContactAt: now,
        contactCount: { increment: 1 },
        phone: existing.phone || phone,
        email: existing.email || email,
        telegram: existing.telegram || input.telegram || null,
        whatsapp: existing.whatsapp || whatsapp,
        vk: existing.vk || input.vk || null,
      },
    });
    await syncClientLinks(client.id, input, phone, email);
    return { client, created: false };
  }

  const client = await prisma.client.create({
    data: {
      firstName: input.firstName,
      lastName: input.lastName || null,
      phone,
      email,
      telegram: input.telegram || null,
      whatsapp,
      vk: input.vk || null,
      firstChannel: input.channel,
      firstContactAt: now,
      lastContactAt: now,
      contactCount: 1,
    },
  });
  await syncClientLinks(client.id, input, phone, email);
  return { client, created: true };
}
