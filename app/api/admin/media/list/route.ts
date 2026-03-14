import { z } from "zod";
import { handleApiError, ok } from "@/lib/utils/api";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const querySchema = z.object({
  store_slug: z.string().optional(),
  media_type: z.enum(["image", "video", "file"]).optional(),
  path_prefix: z.string().optional(),
  limit: z.coerce.number().int().positive().max(500).default(200),
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = querySchema.parse(Object.fromEntries(searchParams.entries()));
    const admin = getSupabaseAdminClient();

    const storeSlug = query.store_slug || process.env.NEXT_PUBLIC_STORE_SLUG || "pureherbhealth";
    const { data: store } = await admin.from("stores").select("id,slug").eq("slug", storeSlug).maybeSingle();
    const siteId = store?.slug || storeSlug;

    let requestBuilder = admin
      .from("media_assets")
      .select("id,site_id,path,url,media_type,mime_type,alt_text,created_at")
      .eq("site_id", siteId)
      .order("created_at", { ascending: false })
      .limit(query.limit);

    if (query.media_type) {
      requestBuilder = requestBuilder.eq("media_type", query.media_type);
    }

    if (query.path_prefix) {
      requestBuilder = requestBuilder.like("path", `${query.path_prefix}%`);
    }

    const { data, error } = await requestBuilder;
    if (error) throw error;

    return ok({ items: data ?? [], store_slug: storeSlug, site_id: siteId });
  } catch (error) {
    return handleApiError(error);
  }
}
