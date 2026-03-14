import type { SupabaseClient } from "@supabase/supabase-js";

function prefixFromStoreSlug(slug: string) {
  return slug
    .split("-")
    .map((part) => part[0] || "")
    .join("")
    .toUpperCase()
    .slice(0, 3) || "PHH";
}

export async function generateOrderNumber(admin: SupabaseClient, storeSlug: string) {
  const prefix = prefixFromStoreSlug(storeSlug);
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const pattern = `${prefix}-${today}-%`;

  const { data, error } = await admin
    .from("orders")
    .select("order_number")
    .like("order_number", pattern)
    .order("created_at", { ascending: false })
    .limit(1);
  if (error) throw error;

  const latest = data?.[0]?.order_number;
  const seq = latest ? Number(latest.split("-")[2] ?? 0) + 1 : 1;
  return `${prefix}-${today}-${String(seq).padStart(3, "0")}`;
}
