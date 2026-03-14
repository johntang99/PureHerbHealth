"use client";

import { useState } from "react";

type Variant = "sidebar" | "inline" | "footer" | "post-quiz" | "post-purchase";

export function NewsletterSignup({ storeSlug, variant = "sidebar" }: { storeSlug: string; variant?: Variant }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const copy =
    variant === "inline"
      ? { title: "Get Weekly Wellness Tips", subtitle: "Short practical TCM guidance every week." }
      : variant === "footer"
        ? { title: "Stay Connected", subtitle: "Monthly insights, seasonal tips, and product education." }
        : variant === "post-purchase"
          ? { title: "Post-Purchase Guidance", subtitle: "Get usage guidance and care tips for your products." }
          : variant === "post-quiz"
            ? { title: "Element-Based Tips", subtitle: "Receive personalized tips aligned with your constitution result." }
            : { title: "Weekly TCM Insights", subtitle: "Get curated wellness tips and herb spotlights." };

  return (
    <form
      className="space-y-2 rounded border bg-slate-50 p-3"
      onSubmit={(event) => {
        event.preventDefault();
        setLoading(true);
        setStatus("");
        fetch("/api/newsletter/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, store_slug: storeSlug, source: variant }),
        })
          .then(async (response) => {
            const payload = (await response.json()) as { error?: string };
            if (!response.ok) throw new Error(payload.error || "Failed to subscribe.");
            setStatus("Check your inbox to confirm subscription.");
            setEmail("");
          })
          .catch((error: unknown) => {
            setStatus(error instanceof Error ? error.message : "Failed to subscribe.");
          })
          .finally(() => setLoading(false));
      }}
    >
      <p className="text-sm font-medium">{copy.title}</p>
      <p className="text-xs text-slate-600">{copy.subtitle}</p>
      <input
        type="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        placeholder="Email address"
        required
        className="w-full rounded border px-2 py-1 text-sm"
      />
      <button type="submit" disabled={loading} className="w-full rounded bg-brand px-3 py-1 text-sm text-white disabled:opacity-60">
        {loading ? "Subscribing..." : "Subscribe"}
      </button>
      {status ? <p className="text-xs text-slate-600">{status}</p> : null}
    </form>
  );
}
