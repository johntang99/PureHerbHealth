import { ok } from "@/lib/utils/api";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const period = url.searchParams.get("period") ?? "30d";
  const storeId = url.searchParams.get("store_id") ?? "all";

  const days = period === "7d" ? 7 : period === "90d" ? 90 : period === "12mo" ? 365 : 30;
  const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const admin = getSupabaseAdminClient();
  let query = admin
    .from("orders")
    .select("id,store_id,total_cents,created_at,status,payment_status")
    .gte("created_at", from)
    .in("status", ["confirmed", "processing", "shipped", "delivered", "refunded"]);
  if (storeId !== "all") query = query.eq("store_id", storeId);
  const { data: orders, error } = await query.order("created_at", { ascending: true });
  if (error) return ok({ error: error.message }, { status: 500 });

  const rows = orders || [];
  const totalRevenueCents = rows.reduce((sum, row) => sum + (row.total_cents || 0), 0);
  const totalOrders = rows.length;
  const avgOrderValueCents = totalOrders > 0 ? Math.round(totalRevenueCents / totalOrders) : 0;

  const perDay = new Map<string, { revenue: number; orders: number }>();
  for (const row of rows) {
    const key = new Date(row.created_at).toISOString().slice(0, 10);
    const existing = perDay.get(key) || { revenue: 0, orders: 0 };
    existing.revenue += row.total_cents || 0;
    existing.orders += 1;
    perDay.set(key, existing);
  }
  const chartData = Array.from(perDay.entries()).map(([date, value]) => ({
    date,
    revenue: Number((value.revenue / 100).toFixed(2)),
    orders: value.orders,
    platform_revenue: 0,
  }));

  const storeComparison =
    storeId === "all"
      ? (() => {
          const byStore = new Map<string, { revenueCents: number; orders: number }>();
          for (const row of rows) {
            const key = row.store_id;
            const current = byStore.get(key) || { revenueCents: 0, orders: 0 };
            current.revenueCents += row.total_cents || 0;
            current.orders += 1;
            byStore.set(key, current);
          }
          return Array.from(byStore.entries()).map(([id, value]) => ({
            store_id: id,
            store_name: id,
            revenue: Number((value.revenueCents / 100).toFixed(2)),
            orders: value.orders,
            avg_order_value: value.orders ? Number(((value.revenueCents / value.orders) / 100).toFixed(2)) : 0,
            conversion_rate: 0,
          }));
        })()
      : undefined;

  return ok({
    store_id: storeId,
    period,
    summary: {
      total_revenue: Number((totalRevenueCents / 100).toFixed(2)),
      total_orders: totalOrders,
      total_platform_revenue: 0,
      avg_order_value: Number((avgOrderValueCents / 100).toFixed(2)),
      unique_customers: 0,
      conversion_rate: 0,
    },
    chart_data: chartData,
    top_products: [],
    store_comparison: storeComparison,
  });
}
