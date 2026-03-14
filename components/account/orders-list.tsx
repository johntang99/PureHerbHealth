"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type OrderItem = {
  id: string;
  quantity: number;
  unit_price_cents: number;
  product: { id: string; slug: string; name: string; name_zh: string | null } | null;
};

type Order = {
  id: string;
  order_number: string;
  status: string;
  payment_status: string;
  shipping_status: string;
  subtotal_cents: number;
  shipping_cents: number;
  tax_cents: number;
  discount_cents: number;
  total_cents: number;
  currency: string;
  created_at: string;
  customer_email: string | null;
  items: OrderItem[];
};

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

export function OrdersList({
  orders,
  locale,
}: {
  orders: Order[];
  locale: string;
}) {
  const [expanded, setExpanded] = useState<string | null>(
    orders[0]?.id ?? null
  );
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [resuming, setResuming] = useState<string | null>(null);
  const [cancelConfirm, setCancelConfirm] = useState<string | null>(null);
  const [orderList, setOrderList] = useState<Order[]>(orders);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const isZh = locale === "zh";
  const router = useRouter();

  async function handleCancel(orderId: string) {
    if (cancelling) return;
    setCancelling(orderId);
    setErrorMsg(null);
    const res = await fetch(`/api/account/orders/${orderId}/cancel`, {
      method: "POST",
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) {
      setErrorMsg(data.error ?? (isZh ? "取消失败，请重试。" : "Failed to cancel. Please try again."));
    } else {
      setOrderList((prev) =>
        prev.map((o) =>
          o.id === orderId ? { ...o, status: "cancelled" } : o
        )
      );
      setCancelConfirm(null);
    }
    setCancelling(null);
  }

  async function handleResume(orderId: string) {
    if (resuming) return;
    setResuming(orderId);
    setErrorMsg(null);
    const res = await fetch(`/api/account/orders/${orderId}/resume`);
    const data = (await res.json().catch(() => ({}))) as {
      can_resume?: boolean;
      client_secret?: string;
      error?: string;
    };
    if (!res.ok || !data.can_resume) {
      setErrorMsg(
        data.error ??
          (isZh
            ? "无法恢复支付，请联系客服。"
            : "Unable to resume payment. Please contact support.")
      );
      setResuming(null);
      return;
    }
    // Redirect to checkout resume page with the client secret
    router.push(
      `/${locale}/checkout?resume=${orderId}&pi=${encodeURIComponent(data.client_secret ?? "")}`
    );
  }

  if (orderList.length === 0) {
    return (
      <div className="rounded-xl border border-[var(--neutral-200)] bg-white px-6 py-12 text-center">
        <p className="text-2xl">📦</p>
        <p className="mt-2 font-semibold text-[var(--neutral-700)]">
          {isZh ? "暂无订单记录" : "No orders yet"}
        </p>
        <p className="mt-1 text-sm text-[var(--neutral-500)]">
          {isZh
            ? "您的订单将在此处显示。"
            : "Your orders will appear here once you place one."}
        </p>
        <Link
          href={`/${locale}/shop`}
          className="mt-4 inline-block rounded-lg bg-[var(--color-brand-500)] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[var(--color-brand-600)] transition-colors"
        >
          {isZh ? "前往商店" : "Shop now"}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {orderList.map((order) => {
        const isOpen = expanded === order.id;
        return (
          <div
            key={order.id}
            className="overflow-hidden rounded-xl border border-[var(--neutral-200)] bg-white transition-all"
          >
            {/* Order row header */}
            <button
              type="button"
              onClick={() => setExpanded(isOpen ? null : order.id)}
              className="flex w-full items-center justify-between px-5 py-4 text-left hover:bg-[var(--neutral-50)] transition-colors"
            >
              <div className="flex items-center gap-4">
                <span
                  className={[
                    "hidden h-7 w-7 items-center justify-center rounded-full text-xs font-bold sm:flex",
                    isOpen
                      ? "bg-[var(--color-brand-500)] text-white"
                      : "bg-[var(--neutral-100)] text-[var(--neutral-500)]",
                  ].join(" ")}
                >
                  {isOpen ? "−" : "+"}
                </span>
                <div>
                  <p className="text-sm font-semibold text-[var(--neutral-900)]">
                    {order.order_number}
                  </p>
                  <p className="text-xs text-[var(--neutral-500)]">
                    {new Date(order.created_at).toLocaleDateString(
                      isZh ? "zh-CN" : "en-US",
                      { year: "numeric", month: "short", day: "numeric" }
                    )}
                    {" · "}
                    {order.items.length}{" "}
                    {isZh ? "件商品" : order.items.length === 1 ? "item" : "items"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={[
                    "hidden rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize sm:block",
                    STATUS_STYLES[order.status] ?? "bg-gray-50 text-gray-700 border-gray-200",
                  ].join(" ")}
                >
                  {isZh ? STATUS_ZH[order.status] ?? order.status : order.status}
                </span>
                <span className="text-sm font-bold text-[var(--neutral-900)]">
                  ${(order.total_cents / 100).toFixed(2)}{" "}
                  <span className="font-normal text-[var(--neutral-500)]">
                    {order.currency.toUpperCase()}
                  </span>
                </span>
              </div>
            </button>

            {/* Expanded detail */}
            {isOpen && (
              <div className="border-t border-[var(--neutral-100)] px-5 pb-5 pt-4">
                {/* Status row */}
                <div className="mb-4 flex flex-wrap gap-2">
                  <StatusBadge
                    label={isZh ? "订单" : "Order"}
                    value={isZh ? STATUS_ZH[order.status] ?? order.status : order.status}
                    style={STATUS_STYLES[order.status]}
                  />
                  <StatusBadge
                    label={isZh ? "支付" : "Payment"}
                    value={order.payment_status}
                    style={PAYMENT_STYLES[order.payment_status]}
                  />
                  <StatusBadge
                    label={isZh ? "配送" : "Shipping"}
                    value={order.shipping_status}
                    style="bg-sky-50 text-sky-700 border-sky-200"
                  />
                </div>

                {/* Items list */}
                <div className="mb-4 space-y-2">
                  {order.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between rounded-lg border border-[var(--neutral-100)] bg-[var(--neutral-50)] px-4 py-2.5"
                    >
                      <div>
                        <p className="text-sm font-medium text-[var(--neutral-900)]">
                          {isZh && item.product?.name_zh
                            ? item.product.name_zh
                            : item.product?.name ?? (isZh ? "商品" : "Product")}
                        </p>
                        <p className="text-xs text-[var(--neutral-500)]">
                          {isZh ? "数量" : "Qty"}: {item.quantity} ×{" "}
                          ${(item.unit_price_cents / 100).toFixed(2)}
                        </p>
                      </div>
                      <p className="text-sm font-semibold text-[var(--neutral-900)]">
                        ${((item.quantity * item.unit_price_cents) / 100).toFixed(2)}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Totals */}
                <div className="mb-4 rounded-lg border border-[var(--neutral-200)] bg-white px-4 py-3 text-sm">
                  <div className="space-y-1.5 text-[var(--neutral-600)]">
                    <Row
                      label={isZh ? "小计" : "Subtotal"}
                      value={`$${(order.subtotal_cents / 100).toFixed(2)}`}
                    />
                    <Row
                      label={isZh ? "运费" : "Shipping"}
                      value={`$${(order.shipping_cents / 100).toFixed(2)}`}
                    />
                    <Row
                      label={isZh ? "税费" : "Tax"}
                      value={`$${(order.tax_cents / 100).toFixed(2)}`}
                    />
                    {order.discount_cents > 0 && (
                      <Row
                        label={isZh ? "优惠" : "Discount"}
                        value={`-$${(order.discount_cents / 100).toFixed(2)}`}
                        green
                      />
                    )}
                  </div>
                  <div className="mt-2 border-t border-[var(--neutral-200)] pt-2 flex items-center justify-between font-semibold text-[var(--neutral-900)]">
                    <span>{isZh ? "合计" : "Total"}</span>
                    <span>
                      ${(order.total_cents / 100).toFixed(2)}{" "}
                      {order.currency.toUpperCase()}
                    </span>
                  </div>
                </div>

                {/* Error message */}
                {errorMsg && expanded === order.id && (
                  <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-xs text-red-700">
                    {errorMsg}
                    <button
                      type="button"
                      onClick={() => setErrorMsg(null)}
                      className="ml-2 underline"
                    >
                      {isZh ? "关闭" : "Dismiss"}
                    </button>
                  </div>
                )}

                {/* Actions */}
                <div className="flex flex-wrap gap-2">
                  <Link
                    href={`/${locale}/account/orders/${order.id}`}
                    className="rounded-lg border border-[var(--neutral-300)] px-4 py-2 text-xs font-semibold text-[var(--neutral-700)] hover:bg-[var(--neutral-100)] transition-colors"
                  >
                    {isZh ? "查看详情" : "View details"}
                  </Link>

                  {/* Pay Now — pending payment */}
                  {(order.status === "pending" &&
                    order.payment_status !== "succeeded") && (
                    <button
                      type="button"
                      disabled={resuming === order.id}
                      onClick={() => void handleResume(order.id)}
                      className="rounded-lg bg-[var(--color-brand-500)] px-4 py-2 text-xs font-semibold text-white hover:bg-[var(--color-brand-600)] disabled:opacity-60 transition-colors"
                    >
                      {resuming === order.id
                        ? isZh ? "正在处理..." : "Loading..."
                        : isZh ? "继续支付" : "Pay now"}
                    </button>
                  )}

                  {/* Cancel — pending or confirmed only */}
                  {(order.status === "pending" || order.status === "confirmed") && (
                    cancelConfirm === order.id ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-[var(--neutral-500)]">
                          {isZh ? "确认取消？" : "Confirm cancel?"}
                        </span>
                        <button
                          type="button"
                          disabled={cancelling === order.id}
                          onClick={() => void handleCancel(order.id)}
                          className="rounded-lg border border-red-300 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-60 transition-colors"
                        >
                          {cancelling === order.id
                            ? isZh ? "取消中..." : "Cancelling..."
                            : isZh ? "确认取消" : "Yes, cancel"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setCancelConfirm(null)}
                          className="rounded-lg border border-[var(--neutral-300)] px-3 py-1.5 text-xs font-semibold text-[var(--neutral-600)] hover:bg-[var(--neutral-100)] transition-colors"
                        >
                          {isZh ? "不了" : "Keep it"}
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setCancelConfirm(order.id)}
                        className="rounded-lg border border-[var(--neutral-300)] px-4 py-2 text-xs font-semibold text-[var(--neutral-600)] hover:border-red-300 hover:bg-red-50 hover:text-red-700 transition-colors"
                      >
                        {isZh ? "取消订单" : "Cancel order"}
                      </button>
                    )
                  )}

                  {/* Track — shipped or delivered */}
                  {(order.status === "shipped" || order.status === "delivered") && (
                    <button
                      type="button"
                      className="rounded-lg border border-[var(--neutral-300)] px-4 py-2 text-xs font-semibold text-[var(--neutral-700)] hover:bg-[var(--neutral-100)] transition-colors"
                    >
                      {isZh ? "查看物流" : "Track shipment"}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function StatusBadge({
  label,
  value,
  style,
}: {
  label: string;
  value: string;
  style?: string;
}) {
  return (
    <span
      className={[
        "rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize",
        style ?? "bg-gray-50 text-gray-700 border-gray-200",
      ].join(" ")}
    >
      {label}: {value}
    </span>
  );
}

function Row({
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
      <span className={green ? "text-emerald-600 font-medium" : ""}>{value}</span>
    </div>
  );
}
