"use client";

import { useEffect, useMemo, useState } from "react";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { usePathname, useRouter } from "next/navigation";
import { useCart } from "@/lib/cart/context";

const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "";
const hasLiveStripe = publishableKey.startsWith("pk_");
const stripePromise = hasLiveStripe ? loadStripe(publishableKey) : null;

type CheckoutPayload = {
  store_slug: string;
  cart_id?: string | null;
  customer: { email: string; full_name: string; phone?: string };
  shipping_address: {
    full_name: string;
    address_line_1: string;
    address_line_2?: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
    phone?: string;
  };
  billing_address?: {
    full_name: string;
    address_line_1: string;
    address_line_2?: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
    phone?: string;
  };
  shipping_method: { carrier: string; service: string; rate_id: string; amount: number };
};

type CheckoutLabels = {
  processing: string;
  payNow: string;
  stripeLoading: string;
  paymentFailed: string;
};

type ShippingRate = {
  id: string;
  carrier: string;
  service: string;
  carrier_display: string;
  rate: number;
  estimated_days: number;
  rate_id: string;
  is_free?: boolean;
};

function StripeConfirmForm({
  clientSecret,
  orderId,
  locale,
  labels,
}: {
  clientSecret: string;
  orderId: string;
  locale: string;
  labels: CheckoutLabels;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  async function confirm() {
    setSubmitting(true);
    setMessage("");
    if (!stripe || !elements) {
      setMessage(labels.stripeLoading);
      setSubmitting(false);
      return;
    }

    // Stripe requires elements.submit() before any async work and before confirmPayment()
    const { error: submitError } = await elements.submit();
    if (submitError) {
      setMessage(submitError.message ?? labels.paymentFailed);
      setSubmitting(false);
      return;
    }

    const confirmationUrl = `${window.location.origin}/${locale}/checkout/confirmation?order=${orderId}`;
    const result = await stripe.confirmPayment({
      elements,
      clientSecret,
      confirmParams: { return_url: confirmationUrl },
      redirect: "if_required",
    });

    if (result.error) {
      setMessage(result.error.message ?? labels.paymentFailed);
      setSubmitting(false);
      return;
    }

    // Use hard navigation so it works correctly whether the checkout is served
    // directly or proxied from another origin (e.g. tcm-network → pureherbhealth).
    window.location.href = confirmationUrl;
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        className="rounded bg-brand px-4 py-2 text-sm text-white disabled:opacity-60"
        onClick={() => void confirm()}
        disabled={submitting}
      >
        {submitting ? labels.processing : labels.payNow}
      </button>
      {message ? <p className="text-sm text-red-600">{message}</p> : null}
    </div>
  );
}

export function CheckoutForm() {
  const cart = useCart();
  const pathname = usePathname();
  const [email, setEmail] = useState("demo@example.com");
  const [fullName, setFullName] = useState("Demo User");
  const [address1, setAddress1] = useState("1 Main St");
  const [city, setCity] = useState("New York");
  const [state, setState] = useState("NY");
  const [postalCode, setPostalCode] = useState("10001");
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [creatingOrder, setCreatingOrder] = useState(false);
  const [message, setMessage] = useState("");
  const [authLoading, setAuthLoading] = useState(true);
  const [isSignedIn, setSignedIn] = useState(false);
  const [signedInEmail, setSignedInEmail] = useState("");
  const [continueAsGuest, setContinueAsGuest] = useState(false);
  const [phone, setPhone] = useState("");
  const [address2, setAddress2] = useState("");
  const [sameAsShipping, setSameAsShipping] = useState(true);
  const [billingName, setBillingName] = useState("");
  const [billingAddress1, setBillingAddress1] = useState("");
  const [billingAddress2, setBillingAddress2] = useState("");
  const [billingCity, setBillingCity] = useState("");
  const [billingState, setBillingState] = useState("");
  const [billingPostalCode, setBillingPostalCode] = useState("");
  const [shippingRates, setShippingRates] = useState<ShippingRate[]>([]);
  const [shippingRateId, setShippingRateId] = useState("");
  const [shippingRatesLoading, setShippingRatesLoading] = useState(false);
  const [shippingRatesError, setShippingRatesError] = useState("");
  const router = useRouter();
  const locale = pathname?.split("/")[1] || "en";
  const isZh = locale === "zh";
  const t = {
    checkout: isZh ? "结账" : "Checkout",
    checkingAccount: isZh ? "正在检查账户状态..." : "Checking account status...",
    signedInAs: isZh ? "当前已登录：" : "Signed in as",
    directCheckout: isZh ? "。可直接完成结账。" : ". You can check out directly.",
    checkoutOptions: isZh ? "结账方式：" : "Checkout options:",
    signIn: isZh ? "登录" : "Sign in",
    createAccount: isZh ? "创建账户" : "Create account",
    continueGuest: isZh ? "游客结账" : "Continue as guest",
    chooseOptionFirst: isZh ? "请先选择：登录、创建账户，或游客结账后继续。" : 'Please sign in, create an account, or choose "Continue as guest" to proceed.',
    email: isZh ? "邮箱" : "Email",
    fullName: isZh ? "姓名" : "Full name",
    address1: isZh ? "地址第一行" : "Address line 1",
    city: isZh ? "城市" : "City",
    state: isZh ? "州/省" : "State",
    postalCode: isZh ? "邮编" : "Postal code",
    createOrderFirst: isZh ? "请先创建订单，然后会显示支付表单。" : "Create your order first, then payment form will appear.",
    stubMode: isZh ? "当前为模拟支付模式，订单将通过模拟 webhook 自动确认。" : "Stub mode payment active. Order auto-confirms via simulated webhook.",
    placeOrder: isZh ? "提交订单" : "Place order",
    creatingOrder: isZh ? "创建订单中..." : "Creating order...",
    checkoutFailed: isZh ? "结账失败。" : "Checkout failed.",
    orderSummary: isZh ? "订单摘要" : "Order Summary",
    subtotal: isZh ? "小计" : "Subtotal",
    shippingAddress: isZh ? "配送地址" : "Shipping address",
    shippingMethod: isZh ? "配送方式" : "Shipping method",
    billingAddress: isZh ? "账单地址" : "Billing address",
    contact: isZh ? "联系信息" : "Contact",
    phone: isZh ? "电话（可选）" : "Phone (optional)",
    address2: isZh ? "地址第二行（可选）" : "Address line 2 (optional)",
    sameAsShipping: isZh ? "账单地址与配送地址一致" : "Billing address is same as shipping",
    loadRates: isZh ? "正在获取配送选项..." : "Loading shipping options...",
    ratesError: isZh ? "无法获取配送选项，请检查地址后重试。" : "Unable to load shipping options. Please verify address.",
    noRates: isZh ? "请先填写完整配送地址以加载配送选项。" : "Enter shipping address to load delivery options.",
    paymentSection: isZh ? "支付" : "Payment",
    shipping: isZh ? "运费" : "Shipping",
    estimatedTax: isZh ? "预估税费" : "Estimated tax",
    total: isZh ? "合计" : "Total",
    processing: isZh ? "处理中..." : "Processing...",
    payNow: isZh ? "立即支付" : "Pay now",
    stripeLoading: isZh ? "支付组件加载中。" : "Stripe is still loading.",
    paymentFailed: isZh ? "支付失败。" : "Payment failed.",
  } as const;

  useEffect(() => {
    let cancelled = false;
    async function loadAuthState() {
      const res = await fetch("/api/account/me", { cache: "no-store" });
      if (cancelled) return;
      if (!res.ok) {
        setSignedIn(false);
        setAuthLoading(false);
        return;
      }
      const payload = (await res.json()) as { user?: { email?: string | null }; profile?: { full_name?: string | null } };
      if (cancelled) return;
      setSignedIn(true);
      setSignedInEmail(payload.user?.email || "");
      if (payload.user?.email) setEmail(payload.user.email);
      if (payload.profile?.full_name) setFullName(payload.profile.full_name);
      setContinueAsGuest(true);
      setAuthLoading(false);
    }
    void loadAuthState();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!sameAsShipping) return;
    setBillingName(fullName);
    setBillingAddress1(address1);
    setBillingAddress2(address2);
    setBillingCity(city);
    setBillingState(state);
    setBillingPostalCode(postalCode);
  }, [sameAsShipping, fullName, address1, address2, city, state, postalCode]);

  useEffect(() => {
    const ready = Boolean(fullName && address1 && city && state && postalCode);
    if (!ready) {
      setShippingRates([]);
      setShippingRateId("");
      setShippingRatesError("");
      return;
    }

    let cancelled = false;
    async function loadRates() {
      setShippingRatesLoading(true);
      setShippingRatesError("");
      const res = await fetch("/api/shipping/rates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          store_slug: cart.storeSlug,
          to_address: {
            name: fullName,
            street1: address1,
            street2: address2 || undefined,
            city,
            state,
            zip: postalCode,
            country: "US",
            phone: phone || undefined,
          },
          parcel: {
            weight_oz: 16,
            length: 8,
            width: 6,
            height: 2,
          },
          subtotal: cart.subtotal,
          free_shipping_threshold: 75,
          free_shipping_carrier_preference: "cheapest",
        }),
      });

      const payload = (await res.json().catch(() => ({}))) as {
        rates?: ShippingRate[];
        cheapest?: ShippingRate;
        error?: string;
      };
      if (cancelled) return;
      if (!res.ok || payload.error) {
        setShippingRates([]);
        setShippingRateId("");
        setShippingRatesError(payload.error || t.ratesError);
        setShippingRatesLoading(false);
        return;
      }
      const rates = payload.rates ?? [];
      setShippingRates(rates);
      const fallback = payload.cheapest?.rate_id || rates[0]?.rate_id || "";
      setShippingRateId((prev) => (prev && rates.some((rate) => rate.rate_id === prev) ? prev : fallback));
      setShippingRatesLoading(false);
    }

    void loadRates();
    return () => {
      cancelled = true;
    };
  }, [address1, address2, cart.subtotal, city, fullName, phone, postalCode, state, t.ratesError]);

  const selectedShippingRate = shippingRates.find((rate) => rate.rate_id === shippingRateId) ?? null;
  const estimatedTax = useMemo(() => (cart.subtotal + (selectedShippingRate?.rate ?? 0)) * 0.08, [cart.subtotal, selectedShippingRate?.rate]);
  const estimatedTotal = useMemo(() => cart.subtotal + (selectedShippingRate?.rate ?? 0) + estimatedTax, [cart.subtotal, selectedShippingRate?.rate, estimatedTax]);
  const checkoutReady = Boolean(isSignedIn || continueAsGuest) && Boolean(selectedShippingRate) && Boolean(email && fullName && address1 && city && state && postalCode);

  const payload = useMemo<CheckoutPayload>(
    () => ({
      store_slug: cart.storeSlug,
      cart_id: cart.id,
      customer: { email, full_name: fullName, phone: phone || undefined },
      shipping_address: {
        full_name: fullName,
        address_line_1: address1,
        address_line_2: address2 || undefined,
        city,
        state,
        postal_code: postalCode,
        country: "US",
        phone: phone || undefined,
      },
      billing_address: sameAsShipping
        ? undefined
        : {
            full_name: billingName || fullName,
            address_line_1: billingAddress1,
            address_line_2: billingAddress2 || undefined,
            city: billingCity,
            state: billingState,
            postal_code: billingPostalCode,
            country: "US",
            phone: phone || undefined,
          },
      shipping_method: selectedShippingRate
        ? {
            carrier: selectedShippingRate.carrier,
            service: selectedShippingRate.service,
            rate_id: selectedShippingRate.rate_id,
            amount: selectedShippingRate.rate,
          }
        : { carrier: "USPS", service: "Ground", rate_id: "stub", amount: 8.95 },
    }),
    [
      address1,
      address2,
      billingAddress1,
      billingAddress2,
      billingCity,
      billingName,
      billingPostalCode,
      billingState,
      cart.id,
      city,
      email,
      fullName,
      phone,
      postalCode,
      sameAsShipping,
      selectedShippingRate,
      state,
    ],
  );

  async function startCheckout() {
    if (!checkoutReady) return;
    setCreatingOrder(true);
    setMessage("");
    const checkoutRes = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const checkoutJson = await checkoutRes.json();

    if (!checkoutRes.ok || checkoutJson.error) {
      setMessage(checkoutJson.error ?? t.checkoutFailed);
      setCreatingOrder(false);
      return;
    }

    const createdOrderId = checkoutJson.order_id as string;
    setOrderId(createdOrderId);
    setClientSecret(checkoutJson.client_secret as string);

    if (checkoutJson.mode === "stub") {
      await fetch("/api/webhooks/stripe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "payment_intent.succeeded",
          data: { object: { metadata: { order_id: createdOrderId } } },
        }),
      });
      router.push(`/${locale}/checkout/confirmation?order=${createdOrderId}`);
      return;
    }
    setCreatingOrder(false);
  }

  return (
    <div className="grid gap-6 md:grid-cols-[2fr_1fr]">
      <div className="space-y-4 rounded border p-4">
        <h2 className="text-lg font-semibold">{t.checkout}</h2>
        <div className="rounded border border-[var(--neutral-200)] bg-[var(--neutral-100)] p-3">
          {authLoading ? (
            <p className="text-sm text-[var(--neutral-600)]">{t.checkingAccount}</p>
          ) : isSignedIn ? (
            <p className="text-sm text-emerald-700">
              {t.signedInAs} <strong>{signedInEmail}</strong>
              {t.directCheckout}
            </p>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-[var(--neutral-700)]">{t.checkoutOptions}</p>
              <div className="flex flex-wrap gap-2">
                <a
                  href={`/${locale}/login?next=${encodeURIComponent(`/${locale}/checkout?store_slug=${cart.storeSlug}`)}`}
                  className="inline-flex h-9 items-center justify-center rounded-md border border-[var(--neutral-300)] bg-white px-3 text-sm font-medium text-[var(--neutral-700)] hover:bg-[var(--neutral-200)]"
                >
                  {t.signIn}
                </a>
                <a
                  href={`/${locale}/register?next=${encodeURIComponent(`/${locale}/checkout?store_slug=${cart.storeSlug}`)}`}
                  className="inline-flex h-9 items-center justify-center rounded-md border border-[var(--neutral-300)] bg-white px-3 text-sm font-medium text-[var(--neutral-700)] hover:bg-[var(--neutral-200)]"
                >
                  {t.createAccount}
                </a>
                <button
                  type="button"
                  onClick={() => setContinueAsGuest(true)}
                  className="inline-flex h-9 items-center justify-center rounded-md bg-[var(--color-brand-500)] px-3 text-sm font-semibold text-white hover:bg-[var(--color-brand-600)]"
                >
                  {t.continueGuest}
                </button>
              </div>
            </div>
          )}
        </div>

        {!isSignedIn && !continueAsGuest ? (
          <p className="rounded border border-[var(--neutral-200)] bg-white p-3 text-sm text-[var(--neutral-600)]">
            {t.chooseOptionFirst}
          </p>
        ) : null}

        {isSignedIn || continueAsGuest ? (
          <>
            <div className="space-y-2 rounded border border-[var(--neutral-200)] bg-white p-3">
              <p className="text-sm font-semibold text-[var(--neutral-900)]">{t.contact}</p>
              <input className="w-full rounded border p-2 text-sm" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t.email} />
              <input className="w-full rounded border p-2 text-sm" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder={t.fullName} />
              <input className="w-full rounded border p-2 text-sm" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder={t.phone} />
            </div>

            <div className="space-y-2 rounded border border-[var(--neutral-200)] bg-white p-3">
              <p className="text-sm font-semibold text-[var(--neutral-900)]">{t.shippingAddress}</p>
              <input className="w-full rounded border p-2 text-sm" value={address1} onChange={(e) => setAddress1(e.target.value)} placeholder={t.address1} />
              <input className="w-full rounded border p-2 text-sm" value={address2} onChange={(e) => setAddress2(e.target.value)} placeholder={t.address2} />
              <div className="grid grid-cols-3 gap-2">
                <input className="rounded border p-2 text-sm" value={city} onChange={(e) => setCity(e.target.value)} placeholder={t.city} />
                <input className="rounded border p-2 text-sm" value={state} onChange={(e) => setState(e.target.value)} placeholder={t.state} />
                <input className="rounded border p-2 text-sm" value={postalCode} onChange={(e) => setPostalCode(e.target.value)} placeholder={t.postalCode} />
              </div>
            </div>

            <div className="space-y-2 rounded border border-[var(--neutral-200)] bg-white p-3">
              <p className="text-sm font-semibold text-[var(--neutral-900)]">{t.shippingMethod}</p>
              {shippingRatesLoading ? <p className="text-sm text-[var(--neutral-500)]">{t.loadRates}</p> : null}
              {shippingRatesError ? <p className="text-sm text-red-600">{shippingRatesError}</p> : null}
              {!shippingRatesLoading && !shippingRatesError && shippingRates.length === 0 ? <p className="text-sm text-[var(--neutral-500)]">{t.noRates}</p> : null}
              {shippingRates.length > 0 ? (
                <div className="space-y-2">
                  {shippingRates.map((rate) => (
                    <label key={rate.rate_id} className="flex cursor-pointer items-center justify-between rounded border border-[var(--neutral-200)] px-3 py-2 text-sm">
                      <span className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="shipping_rate"
                          checked={shippingRateId === rate.rate_id}
                          onChange={() => setShippingRateId(rate.rate_id)}
                        />
                        <span>
                          {rate.carrier_display} · {rate.estimated_days}d
                        </span>
                      </span>
                      <span className="font-semibold">{rate.is_free ? "FREE" : `$${rate.rate.toFixed(2)}`}</span>
                    </label>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="space-y-2 rounded border border-[var(--neutral-200)] bg-white p-3">
              <p className="text-sm font-semibold text-[var(--neutral-900)]">{t.billingAddress}</p>
              <label className="flex items-center gap-2 text-sm text-[var(--neutral-700)]">
                <input type="checkbox" checked={sameAsShipping} onChange={(e) => setSameAsShipping(e.target.checked)} />
                {t.sameAsShipping}
              </label>
              {!sameAsShipping ? (
                <div className="space-y-2">
                  <input className="w-full rounded border p-2 text-sm" value={billingName} onChange={(e) => setBillingName(e.target.value)} placeholder={t.fullName} />
                  <input className="w-full rounded border p-2 text-sm" value={billingAddress1} onChange={(e) => setBillingAddress1(e.target.value)} placeholder={t.address1} />
                  <input className="w-full rounded border p-2 text-sm" value={billingAddress2} onChange={(e) => setBillingAddress2(e.target.value)} placeholder={t.address2} />
                  <div className="grid grid-cols-3 gap-2">
                    <input className="rounded border p-2 text-sm" value={billingCity} onChange={(e) => setBillingCity(e.target.value)} placeholder={t.city} />
                    <input className="rounded border p-2 text-sm" value={billingState} onChange={(e) => setBillingState(e.target.value)} placeholder={t.state} />
                    <input className="rounded border p-2 text-sm" value={billingPostalCode} onChange={(e) => setBillingPostalCode(e.target.value)} placeholder={t.postalCode} />
                  </div>
                </div>
              ) : null}
            </div>

            <div className="space-y-3 rounded border border-[var(--neutral-200)] bg-slate-50 p-3">
              <p className="text-sm font-semibold text-[var(--neutral-900)]">{t.paymentSection}</p>
              {hasLiveStripe && clientSecret && orderId ? (
                <Elements stripe={stripePromise} options={{ clientSecret }}>
                  <PaymentElement />
                  <StripeConfirmForm clientSecret={clientSecret} orderId={orderId} locale={locale} labels={t} />
                </Elements>
              ) : (
                <>
                  <p className="text-sm">{hasLiveStripe ? t.createOrderFirst : t.stubMode}</p>
                  <button
                    type="button"
                    className="rounded bg-brand px-4 py-2 text-sm text-white disabled:opacity-60"
                    onClick={() => void startCheckout()}
                    disabled={!checkoutReady || creatingOrder || cart.item_count === 0}
                  >
                    {creatingOrder ? t.creatingOrder : t.placeOrder}
                  </button>
                  {message ? <p className="text-sm text-red-600">{message}</p> : null}
                </>
              )}
            </div>
          </>
        ) : null}
      </div>

      <aside className="rounded border p-4">
        <h3 className="mb-3 text-sm font-semibold">{t.orderSummary}</h3>
        <div className="space-y-2">
          {cart.items.map((item) => (
            <div key={item.id} className="text-sm">
              {item.product.name} x {item.quantity} - ${(item.total_price_cents / 100).toFixed(2)}
            </div>
          ))}
        </div>
        <p className="mt-4 text-sm font-semibold">
          {t.subtotal}: ${cart.subtotal.toFixed(2)}
        </p>
        <p className="mt-1 text-sm">
          {t.shipping}: ${selectedShippingRate?.rate.toFixed(2) ?? "0.00"}
        </p>
        <p className="mt-1 text-sm">
          {t.estimatedTax}: ${estimatedTax.toFixed(2)}
        </p>
        <p className="mt-2 border-t border-[var(--neutral-200)] pt-2 text-sm font-semibold">
          {t.total}: ${estimatedTotal.toFixed(2)}
        </p>
      </aside>
    </div>
  );
}
