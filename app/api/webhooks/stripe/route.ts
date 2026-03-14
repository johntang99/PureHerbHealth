import Stripe from "stripe";
import { ok } from "@/lib/utils/api";
import { getStripeClient, hasUsableStripeKey } from "@/lib/stripe/client";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

async function recordStoreOrderDetails(orderId: string, platformFeeCentsFromMetadata?: number) {
  const admin = getSupabaseAdminClient();
  const { data: order, error: orderError } = await admin.from("orders").select("id,store_id,total_cents").eq("id", orderId).maybeSingle();
  if (orderError || !order) return;

  const { data: store } = await admin
    .from("stores")
    .select("id,revenue_share_platform_pct,slug,type")
    .eq("id", order.store_id)
    .maybeSingle();
  if (!store) return;

  const isMasterStore = store.slug === "pureherbhealth" || store.type === "standalone";
  const platformFeeCents =
    platformFeeCentsFromMetadata ??
    (isMasterStore ? order.total_cents : Math.round(order.total_cents * (Number(store.revenue_share_platform_pct || 30) / 100)));
  const storeRevenueCents = Math.max(0, order.total_cents - platformFeeCents);

  await admin.from("store_order_details").upsert(
    {
      order_id: order.id,
      store_id: store.id,
      store_revenue_cents: storeRevenueCents,
      platform_revenue_cents: platformFeeCents,
      revenue_share_pct: Number(store.revenue_share_platform_pct || 30),
      transfer_status: isMasterStore ? "not_applicable" : "pending",
    },
    { onConflict: "order_id" },
  );

  const dateKey = new Date().toISOString().slice(0, 10);
  await admin.rpc("increment_store_analytics", {
    p_store_id: store.id,
    p_date: dateKey,
    p_revenue_cents: order.total_cents,
    p_platform_revenue_cents: platformFeeCents,
  });
}

async function applyOrderUpdate(event: { type: string; data?: { object?: { metadata?: { order_id?: string; platform_fee_cents?: string } } } }) {
  const admin = getSupabaseAdminClient();
  const orderId = event.data?.object?.metadata?.order_id;
  if (!orderId) return;

  if (event.type === "payment_intent.succeeded") {
    await admin.from("orders").update({ payment_status: "succeeded", status: "confirmed" }).eq("id", orderId);
    const feeFromMetadata = Number(event.data?.object?.metadata?.platform_fee_cents || "0");
    await recordStoreOrderDetails(orderId, Number.isFinite(feeFromMetadata) ? feeFromMetadata : undefined);
  } else if (event.type === "payment_intent.payment_failed") {
    await admin.from("orders").update({ payment_status: "failed", status: "pending" }).eq("id", orderId);
  } else if (event.type === "charge.refunded") {
    await admin.from("orders").update({ payment_status: "refunded", status: "refunded" }).eq("id", orderId);
  }
}

async function applyConnectUpdate(event: Stripe.Event) {
  const admin = getSupabaseAdminClient();
  if (event.type === "account.updated") {
    const account = event.data.object as Stripe.Account;
    const isFullyOnboarded = Boolean(account.charges_enabled && account.payouts_enabled && account.details_submitted);
    await admin
      .from("stores")
      .update({
        stripe_connect_onboarded: isFullyOnboarded,
        stripe_onboarding_complete: isFullyOnboarded,
        updated_at: new Date().toISOString(),
      })
      .eq("stripe_connect_account_id", account.id);
  } else if (event.type === "account.application.deauthorized") {
    const object = event.data.object as { account?: string };
    if (!object.account) return;
    await admin
      .from("stores")
      .update({
        stripe_connect_onboarded: false,
        stripe_onboarding_complete: false,
        stripe_connect_account_id: null,
        updated_at: new Date().toISOString(),
      })
      .eq("stripe_connect_account_id", object.account);
  }
}

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  try {
    if (!hasUsableStripeKey() || !process.env.STRIPE_WEBHOOK_SECRET || process.env.STRIPE_WEBHOOK_SECRET.includes("...")) {
      const parsed = JSON.parse(body) as Stripe.Event & { type?: string; data?: { object?: { metadata?: { order_id?: string; platform_fee_cents?: string } } } };
      if (parsed?.type) {
        await applyOrderUpdate({
          type: parsed.type,
          data: parsed.data,
        });
        await applyConnectUpdate(parsed as Stripe.Event);
      }
      return ok({
        received: true,
        mode: "stub",
        event_type: parsed?.type ?? null,
        order_id: parsed?.data?.object?.metadata?.order_id ?? null,
        signature_present: Boolean(signature),
        payload_size: body.length,
      });
    }

    const stripe = getStripeClient();
    if (!stripe || !signature) {
      return ok({ error: "Missing stripe client or signature" }, { status: 400 });
    }

    const event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET);
    const obj = event.data.object as Stripe.PaymentIntent | Stripe.Charge;
    await applyOrderUpdate({
      type: event.type,
      data: { object: { metadata: { order_id: obj.metadata?.order_id, platform_fee_cents: obj.metadata?.platform_fee_cents } } },
    });
    await applyConnectUpdate(event);

    return ok({ received: true, mode: "stripe", event_type: event.type });
  } catch (error) {
    return ok({ error: error instanceof Error ? error.message : "Webhook failed" }, { status: 400 });
  }
}
