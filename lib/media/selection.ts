import { getSupabaseAdminClient } from "@/lib/supabase/admin";

type MediaRow = {
  id: string;
  site_id: string;
  media_type: "image" | "video" | "file";
  url: string;
  alt_text: string | null;
};

export async function fetchMediaAssetsByIds(siteId: string, ids: string[]) {
  if (ids.length === 0) return [] as MediaRow[];
  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from("media_assets")
    .select("id, site_id, media_type, url, alt_text")
    .eq("site_id", siteId)
    .in("id", ids);

  if (error) throw error;
  const rows = (data ?? []) as MediaRow[];
  if (rows.length !== new Set(ids).size) {
    throw new Error("One or more media asset IDs are invalid for this site.");
  }
  const orderIndex = new Map(ids.map((id, index) => [id, index]));
  return rows.sort((a, b) => (orderIndex.get(a.id) ?? 0) - (orderIndex.get(b.id) ?? 0));
}

export function toImageObjects(rows: MediaRow[]) {
  return rows
    .filter((row) => row.media_type === "image")
    .map((row, idx) => ({
      media_asset_id: row.id,
      url: row.url,
      alt: row.alt_text ?? "",
      position: idx,
      is_primary: idx === 0,
    }));
}

export function toVideoObjects(rows: MediaRow[]) {
  return rows
    .filter((row) => row.media_type === "video")
    .map((row) => ({
      media_asset_id: row.id,
      url: row.url,
      title: "",
    }));
}
