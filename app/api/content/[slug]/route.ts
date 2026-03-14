import { z } from "zod";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { handleApiError, ok } from "@/lib/utils/api";

const querySchema = z.object({
  store_slug: z.string().optional(),
  type: z.enum(["blog_post", "herb_profile", "condition_guide", "seasonal_guide", "element_guide"]).optional(),
});

function excerptFromBody(input: string | null | undefined, max = 180) {
  if (!input) return "";
  const plain = input.replace(/[#*_>`~-]/g, "").replace(/\s+/g, " ").trim();
  if (plain.length <= max) return plain;
  return `${plain.slice(0, max - 1).trim()}...`;
}

function normalizeImage(value: unknown) {
  if (!value || typeof value !== "object") return null;
  const obj = value as Record<string, unknown>;
  const url = typeof obj.url === "string" ? obj.url : "";
  if (!url) return null;
  return {
    url,
    alt: typeof obj.alt === "string" ? obj.alt : "",
  };
}

export async function GET(request: Request, { params }: { params: { slug: string } }) {
  try {
    const admin = getSupabaseAdminClient();
    const parsed = querySchema.parse(Object.fromEntries(new URL(request.url).searchParams.entries()));

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
      .select("id,slug,title,title_zh,type,body_markdown,body_markdown_zh,featured_image,images,videos,tcm_data,view_count,meta_title,meta_description,published_at,created_at,updated_at")
      .eq("slug", params.slug)
      .eq("status", "published")
      .limit(1);
    if (storeId) query = query.eq("store_id", storeId);
    if (parsed.type) query = query.eq("type", parsed.type);

    const { data, error } = await query.maybeSingle();
    if (error) throw error;
    if (!data) return ok({ error: "Content not found" }, { status: 404 });

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

    return ok({
      id: data.id,
      slug: data.slug,
      title: data.title,
      title_zh: data.title_zh,
      type: data.type,
      excerpt: excerptFromBody(data.body_markdown),
      body_markdown: data.body_markdown,
      body_markdown_zh: data.body_markdown_zh,
      tcm_data: data.tcm_data && typeof data.tcm_data === "object" ? data.tcm_data : {},
      view_count: data.view_count || 0,
      meta_title: data.meta_title || null,
      meta_description: data.meta_description || null,
      featured_image: normalizeImage(data.featured_image),
      images: Array.isArray(data.images) ? data.images : [],
      videos: Array.isArray(data.videos) ? data.videos : [],
      linked_products: linkedProducts,
      published_at: data.published_at || data.created_at,
      updated_at: data.updated_at,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
