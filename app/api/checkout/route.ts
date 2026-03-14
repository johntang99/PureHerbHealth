import { z } from "zod";
import { handleApiError, ok } from "@/lib/utils/api";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getStripeClient } from "@/lib/stripe/client";
import { generateOrderNumber } from "@/lib/orders/number";
import { getOrCreateCart, loadCartDetails, normalizeGuestToken, resolveStore } from "@/lib/cart/service";
import { resolveStoreSlug } from "@/lib/store/slug";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { ensureProfileForAuthUser } from "@/lib/auth/profile";

const addressSchema = z.object({
  full_name: z.string().min(1),
  address_line_1: z.string().min(1),
  address_line_2: z.string().optional(),
  city: z.string().min(1),
  state: z.string().min(1),
  postal_code: z.string().min(1),
  country: z.string().min(2),
  phone: z.string().optional(),
});

const checkoutSchema = z.object({
  store_slug: z.string().optional(),
  cart_id: z.string().uuid().optional(),
  customer: z.object({
    email: z.string().email(),
    full_name: z.string().min(1),
    phone: z.string().optional(),
  }),
  shipping_address: addressSchema,
  billing_address: addressSchema.optional(),
  shipping_method: z.object({
    carrier: z.string().default("USPS"),
    service: z.string().default("Ground"),
    rate_id: z.string().default("stub"),
    amount: z.number().default(8.95),
  }),
  promo_code: z.string().optional(),
  customer_notes: z.string().optional(),
  save_address: z.boolean().optional(),
});

export async function POST(request: Request) {
  try {
    const body = checkoutSchema.parse(await request.json());
    const admin = getSupabaseAdminClient();
    const sessionClient = await getSupabaseServerClient();
    const {
      data: { user },
    } = await sessionClient.auth.getUser();
    const profile = user ? await ensureProfileForAuthUser(user) : null;
    const storeSlug = resolveStoreSlug(body.store_slug);
    const store = await resolveStore(admin, storeSlug);
    if (!store) {
      return ok({ error: "Store not found" }, { status: 404 });
    }
    const { data: storeDetail, error: storeDetailError } = await admin
      .from("stores")
      .select("id,slug,type,stripe_connect_account_id,revenue_share_platform_pct")
      .eq("id", store.id)
      .maybeSingle();
    if (storeDetailError) throw storeDetailError;

    const guestToken = normalizeGuestToken();
    const cart = body.cart_id
      ? { id: body.cart_id }
      : await getOrCreateCart({ admin, storeId: store.id, guestToken, profileId: profile?.id ?? null });
    const cartDetails = await loadCartDetails(admin, cart.id);
    if (cartDetails.items.length === 0) {
      return ok({ error: "Cart is empty" }, { status: 400 });
    }

    const subtotalCents = cartDetails.subtotal_cents;
    const shippingCents = Math.round(body.shipping_method.amount * 100);
    const taxCents = 0;
    const discountCents = 0;
    const totalCents = Math.max(0, subtotalCents + shippingCents + taxCents - discountCents);

    const orderNumber = await generateOrderNumber(admin, storeSlug);
    const { data: order, error: orderError } = await admin
      .from("orders")
      .insert({
        store_id: store.id,
        profile_id: profile?.id ?? null,
        order_number: orderNumber,
        status: "pending",
        payment_status: "pending",
        shipping_status: "pending",
        subtotal_cents: subtotalCents,
        shipping_cents: shippingCents,
        tax_cents: taxCents,
        discount_cents: discountCents,
        total_cents: totalCents,
        currency: "usd",
        customer_email: body.customer.email || user?.email || null,
        customer_name: body.customer.full_name || profile?.full_name || null,
        customer_phone: body.customer.phone || null,
        shipping_address: body.shipping_address,
        billing_address: body.billing_address ?? body.shipping_address,
        shipping_carrier: body.shipping_method.carrier,
        shipping_service: body.shipping_method.service,
        shipping_rate_id: body.shipping_method.rate_id,
        promo_code: body.promo_code || null,
        customer_notes: body.customer_notes || null,
      })
      .select("id,order_number,total_cents,currency")
      .single();
    if (orderError) throw orderError;

    const orderItems = cartDetails.items.map((item) => ({
      order_id: order.id,
      product_id: item.product_id,
      quantity: item.quantity,
      unit_price_cents: item.unit_price_cents,
    }));
    const { error: itemError } = await admin.from("order_items").insert(orderItems);
    if (itemError) throw itemError;

    // Clear the cart now that the order is committed
    await admin.from("cart_items").delete().eq("cart_id", cart.id);

    const stripe = getStripeClient();
    let clientSecret = "pi_stub_secret_123";
    let mode: "stripe" | "stub" = "stub";
    if (stripe) {
      const connectAccountId = storeDetail?.stripe_connect_account_id || null;
      const platformPct = Number(storeDetail?.revenue_share_platform_pct ?? 30);
      const transferData = connectAccountId ? { destination: connectAccountId } : undefined;
      const applicationFeeAmount = connectAccountId ? Math.round(totalCents * (platformPct / 100)) : undefined;

      const paymentIntent = await stripe.paymentIntents.create({
        amount: totalCents,
        currency: "usd",
        automatic_payment_methods: { enabled: true },
        application_fee_amount: applicationFeeAmount,
        transfer_data: transferData,
        metadata: {
          order_id: order.id,
          order_number: order.order_number,
          store_id: store.id,
          store_slug: store.slug,
          customer_email: body.customer.email,
          platform_fee_cents: String(applicationFeeAmount || 0),
        },
      });
      clientSecret = paymentIntent.client_secret ?? clientSecret;
      mode = "stripe";

      const { error: orderUpdateError } = await admin
        .from("orders")
        .update({
          stripe_payment_intent_id: paymentIntent.id,
        })
        .eq("id", order.id);
      if (orderUpdateError) throw orderUpdateError;
    }

    return ok({
      order_id: order.id,
      order_number: order.order_number,
      client_secret: clientSecret,
      total: Number((order.total_cents / 100).toFixed(2)),
      mode,
      status: "pending",
    });
  } catch (error) {
    return handleApiError(error);
  }
}
