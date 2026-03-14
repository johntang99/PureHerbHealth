import { handleApiError, ok } from "@/lib/utils/api";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getStripeClient } from "@/lib/stripe/client";

export async function POST(_: Request, { params }: { params: { id: string } }) {
  try {
    const admin = getSupabaseAdminClient();
    const stripe = getStripeClient();
    const { data: store, error: storeError } = await admin
      .from("stores")
      .select("id,slug,name,contact_email,stripe_connect_account_id")
      .eq("id", params.id)
      .maybeSingle();
    if (storeError) return ok({ error: storeError.message }, { status: 500 });
    if (!store) return ok({ error: "Store not found" }, { status: 404 });

    if (!stripe) {
      return ok({
        url: `https://connect.stripe.com/setup/c/stub-${store.id}`,
        account_id: store.stripe_connect_account_id || `acct_stub_${store.id.replace(/-/g, "").slice(0, 16)}`,
        mode: "stub",
      });
    }

    let accountId = store.stripe_connect_account_id;
    if (!accountId) {
      const account = await stripe.accounts.create({
        type: "standard",
        email: store.contact_email || undefined,
        metadata: {
          store_id: store.id,
          store_slug: store.slug,
          store_name: store.name,
        },
      });
      accountId = account.id;
      const { error: updateError } = await admin.from("stores").update({ stripe_connect_account_id: account.id }).eq("id", store.id);
      if (updateError) return ok({ error: updateError.message }, { status: 500 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3005";
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      type: "account_onboarding",
      refresh_url: `${appUrl}/admin/stores/${store.id}/stripe?retry=true`,
      return_url: `${appUrl}/admin/stores/${store.id}/stripe?success=true`,
    });

    return ok({
      url: accountLink.url,
      account_id: accountId,
      mode: "stripe",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Stripe onboarding failed";
    if (message.toLowerCase().includes("signed up for connect")) {
      return ok({
        url: `https://connect.stripe.com/setup/c/stub-${params.id}`,
        account_id: `acct_stub_${params.id.replace(/-/g, "").slice(0, 16)}`,
        mode: "stub",
        warning: message,
      });
    }
    return handleApiError(error);
  }
}
