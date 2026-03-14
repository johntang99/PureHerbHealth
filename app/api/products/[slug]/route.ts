import { z } from "zod";
import { getLocalized } from "@/lib/i18n/get-localized";
import { badRequest, handleApiError, ok } from "@/lib/utils/api";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

const querySchema = z.object({
  store_slug: z.string().optional(),
  locale: z.enum(["en", "zh"]).default("en"),
});

type ProductApiRow = {
  id: string;
  slug: string;
  name: string;
  name_zh: string | null;
  short_description: string | null;
  short_description_zh: string | null;
  description: string | null;
  description_zh: string | null;
  description_markdown?: string | null;
  description_markdown_zh?: string | null;
  tcm_guide_markdown?: string | null;
  tcm_guide_markdown_zh?: string | null;
  ingredients_markdown?: string | null;
  ingredients_markdown_zh?: string | null;
  usage_markdown?: string | null;
  usage_markdown_zh?: string | null;
  price_cents: number;
  images: Array<{ url?: string; alt?: string }> | null;
  videos: Array<{ url?: string; title?: string }> | null;
  category_id: string | null;
  categories?: { slug?: string; name?: string; name_zh?: string }[] | { slug?: string; name?: string; name_zh?: string } | null;
};

export async function GET(request: Request, { params }: { params: { slug: string } }) {
  try {
    const { searchParams } = new URL(request.url);
    const parsed = querySchema.parse(Object.fromEntries(searchParams.entries()));
    const admin = getSupabaseAdminClient();

    const withMarkdownSelect =
      "id,slug,name,name_zh,short_description,short_description_zh,description,description_zh,description_markdown,description_markdown_zh,tcm_guide_markdown,tcm_guide_markdown_zh,ingredients_markdown,ingredients_markdown_zh,usage_markdown,usage_markdown_zh,price_cents,images,videos,category_id,categories:category_id(slug,name,name_zh)";
    const legacySelect =
      "id,slug,name,name_zh,short_description,short_description_zh,description,description_zh,price_cents,images,videos,category_id,categories:category_id(slug,name,name_zh)";

    let product: ProductApiRow | null = null;
    const withMarkdown = await admin.from("products").select(withMarkdownSelect).eq("slug", params.slug).eq("enabled", true).maybeSingle();
    if (withMarkdown.error && withMarkdown.error.message.toLowerCase().includes("description_markdown")) {
      const legacy = await admin.from("products").select(legacySelect).eq("slug", params.slug).eq("enabled", true).maybeSingle();
      if (legacy.error) throw legacy.error;
      product = (legacy.data ?? null) as ProductApiRow | null;
    } else {
      if (withMarkdown.error) throw withMarkdown.error;
      product = (withMarkdown.data ?? null) as ProductApiRow | null;
    }
    if (!product) return badRequest("Product not found");
    const productCategory = Array.isArray(product.categories)
      ? product.categories[0]
      : (product.categories as { slug?: string; name?: string; name_zh?: string } | null);

    let storePricing: { store_price?: number; practitioner_note?: string } = {};
    if (parsed.store_slug) {
      const { data: store } = await admin.from("stores").select("id").eq("slug", parsed.store_slug).maybeSingle();
      if (store?.id) {
        const { data: sp } = await admin
          .from("store_products")
          .select("price_override_cents")
          .eq("store_id", store.id)
          .eq("product_id", product.id)
          .maybeSingle();
        if (sp?.price_override_cents) {
          storePricing = { store_price: Number((sp.price_override_cents / 100).toFixed(2)) };
        }
      }
    }

    // Fetch real product variants
    const { data: variantRows } = await admin
      .from("product_variants")
      .select("id,name,name_zh,price_cents,compare_at_price_cents,sku,sort_order,is_default")
      .eq("product_id", product.id)
      .order("sort_order", { ascending: true });

    const realVariants = (variantRows ?? []).map((v) => ({
      id: v.id as string,
      name: (parsed.locale === "zh" && v.name_zh ? v.name_zh : v.name) as string,
      sku: (v.sku ?? `SKU-${product.slug}`) as string,
      price: Number(((v.price_cents as number) / 100).toFixed(2)),
      compare_at_price: v.compare_at_price_cents ? Number(((v.compare_at_price_cents as number) / 100).toFixed(2)) : null,
      sale_price: null,
      stock_quantity: 100,
      is_default: v.is_default as boolean,
    }));

    // Fall back to base product if no variants defined
    const variants = realVariants.length > 0
      ? realVariants
      : [{
          id: `${product.id}-default`,
          name: parsed.locale === "zh" ? "标准装" : "Standard",
          sku: `SKU-${product.slug}`,
          price: Number((product.price_cents / 100).toFixed(2)),
          compare_at_price: null,
          sale_price: null,
          stock_quantity: 100,
          is_default: true,
        }];

    const relatedQuery = await admin
      .from("products")
      .select("id,slug,name,name_zh,short_description,short_description_zh,price_cents,images,category_id,categories:category_id(slug,name,name_zh)")
      .eq("enabled", true)
      .eq("category_id", product.category_id)
      .neq("id", product.id)
      .limit(4);

    const relatedProducts = (relatedQuery.data ?? []).map((item) => ({
      id: item.id,
      slug: item.slug,
      name: getLocalized(item as Record<string, unknown>, "name", parsed.locale),
      short_description: getLocalized(item as Record<string, unknown>, "short_description", parsed.locale),
      price: Number((item.price_cents / 100).toFixed(2)),
      primary_image: {
        url: item.images?.[0]?.url ?? "",
        alt: item.images?.[0]?.alt ?? "",
      },
    }));

    const { data: reverseLinks } = await admin
      .from("content_products")
      .select("content_id,content:content_id(id,slug,title,type,status,created_at)")
      .eq("product_id", product.id);
    const relatedContent = (reverseLinks || [])
      .map((link) => {
        const content = Array.isArray(link.content) ? link.content[0] : link.content;
        if (!content || content.status !== "published") return null;
        return {
          id: content.id,
          slug: content.slug,
          title: content.title,
          type: content.type,
          published_at: content.created_at,
        };
      })
      .filter((item): item is { id: string; slug: string; title: string; type: string; published_at: string } => Boolean(item));

    return ok({
      id: product.id,
      slug: product.slug,
      name: getLocalized(product as Record<string, unknown>, "name", parsed.locale),
      short_description: getLocalized(product as Record<string, unknown>, "short_description", parsed.locale),
      long_description:
        getLocalized(product as Record<string, unknown>, "description", parsed.locale) ||
        (parsed.locale === "zh" ? "暂无详细介绍。" : "Detailed information is coming soon."),
      markdown_sections: {
        description:
          ((parsed.locale === "zh" ? product.description_markdown_zh : product.description_markdown) as string | null) ||
          (getLocalized(product as Record<string, unknown>, "description", parsed.locale) || ""),
        tcm_guide:
          ((parsed.locale === "zh" ? product.tcm_guide_markdown_zh : product.tcm_guide_markdown) as string | null) ||
          "## TCM Guide\n\n- Consult practitioner guidance for constitution-fit usage.",
        ingredients:
          ((parsed.locale === "zh" ? product.ingredients_markdown_zh : product.ingredients_markdown) as string | null) ||
          "## Ingredients\n\n- See product label for complete ingredient information.",
        usage:
          ((parsed.locale === "zh" ? product.usage_markdown_zh : product.usage_markdown) as string | null) ||
          "## Usage\n\n- Follow label directions or practitioner instructions.",
      },
      price: Number((product.price_cents / 100).toFixed(2)),
      sale_price: null,
      images: product.images ?? [],
      variants,
      tcm_name_chinese: null,
      tcm_name_pinyin: null,
      tcm_nature: null,
      tcm_flavors: [],
      tcm_meridians: [],
      tcm_elements: [],
      tcm_actions: [],
      tcm_indications: [],
      tcm_contraindications: [],
      tcm_dosage: null,
      form: null,
      serving_size: null,
      servings_per_container: null,
      ingredients: null,
      origin: null,
      certifications: [],
      reviews: {
        avg_rating: 4.8,
        count: 0,
        distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
        recent: [],
      },
      related_products: relatedProducts,
      related_content: relatedContent,
      category: {
        slug: productCategory?.slug ?? "uncategorized",
        name: parsed.locale === "zh" && productCategory?.name_zh ? productCategory.name_zh : productCategory?.name ?? "Uncategorized",
      },
      seo_title: `${getLocalized(product as Record<string, unknown>, "name", parsed.locale)} | pureHerbHealth`,
      seo_description: getLocalized(product as Record<string, unknown>, "short_description", parsed.locale),
      tcm_disclaimer:
        parsed.locale === "zh"
          ? "本产品声明未经美国 FDA 评估，不用于诊断、治疗或预防任何疾病。"
          : "These statements have not been evaluated by the FDA. Not intended to diagnose, treat, cure, or prevent any disease.",
      ...storePricing,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
