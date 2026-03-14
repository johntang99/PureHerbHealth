import { z } from "zod";

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(12),
});

export const cartItemSchema = z.object({
  productId: z.string().uuid().or(z.string().min(1)),
  quantity: z.number().int().positive().max(99),
});

export const aiChatSchema = z.object({
  store_slug: z.string().default("pureherbhealth"),
  messages: z.array(
    z.object({
      role: z.enum(["user", "assistant"]),
      content: z.string().min(1),
      timestamp: z.string().optional(),
    }),
  ),
  customer_profile: z
    .object({
      customer_id: z.string().optional(),
      constitution_type: z.string().optional(),
      element_affinity: z.string().optional(),
      health_goals: z.array(z.string()).optional(),
      dietary_restrictions: z.array(z.string()).optional(),
      allergies: z.array(z.string()).optional(),
      age_range: z.string().optional(),
    })
    .optional()
    .nullable(),
  session_id: z.string().min(6),
  conversation_id: z.string().uuid().optional().nullable(),
  locale: z.enum(["en", "zh"]).default("en"),
});
