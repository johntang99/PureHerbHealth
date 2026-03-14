import { NextResponse } from "next/server";
import { getAuthenticatedUserAndProfile } from "@/lib/auth/profile";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

// Only these statuses can be cancelled by the customer
const CANCELLABLE_STATUSES = ["pending", "confirmed"];

export async function POST(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getAuthenticatedUserAndProfile();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = getSupabaseAdminClient();

  // Fetch the order and verify ownership
  const { data: order, error: fetchError } = await admin
    .from("orders")
    .select("id, status, payment_status, stripe_payment_intent_id, profile_id")
    .eq("id", params.id)
    .eq("profile_id", session.profile.id)
    .maybeSingle();

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }
  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }
  if (!CANCELLABLE_STATUSES.includes(order.status)) {
    return NextResponse.json(
      {
        error: `Order cannot be cancelled. Current status: ${order.status}. Only pending or confirmed orders can be cancelled.`,
      },
      { status: 422 }
    );
  }

  // Update the order status
  const { error: updateError } = await admin
    .from("orders")
    .update({
      status: "cancelled",
      cancelled_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", order.id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    message: "Order cancelled successfully.",
    stripe_payment_intent_id: order.stripe_payment_intent_id ?? null,
  });
}
