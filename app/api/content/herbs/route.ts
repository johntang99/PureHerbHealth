import { ok } from "@/lib/utils/api";
import { z } from "zod";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { handleApiError } from "@/lib/utils/api";

const schema = z.object({
  store_slug: z.string().optional(),
  search: z.string().optional(),
  letter: z.string().optional(),
  nature: z.string().optional(),
  element: z.string().optional(),
  meridian: z.string().optional(),
  category: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  per_page: z.coerce.number().int().positive().max(60).default(24),
});

function normalizeImage(value: unknown) {
  if (!value || typeof value !== "object") return null;
  const obj = value as Record<string, unknown>;
  const url = typeof obj.url === "string" ? obj.url : "";
  if (!url) return null;
  return { url, alt: typeof obj.alt === "string" ? obj.alt : "" };
}

export async function GET(request: Request) {
  try {
    const parsed = schema.parse(Object.fromEntries(new URL(request.url).searchParams.entries()));
    const admin = getSupabaseAdminClient();
    const from = (parsed.page - 1) * parsed.per_page;
    const to = from + parsed.per_page - 1;

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
      .select("id,slug,title,featured_image,tcm_data,created_at", { count: "exact" })
      .eq("status", "published")
      .eq("type", "herb_profile")
      .order("title", { ascending: true })
      .range(from, to);
    if (storeId) query = query.eq("store_id", storeId);
    if (parsed.search) query = query.ilike("title", `%${parsed.search}%`);
    if (parsed.letter) query = query.ilike("title", `${parsed.letter}%`);
    if (parsed.nature) query = query.contains("tcm_data", { nature: parsed.nature });
    if (parsed.category) query = query.contains("tcm_data", { category: parsed.category });
    if (parsed.element) query = query.contains("tcm_data", { elements: [parsed.element] });
    if (parsed.meridian) query = query.contains("tcm_data", { meridians: [parsed.meridian] });

    const { data: rows, count, error } = await query;
    if (error) throw error;

    let allQuery = admin.from("content").select("title,tcm_data").eq("status", "published").eq("type", "herb_profile");
    if (storeId) allQuery = allQuery.eq("store_id", storeId);
    const { data: allRows, error: allError } = await allQuery;
    if (allError) throw allError;

    const alphabetMap = new Map<string, number>();
    const natures = new Map();
    const elements = new Map();
    const meridians = new Map();
    const categories = new Map();
    for (const row of allRows || []) {
      const letter = (row.title || "").slice(0, 1).toUpperCase();
      if (!letter) continue;
      alphabetMap.set(letter, (alphabetMap.get(letter) || 0) + 1);
      const tcmData = row.tcm_data && typeof row.tcm_data === "object" ? row.tcm_data : {};
      const nature = typeof tcmData.nature === "string" ? tcmData.nature : null;
      if (nature) natures.set(nature, (natures.get(nature) || 0) + 1);
      const category = typeof tcmData.category === "string" ? tcmData.category : null;
      if (category) categories.set(category, (categories.get(category) || 0) + 1);
      for (const element of Array.isArray(tcmData.elements) ? tcmData.elements : []) {
        if (typeof element === "string") elements.set(element, (elements.get(element) || 0) + 1);
      }
      for (const meridian of Array.isArray(tcmData.meridians) ? tcmData.meridians : []) {
        if (typeof meridian === "string") meridians.set(meridian, (meridians.get(meridian) || 0) + 1);
      }
    }

    return ok({
      herbs: (rows || []).map((row) => ({
        ...(row.tcm_data && typeof row.tcm_data === "object" ? row.tcm_data : {}),
        id: row.id,
        slug: row.slug,
        title: row.title,
        chinese_name: row.tcm_data?.chinese_name || "",
        pinyin: row.tcm_data?.pinyin || "",
        featured_image: normalizeImage(row.featured_image),
        nature: row.tcm_data?.nature || "neutral",
        elements: Array.isArray(row.tcm_data?.elements) ? row.tcm_data.elements : [],
        meridians: Array.isArray(row.tcm_data?.meridians) ? row.tcm_data.meridians : [],
        category: row.tcm_data?.category || "general",
      })),
      alphabet: Array.from(alphabetMap.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([letter, value]) => ({ letter, count: value })),
      filters: {
        natures: Array.from(natures.entries()).map(([value, count]) => ({ value, count })),
        elements: Array.from(elements.entries()).map(([value, count]) => ({ value, count })),
        meridians: Array.from(meridians.entries()).map(([value, count]) => ({ value, count })),
        categories: Array.from(categories.entries()).map(([value, count]) => ({ value, label: value.replace(/-/g, " "), count })),
      },
      pagination: {
        page: parsed.page,
        per_page: parsed.per_page,
        total: count || 0,
        total_pages: Math.max(1, Math.ceil((count || 0) / parsed.per_page)),
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
