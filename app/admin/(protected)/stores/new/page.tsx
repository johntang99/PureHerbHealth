"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

const STEPS = [
  { id: "o1", label: "Intake",          icon: "🏢" },
  { id: "o2", label: "Branding",        icon: "🎨" },
  { id: "o3", label: "Products",        icon: "📦" },
  { id: "o4", label: "Stripe Connect",  icon: "💳" },
  { id: "o5", label: "AI Config",       icon: "🤖" },
  { id: "o6", label: "Review",          icon: "👁" },
  { id: "o7", label: "Go Live",         icon: "🚀" },
] as const;

type ProductOption = { id: string; name: string; price: number };

const input =
  "h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-[#2D8C54] focus:ring-2 focus:ring-[#2D8C54]/20";

export default function AdminStoreWizardPage() {
  const router = useRouter();
  const [step, setStep]         = useState(0);
  const [storeId, setStoreId]   = useState<string | null>(null);
  const [storeSlug, setStoreSlug] = useState<string | null>(null);
  const [saving, setSaving]     = useState(false);
  const [message, setMessage]   = useState("");
  const [error, setError]       = useState("");

  const [intake, setIntake] = useState({
    storeName: "", businessName: "", contactEmail: "", supportEmail: "", phone: "", type: "embedded",
  });
  const [branding, setBranding] = useState({ logoUrl: "", brand500: "#2D8C54", accent500: "#D4A843" });
  const [aiConfig, setAiConfig] = useState({ practitionerName: "", practitionerTitle: "", bookingUrl: "" });
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<Record<string, boolean>>({});
  const [stripeLink, setStripeLink] = useState("");
  const [activationIssues, setActivationIssues] = useState<string[]>([]);
  const [activated, setActivated] = useState(false);

  const selectedCount = useMemo(() => Object.values(selectedProducts).filter(Boolean).length, [selectedProducts]);

  async function handleSave() {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      /* ── O1 Intake ── */
      if (step === 0) {
        if (!intake.storeName.trim()) throw new Error("Store name is required.");
        const res = await fetch("/api/stores", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: intake.type,
            intake: {
              business: {
                storeName: intake.storeName,
                name: intake.businessName || intake.storeName,
                email: intake.contactEmail || undefined,
                supportEmail: intake.supportEmail || undefined,
                phone: intake.phone || undefined,
              },
            },
          }),
        });
        const data = (await res.json()) as { store_id?: string; store_slug?: string; error?: string };
        if (!res.ok || !data.store_id) throw new Error(data.error || "Failed to create store");
        setStoreId(data.store_id);
        setStoreSlug(data.store_slug || null);
        setMessage(`Store "${data.store_slug}" created successfully.`);
        setTimeout(() => { setMessage(""); setStep(1); }, 800);
        return;
      }

      /* ── O2 Branding ── */
      if (step === 1) {
        if (!storeId) throw new Error("Complete O1 first.");
        const res = await fetch(`/api/stores/${storeId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            logo_url: branding.logoUrl || undefined,
            theme_config: { colors: { brand_500: branding.brand500, accent_500: branding.accent500 } },
          }),
        });
        const data = (await res.json()) as { error?: string };
        if (!res.ok) throw new Error(data.error || "Failed to save branding");
        setMessage("Branding saved.");
        setTimeout(() => { setMessage(""); setStep(2); }, 800);
        return;
      }

      /* ── O3 Products ── */
      if (step === 2) {
        if (!storeId) throw new Error("Complete O1 first.");
        if (products.length === 0) {
          const productRes = await fetch("/api/products?per_page=50&locale=en", { cache: "no-store" });
          const productJson = (await productRes.json()) as { products?: Array<{ id: string; name: string; price: number }> };
          const items = (productJson.products || []).map((p) => ({ id: p.id, name: p.name, price: p.price }));
          setProducts(items);
          const defaults: Record<string, boolean> = {};
          for (const p of items) defaults[p.id] = true;
          setSelectedProducts(defaults);
          setMessage("Products loaded. Adjust selection then click Save again.");
          return;
        }
        const payload = Object.entries(selectedProducts)
          .filter(([, v]) => v)
          .map(([productId], idx) => ({ product_id: productId, enabled: true, sort_order: idx }));
        const res = await fetch(`/api/stores/${storeId}/products`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ products: payload }),
        });
        const data = (await res.json()) as { error?: string };
        if (!res.ok) throw new Error(data.error || "Failed to save product curation");
        setMessage(`${payload.length} products curated.`);
        setTimeout(() => { setMessage(""); setStep(3); }, 800);
        return;
      }

      /* ── O4 Stripe Connect ── */
      if (step === 3) {
        if (!storeId) throw new Error("Complete O1 first.");
        const res = await fetch(`/api/stores/${storeId}/stripe-onboard`, { method: "POST" });
        const data = (await res.json()) as { url?: string; error?: string; mode?: string; warning?: string };
        if (!res.ok || !data.url) throw new Error(data.error || "Failed to start Stripe onboarding");
        setStripeLink(data.url);
        setMessage(data.mode === "stub" ? `Stub mode: ${data.warning || "Stripe Connect not enabled"}` : "Stripe link generated — open it to complete onboarding.");
        return;
      }

      /* ── O5 AI Config ── */
      if (step === 4) {
        if (!storeId) throw new Error("Complete O1 first.");
        const res = await fetch(`/api/stores/${storeId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ai_practitioner_name: aiConfig.practitionerName || undefined,
            ai_practitioner_title: aiConfig.practitionerTitle || undefined,
            ai_booking_url: aiConfig.bookingUrl || undefined,
          }),
        });
        const data = (await res.json()) as { error?: string };
        if (!res.ok) throw new Error(data.error || "Failed to save AI config");
        setMessage("AI configuration saved.");
        setTimeout(() => { setMessage(""); setStep(5); }, 800);
        return;
      }

      /* ── O6 Review ── */
      if (step === 5) {
        setStep(6);
        return;
      }

      /* ── O7 Go Live ── */
      if (step === 6) {
        if (!storeId) throw new Error("Complete O1 first.");
        const res = await fetch(`/api/stores/${storeId}/activate`, { method: "PUT" });
        const data = (await res.json()) as { ready?: boolean; status?: string; issues?: string[]; error?: string };
        if (!res.ok || !data.ready) {
          setActivationIssues(data.issues || [data.error || "Activation blocked"]);
          throw new Error("Readiness checks failed — see issues below.");
        }
        setActivated(true);
        setMessage("Store is now LIVE!");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">New Store Wizard</h1>
        <p className="mt-0.5 text-[13px] text-gray-500">Complete all steps to onboard a new store onto the platform.</p>
      </div>

      {/* Step progress */}
      <div className="flex items-center gap-0">
        {STEPS.map((s, idx) => {
          const done = idx < step;
          const active = idx === step;
          return (
            <div key={s.id} className="flex flex-1 items-center">
              <button
                type="button"
                onClick={() => { if (done) setStep(idx); }}
                className={`flex flex-col items-center gap-1 flex-1 ${done ? "cursor-pointer" : "cursor-default"}`}
              >
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-[13px] font-semibold transition
                    ${active ? "bg-[#2D8C54] text-white ring-4 ring-[#2D8C54]/20" : done ? "bg-[#2D8C54] text-white" : "bg-gray-100 text-gray-400"}`}
                >
                  {done ? "✓" : idx + 1}
                </div>
                <span className={`text-[10px] font-medium ${active ? "text-[#2D8C54]" : done ? "text-gray-600" : "text-gray-400"}`}>
                  {s.label}
                </span>
              </button>
              {idx < STEPS.length - 1 && (
                <div className={`mb-4 h-0.5 flex-1 ${idx < step ? "bg-[#2D8C54]" : "bg-gray-200"}`} />
              )}
            </div>
          );
        })}
      </div>

      {/* Step card */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-center gap-2.5">
          <span className="text-xl">{STEPS[step].icon}</span>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#2D8C54]">Step {step + 1} of {STEPS.length}</p>
            <h2 className="text-[17px] font-bold text-gray-900">{STEPS[step].label}</h2>
          </div>
          {storeId && (
            <span className="ml-auto rounded-full bg-gray-100 px-2.5 py-1 font-mono text-[11px] text-gray-500">
              {storeSlug}
            </span>
          )}
        </div>

        {/* ── O1 Intake ── */}
        {step === 0 && (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-1.5">
                <span className="text-[13px] font-medium text-gray-700">Store Name <span className="text-red-500">*</span></span>
                <input className={input} placeholder="e.g. Dr. Chen Wellness" value={intake.storeName} onChange={(e) => setIntake((v) => ({ ...v, storeName: e.target.value }))} />
              </label>
              <label className="space-y-1.5">
                <span className="text-[13px] font-medium text-gray-700">Business Name</span>
                <input className={input} placeholder="Legal business name" value={intake.businessName} onChange={(e) => setIntake((v) => ({ ...v, businessName: e.target.value }))} />
              </label>
              <label className="space-y-1.5">
                <span className="text-[13px] font-medium text-gray-700">Contact Email</span>
                <input type="email" className={input} placeholder="owner@clinic.com" value={intake.contactEmail} onChange={(e) => setIntake((v) => ({ ...v, contactEmail: e.target.value }))} />
              </label>
              <label className="space-y-1.5">
                <span className="text-[13px] font-medium text-gray-700">Support Email</span>
                <input type="email" className={input} placeholder="support@clinic.com" value={intake.supportEmail} onChange={(e) => setIntake((v) => ({ ...v, supportEmail: e.target.value }))} />
              </label>
              <label className="space-y-1.5">
                <span className="text-[13px] font-medium text-gray-700">Phone</span>
                <input className={input} placeholder="+1 (555) 000-0000" value={intake.phone} onChange={(e) => setIntake((v) => ({ ...v, phone: e.target.value }))} />
              </label>
              <label className="space-y-1.5">
                <span className="text-[13px] font-medium text-gray-700">Store Type</span>
                <select className={input} value={intake.type} onChange={(e) => setIntake((v) => ({ ...v, type: e.target.value }))}>
                  <option value="embedded">Embedded (within platform)</option>
                  <option value="standalone">Standalone</option>
                </select>
              </label>
            </div>
          </div>
        )}

        {/* ── O2 Branding ── */}
        {step === 1 && (
          <div className="space-y-4">
            <label className="space-y-1.5">
              <span className="text-[13px] font-medium text-gray-700">Logo URL</span>
              <input className={input} placeholder="https://example.com/logo.png" value={branding.logoUrl} onChange={(e) => setBranding((v) => ({ ...v, logoUrl: e.target.value }))} />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-1.5">
                <span className="text-[13px] font-medium text-gray-700">Brand Color</span>
                <div className="flex gap-2">
                  <input type="color" className="h-10 w-12 cursor-pointer rounded-lg border border-gray-200 p-1" value={branding.brand500} onChange={(e) => setBranding((v) => ({ ...v, brand500: e.target.value }))} />
                  <input className={`${input} flex-1`} value={branding.brand500} onChange={(e) => setBranding((v) => ({ ...v, brand500: e.target.value }))} />
                </div>
              </label>
              <label className="space-y-1.5">
                <span className="text-[13px] font-medium text-gray-700">Accent Color</span>
                <div className="flex gap-2">
                  <input type="color" className="h-10 w-12 cursor-pointer rounded-lg border border-gray-200 p-1" value={branding.accent500} onChange={(e) => setBranding((v) => ({ ...v, accent500: e.target.value }))} />
                  <input className={`${input} flex-1`} value={branding.accent500} onChange={(e) => setBranding((v) => ({ ...v, accent500: e.target.value }))} />
                </div>
              </label>
            </div>
            {/* Preview */}
            <div className="rounded-lg border border-gray-100 p-4">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Preview</p>
              <div className="flex items-center gap-3">
                {branding.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={branding.logoUrl} alt="logo" className="h-8 w-8 rounded object-cover" />
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded font-bold text-white text-sm" style={{ backgroundColor: branding.brand500 }}>S</div>
                )}
                <div>
                  <div className="h-2 w-24 rounded" style={{ backgroundColor: branding.brand500 }} />
                  <div className="mt-1 h-1.5 w-16 rounded" style={{ backgroundColor: branding.accent500 }} />
                </div>
                <button className="ml-auto rounded-md px-3 py-1.5 text-xs font-semibold text-white" style={{ backgroundColor: branding.brand500 }}>
                  Shop Now
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── O3 Products ── */}
        {step === 2 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600">Select which products to enable for this store.</p>
              {products.length > 0 && (
                <span className="rounded-full bg-[#2D8C54]/10 px-2.5 py-0.5 text-[12px] font-semibold text-[#2D8C54]">
                  {selectedCount} / {products.length} selected
                </span>
              )}
            </div>
            {products.length === 0 ? (
              <div className="rounded-lg border border-dashed border-gray-200 py-8 text-center text-sm text-gray-400">
                Click <strong>Save Step</strong> to load the product catalog.
              </div>
            ) : (
              <>
                <div className="mb-1 flex gap-3 text-[12px]">
                  <button type="button" className="text-[#2D8C54] underline" onClick={() => { const all: Record<string, boolean> = {}; for (const p of products) all[p.id] = true; setSelectedProducts(all); }}>Select all</button>
                  <button type="button" className="text-gray-400 underline" onClick={() => setSelectedProducts({})}>Deselect all</button>
                </div>
                <div className="max-h-64 overflow-y-auto rounded-lg border border-gray-200 divide-y divide-gray-100">
                  {products.map((p) => (
                    <label key={p.id} className="flex cursor-pointer items-center gap-3 px-4 py-2.5 hover:bg-gray-50">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-gray-300 accent-[#2D8C54]"
                        checked={Boolean(selectedProducts[p.id])}
                        onChange={(e) => setSelectedProducts((prev) => ({ ...prev, [p.id]: e.target.checked }))}
                      />
                      <span className="flex-1 text-sm text-gray-800">{p.name}</span>
                      <span className="text-[12px] text-gray-400">${p.price.toFixed(2)}</span>
                    </label>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* ── O4 Stripe Connect ── */}
        {step === 3 && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Generate a Stripe Connect onboarding link for the store owner to connect their payment account.
            </p>
            <div className="rounded-lg border border-gray-100 bg-gray-50 p-4 text-[13px] text-gray-600 space-y-1">
              <p>• The store owner opens the link and completes Stripe&apos;s KYC flow</p>
              <p>• Payouts will go directly to their connected account</p>
              <p>• Platform fee is deducted automatically</p>
            </div>
            {stripeLink ? (
              <a
                href={stripeLink}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-lg bg-[#635BFF] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#4f48cc]"
              >
                Open Stripe Onboarding ↗
              </a>
            ) : (
              <p className="text-[13px] text-gray-400">Click <strong>Save Step</strong> to generate the onboarding link.</p>
            )}
          </div>
        )}

        {/* ── O5 AI Config ── */}
        {step === 4 && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">Configure the AI wellness advisor persona for this store.</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-1.5">
                <span className="text-[13px] font-medium text-gray-700">Practitioner Name</span>
                <input className={input} placeholder="Dr. Li Wei" value={aiConfig.practitionerName} onChange={(e) => setAiConfig((v) => ({ ...v, practitionerName: e.target.value }))} />
              </label>
              <label className="space-y-1.5">
                <span className="text-[13px] font-medium text-gray-700">Practitioner Title</span>
                <input className={input} placeholder="Licensed TCM Practitioner" value={aiConfig.practitionerTitle} onChange={(e) => setAiConfig((v) => ({ ...v, practitionerTitle: e.target.value }))} />
              </label>
              <label className="space-y-1.5 sm:col-span-2">
                <span className="text-[13px] font-medium text-gray-700">Booking URL <span className="text-gray-400 font-normal">(optional)</span></span>
                <input type="url" className={input} placeholder="https://clinic.com/book" value={aiConfig.bookingUrl} onChange={(e) => setAiConfig((v) => ({ ...v, bookingUrl: e.target.value }))} />
              </label>
            </div>
          </div>
        )}

        {/* ── O6 Review ── */}
        {step === 5 && (
          <div className="space-y-3">
            <p className="text-sm text-gray-600">Review all configuration before going live.</p>
            <div className="divide-y divide-gray-100 rounded-lg border border-gray-200 text-sm">
              {[
                ["Store Name", intake.storeName || "—"],
                ["Business Name", intake.businessName || intake.storeName || "—"],
                ["Contact Email", intake.contactEmail || "—"],
                ["Store Type", intake.type],
                ["Brand Color", branding.brand500],
                ["Logo URL", branding.logoUrl || "Not set"],
                ["Products Curated", selectedCount ? `${selectedCount} products` : "Not set"],
                ["Stripe Onboarding", stripeLink ? "Link generated" : "Not started"],
                ["AI Practitioner", aiConfig.practitionerName || "Not set"],
                ["Practitioner Title", aiConfig.practitionerTitle || "Not set"],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center gap-3 px-4 py-2.5">
                  <span className="w-40 shrink-0 text-[13px] text-gray-500">{label}</span>
                  <span className="text-[13px] font-medium text-gray-900">{value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── O7 Go Live ── */}
        {step === 6 && (
          <div className="space-y-4">
            {activated ? (
              <div className="rounded-lg bg-green-50 border border-green-200 px-5 py-6 text-center space-y-2">
                <p className="text-3xl">🎉</p>
                <p className="font-semibold text-green-800">Store is LIVE!</p>
                <p className="text-[13px] text-green-600">
                  <strong>{intake.storeName}</strong> ({storeSlug}) is now active on the platform.
                </p>
                <button
                  type="button"
                  className="mt-2 rounded-lg bg-[#2D8C54] px-4 py-2 text-sm font-semibold text-white hover:bg-[#22764a]"
                  onClick={() => router.push("/admin/stores")}
                >
                  View All Stores →
                </button>
              </div>
            ) : (
              <>
                <p className="text-sm text-gray-600">
                  Clicking <strong>Activate Store</strong> will run readiness checks and set the store as live.
                </p>
                <div className="rounded-lg border border-gray-100 bg-gray-50 p-4 text-[13px] text-gray-600 space-y-1">
                  <p className="font-semibold text-gray-700 mb-2">Readiness checklist:</p>
                  {[
                    ["Business name", !!intake.businessName || !!intake.storeName],
                    ["Logo set", !!branding.logoUrl],
                    ["Theme colors", !!branding.brand500],
                    ["Products curated", selectedCount > 0],
                    ["AI practitioner name", !!aiConfig.practitionerName],
                    ["Stripe Connect", !!stripeLink || intake.type === "standalone"],
                  ].map(([label, ok]) => (
                    <p key={label as string}>
                      <span className={ok ? "text-green-600" : "text-amber-500"}>{ok ? "✓" : "○"}</span>{" "}
                      {label as string}
                    </p>
                  ))}
                </div>
                {activationIssues.length > 0 && (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700 space-y-0.5">
                    <p className="font-semibold mb-1">Issues to resolve:</p>
                    {activationIssues.map((issue) => <p key={issue}>• {issue}</p>)}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Messages */}
      {message && <p className="rounded-lg bg-green-50 border border-green-200 px-4 py-2.5 text-sm font-medium text-green-700">{message}</p>}
      {error   && <p className="rounded-lg bg-red-50 border border-red-200 px-4 py-2.5 text-sm font-medium text-red-700">{error}</p>}

      {/* Navigation */}
      {!activated && (
        <div className="flex items-center gap-3">
          <button
            type="button"
            disabled={step === 0 || saving}
            onClick={() => { setError(""); setMessage(""); setStep((v) => Math.max(0, v - 1)); }}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40"
          >
            ← Back
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={handleSave}
            className="rounded-lg bg-[#2D8C54] px-6 py-2 text-sm font-semibold text-white hover:bg-[#22764a] disabled:opacity-60"
          >
            {saving ? "Saving…" : step === 6 ? "🚀 Activate Store" : "Save & Continue →"}
          </button>
          {step < STEPS.length - 1 && (
            <button
              type="button"
              disabled={saving}
              onClick={() => { setError(""); setMessage(""); setStep((v) => Math.min(STEPS.length - 1, v + 1)); }}
              className="text-sm text-gray-400 hover:text-gray-600"
            >
              Skip step
            </button>
          )}
        </div>
      )}
    </div>
  );
}
