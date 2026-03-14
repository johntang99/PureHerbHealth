import { ok } from "@/lib/utils/api";
import { z } from "zod";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { handleApiError } from "@/lib/utils/api";

const querySchema = z.object({
  store_slug: z.string().optional(),
});

function normalizeImage(value: unknown) {
  if (!value || typeof value !== "object") return null;
  const obj = value as Record<string, unknown>;
  const url = typeof obj.url === "string" ? obj.url : "";
  if (!url) return null;
  return { url, alt: typeof obj.alt === "string" ? obj.alt : "" };
}

export async function GET(request: Request, { params }: { params: { slug: string } }) {
  try {
    const parsed = querySchema.parse(Object.fromEntries(new URL(request.url).searchParams.entries()));
    const admin = getSupabaseAdminClient();

    let storeId: string | null = null;
    if (parsed.store_slug) {
      const { data: store } = await admin.from("stores").select("id").eq("slug", parsed.store_slug).maybeSingle();
      storeId = store?.id ?? null;
    }
    if (!storeId) {
      const { data: fallback } = await admin.from("stores").select("id").eq("slug", "pureherbhealth").maybeSingle();
      storeId = fallback?.id ?? null;
    }

    let query = admin
      .from("content")
      .select("id,slug,title,title_zh,body_markdown,body_markdown_zh,featured_image,images,videos,tcm_data,meta_title,meta_description,published_at,created_at,updated_at")
      .eq("slug", params.slug)
      .eq("type", "herb_profile")
      .eq("status", "published")
      .limit(1);
    if (storeId) query = query.eq("store_id", storeId);

    const { data, error } = await query.maybeSingle();
    if (error) throw error;
    if (!data) return ok({ error: "Herb not found" }, { status: 404 });

    const { data: contentProductRows } = await admin.from("content_products").select("product_id").eq("content_id", data.id);
    const linkedProductIds = (contentProductRows || []).map((row) => row.product_id).filter(Boolean);
    let linkedProducts: Array<{
      id: string;
      slug: string;
      name: string;
      short_description: string | null;
      price: number;
      primary_image: { url: string; alt: string } | null;
      category_slug: string | null;
    }> = [];
    if (linkedProductIds.length > 0) {
      const { data: products } = await admin
        .from("products")
        .select("id,slug,name,short_description,price_cents,images,category_id,categories:category_id(slug)")
        .in("id", linkedProductIds)
        .eq("enabled", true);
      linkedProducts = (products || []).map((product) => {
        const category = Array.isArray(product.categories)
          ? product.categories[0]
          : (product.categories as { slug?: string } | null);
        return {
          id: product.id,
          slug: product.slug,
          name: product.name,
          short_description: product.short_description,
          price: Number(((product.price_cents || 0) / 100).toFixed(2)),
          primary_image: product.images?.[0] ? { url: product.images[0].url ?? "", alt: product.images[0].alt ?? "" } : null,
          category_slug: category?.slug ?? null,
        };
      });
    }

    const tcmData = data.tcm_data && typeof data.tcm_data === "object" ? (data.tcm_data as Record<string, unknown>) : {};

    return ok({
      id: data.id,
      slug: data.slug,
      title: data.title,
      title_zh: data.title_zh,
      chinese_name: typeof tcmData.chinese_name === "string" ? tcmData.chinese_name : "",
      pinyin: typeof tcmData.pinyin === "string" ? tcmData.pinyin : "",
      nature: typeof tcmData.nature === "string" ? tcmData.nature : "neutral",
      elements: Array.isArray(tcmData.elements) ? tcmData.elements : [],
      meridians: Array.isArray(tcmData.meridians) ? tcmData.meridians : [],
      category: typeof tcmData.category === "string" ? tcmData.category : "general",
      featured_image: normalizeImage(data.featured_image),
      images: Array.isArray(data.images) ? data.images : [],
      videos: Array.isArray(data.videos) ? data.videos : [],
      linked_products: linkedProducts,
      body_markdown: data.body_markdown,
      body_markdown_zh: data.body_markdown_zh,
      tcm_data: tcmData,
      safety: Array.isArray(tcmData.contraindications) ? tcmData.contraindications : [],
      pairings: [],
      references: Array.isArray(tcmData.modern_research) ? tcmData.modern_research : [],
      meta_title: data.meta_title || null,
      meta_description: data.meta_description || null,
      published_at: data.published_at || data.created_at,
      updated_at: data.updated_at,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
