import { ok } from "@/lib/utils/api";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export async function PUT(_: Request, { params }: { params: { id: string } }) {
  const admin = getSupabaseAdminClient();
  const { data: store, error: storeError } = await admin
    .from("stores")
    .select("id,name,type,business_name,logo_url,theme_config,ai_practitioner_name,stripe_connect_onboarded")
    .eq("id", params.id)
    .maybeSingle();
  if (storeError) return ok({ error: storeError.message }, { status: 500 });
  if (!store) return ok({ error: "Store not found" }, { status: 404 });

  const issues: string[] = [];
  if (!store.business_name) issues.push("Missing business name");
  // logo, colors, AI name, and Stripe are warned but not blocking (allow test stores to activate)
  const isDev = process.env.NODE_ENV !== "production";
  if (!store.logo_url && !isDev) issues.push("Missing logo_url");
  const colors = (store.theme_config as { colors?: Record<string, unknown> } | null)?.colors;
  if (!colors && !isDev) issues.push("Missing theme colors");
  if (!store.ai_practitioner_name && !isDev) issues.push("Missing ai_practitioner_name");
  if (store.type !== "standalone" && !store.stripe_connect_onboarded && !isDev) issues.push("Stripe Connect not completed");

  const { count: enabledCount, error: countError } = await admin
    .from("store_products")
    .select("id", { count: "exact", head: true })
    .eq("store_id", params.id)
    .eq("enabled", true);
  if (countError) return ok({ error: countError.message }, { status: 500 });
  if (!enabledCount) issues.push("No enabled products");

  if (issues.length > 0) {
    return ok({ store_id: params.id, ready: false, issues }, { status: 400 });
  }

  const { error: updateError } = await admin
    .from("stores")
    .update({ is_active: true, updated_at: new Date().toISOString() })
    .eq("id", params.id);
  if (updateError) return ok({ error: updateError.message }, { status: 500 });

  return ok({ store_id: params.id, status: "active", ready: true });
}
