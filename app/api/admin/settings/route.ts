import { z } from "zod";
import { handleApiError, ok } from "@/lib/utils/api";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

const updateSchema = z.object({
  store_slug: z.string().optional(),
  settings: z.record(z.string(), z.unknown()),
});

export const dynamic = "force-dynamic";

async function resolveStoreId(admin: ReturnType<typeof getSupabaseAdminClient>, storeSlug?: string) {
  const slug = storeSlug || process.env.NEXT_PUBLIC_STORE_SLUG || "pureherbhealth";
  const { data } = await admin.from("stores").select("id,slug,name,settings").eq("slug", slug).maybeSingle();
  return data;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get("store_slug") ?? undefined;
    const admin = getSupabaseAdminClient();
    const store = await resolveStoreId(admin, slug);
    if (!store) throw new Error("Store not found");
    return ok({ store_id: store.id, slug: store.slug, name: store.name, settings: store.settings ?? {} });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(request: Request) {
  try {
    const body = updateSchema.parse(await request.json());
    const admin = getSupabaseAdminClient();
    const store = await resolveStoreId(admin, body.store_slug);
    if (!store) throw new Error("Store not found");

    const { data, error } = await admin
      .from("stores")
      .update({ settings: { ...(store.settings as Record<string, unknown> ?? {}), ...body.settings } })
      .eq("id", store.id)
      .select("id,slug,name,settings")
      .single();
    if (error) throw error;
    return ok({ store_id: data.id, slug: data.slug, name: data.name, settings: data.settings ?? {} });
  } catch (error) {
    return handleApiError(error);
  }
}
