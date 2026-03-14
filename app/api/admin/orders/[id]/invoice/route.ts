import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { ok } from "@/lib/utils/api";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const admin = getSupabaseAdminClient();
  const { data: order } = await admin
    .from("orders")
    .select("id,order_number,created_at,customer_name,customer_email,shipping_address,subtotal_cents,shipping_cents,tax_cents,discount_cents,total_cents,payment_status,store_id,stores:store_id(name)")
    .eq("id", params.id)
    .maybeSingle();
  if (!order) return ok({ error: "Order not found" }, { status: 404 });

  const { data: items } = await admin
    .from("order_items")
    .select("sku,title_snapshot,quantity,unit_price_cents,products:product_id(name,sku)")
    .eq("order_id", params.id);

  const store = Array.isArray(order.stores) ? order.stores[0] : order.stores;
  const rows = (items || [])
    .map((item) => {
      const product = Array.isArray(item.products) ? item.products[0] : item.products;
      const sku = item.sku || product?.sku || "";
      const title = item.title_snapshot || product?.name || "Item";
      const unit = (item.unit_price_cents || 0) / 100;
      const line = unit * (item.quantity || 0);
      return `<tr><td>${sku}</td><td>${title}</td><td>${item.quantity}</td><td>$${unit.toFixed(2)}</td><td>$${line.toFixed(2)}</td></tr>`;
    })
    .join("");

  const html = `<!doctype html><html><head><meta charset="utf-8"/><title>Invoice ${order.order_number}</title></head>
  <body style="font-family: Arial, sans-serif; padding: 24px;">
    <h1>${store?.name || "Store"} — Invoice</h1>
    <p>Invoice #: INV-${order.order_number}<br/>Order #: ${order.order_number}<br/>Date: ${new Date(order.created_at).toLocaleString()}</p>
    <p><strong>Bill To:</strong><br/>${order.customer_name || ""}<br/>${order.customer_email || ""}</p>
    <table border="1" cellpadding="8" cellspacing="0" style="border-collapse: collapse; width: 100%;">
      <thead><tr><th>SKU</th><th>Description</th><th>Qty</th><th>Unit</th><th>Total</th></tr></thead><tbody>${rows}</tbody>
    </table>
    <p>Subtotal: $${((order.subtotal_cents || 0) / 100).toFixed(2)}<br/>
       Shipping: $${((order.shipping_cents || 0) / 100).toFixed(2)}<br/>
       Tax: $${((order.tax_cents || 0) / 100).toFixed(2)}<br/>
       Discount: -$${((order.discount_cents || 0) / 100).toFixed(2)}<br/>
       <strong>Total: $${((order.total_cents || 0) / 100).toFixed(2)}</strong></p>
    <p>Payment Status: ${order.payment_status}</p>
  </body></html>`;

  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}
