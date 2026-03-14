import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { handleApiError } from "@/lib/utils/api";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    const admin = getSupabaseAdminClient();
    const { data: order, error: orderError } = await admin
      .from("orders")
      .select("id,order_number,status,payment_status,shipping_status,subtotal_cents,shipping_cents,tax_cents,total_cents,currency,created_at")
      .eq("id", params.id)
      .maybeSingle();
    if (orderError) throw orderError;
    if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

    const { data: items, error: itemError } = await admin
      .from("order_items")
      .select("id,product_id,quantity,unit_price_cents,products:product_id(id,slug,name,name_zh,images)")
      .eq("order_id", params.id);
    if (itemError) throw itemError;

    return NextResponse.json({
      ...order,
      items:
        items?.map((item) => {
          const product = Array.isArray(item.products) ? item.products[0] : item.products;
          return {
            id: item.id,
            product_id: item.product_id,
            quantity: item.quantity,
            unit_price_cents: item.unit_price_cents,
            product: {
              id: product?.id ?? null,
              slug: product?.slug ?? null,
              name: product?.name ?? "Unknown product",
              name_zh: product?.name_zh ?? null,
              image_url: product?.images?.[0]?.url ?? "",
            },
          };
        }) ?? [],
    });
  } catch (error) {
    return handleApiError(error);
  }
}
