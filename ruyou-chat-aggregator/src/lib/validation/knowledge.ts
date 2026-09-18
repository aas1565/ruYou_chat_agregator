import { z } from "zod";
import { KNOWLEDGE_ENTRY_TYPES, KNOWLEDGE_SOURCE_TYPES } from "@/lib/constants";

export const knowledgeListQuerySchema = z.object({
  type: z.enum(KNOWLEDGE_ENTRY_TYPES).optional(),
  q: z.string().trim().max(200).optional(),
  active: z
    .enum(["true", "false"])
    .optional()
    .transform((value) => (value === undefined ? undefined : value === "true")),
});

export const createKnowledgeEntrySchema = z.object({
  type: z.enum(KNOWLEDGE_ENTRY_TYPES),
  title: z.string().trim().min(1).max(200),
  content: z.string().trim().min(1).max(20000),
  metadata: z.record(z.string(), z.unknown()).optional().nullable(),
  isActive: z.boolean().optional(),
});

export const updateKnowledgeEntrySchema = z
  .object({
    type: z.enum(KNOWLEDGE_ENTRY_TYPES).optional(),
    title: z.string().trim().min(1).max(200).optional(),
    content: z.string().trim().min(1).max(20000).optional(),
    metadata: z.record(z.string(), z.unknown()).optional().nullable(),
    isActive: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "Нужно указать хотя бы одно поле",
  });

export const createKnowledgeUrlSchema = z.object({
  url: z.string().trim().url().max(2000),
  name: z.string().trim().min(1).max(200).optional(),
});

export const knowledgeSourceTypeSchema = z.enum(KNOWLEDGE_SOURCE_TYPES);
