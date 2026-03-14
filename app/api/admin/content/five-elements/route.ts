import { z } from "zod";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { handleApiError, ok } from "@/lib/utils/api";

const elementIdSchema = z.enum(["wood", "fire", "earth", "metal", "water"]);

const itemSchema = z.object({
  element_id: elementIdSchema,
  label: z.string().min(1),
  emoji: z.string().min(1),
  color: z.string().min(1),
  season: z.string().min(1),
  organs: z.string().min(1),
  summary: z.string().min(1),
  generates_element_id: elementIdSchema,
  controls_element_id: elementIdSchema,
  display_order: z.number().int().min(0),
});

const bodySchema = z.object({
  store_slug: z.string().optional(),
  store_id: z.string().uuid().optional(),
  items: z.array(itemSchema).min(5),
});

async function resolveStoreId(admin: ReturnType<typeof getSupabaseAdminClient>, input: { store_slug?: string | null; store_id?: string | null }) {
  if (input.store_id) return input.store_id;
  const storeSlug = input.store_slug || process.env.NEXT_PUBLIC_STORE_SLUG || "pureherbhealth";
  const { data: store, error: storeError } = await admin.from("stores").select("id").eq("slug", storeSlug).maybeSingle();
  if (storeError) throw storeError;
  return store?.id ?? null;
}

export async function GET(request: Request) {
  try {
    const searchParams = new URL(request.url).searchParams;
    const admin = getSupabaseAdminClient();
    const storeId = await resolveStoreId(admin, {
      store_slug: searchParams.get("store_slug"),
      store_id: searchParams.get("store_id"),
    });
    if (!storeId) return ok({ items: [] });

    const { data, error } = await admin
      .from("five_elements_config")
      .select("element_id,label,emoji,color,season,organs,summary,generates_element_id,controls_element_id,display_order")
      .eq("store_id", storeId)
      .order("display_order", { ascending: true });
    if (error) throw error;
    return ok({ items: data || [] });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(request: Request) {
  try {
    const body = bodySchema.parse(await request.json());
    const admin = getSupabaseAdminClient();
    const storeId = await resolveStoreId(admin, { store_slug: body.store_slug, store_id: body.store_id });
    if (!storeId) throw new Error("Store not found.");

    const rows = body.items.map((item) => ({
      store_id: storeId,
      ...item,
      updated_at: new Date().toISOString(),
    }));
    const { error } = await admin.from("five_elements_config").upsert(rows, { onConflict: "store_id,element_id" });
    if (error) throw error;
    return ok({ success: true, updated: rows.length });
  } catch (error) {
    return handleApiError(error);
  }
}
