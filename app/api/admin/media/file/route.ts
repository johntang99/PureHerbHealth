import { NextResponse } from "next/server";
import { getStoreContextFromHeaders } from "@/lib/store/context";
import { deleteMediaAsset } from "@/lib/media/media-db";
import { deleteFromMediaBucket, sanitizePathPart } from "@/lib/media/storage";

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const path = sanitizePathPart(searchParams.get("path") ?? "");
    const fromQuery = searchParams.get("siteId");
    const fallback = getStoreContextFromHeaders().storeSlug;
    const siteId = sanitizePathPart(fromQuery || fallback || "pureherbhealth");

    if (!path) {
      return NextResponse.json({ message: "path is required" }, { status: 400 });
    }

    await deleteFromMediaBucket(siteId, path);
    await deleteMediaAsset(siteId, path);
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Delete failed";
    return NextResponse.json({ message }, { status: 500 });
  }
}
