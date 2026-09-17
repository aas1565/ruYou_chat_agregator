import { z } from "zod";
import { CHANNELS, CLIENT_STATUSES, CONTACT_TYPES } from "@/lib/constants";

export const createClientSchema = z.object({
  firstName: z.string().trim().min(1, "Укажите имя").max(80),
  lastName: z.string().trim().max(80).optional().nullable(),
  phone: z.string().trim().max(32).optional().nullable(),
  email: z.string().trim().email("Некорректный email").max(160).optional().nullable().or(z.literal("")),
  telegram: z.string().trim().max(80).optional().nullable(),
  whatsapp: z.string().trim().max(80).optional().nullable(),
  vk: z.string().trim().max(120).optional().nullable(),
  firstChannel: z.enum(CHANNELS),
  externalId: z.string().trim().max(160).optional().nullable(),
  note: z.string().trim().max(2000).optional().nullable(),
});

export const updateClientSchema = z.object({
  firstName: z.string().trim().min(1).max(80).optional(),
  lastName: z.string().trim().max(80).optional().nullable(),
  phone: z.string().trim().max(32).optional().nullable(),
  email: z
    .string()
    .trim()
    .email("Некорректный email")
    .max(160)
    .optional()
    .nullable()
    .or(z.literal("")),
  telegram: z.string().trim().max(80).optional().nullable(),
  whatsapp: z.string().trim().max(80).optional().nullable(),
  vk: z.string().trim().max(120).optional().nullable(),
  status: z.enum(CLIENT_STATUSES).optional(),
  note: z.string().trim().max(2000).optional(),
});

export const clientSearchSchema = z.object({
  phone: z.string().trim().optional(),
  email: z.string().trim().optional(),
  channel: z.enum(CHANNELS).optional(),
  externalId: z.string().trim().optional(),
});

export const clientListQuerySchema = z.object({
  q: z.string().trim().optional(),
  channel: z.enum(CHANNELS).optional(),
  status: z.enum(CLIENT_STATUSES).optional(),
  sort: z.enum(["lastContactAt", "firstName", "contactCount", "createdAt"]).optional(),
  order: z.enum(["asc", "desc"]).optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(50).optional(),
});

export const noteSchema = z.object({
  text: z.string().trim().min(1, "Введите заметку").max(2000),
  clientId: z.string().optional(),
  leadId: z.string().optional(),
});

export const contactTypeSchema = z.enum(CONTACT_TYPES);

export type CreateClientInput = z.infer<typeof createClientSchema>;
export type UpdateClientInput = z.infer<typeof updateClientSchema>;
