import { NextResponse } from "next/server";
import { getStoreContextFromHeaders } from "@/lib/store/context";
import { upsertMediaAsset } from "@/lib/media/media-db";
import { inferMediaType, sanitizePathPart, uploadToMediaBucket } from "@/lib/media/storage";

function sanitizeFilename(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9.-]/g, "-")
    .replace(/-+/g, "-");
}

function asUuidOrNull(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
    ? value
    : null;
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const folderInput = String(formData.get("folder") ?? "general");
    const siteIdInput = String(formData.get("siteId") ?? "");
    const altText = String(formData.get("altText") ?? "");
    const { storeId, storeSlug } = getStoreContextFromHeaders();
    const siteId = sanitizePathPart(siteIdInput || storeSlug || "pureherbhealth");

    if (!(file instanceof File)) {
      return NextResponse.json({ message: "file is required" }, { status: 400 });
    }

    const folder = sanitizePathPart(folderInput);
    const safeName = sanitizeFilename(file.name) || `upload-${Date.now()}`;
    const filename = `${Date.now()}-${safeName}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const uploaded = await uploadToMediaBucket({
      siteId,
      folder,
      filename,
      buffer,
      contentType: file.type || "application/octet-stream",
    });

    const mediaAssetId = await upsertMediaAsset({
      siteId,
      storeId: asUuidOrNull(storeId),
      bucket: uploaded.bucket,
      path: uploaded.relativePath,
      url: uploaded.publicUrl,
      mediaType: inferMediaType(file.type || ""),
      mimeType: file.type || undefined,
      altText: altText || undefined,
    });

    return NextResponse.json({
      id: mediaAssetId,
      url: uploaded.publicUrl,
      path: uploaded.relativePath,
      filename,
      mediaType: inferMediaType(file.type || ""),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload failed";
    return NextResponse.json({ message }, { status: 500 });
  }
}
