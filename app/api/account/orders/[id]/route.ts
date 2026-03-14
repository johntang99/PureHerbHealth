import { handleApiError, ok, unauthorized } from "@/lib/utils/api";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getAuthenticatedUserAndProfile } from "@/lib/auth/profile";

export async function GET(_request: Request, context: { params: { id: string } }) {
  try {
    const session = await getAuthenticatedUserAndProfile();
    if (!session) return unauthorized();
    const { profile } = session;
    const admin = getSupabaseAdminClient();

    const { data: order, error: orderError } = await admin
      .from("orders")
      .select("id,order_number,status,payment_status,shipping_status,subtotal_cents,shipping_cents,tax_cents,discount_cents,total_cents,currency,created_at,updated_at,customer_email,customer_name,shipping_address,promo_code")
      .eq("id", context.params.id)
      .eq("profile_id", profile.id)
      .maybeSingle();
    if (orderError) throw orderError;
    if (!order) return ok({ error: "Order not found" }, { status: 404 });

    const { data: items, error: itemsError } = await admin
      .from("order_items")
      .select("id,quantity,unit_price_cents,product:product_id(id,slug,name,name_zh,images)")
      .eq("order_id", order.id);
    if (itemsError) throw itemsError;

    return ok({
      ...order,
      items:
        items?.map((item) => {
          const product = Array.isArray(item.product) ? item.product[0] : item.product;
          return {
            id: item.id,
            quantity: item.quantity,
            unit_price_cents: item.unit_price_cents,
            product: {
              id: product?.id ?? null,
              slug: product?.slug ?? null,
              name: product?.name ?? null,
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
