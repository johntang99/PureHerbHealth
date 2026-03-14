import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { ok } from "@/lib/utils/api";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const admin = getSupabaseAdminClient();
  const { data: order } = await admin
    .from("orders")
    .select("id,order_number,created_at,customer_name,shipping_address,shipping_carrier,shipping_service,customer_notes,store_id,stores:store_id(name)")
    .eq("id", params.id)
    .maybeSingle();
  if (!order) return ok({ error: "Order not found" }, { status: 404 });

  const { data: items } = await admin
    .from("order_items")
    .select("sku,title_snapshot,quantity,products:product_id(name,sku)")
    .eq("order_id", params.id);

  const store = Array.isArray(order.stores) ? order.stores[0] : order.stores;
  const shippingAddress = (order.shipping_address || {}) as Record<string, string>;
  const rows = (items || [])
    .map((item) => {
      const product = Array.isArray(item.products) ? item.products[0] : item.products;
      const sku = item.sku || product?.sku || "";
      const title = item.title_snapshot || product?.name || "Item";
      return `<tr><td>${sku}</td><td>${title}</td><td>${item.quantity}</td></tr>`;
    })
    .join("");

  const html = `<!doctype html><html><head><meta charset="utf-8"/><title>Packing Slip ${order.order_number}</title></head>
  <body style="font-family: Arial, sans-serif; padding: 24px;">
    <h1>${store?.name || "Store"} — Packing Slip</h1>
    <p>Order: ${order.order_number}<br/>Date: ${new Date(order.created_at).toLocaleString()}</p>
    <p><strong>Ship To:</strong><br/>${shippingAddress.full_name || order.customer_name || ""}<br/>${shippingAddress.address_line_1 || ""} ${shippingAddress.address_line_2 || ""}<br/>${shippingAddress.city || ""}, ${shippingAddress.state || ""} ${shippingAddress.postal_code || ""}</p>
    <table border="1" cellpadding="8" cellspacing="0" style="border-collapse: collapse; width: 100%;">
      <thead><tr><th>SKU</th><th>Item</th><th>Qty</th></tr></thead><tbody>${rows}</tbody>
    </table>
    <p>Shipping: ${order.shipping_carrier || ""} ${order.shipping_service || ""}</p>
    <p>Customer Notes: ${order.customer_notes || "None"}</p>
  </body></html>`;

  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}
