"use client";

import { useEffect, useState } from "react";

type OrderState = {
  id: string;
  order_number: string;
  status: string;
  payment_status: string;
  shipping_status: string;
  total_cents: number;
  currency: string;
  items: Array<{
    id: string;
    quantity: number;
    unit_price_cents: number;
    product: { name: string };
  }>;
};

export function OrderConfirmation({ orderId }: { orderId: string }) {
  const [order, setOrder] = useState<OrderState | null>(null);
  const [isLoading, setLoading] = useState(true);
  const [pollCount, setPollCount] = useState(0);

  useEffect(() => {
    let timer: number | null = null;

    const load = async () => {
      const res = await fetch(`/api/orders/${orderId}`, { cache: "no-store" });
      const json = await res.json();
      if (res.ok) {
        setOrder(json);
        const done = json.payment_status === "succeeded" || json.status === "confirmed";
        if (!done && pollCount < 20) {
          timer = window.setTimeout(() => setPollCount((v) => v + 1), 1500);
        }
      }
      setLoading(false);
    };

    void load();
    return () => {
      if (timer) window.clearTimeout(timer);
    };
  }, [orderId, pollCount]);

  if (isLoading) return <p className="text-sm">Loading order status...</p>;
  if (!order) return <p className="text-sm text-red-600">Order not found.</p>;

  return (
    <section className="space-y-4">
      <div className="rounded border p-4">
        <h1 className="text-2xl font-semibold">Order {order.order_number}</h1>
        <p className="text-sm">Order status: {order.status}</p>
        <p className="text-sm">Payment status: {order.payment_status}</p>
        <p className="text-sm font-semibold">
          Total: ${(order.total_cents / 100).toFixed(2)} {order.currency.toUpperCase()}
        </p>
      </div>
      <div className="rounded border p-4">
        <h2 className="mb-2 text-sm font-semibold">Items</h2>
        <div className="space-y-2">
          {order.items.map((item) => (
            <p key={item.id} className="text-sm">
              {item.product.name} x {item.quantity}
            </p>
          ))}
        </div>
      </div>
    </section>
  );
}
