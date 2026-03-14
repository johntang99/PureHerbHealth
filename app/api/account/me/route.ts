import { handleApiError, ok, unauthorized } from "@/lib/utils/api";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getAuthenticatedUserAndProfile } from "@/lib/auth/profile";

export async function GET() {
  try {
    const session = await getAuthenticatedUserAndProfile();
    if (!session) return unauthorized();
    const { user, profile } = session;
    const admin = getSupabaseAdminClient();

    const { count: ordersCount, error: ordersCountError } = await admin
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("profile_id", profile.id);
    if (ordersCountError) throw ordersCountError;

    const { data: latestOrders, error: latestOrdersError } = await admin
      .from("orders")
      .select("id,order_number,status,payment_status,shipping_status,total_cents,currency,created_at")
      .eq("profile_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(5);
    if (latestOrdersError) throw latestOrdersError;

    return ok({
      user: {
        id: user.id,
        email: user.email ?? null,
      },
      profile,
      stats: {
        orders_count: ordersCount ?? 0,
      },
      recent_orders: latestOrders ?? [],
    });
  } catch (error) {
    return handleApiError(error);
  }
}
