import { redirect } from "next/navigation";
import type { Locale } from "@/lib/i18n/config";
import { getAuthenticatedUserAndProfile } from "@/lib/auth/profile";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { OrdersList } from "@/components/account/orders-list";

export const dynamic = "force-dynamic";

export default async function AccountOrdersPage({
  params,
}: {
  params: { locale: Locale };
}) {
  const session = await getAuthenticatedUserAndProfile();
  if (!session) {
    redirect(
      `/${params.locale}/login?next=${encodeURIComponent(`/${params.locale}/account/orders`)}`
    );
  }

  const admin = getSupabaseAdminClient();
  const isZh = params.locale === "zh";

  const { data: orders } = await admin
    .from("orders")
    .select(
      `id, order_number, status, payment_status, shipping_status,
       subtotal_cents, shipping_cents, tax_cents, discount_cents,
       total_cents, currency, created_at, customer_email,
       items:order_items(id, quantity, unit_price_cents,
         product:product_id(id, slug, name, name_zh)
       )`
    )
    .eq("profile_id", session.profile.id)
    .order("created_at", { ascending: false });

  // Normalise the nested product shape (Supabase returns array for joins)
  const normalised = (orders ?? []).map((o) => ({
    ...o,
    items: (o.items ?? []).map((item: {
      id: string;
      quantity: number;
      unit_price_cents: number;
      product: unknown;
    }) => ({
      ...item,
      product: Array.isArray(item.product) ? item.product[0] ?? null : item.product,
    })),
  }));

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--color-brand-500)]">
          {isZh ? "账户" : "Account"}
        </p>
        <h1
          className="text-2xl font-bold text-[var(--neutral-900)]"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          {isZh ? "我的订单" : "My orders"}
        </h1>
        <p className="mt-0.5 text-sm text-[var(--neutral-500)]">
          {normalised.length > 0
            ? isZh
              ? `共 ${normalised.length} 笔订单`
              : `${normalised.length} order${normalised.length === 1 ? "" : "s"} total`
            : isZh
              ? "暂无订单记录"
              : "No orders yet"}
        </p>
      </div>

      <OrdersList orders={normalised} locale={params.locale} />
    </div>
  );
}
