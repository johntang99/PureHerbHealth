import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { handleApiError } from "@/lib/utils/api";
import { loadCartDetails } from "@/lib/cart/service";

export async function DELETE(_: Request, { params }: { params: { item_id: string } }) {
  try {
    const admin = getSupabaseAdminClient();
    const { data: item, error: itemError } = await admin.from("cart_items").select("cart_id").eq("id", params.item_id).single();
    if (itemError) throw itemError;

    const { error } = await admin.from("cart_items").delete().eq("id", params.item_id);
    if (error) throw error;

    const details = await loadCartDetails(admin, item.cart_id);
    return NextResponse.json({
      items: details.items,
      subtotal: Number((details.subtotal_cents / 100).toFixed(2)),
      item_count: details.item_count,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
