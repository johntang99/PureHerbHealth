import { ok } from "@/lib/utils/api";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getStripeClient } from "@/lib/stripe/client";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const admin = getSupabaseAdminClient();
  const stripe = getStripeClient();
  const { data: store, error: storeError } = await admin
    .from("stores")
    .select("id,stripe_connect_account_id,stripe_connect_onboarded")
    .eq("id", params.id)
    .maybeSingle();
  if (storeError) return ok({ error: storeError.message }, { status: 500 });
  if (!store) return ok({ error: "Store not found" }, { status: 404 });

  if (!store.stripe_connect_account_id) {
    return ok({
      account_id: null,
      onboarded: false,
      charges_enabled: false,
      payouts_enabled: false,
      details_submitted: false,
      requirements: [],
      mode: stripe ? "stripe" : "stub",
    });
  }

  if (!stripe) {
    return ok({
      account_id: store.stripe_connect_account_id,
      onboarded: Boolean(store.stripe_connect_onboarded),
      charges_enabled: Boolean(store.stripe_connect_onboarded),
      payouts_enabled: Boolean(store.stripe_connect_onboarded),
      details_submitted: Boolean(store.stripe_connect_onboarded),
      requirements: [],
      mode: "stub",
    });
  }

  const account = await stripe.accounts.retrieve(store.stripe_connect_account_id);
  return ok({
    account_id: account.id,
    onboarded: Boolean(store.stripe_connect_onboarded),
    charges_enabled: account.charges_enabled,
    payouts_enabled: account.payouts_enabled,
    details_submitted: account.details_submitted,
    requirements: account.requirements?.currently_due || [],
    mode: "stripe",
  });
}
