import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthenticatedUserAndProfile } from "@/lib/auth/profile";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getStoreContextFromHeaders } from "@/lib/store/context";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getAuthenticatedUserAndProfile();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from("wishlists")
    .select(
      "id, product_id, created_at, product:product_id(id, slug, name, name_zh, short_description, short_description_zh, price_cents, images)"
    )
    .eq("profile_id", session.profile.id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ items: data ?? [] });
}

const addSchema = z.object({ product_id: z.string().uuid() });

export async function POST(request: Request) {
  const session = await getAuthenticatedUserAndProfile();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { storeId } = getStoreContextFromHeaders();
  const body = await request.json().catch(() => ({}));
  const parsed = addSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "product_id required" }, { status: 400 });

  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from("wishlists")
    .upsert(
      {
        profile_id: session.profile.id,
        product_id: parsed.data.product_id,
        store_id: storeId,
      },
      { onConflict: "profile_id,product_id" }
    )
    .select("id, product_id, created_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ item: data });
}
