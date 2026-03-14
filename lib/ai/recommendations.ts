import type { SupabaseClient } from "@supabase/supabase-js";

const PRODUCT_REC_REGEX = /\[PRODUCT_REC:\s*([^\|]+)\s*\|\s*([^\|]+)\s*\|\s*([^\|]+)\s*\|\s*([\d.]+)\s*\]/g;

type ParsedRecommendation = {
  slug: string;
  relevance_reason: string;
  tcm_relevance: string;
  confidence: number;
};

export function extractRecommendations(text: string) {
  const parsed: ParsedRecommendation[] = [];
  let match: RegExpExecArray | null;
  while ((match = PRODUCT_REC_REGEX.exec(text)) !== null) {
    parsed.push({
      slug: match[1].trim(),
      relevance_reason: match[2].trim(),
      tcm_relevance: match[3].trim(),
      confidence: Number(match[4].trim()) || 0.5,
    });
  }
  return {
    cleanText: text.replace(PRODUCT_REC_REGEX, "").trim(),
    recommendations: parsed,
  };
}

export async function hydrateRecommendations(admin: SupabaseClient, storeId: string, parsed: ParsedRecommendation[]) {
  if (!parsed.length) return [];
  const slugs = Array.from(new Set(parsed.map((item) => item.slug)));
  const { data, error } = await admin
    .from("store_products")
    .select("product_id,products:product_id(id,slug,name,price_cents,images)")
    .eq("store_id", storeId)
    .in("products.slug", slugs);
  if (error || !data) return [];

  return parsed
    .map((rec) => {
      const row = data.find((item) => {
        const product = Array.isArray(item.products) ? item.products[0] : item.products;
        return product?.slug === rec.slug;
      });
      if (!row) return null;
      const product = Array.isArray(row.products) ? row.products[0] : row.products;
      if (!product) return null;
      return {
        product_id: product.id,
        slug: product.slug,
        name: product.name,
        image_url: product.images?.[0]?.url || "",
        price: Number(((product.price_cents || 0) / 100).toFixed(2)),
        relevance_reason: rec.relevance_reason,
        tcm_relevance: rec.tcm_relevance,
        confidence: rec.confidence,
      };
    })
    .filter(Boolean);
}
