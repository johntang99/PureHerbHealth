import { z } from "zod";
import { handleApiError, ok } from "@/lib/utils/api";
import { listProducts } from "@/lib/catalog/service";

const bodySchema = z.object({
  query: z.string().min(1),
  store_slug: z.string().optional(),
  page: z.number().int().positive().default(1),
  per_page: z.number().int().positive().max(50).default(20),
  locale: z.enum(["en", "zh"]).default("en"),
});

export async function POST(request: Request) {
  try {
    const body = bodySchema.parse(await request.json());
    const looksNaturalLanguage = body.query.trim().split(/\s+/).length > 3;
    const response = await listProducts({
      locale: body.locale,
      page: body.page,
      perPage: body.per_page,
      search: body.query,
      storeSlug: body.store_slug,
      sort: "newest",
    });

    return ok({
      ...response,
      ai_interpretation: looksNaturalLanguage
        ? {
            detected_intent: body.query,
            tcm_mapping:
              body.locale === "zh"
                ? "根据中医语义进行检索，优先展示相关调理类别。"
                : "Natural-language query mapped to TCM-aligned product intents.",
            suggested_categories: response.filters.categories.slice(0, 3).map((item) => item.slug),
          }
        : undefined,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
