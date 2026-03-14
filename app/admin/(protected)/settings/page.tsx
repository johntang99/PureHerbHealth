"use client";

import { useEffect, useState, useCallback } from "react";
import { adminTheme as t } from "@/lib/admin/theme";

type StoreSettings = {
  store_id: string;
  slug: string;
  name: string;
  settings: Record<string, unknown>;
};

type Section = {
  key: string;
  label: string;
  icon: string;
  fields: Array<{
    key: string;
    label: string;
    type: "text" | "email" | "url" | "toggle" | "textarea" | "number";
    placeholder?: string;
    description?: string;
  }>;
};

const SECTIONS: Section[] = [
  {
    key: "branding",
    label: "Branding",
    icon: "🎨",
    fields: [
      { key: "store_display_name", label: "Store Display Name", type: "text", placeholder: "pureHerbHealth" },
      { key: "tagline", label: "Tagline", type: "text", placeholder: "Traditional Wellness, Modern Science" },
      { key: "support_email", label: "Support Email", type: "email", placeholder: "support@example.com" },
      { key: "support_phone", label: "Support Phone", type: "text", placeholder: "+1 (555) 000-0000" },
      { key: "website_url", label: "Website URL", type: "url", placeholder: "https://pureherbhealth.com" },
    ],
  },
  {
    key: "commerce",
    label: "Commerce",
    icon: "🛒",
    fields: [
      { key: "free_shipping_threshold_cents", label: "Free Shipping Threshold ($)", type: "number", placeholder: "75", description: "Orders above this amount get free shipping." },
      { key: "low_stock_alert_threshold", label: "Low Stock Alert (units)", type: "number", placeholder: "10" },
      { key: "tax_rate_pct", label: "Default Tax Rate (%)", type: "number", placeholder: "0" },
      { key: "enable_afterpay", label: "Enable Afterpay / Buy Now Pay Later", type: "toggle" },
      { key: "enable_bundles", label: "Enable Bundle Products", type: "toggle" },
      { key: "enable_wishlists", label: "Enable Wishlists", type: "toggle" },
    ],
  },
  {
    key: "content",
    label: "Content & SEO",
    icon: "📄",
    fields: [
      { key: "meta_title_suffix", label: "SEO Title Suffix", type: "text", placeholder: "| pureHerbHealth" },
      { key: "default_meta_description", label: "Default Meta Description", type: "textarea", placeholder: "Premium TCM herbs and supplements." },
      { key: "google_analytics_id", label: "Google Analytics ID", type: "text", placeholder: "G-XXXXXXXXXX" },
      { key: "facebook_pixel_id", label: "Facebook Pixel ID", type: "text", placeholder: "123456789" },
    ],
  },
  {
    key: "notifications",
    label: "Notifications",
    icon: "🔔",
    fields: [
      { key: "notify_new_orders", label: "Email on New Order", type: "toggle" },
      { key: "notify_low_stock", label: "Email on Low Stock", type: "toggle" },
      { key: "notify_new_reviews", label: "Email on New Review", type: "toggle" },
      { key: "admin_notification_email", label: "Admin Notification Email", type: "email", placeholder: "admin@example.com" },
    ],
  },
];

export default function SettingsPage() {
  const [store, setStore] = useState<StoreSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [localSettings, setLocalSettings] = useState<Record<string, unknown>>({});
  const [activeSection, setActiveSection] = useState("branding");

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/settings", { cache: "no-store" });
    const d = (await res.json()) as StoreSettings;
    setStore(d);
    setLocalSettings(d.settings ?? {});
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  function setField(key: string, value: unknown) {
    setLocalSettings((s) => ({ ...s, [key]: value }));
  }

  function getField(key: string, type: string): string | boolean {
    const val = localSettings[key];
    if (type === "toggle") return Boolean(val);
    return String(val ?? "");
  }

  async function save() {
    setSaving(true);
    setError(null);
    const res = await fetch("/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ settings: localSettings }),
    });
    const d = (await res.json()) as StoreSettings & { error?: string };
    if (!res.ok) { setError(d.error ?? "Save failed"); setSaving(false); return; }
    setStore(d);
    setLocalSettings(d.settings ?? {});
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  if (loading) return <div className={t.alertLoading}>Loading settings…</div>;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className={`text-xl font-bold ${t.heading}`}>Platform Settings</h1>
          <p className={`text-[13px] ${t.muted}`}>{store?.name} · {store?.slug}</p>
        </div>
        <button type="button" disabled={saving} onClick={() => void save()} className={t.btnPrimary}>
          {saving ? "Saving…" : saved ? "✓ Saved" : "Save Changes"}
        </button>
      </div>

      {error && <div className={t.alertError}>{error}</div>}
      {saved && <div className={t.alertSuccess}>Settings saved successfully.</div>}

      <div className="flex gap-6">
        {/* Section nav */}
        <div className="w-44 shrink-0 space-y-0.5">
          {SECTIONS.map((s) => (
            <button
              key={s.key}
              type="button"
              onClick={() => setActiveSection(s.key)}
              className={[
                "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[13px] font-medium transition",
                activeSection === s.key
                  ? "bg-[#2D8C54]/10 text-[#2D8C54]"
                  : "text-gray-600 hover:bg-gray-100",
              ].join(" ")}
            >
              <span>{s.icon}</span>{s.label}
            </button>
          ))}
        </div>

        {/* Fields */}
        <div className="flex-1">
          {SECTIONS.filter((s) => s.key === activeSection).map((section) => (
            <div key={section.key} className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <p className={`mb-5 ${t.sectionLabel}`}>{section.icon} {section.label}</p>
              <div className="space-y-5">
                {section.fields.map((field) => (
                  <div key={field.key}>
                    <label className={`mb-1 block ${t.labelClass}`}>{field.label}</label>
                    {field.type === "toggle" ? (
                      <label className="inline-flex cursor-pointer items-center gap-3">
                        <div className="relative">
                          <input
                            type="checkbox"
                            className="peer sr-only"
                            checked={Boolean(getField(field.key, "toggle"))}
                            onChange={(e) => setField(field.key, e.target.checked)}
                          />
                          <div className="h-6 w-11 rounded-full bg-gray-200 peer-checked:bg-[#2D8C54] transition-colors" />
                          <div className="absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5" />
                        </div>
                        <span className="text-[13px] text-gray-700">{getField(field.key, "toggle") ? "Enabled" : "Disabled"}</span>
                      </label>
                    ) : field.type === "textarea" ? (
                      <textarea
                        rows={3}
                        value={getField(field.key, field.type) as string}
                        onChange={(e) => setField(field.key, e.target.value)}
                        placeholder={field.placeholder}
                        className={t.input}
                      />
                    ) : (
                      <input
                        type={field.type}
                        value={getField(field.key, field.type) as string}
                        onChange={(e) => setField(field.key, field.type === "number" ? Number(e.target.value) : e.target.value)}
                        placeholder={field.placeholder}
                        className={t.input}
                      />
                    )}
                    {field.description && (
                      <p className="mt-1 text-[11px] text-gray-400">{field.description}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
