import { NextResponse } from "next/server";
import { getAuthenticatedUserAndProfile } from "@/lib/auth/profile";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function DELETE(
  _req: Request,
  { params }: { params: { productId: string } }
) {
  const session = await getAuthenticatedUserAndProfile();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = getSupabaseAdminClient();
  const { error } = await admin
    .from("wishlists")
    .delete()
    .eq("profile_id", session.profile.id)
    .eq("product_id", params.productId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
