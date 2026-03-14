import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export type MediaAsset = {
  id: string;
  site_id: string;
  path: string;
  url: string;
  media_type: "image" | "video" | "file";
  mime_type: string | null;
  alt_text: string | null;
  created_at: string;
};

export async function upsertMediaAsset(input: {
  siteId: string;
  storeId?: string | null;
  bucket: string;
  path: string;
  url: string;
  mediaType: "image" | "video" | "file";
  mimeType?: string;
  altText?: string;
}) {
  const admin = getSupabaseAdminClient();
  const payload = {
    site_id: input.siteId,
    store_id: input.storeId ?? null,
    bucket: input.bucket,
    path: input.path,
    url: input.url,
    media_type: input.mediaType,
    mime_type: input.mimeType ?? null,
    alt_text: input.altText ?? null,
  };
  const { data, error } = await admin.from("media_assets").upsert(payload, { onConflict: "site_id,path" }).select("id").maybeSingle();

  if (error) throw error;
  if (data?.id) return data.id as string;

  // Fallback for PostgREST configurations that don't return rows on upsert.
  const { data: existing, error: selectError } = await admin
    .from("media_assets")
    .select("id")
    .eq("site_id", input.siteId)
    .eq("path", input.path)
    .maybeSingle();
  if (selectError) throw selectError;
  if (!existing?.id) throw new Error("Media asset could not be resolved after upsert.");
  return existing.id as string;
}

export async function listMediaAssets(siteId: string) {
  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from("media_assets")
    .select("id, site_id, path, url, media_type, mime_type, alt_text, created_at")
    .eq("site_id", siteId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as MediaAsset[];
}

export async function deleteMediaAsset(siteId: string, path: string) {
  const admin = getSupabaseAdminClient();
  const { error } = await admin.from("media_assets").delete().eq("site_id", siteId).eq("path", path);
  if (error) throw error;
}
