import { ok } from "@/lib/utils/api";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const storeId = url.searchParams.get("store_id") || "all";
  const admin = getSupabaseAdminClient();

  let orderQuery = admin
    .from("orders")
    .select("id,total_cents,status,created_at")
    .in("status", ["pending", "confirmed", "processing", "shipped", "delivered"]);
  if (storeId !== "all") orderQuery = orderQuery.eq("store_id", storeId);
  const { data: orders, error: orderError } = await orderQuery;
  if (orderError) return ok({ error: orderError.message }, { status: 500 });

  const totalRevenueCents = (orders || []).reduce((sum, order) => sum + (order.total_cents || 0), 0);

  const items: Array<{ product_id: string; quantity: number; products?: unknown }> = [];
  if (storeId === "all") {
    const { data } = await admin.from("order_items").select("product_id,quantity,products:product_id(name)");
    if (data) items.push(...(data as Array<{ product_id: string; quantity: number; products?: unknown }>));
  } else {
    const { data } = await admin
      .from("order_items")
      .select("product_id,quantity,order:order_id!inner(store_id),products:product_id(name)")
      .eq("order.store_id", storeId);
    if (data) items.push(...(data as Array<{ product_id: string; quantity: number; products?: unknown }>));
  }

  const rank = new Map<string, { name: string; qty: number }>();
  for (const item of items) {
    const product = Array.isArray(item.products) ? item.products[0] : item.products;
    const key = item.product_id;
    const current = rank.get(key) || { name: product?.name || "Unknown", qty: 0 };
    current.qty += Number(item.quantity || 0);
    rank.set(key, current);
  }
  const topProducts = Array.from(rank.entries())
    .map(([id, value]) => ({ product_id: id, name: value.name, quantity: value.qty }))
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 5);

  return ok({
    store_id: storeId,
    revenue_cents: totalRevenueCents,
    orders: (orders || []).length,
    top_products: topProducts,
  });
}
