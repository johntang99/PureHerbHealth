import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export function getMediaBucket() {
  return process.env.SUPABASE_STORAGE_BUCKET || process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET || "media";
}

export function sanitizePathPart(value: string) {
  const cleaned = value.replace(/[^a-zA-Z0-9/_-]/g, "").replace(/^\/+|\/+$/g, "");
  if (!cleaned) return "";
  const normalized = cleaned.replace(/\/+/g, "/");
  if (normalized.startsWith("..") || normalized.includes("../")) return "";
  return normalized;
}

export function inferMediaType(mimeType: string): "image" | "video" | "file" {
  const lower = mimeType.toLowerCase();
  if (lower.startsWith("image/")) return "image";
  if (lower.startsWith("video/")) return "video";
  return "file";
}

export async function uploadToMediaBucket(input: {
  siteId: string;
  folder: string;
  filename: string;
  buffer: Buffer;
  contentType: string;
}) {
  const bucket = getMediaBucket();
  const supabase = getSupabaseAdminClient();
  const objectPath = `${input.siteId}/${input.folder ? `${input.folder}/` : ""}${input.filename}`;

  const { error } = await supabase.storage.from(bucket).upload(objectPath, input.buffer, {
    contentType: input.contentType,
    cacheControl: "3600",
    upsert: true,
  });
  if (error) throw error;

  const { data } = supabase.storage.from(bucket).getPublicUrl(objectPath);
  return {
    bucket,
    objectPath,
    relativePath: objectPath.slice(input.siteId.length + 1),
    publicUrl: data.publicUrl,
  };
}

export async function deleteFromMediaBucket(siteId: string, relativePath: string) {
  const bucket = getMediaBucket();
  const supabase = getSupabaseAdminClient();
  const objectPath = `${siteId}/${relativePath}`;
  const { error } = await supabase.storage.from(bucket).remove([objectPath]);
  if (error) throw error;
}
