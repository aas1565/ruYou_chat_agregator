import { z } from "zod";
import { CHANNELS, CONVERSATION_STATUSES } from "@/lib/constants";

export const conversationListQuerySchema = z.object({
  q: z.string().trim().optional(),
  channel: z.enum(CHANNELS).optional(),
  status: z.enum(CONVERSATION_STATUSES).optional(),
  filter: z.enum(["all", "unread", "operator"]).optional(),
});

export const createMessageSchema = z.object({
  text: z.string().trim().min(1, "Введите сообщение").max(4000),
  senderType: z.enum(["OPERATOR", "CLIENT"]).default("OPERATOR"),
});
