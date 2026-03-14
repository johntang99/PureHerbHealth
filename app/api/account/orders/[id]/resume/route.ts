import { NextResponse } from "next/server";
import { getAuthenticatedUserAndProfile } from "@/lib/auth/profile";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getStripeClient } from "@/lib/stripe/client";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getAuthenticatedUserAndProfile();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = getSupabaseAdminClient();

  const { data: order } = await admin
    .from("orders")
    .select(
      "id, order_number, status, payment_status, stripe_payment_intent_id, total_cents, currency"
    )
    .eq("id", params.id)
    .eq("profile_id", session.profile.id)
    .maybeSingle();

  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  if (order.payment_status === "succeeded") {
    return NextResponse.json(
      { error: "This order has already been paid." },
      { status: 422 }
    );
  }

  if (!order.stripe_payment_intent_id) {
    return NextResponse.json(
      {
        error: "No payment intent found for this order.",
        can_resume: false,
        order_id: order.id,
      },
      { status: 422 }
    );
  }

  const stripe = getStripeClient();
  if (!stripe) {
    return NextResponse.json(
      { error: "Payment service unavailable." },
      { status: 503 }
    );
  }

  // Retrieve the existing payment intent and get a fresh client secret
  const intent = await stripe.paymentIntents.retrieve(
    order.stripe_payment_intent_id
  );

  if (intent.status === "succeeded") {
    return NextResponse.json(
      { error: "Payment already completed for this order." },
      { status: 422 }
    );
  }

  if (intent.status === "canceled") {
    return NextResponse.json(
      {
        error: "This payment was cancelled. Please contact support.",
        can_resume: false,
      },
      { status: 422 }
    );
  }

  return NextResponse.json({
    can_resume: true,
    client_secret: intent.client_secret,
    order_number: order.order_number,
    total_cents: order.total_cents,
    currency: order.currency,
  });
}
