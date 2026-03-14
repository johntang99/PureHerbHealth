import Stripe from "stripe";

let stripeClient: Stripe | null = null;

export function hasUsableStripeKey() {
  const key = process.env.STRIPE_SECRET_KEY;
  return Boolean(key && !key.includes("..."));
}

export function getStripeClient() {
  if (!hasUsableStripeKey()) return null;
  if (!stripeClient) {
    stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: "2026-02-25.clover",
      typescript: true,
    });
  }
  return stripeClient;
}
