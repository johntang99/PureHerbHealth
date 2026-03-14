import { z } from "zod";
import { getLocalized } from "@/lib/i18n/get-localized";
import { handleApiError, ok } from "@/lib/utils/api";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

const querySchema = z.object({
  locale: z.enum(["en", "zh"]).default("en"),
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const parsed = querySchema.parse(Object.fromEntries(searchParams.entries()));
    const admin = getSupabaseAdminClient();
    const { data: categories, error } = await admin.from("categories").select("id,slug,name,name_zh,parent_id");
    if (error) throw error;

    const { data: products } = await admin.from("products").select("category_id").eq("enabled", true);
    const countByCategory = (products ?? []).reduce<Record<string, number>>((acc, row) => {
      const categoryId = row.category_id;
      if (categoryId) acc[categoryId] = (acc[categoryId] ?? 0) + 1;
      return acc;
    }, {});

    const byParent = new Map<string | null, Array<Record<string, unknown>>>();
    for (const row of categories ?? []) {
      const key = row.parent_id ?? null;
      byParent.set(key, [...(byParent.get(key) ?? []), row]);
    }

    type CategoryNode = {
      id: string;
      slug: string;
      name: string;
      description: string | null;
      image_url: string | null;
      product_count: number;
      children: CategoryNode[];
    };

    const buildNode = (row: Record<string, unknown>): CategoryNode => {
      const id = row.id as string;
      const children = (byParent.get(id) ?? []).map(buildNode);
      return {
        id,
        slug: row.slug as string,
        name: getLocalized(row, "name", parsed.locale),
        description: null,
        image_url: null,
        product_count: countByCategory[id] ?? 0,
        children,
      };
    };

    return ok({
      categories: (byParent.get(null) ?? []).map(buildNode),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
