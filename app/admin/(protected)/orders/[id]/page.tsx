"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { adminTheme as t } from "@/lib/admin/theme";

// ── Types ──────────────────────────────────────────────────────────────────

type OrderItem = {
  id: string;
  product_id: string;
  sku: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  image_url: string;
  product_name: string;
};

type InternalNote = {
  id: string;
  author_id: string | null;
  author_name: string;
  content: string;
  created_at: string;
};

type TimelineEvent = {
  id: string;
  event_type: string;
  description: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

type OrderDetail = {
  id: string;
  order_number: string;
  status: string;
  shipping_status: string;
  payment_status: string;
  total: number;
  subtotal: number;
  shipping_amount: number;
  tax_amount: number;
  discount_amount: number;
  refund_amount: number | null;
  currency: string;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  customer_notes: string | null;
  shipping_address: Record<string, string> | null;
  billing_address: Record<string, string> | null;
  shipping_carrier: string | null;
  shipping_service: string | null;
  tracking_number: string | null;
  tracking_url: string | null;
  shipping_label_url: string | null;
  promo_code: string | null;
  stripe_payment_intent_id: string | null;
  refund_reason: string | null;
  cancelled_at: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
  created_at: string;
  updated_at: string;
  store_name: string;
  store_slug: string;
  items: OrderItem[];
  internal_notes: InternalNote[];
  timeline: TimelineEvent[];
};

// ── Constants ──────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  pending:            "bg-yellow-50 text-yellow-700",
  confirmed:          "bg-blue-50 text-blue-700",
  processing:         "bg-blue-50 text-blue-700",
  shipped:            "bg-purple-50 text-purple-700",
  delivered:          "bg-green-50 text-green-700",
  cancelled:          "bg-red-50 text-red-600",
  refunded:           "bg-gray-100 text-gray-500",
  paid:               "bg-green-50 text-green-700",
  succeeded:          "bg-green-50 text-green-700",
  partially_refunded: "bg-orange-50 text-orange-600",
  failed:             "bg-red-50 text-red-600",
};

const NEXT_STATUSES: Record<string, Array<{ value: string; label: string; color: string }>> = {
  pending:    [{ value: "confirmed",  label: "Confirm Order",     color: "blue"   }],
  confirmed:  [{ value: "processing", label: "Mark Processing",   color: "blue"   }],
  processing: [{ value: "shipped",    label: "Mark as Shipped",   color: "purple" }],
  shipped:    [{ value: "delivered",  label: "Mark as Delivered", color: "green"  }],
};

const ACTION_BTN: Record<string, string> = {
  blue:   "rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50",
  purple: "rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-700 disabled:opacity-50",
  green:  "rounded-lg bg-[#2D8C54] px-4 py-2 text-sm font-semibold text-white hover:bg-[#247043] disabled:opacity-50",
};

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
function fmtDt(d: string) {
  return new Date(d).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}

function AddressBlock({ address }: { address: Record<string, string> }) {
  const { name, line1, line2, city, state, postal_code, country } = address;
  return (
    <div className="text-[13px] leading-relaxed text-gray-700">
      {name && <p className="font-semibold">{name}</p>}
      {line1 && <p>{line1}</p>}
      {line2 && <p>{line2}</p>}
      <p>{[city, state, postal_code].filter(Boolean).join(", ")} {country}</p>
    </div>
  );
}

// ── Component ──────────────────────────────────────────────────────────────

export default function AdminOrderDetailPage() {
  const params = useParams<{ id: string }>();
  const orderId = useMemo(() => params?.id ?? "", [params]);

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Ship modal
  const [shipModalOpen, setShipModalOpen] = useState(false);
  const [carrier, setCarrier] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [trackingUrl, setTrackingUrl] = useState("");

  // Cancel modal
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelRefund, setCancelRefund] = useState(true);

  // Refund modal
  const [refundModalOpen, setRefundModalOpen] = useState(false);
  const [refundAmount, setRefundAmount] = useState("");
  const [refundReason, setRefundReason] = useState("");
  const [restoreInventory, setRestoreInventory] = useState(false);

  // Internal note
  const [noteContent, setNoteContent] = useState("");
  const [addingNote, setAddingNote] = useState(false);

  const load = useCallback(async () => {
    if (!orderId) return;
    setLoading(true); setError(null);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, { cache: "no-store" });
      const data = (await res.json()) as OrderDetail & { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to load order");
      setOrder(data);
      setCarrier(data.shipping_carrier ?? "");
      setTrackingNumber(data.tracking_number ?? "");
      setTrackingUrl(data.tracking_url ?? "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error");
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => { void load(); }, [load]);

  function flash(msg: string, isError = false) {
    if (isError) { setActionError(msg); setTimeout(() => setActionError(null), 4000); }
    else          { setActionMsg(msg);  setTimeout(() => setActionMsg(null), 3000); }
  }

  async function updateStatus(status: string, note?: string) {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/status`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status, note }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Status update failed");
      flash(`Order marked as ${status}`);
      await load();
    } catch (err) {
      flash(err instanceof Error ? err.message : "Action failed", true);
    } finally {
      setBusy(false);
    }
  }

  async function handleShip() {
    setBusy(true);
    try {
      if (trackingNumber || carrier || trackingUrl) {
        const res = await fetch(`/api/admin/orders/${orderId}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            tracking_number: trackingNumber || null,
            tracking_url: trackingUrl || null,
            shipping_carrier: carrier || null,
          }),
        });
        if (!res.ok) {
          const d = (await res.json()) as { error?: string };
          throw new Error(d.error ?? "Failed to save tracking info");
        }
      }
      const note = trackingNumber
        ? `Shipped via ${carrier || "carrier"} — tracking: ${trackingNumber}`
        : undefined;
      await updateStatus("shipped", note);
      setShipModalOpen(false);
    } catch (err) {
      flash(err instanceof Error ? err.message : "Ship failed", true);
    } finally {
      setBusy(false);
    }
  }

  async function handleCancel() {
    if (!cancelReason.trim()) { flash("Cancellation reason is required", true); return; }
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/cancel`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ reason: cancelReason, refund: cancelRefund }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Cancel failed");
      flash("Order cancelled");
      setCancelModalOpen(false); setCancelReason("");
      await load();
    } catch (err) {
      flash(err instanceof Error ? err.message : "Cancel failed", true);
    } finally {
      setBusy(false);
    }
  }

  async function handleRefund() {
    if (!refundReason.trim()) { flash("Refund reason is required", true); return; }
    setBusy(true);
    try {
      const body: Record<string, unknown> = { reason: refundReason, restore_inventory: restoreInventory };
      const amt = parseFloat(refundAmount);
      if (!isNaN(amt) && amt > 0) body.amount = amt;
      const res = await fetch(`/api/admin/orders/${orderId}/refund`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Refund failed");
      flash("Refund processed");
      setRefundModalOpen(false); setRefundAmount(""); setRefundReason(""); setRestoreInventory(false);
      await load();
    } catch (err) {
      flash(err instanceof Error ? err.message : "Refund failed", true);
    } finally {
      setBusy(false);
    }
  }

  async function handleAddNote() {
    if (!noteContent.trim()) return;
    setAddingNote(true);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/notes`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ content: noteContent }),
      });
      if (!res.ok) throw new Error("Failed to add note");
      setNoteContent("");
      await load();
    } catch (err) {
      flash(err instanceof Error ? err.message : "Note failed", true);
    } finally {
      setAddingNote(false);
    }
  }

  if (loading) return <div className={t.alertLoading}>Loading order…</div>;
  if (error || !order) {
    return (
      <div className="space-y-4">
        <div className={t.alertError}>{error ?? "Order not found"}</div>
        <Link href="/admin/orders" className={t.btnOutline}>← Back to Orders</Link>
      </div>
    );
  }

  const nextActions = NEXT_STATUSES[order.status] ?? [];
  const canCancel = !["delivered", "cancelled", "refunded"].includes(order.status);
  const canRefund = ["delivered", "shipped"].includes(order.status) && order.payment_status === "succeeded";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Link href="/admin/orders" className="text-[13px] text-gray-400 hover:text-gray-600">Orders</Link>
            <span className="text-gray-300">/</span>
            <span className="font-mono text-[13px] text-gray-600">{order.order_number}</span>
          </div>
          <h1 className={`mt-1 text-xl font-bold ${t.heading}`}>Order #{order.order_number}</h1>
          <p className={`text-[13px] ${t.muted}`}>
            {order.store_name && <span className="mr-2">{order.store_name} ·</span>}
            Placed {fmtDt(order.created_at)}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {actionMsg && <span className="text-[12px] text-green-600">{actionMsg}</span>}
          {actionError && <span className="text-[12px] text-red-600">{actionError}</span>}

          {nextActions.map((action) =>
            action.value === "shipped" ? (
              <button key={action.value} onClick={() => setShipModalOpen(true)} disabled={busy} className={ACTION_BTN[action.color]}>
                {action.label}
              </button>
            ) : (
              <button key={action.value} onClick={() => void updateStatus(action.value)} disabled={busy} className={ACTION_BTN[action.color]}>
                {action.label}
              </button>
            )
          )}
          {canRefund && (
            <button onClick={() => setRefundModalOpen(true)} disabled={busy}
              className="rounded-lg border border-orange-200 px-3 py-2 text-sm font-medium text-orange-600 hover:bg-orange-50 disabled:opacity-50">
              Refund
            </button>
          )}
          {canCancel && (
            <button onClick={() => setCancelModalOpen(true)} disabled={busy}
              className="rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50">
              Cancel Order
            </button>
          )}
        </div>
      </div>

      {/* Status bar */}
      <div className="grid gap-3 rounded-xl border border-gray-200 bg-white px-5 py-4 shadow-sm sm:grid-cols-2 md:grid-cols-4">
        <div>
          <p className="text-[11px] uppercase tracking-wide text-gray-400">Order Status</p>
          <span className={`mt-1 inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${STATUS_COLORS[order.status] ?? "bg-gray-100 text-gray-500"}`}>
            {order.status.replace(/_/g, " ")}
          </span>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-wide text-gray-400">Shipping</p>
          <span className={`mt-1 inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${STATUS_COLORS[order.shipping_status] ?? "bg-gray-100 text-gray-500"}`}>
            {order.shipping_status.replace(/_/g, " ")}
          </span>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-wide text-gray-400">Payment</p>
          <span className={`mt-1 inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${STATUS_COLORS[order.payment_status] ?? "bg-gray-100 text-gray-500"}`}>
            {order.payment_status.replace(/_/g, " ")}
          </span>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-wide text-gray-400">Total</p>
          <p className="mt-1 text-sm font-bold text-gray-900">${order.total.toFixed(2)}</p>
          {order.refund_amount != null && (
            <p className="text-[11px] text-orange-500">Refunded: ${order.refund_amount.toFixed(2)}</p>
          )}
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid gap-5 lg:grid-cols-3">
        {/* Left (2/3) */}
        <div className="space-y-5 lg:col-span-2">

          {/* Items */}
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-100 px-5 py-3">
              <p className="text-[13px] font-semibold text-gray-900">Items ({order.items.length})</p>
            </div>
            <div className="divide-y divide-gray-50 px-5">
              {order.items.map((item) => (
                <div key={item.id} className="flex items-center gap-3 py-3">
                  {item.image_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.image_url} alt={item.product_name} className="h-12 w-12 rounded-lg border border-gray-100 object-cover" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-800">{item.product_name}</p>
                    <p className="text-[11px] text-gray-400">SKU: {item.sku || "—"} · Qty: {item.quantity} × ${item.unit_price.toFixed(2)}</p>
                  </div>
                  <p className="text-sm font-semibold text-gray-900">${item.total_price.toFixed(2)}</p>
                </div>
              ))}
            </div>
            <div className="space-y-1 border-t border-gray-100 px-5 py-3">
              <div className="flex justify-between text-[13px] text-gray-500">
                <span>Subtotal</span><span>${order.subtotal.toFixed(2)}</span>
              </div>
              {order.shipping_amount > 0 && (
                <div className="flex justify-between text-[13px] text-gray-500">
                  <span>Shipping</span><span>${order.shipping_amount.toFixed(2)}</span>
                </div>
              )}
              {order.tax_amount > 0 && (
                <div className="flex justify-between text-[13px] text-gray-500">
                  <span>Tax</span><span>${order.tax_amount.toFixed(2)}</span>
                </div>
              )}
              {order.discount_amount > 0 && (
                <div className="flex justify-between text-[13px] text-green-600">
                  <span>Discount {order.promo_code && `(${order.promo_code})`}</span>
                  <span>−${order.discount_amount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-gray-100 pt-1 text-sm font-bold text-gray-900">
                <span>Total</span><span>${order.total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Internal notes */}
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-100 px-5 py-3">
              <p className="text-[13px] font-semibold text-gray-900">Internal Notes</p>
            </div>
            <div className="space-y-3 px-5 py-4">
              <div className="flex gap-2">
                <textarea
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  placeholder="Add a note visible only to admins…"
                  rows={2}
                  className={`${t.input} resize-none`}
                />
                <button onClick={() => void handleAddNote()} disabled={addingNote || !noteContent.trim()} className={`${t.btnPrimary} shrink-0`}>
                  {addingNote ? "…" : "Add"}
                </button>
              </div>
              {order.internal_notes.length === 0 ? (
                <p className="text-[13px] text-gray-400">No internal notes.</p>
              ) : (
                order.internal_notes.map((note) => (
                  <div key={note.id} className="rounded-lg border border-yellow-100 bg-yellow-50 px-3 py-2.5">
                    <p className="whitespace-pre-line text-[13px] text-gray-700">{note.content}</p>
                    <p className="mt-1 text-[11px] text-gray-400">{note.author_name} · {fmtDt(note.created_at)}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Timeline */}
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-100 px-5 py-3">
              <p className="text-[13px] font-semibold text-gray-900">Timeline</p>
            </div>
            <div className="px-5 py-4">
              {order.timeline.length === 0 ? (
                <p className="text-[13px] text-gray-400">No events yet.</p>
              ) : (
                <div className="space-y-3">
                  {order.timeline.map((event) => (
                    <div key={event.id} className="flex gap-3 text-sm">
                      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#2D8C54]" />
                      <div>
                        <p className="text-gray-700">{event.description}</p>
                        <p className="text-[11px] text-gray-400">{event.event_type} · {fmtDt(event.created_at)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right (1/3) */}
        <div className="space-y-5">
          {/* Customer */}
          <div className="rounded-xl border border-gray-200 bg-white px-5 py-4 shadow-sm">
            <p className="mb-3 text-[13px] font-semibold text-gray-900">Customer</p>
            <div className="space-y-1">
              <p className="text-sm font-medium text-gray-800">
                {order.customer_name ?? <span className="italic text-gray-400">No name</span>}
              </p>
              {order.customer_email && <p className="text-[13px] text-gray-500">{order.customer_email}</p>}
              {order.customer_phone && <p className="text-[13px] text-gray-500">{order.customer_phone}</p>}
              {order.customer_email && (
                <Link href={`/admin/orders?customer_email=${encodeURIComponent(order.customer_email)}`}
                  className="mt-2 block text-[12px] text-[#2D8C54] hover:underline">
                  All orders from this customer →
                </Link>
              )}
            </div>
            {order.customer_notes && (
              <div className="mt-3 border-t border-gray-100 pt-3">
                <p className="text-[11px] uppercase tracking-wide text-gray-400">Customer Note</p>
                <p className="mt-1 text-[13px] italic text-gray-600">"{order.customer_notes}"</p>
              </div>
            )}
          </div>

          {/* Shipping address */}
          {order.shipping_address && Object.keys(order.shipping_address).length > 0 && (
            <div className="rounded-xl border border-gray-200 bg-white px-5 py-4 shadow-sm">
              <p className="mb-3 text-[13px] font-semibold text-gray-900">Ship To</p>
              <AddressBlock address={order.shipping_address} />
            </div>
          )}

          {/* Tracking */}
          <div className="rounded-xl border border-gray-200 bg-white px-5 py-4 shadow-sm">
            <p className="mb-3 text-[13px] font-semibold text-gray-900">Shipping & Tracking</p>
            <div className="space-y-2 text-[13px]">
              {order.shipping_carrier && (
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-gray-400">Carrier</p>
                  <p className="mt-0.5 text-gray-700">{order.shipping_carrier}</p>
                </div>
              )}
              {order.shipping_service && (
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-gray-400">Service</p>
                  <p className="mt-0.5 text-gray-700">{order.shipping_service}</p>
                </div>
              )}
              <div>
                <p className="text-[11px] uppercase tracking-wide text-gray-400">Tracking Number</p>
                {order.tracking_number ? (
                  order.tracking_url ? (
                    <a href={order.tracking_url} target="_blank" rel="noopener noreferrer"
                      className="mt-0.5 block font-mono text-[12px] text-[#2D8C54] hover:underline">
                      {order.tracking_number}
                    </a>
                  ) : (
                    <p className="mt-0.5 font-mono text-[12px] text-gray-700">{order.tracking_number}</p>
                  )
                ) : (
                  <p className="mt-0.5 italic text-gray-300">Not set</p>
                )}
              </div>
              {order.shipped_at && (
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-gray-400">Shipped</p>
                  <p className="mt-0.5 text-gray-700">{fmtDate(order.shipped_at)}</p>
                </div>
              )}
              {order.delivered_at && (
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-gray-400">Delivered</p>
                  <p className="mt-0.5 text-gray-700">{fmtDate(order.delivered_at)}</p>
                </div>
              )}
              {order.shipping_label_url && (
                <a href={order.shipping_label_url} target="_blank" rel="noopener noreferrer"
                  className="mt-1 block rounded-md border border-gray-200 px-3 py-1.5 text-center text-[12px] font-medium text-gray-600 hover:border-gray-400">
                  Print Shipping Label
                </a>
              )}
            </div>
          </div>

          {/* Payment */}
          <div className="rounded-xl border border-gray-200 bg-white px-5 py-4 shadow-sm">
            <p className="mb-3 text-[13px] font-semibold text-gray-900">Payment</p>
            <div className="space-y-2 text-[13px]">
              <div>
                <p className="text-[11px] uppercase tracking-wide text-gray-400">Status</p>
                <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ${STATUS_COLORS[order.payment_status] ?? "bg-gray-100 text-gray-500"}`}>
                  {order.payment_status.replace(/_/g, " ")}
                </span>
              </div>
              {order.stripe_payment_intent_id && (
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-gray-400">Stripe PI</p>
                  <p className="mt-0.5 font-mono text-[11px] text-gray-500">{order.stripe_payment_intent_id}</p>
                </div>
              )}
              {order.refund_amount != null && (
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-gray-400">Refunded</p>
                  <p className="mt-0.5 font-semibold text-orange-500">${order.refund_amount.toFixed(2)}</p>
                  {order.refund_reason && <p className="text-[12px] text-gray-400">{order.refund_reason}</p>}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── SHIP MODAL ────────────────────────────────────────────────────────── */}
      {shipModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
            <div className="border-b border-gray-100 px-6 py-4">
              <h2 className="text-base font-bold text-gray-900">Mark as Shipped</h2>
              <p className="mt-0.5 text-[13px] text-gray-500">Add tracking info then confirm.</p>
            </div>
            <div className="space-y-3 px-6 py-5">
              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-gray-500">Carrier</label>
                <input value={carrier} onChange={(e) => setCarrier(e.target.value)} placeholder="e.g. UPS, FedEx, USPS" className={t.input} />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-gray-500">Tracking Number</label>
                <input value={trackingNumber} onChange={(e) => setTrackingNumber(e.target.value)} placeholder="Tracking number" className={t.input} />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-gray-500">Tracking URL (optional)</label>
                <input value={trackingUrl} onChange={(e) => setTrackingUrl(e.target.value)} placeholder="https://…" className={t.input} />
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-gray-100 px-6 py-4">
              <button onClick={() => setShipModalOpen(false)} className={t.btnOutline}>Cancel</button>
              <button onClick={() => void handleShip()} disabled={busy} className={ACTION_BTN.purple}>
                {busy ? "Saving…" : "Confirm Shipped"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── CANCEL MODAL ──────────────────────────────────────────────────────── */}
      {cancelModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
            <div className="border-b border-gray-100 px-6 py-4">
              <h2 className="text-base font-bold text-gray-900">Cancel Order</h2>
              <p className="mt-0.5 text-[13px] text-gray-500">This will cancel the order and restore inventory.</p>
            </div>
            <div className="space-y-3 px-6 py-5">
              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-gray-500">Reason *</label>
                <input value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} placeholder="Reason for cancellation" className={t.input} />
              </div>
              {order.payment_status === "succeeded" && (
                <label className="flex cursor-pointer items-center gap-2 text-[13px] text-gray-700">
                  <input type="checkbox" checked={cancelRefund} onChange={(e) => setCancelRefund(e.target.checked)} className="rounded" />
                  Issue full refund via Stripe
                </label>
              )}
            </div>
            <div className="flex justify-end gap-2 border-t border-gray-100 px-6 py-4">
              <button onClick={() => setCancelModalOpen(false)} className={t.btnOutline}>Back</button>
              <button onClick={() => void handleCancel()} disabled={busy || !cancelReason.trim()}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50">
                {busy ? "Cancelling…" : "Cancel Order"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── REFUND MODAL ──────────────────────────────────────────────────────── */}
      {refundModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
            <div className="border-b border-gray-100 px-6 py-4">
              <h2 className="text-base font-bold text-gray-900">Process Refund</h2>
              <p className="mt-0.5 text-[13px] text-gray-500">
                Leave amount blank to refund the full order total (${order.total.toFixed(2)}).
              </p>
            </div>
            <div className="space-y-3 px-6 py-5">
              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-gray-500">Refund Amount (USD)</label>
                <input type="number" min="0.01" step="0.01" max={order.total}
                  value={refundAmount} onChange={(e) => setRefundAmount(e.target.value)}
                  placeholder={`Full: $${order.total.toFixed(2)}`} className={t.input} />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-gray-500">Reason *</label>
                <input value={refundReason} onChange={(e) => setRefundReason(e.target.value)} placeholder="Reason for refund" className={t.input} />
              </div>
              <label className="flex cursor-pointer items-center gap-2 text-[13px] text-gray-700">
                <input type="checkbox" checked={restoreInventory} onChange={(e) => setRestoreInventory(e.target.checked)} className="rounded" />
                Restore inventory
              </label>
            </div>
            <div className="flex justify-end gap-2 border-t border-gray-100 px-6 py-4">
              <button onClick={() => setRefundModalOpen(false)} className={t.btnOutline}>Cancel</button>
              <button onClick={() => void handleRefund()} disabled={busy || !refundReason.trim()}
                className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700 disabled:opacity-50">
                {busy ? "Processing…" : "Process Refund"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
