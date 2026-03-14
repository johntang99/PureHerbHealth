import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { upsertMediaAsset } from "@/lib/media/media-db";
import { getMediaBucket, sanitizePathPart } from "@/lib/media/storage";

export const dynamic = "force-dynamic";

function sanitizeFilename(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9.-]/g, "-").replace(/-+/g, "-") || `import-${Date.now()}`;
}

function extFromContentType(contentType: string) {
  const ct = contentType.toLowerCase();
  if (ct.includes("jpeg")) return ".jpg";
  if (ct.includes("png")) return ".png";
  if (ct.includes("webp")) return ".webp";
  if (ct.includes("gif")) return ".gif";
  if (ct.includes("avif")) return ".avif";
  return ".jpg";
}

function isAllowedSource(provider: string, host: string) {
  const h = host.toLowerCase();
  if (provider === "unsplash") return h.endsWith("images.unsplash.com");
  if (provider === "pexels") return h.endsWith("images.pexels.com");
  return false;
}

export async function POST(request: NextRequest) {
  try {
    const payload = (await request.json()) as {
      siteId?: string;
      storeSlug?: string;
      provider?: string;
      sourceUrl?: string;
      folder?: string;
      altText?: string;
    };

    const siteId = sanitizePathPart(String(payload.siteId ?? payload.storeSlug ?? "pureherbhealth"));
    const provider = String(payload.provider ?? "").toLowerCase();
    const sourceUrl = String(payload.sourceUrl ?? "");
    const folder = sanitizePathPart(String(payload.folder ?? "general")) || "general";
    const altText = String(payload.altText ?? "");

    if (!sourceUrl || !provider) {
      return NextResponse.json({ message: "provider and sourceUrl are required" }, { status: 400 });
    }
    if (!["unsplash", "pexels"].includes(provider)) {
      return NextResponse.json({ message: "Invalid provider" }, { status: 400 });
    }

    const parsedUrl = new URL(sourceUrl);
    if (parsedUrl.protocol !== "https:") {
      return NextResponse.json({ message: "Only https URLs are allowed" }, { status: 400 });
    }
    if (!isAllowedSource(provider, parsedUrl.hostname)) {
      return NextResponse.json({ message: "Source URL host is not allowed for this provider" }, { status: 400 });
    }

    const imgRes = await fetch(sourceUrl);
    if (!imgRes.ok) {
      return NextResponse.json({ message: `Failed to fetch source image (${imgRes.status})` }, { status: 502 });
    }
    const contentType = (imgRes.headers.get("content-type") ?? "").toLowerCase();
    if (!contentType.startsWith("image/")) {
      return NextResponse.json({ message: "Source file is not an image" }, { status: 400 });
    }

    const arrayBuffer = await imgRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const sourcePathname = parsedUrl.pathname.split("/").pop() ?? "";
    const sourceExt = sourcePathname.includes(".") ? `.${sourcePathname.split(".").pop()!.toLowerCase()}` : "";
    const ext = sourceExt || extFromContentType(contentType);
    const baseName = sourcePathname ? sourcePathname.replace(/\.[^.]+$/, "") : `${provider}-image`;
    const filename = `${Date.now()}-${sanitizeFilename(baseName)}${ext}`;
    const relativePath = `${folder}/${filename}`;
    const objectPath = `${siteId}/${relativePath}`;

    const bucket = getMediaBucket();
    const supabase = getSupabaseAdminClient();

    const { error: uploadError } = await supabase.storage.from(bucket).upload(objectPath, buffer, {
      contentType,
      cacheControl: "3600",
      upsert: false,
    });
    if (uploadError) {
      console.error("Provider import upload error:", uploadError);
      return NextResponse.json({ message: "Import upload failed" }, { status: 500 });
    }

    const { data } = supabase.storage.from(bucket).getPublicUrl(objectPath);
    const url = data.publicUrl;

    const mediaAssetId = await upsertMediaAsset({
      siteId,
      storeId: null,
      bucket,
      path: relativePath,
      url,
      mediaType: "image",
      mimeType: contentType,
      altText: altText || undefined,
    });

    return NextResponse.json({ id: mediaAssetId, url, path: relativePath, filename, provider });
  } catch (error) {
    console.error("Provider import error:", error);
    return NextResponse.json({ message: "Provider import failed" }, { status: 500 });
  }
}
