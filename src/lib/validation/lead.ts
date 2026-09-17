import { z } from "zod";
import { CHANNELS, LEAD_FUNNELS, ALL_LEAD_STATUSES } from "@/lib/constants";

export const leadListQuerySchema = z.object({
  q: z.string().trim().optional(),
  status: z.enum(ALL_LEAD_STATUSES).optional(),
  channel: z.enum(CHANNELS).optional(),
  sort: z.enum(["createdAt", "updatedAt", "status", "shortId"]).optional(),
  order: z.enum(["asc", "desc"]).optional(),
});

export const createLeadSchema = z.object({
  clientId: z.string().min(1),
  conversationId: z.string().optional().nullable(),
  title: z.string().trim().min(1, "Укажите тему").max(200),
  funnel: z.enum(LEAD_FUNNELS).optional(),
  status: z.enum(ALL_LEAD_STATUSES).optional(),
  assigneeId: z.string().optional().nullable(),
});

export const updateLeadStatusSchema = z.object({
  status: z.enum(ALL_LEAD_STATUSES),
});

export const updateLeadSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  assigneeId: z.string().optional().nullable(),
});
