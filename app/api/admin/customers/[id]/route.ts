import { handleApiError, ok } from "@/lib/utils/api";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    const admin = getSupabaseAdminClient();

    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("id,auth_user_id,email,full_name,role,store_id,created_at,updated_at")
      .eq("id", params.id)
      .maybeSingle();
    if (profileError) throw profileError;
    if (!profile) return ok({ error: "Customer not found" }, { status: 404 });

    const { data: orders, error: ordersError } = await admin
      .from("orders")
      .select(
        "id,order_number,status,payment_status,shipping_status,total_cents,currency,created_at,shipped_at,delivered_at,tracking_number,store_id,stores:store_id(slug,name)",
      )
      .eq("profile_id", profile.id)
      .order("created_at", { ascending: false });
    if (ordersError) throw ordersError;

    // Also try matching by email for guest/unlinked orders
    let emailOrders: typeof orders = [];
    if (profile.email) {
      const { data: byEmail } = await admin
        .from("orders")
        .select(
          "id,order_number,status,payment_status,shipping_status,total_cents,currency,created_at,shipped_at,delivered_at,tracking_number,store_id,stores:store_id(slug,name)",
        )
        .eq("customer_email", profile.email)
        .order("created_at", { ascending: false });
      emailOrders = byEmail ?? [];
    }

    // Merge, dedupe by id
    const seen = new Set<string>();
    const allOrders = [...(orders ?? []), ...emailOrders].filter((o) => {
      if (seen.has(o.id)) return false;
      seen.add(o.id);
      return true;
    });

    const totalSpentCents = allOrders
      .filter((o) => !["cancelled", "refunded"].includes(o.status))
      .reduce((sum, o) => sum + (o.total_cents ?? 0), 0);

    return ok({
      customer: {
        id: profile.id,
        auth_user_id: profile.auth_user_id,
        email: profile.email,
        full_name: profile.full_name,
        role: profile.role,
        store_id: profile.store_id,
        created_at: profile.created_at,
        updated_at: profile.updated_at,
      },
      orders: allOrders.map((o) => {
        const store = Array.isArray(o.stores) ? o.stores[0] : o.stores;
        return {
          id: o.id,
          order_number: o.order_number,
          status: o.status,
          payment_status: o.payment_status,
          shipping_status: o.shipping_status,
          total: Number(((o.total_cents ?? 0) / 100).toFixed(2)),
          currency: o.currency ?? "USD",
          created_at: o.created_at,
          shipped_at: o.shipped_at,
          delivered_at: o.delivered_at,
          tracking_number: o.tracking_number,
          store_name: store?.name ?? "",
          store_slug: store?.slug ?? "",
        };
      }),
      stats: {
        order_count: allOrders.length,
        total_spent: Number((totalSpentCents / 100).toFixed(2)),
        last_order_at: allOrders[0]?.created_at ?? null,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const body = (await request.json()) as { full_name?: string; email?: string };
    const admin = getSupabaseAdminClient();
    const updates: Record<string, string> = {};
    if (body.full_name !== undefined) updates.full_name = body.full_name;
    if (body.email !== undefined) updates.email = body.email;
    if (Object.keys(updates).length === 0) return ok({ id: params.id });

    const { error } = await admin.from("profiles").update(updates).eq("id", params.id);
    if (error) throw error;
    return ok({ id: params.id });
  } catch (error) {
    return handleApiError(error);
  }
}
