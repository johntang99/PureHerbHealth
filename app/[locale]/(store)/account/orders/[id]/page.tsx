import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Locale } from "@/lib/i18n/config";
import { getAuthenticatedUserAndProfile } from "@/lib/auth/profile";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  confirmed: "bg-blue-50 text-blue-700 border-blue-200",
  processing: "bg-blue-50 text-blue-700 border-blue-200",
  shipped: "bg-indigo-50 text-indigo-700 border-indigo-200",
  delivered: "bg-emerald-50 text-emerald-700 border-emerald-200",
  cancelled: "bg-red-50 text-red-700 border-red-200",
  refunded: "bg-gray-50 text-gray-700 border-gray-200",
};

const PAYMENT_STYLES: Record<string, string> = {
  succeeded: "bg-emerald-50 text-emerald-700 border-emerald-200",
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  failed: "bg-red-50 text-red-700 border-red-200",
  refunded: "bg-gray-50 text-gray-600 border-gray-200",
};

const STATUS_ZH: Record<string, string> = {
  pending: "待处理",
  confirmed: "已确认",
  processing: "处理中",
  shipped: "已发货",
  delivered: "已送达",
  cancelled: "已取消",
  refunded: "已退款",
};

export default async function AccountOrderDetailPage({
  params,
}: {
  params: { locale: Locale; id: string };
}) {
  const session = await getAuthenticatedUserAndProfile();
  if (!session) {
    redirect(
      `/${params.locale}/login?next=${encodeURIComponent(`/${params.locale}/account/orders/${params.id}`)}`
    );
  }

  const admin = getSupabaseAdminClient();
  const isZh = params.locale === "zh";

  const { data: order } = await admin
    .from("orders")
    .select(
      `id, order_number, status, payment_status, shipping_status,
       subtotal_cents, shipping_cents, tax_cents, discount_cents,
       total_cents, currency, created_at, customer_email, customer_name`
    )
    .eq("id", params.id)
    .eq("profile_id", session.profile.id)
    .maybeSingle();

  if (!order) notFound();

  const { data: items } = await admin
    .from("order_items")
    .select(
      "id, quantity, unit_price_cents, product:product_id(id, slug, name, name_zh, images)"
    )
    .eq("order_id", order.id);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link
            href={`/${params.locale}/account/orders`}
            className="mb-1 inline-flex items-center gap-1 text-xs font-medium text-[var(--color-brand-600)] hover:underline"
          >
            ← {isZh ? "返回订单列表" : "Back to orders"}
          </Link>
          <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--color-brand-500)]">
            {isZh ? "订单详情" : "Order detail"}
          </p>
          <h1
            className="text-2xl font-bold text-[var(--neutral-900)]"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            {order.order_number}
          </h1>
          <p className="mt-0.5 text-sm text-[var(--neutral-500)]">
            {new Date(order.created_at).toLocaleString(
              isZh ? "zh-CN" : "en-US",
              {
                year: "numeric",
                month: "long",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              }
            )}
          </p>
        </div>
        {/* Primary status badge */}
        <span
          className={[
            "rounded-full border px-3 py-1 text-sm font-semibold capitalize",
            STATUS_STYLES[order.status] ?? "bg-gray-50 text-gray-700 border-gray-200",
          ].join(" ")}
        >
          {isZh ? STATUS_ZH[order.status] ?? order.status : order.status}
        </span>
      </div>

      {/* Status row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          {
            label: isZh ? "订单状态" : "Order status",
            value: isZh ? STATUS_ZH[order.status] ?? order.status : order.status,
            style: STATUS_STYLES[order.status],
          },
          {
            label: isZh ? "支付状态" : "Payment",
            value: order.payment_status,
            style: PAYMENT_STYLES[order.payment_status],
          },
          {
            label: isZh ? "配送状态" : "Shipping",
            value: order.shipping_status,
            style: "bg-sky-50 text-sky-700 border-sky-200",
          },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-xl border border-[var(--neutral-200)] bg-white p-4"
          >
            <p className="text-xs font-medium uppercase tracking-wide text-[var(--neutral-500)]">
              {s.label}
            </p>
            <span
              className={[
                "mt-2 inline-block rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize",
                s.style ?? "bg-gray-50 text-gray-700 border-gray-200",
              ].join(" ")}
            >
              {s.value}
            </span>
          </div>
        ))}
      </div>

      {/* Items */}
      <div className="rounded-xl border border-[var(--neutral-200)] bg-white">
        <div className="border-b border-[var(--neutral-100)] px-5 py-4">
          <h2 className="font-semibold text-[var(--neutral-900)]">
            {isZh ? "订购商品" : "Items ordered"}
          </h2>
        </div>
        <div className="divide-y divide-[var(--neutral-100)]">
          {(items ?? []).map((item) => {
            const product = Array.isArray(item.product)
              ? item.product[0]
              : item.product;
            const images = (product as { images?: string[] } | null)?.images;
            const imgUrl =
              Array.isArray(images) && images.length > 0 ? images[0] : null;

            return (
              <div
                key={item.id}
                className="flex items-center gap-4 px-5 py-4"
              >
                {/* Product image */}
                <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-[var(--neutral-200)] bg-[var(--neutral-100)]">
                  {imgUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={imgUrl}
                      alt={product?.name ?? ""}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-lg">
                      🌿
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-[var(--neutral-900)] truncate">
                    {isZh && (product as { name_zh?: string } | null)?.name_zh
                      ? (product as { name_zh: string }).name_zh
                      : (product as { name?: string } | null)?.name ??
                        (isZh ? "商品" : "Product")}
                  </p>
                  <p className="text-xs text-[var(--neutral-500)]">
                    {isZh ? "单价" : "Unit price"}:{" "}
                    ${(item.unit_price_cents / 100).toFixed(2)} ×{" "}
                    {item.quantity}
                  </p>
                </div>
                <p className="shrink-0 font-semibold text-[var(--neutral-900)]">
                  ${((item.unit_price_cents * item.quantity) / 100).toFixed(2)}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Order summary */}
      <div className="rounded-xl border border-[var(--neutral-200)] bg-white px-5 py-5">
        <h2 className="mb-3 font-semibold text-[var(--neutral-900)]">
          {isZh ? "费用明细" : "Order summary"}
        </h2>
        <div className="space-y-2 text-sm text-[var(--neutral-600)]">
          <SummaryRow label={isZh ? "小计" : "Subtotal"} value={`$${(order.subtotal_cents / 100).toFixed(2)}`} />
          <SummaryRow label={isZh ? "运费" : "Shipping"} value={`$${(order.shipping_cents / 100).toFixed(2)}`} />
          <SummaryRow label={isZh ? "税费" : "Tax"} value={`$${(order.tax_cents / 100).toFixed(2)}`} />
          {order.discount_cents > 0 && (
            <SummaryRow
              label={isZh ? "优惠折扣" : "Discount"}
              value={`-$${(order.discount_cents / 100).toFixed(2)}`}
              green
            />
          )}
        </div>
        <div className="mt-3 border-t border-[var(--neutral-200)] pt-3 flex items-center justify-between text-base font-bold text-[var(--neutral-900)]">
          <span>{isZh ? "订单总计" : "Total"}</span>
          <span>
            ${(order.total_cents / 100).toFixed(2)}{" "}
            <span className="font-medium text-[var(--neutral-500)] text-sm">
              {order.currency.toUpperCase()}
            </span>
          </span>
        </div>
      </div>

      {/* Customer info */}
      {(order.customer_name || order.customer_email) && (
        <div className="rounded-xl border border-[var(--neutral-200)] bg-white px-5 py-4">
          <h2 className="mb-2 font-semibold text-[var(--neutral-900)]">
            {isZh ? "收件信息" : "Customer info"}
          </h2>
          <p className="text-sm text-[var(--neutral-700)]">
            {order.customer_name}
          </p>
          <p className="text-sm text-[var(--neutral-500)]">
            {order.customer_email}
          </p>
        </div>
      )}
    </div>
  );
}

function SummaryRow({
  label,
  value,
  green,
}: {
  label: string;
  value: string;
  green?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span>{label}</span>
      <span className={green ? "font-medium text-emerald-600" : ""}>{value}</span>
    </div>
  );
}
