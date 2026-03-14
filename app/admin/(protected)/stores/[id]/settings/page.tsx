"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { DEFAULT_THEME_CONFIG, resolveThemeConfig } from "@/lib/theme/config";

type StorePayload = {
  id: string;
  slug: string;
  name: string;
  is_active: boolean;
  revenue_share_platform_pct: number;
  logo_url: string | null;
  theme_config: Record<string, unknown> | null;
  ai_practitioner_name: string | null;
  ai_practitioner_title: string | null;
  ai_booking_url: string | null;
  error?: string;
};

const inputCls = "w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 focus:border-[#2D8C54] focus:outline-none focus:ring-1 focus:ring-[#2D8C54]/20";
const labelCls = "text-[11px] font-semibold uppercase tracking-wide text-gray-400";

export default function StoreSettingsPage() {
  const params = useParams<{ id: string }>();
  const storeId = useMemo(() => params?.id || "", [params]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string>("");

  const [storeName, setStoreName] = useState("");
  const [storeSlug, setStoreSlug] = useState("");
  const [isActive, setIsActive] = useState(false);
  const [logoUrl, setLogoUrl] = useState("");
  const [brand500, setBrand500] = useState("#2D8C54");
  const [accent500, setAccent500] = useState("#D4A843");
  const [revenueSharePct, setRevenueSharePct] = useState(30);
  const [practitionerName, setPractitionerName] = useState("");
  const [practitionerTitle, setPractitionerTitle] = useState("");
  const [bookingUrl, setBookingUrl] = useState("");
  const [themeJsonText, setThemeJsonText] = useState(JSON.stringify(DEFAULT_THEME_CONFIG, null, 2));

  function updateThemeJson(mutator: (draft: Record<string, unknown>) => void) {
    try {
      const parsed = JSON.parse(themeJsonText) as Record<string, unknown>;
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return;
      const draft = { ...parsed };
      mutator(draft);
      setThemeJsonText(JSON.stringify(draft, null, 2));
    } catch {
      // Ignore parse errors during inline edits
    }
  }

  async function loadStore() {
    if (!storeId) return;
    setLoading(true);
    setError(null);
    setMessage("");
    try {
      const storesRes = await fetch("/api/stores", { cache: "no-store" });
      const storesJson = (await storesRes.json()) as { stores?: StorePayload[]; error?: string };
      if (!storesRes.ok) throw new Error(storesJson.error || "Failed to load stores");
      const store = (storesJson.stores || []).find((item) => item.id === storeId);
      if (!store) throw new Error("Store not found");

      setStoreName(store.name || "");
      setStoreSlug(store.slug || "");
      setIsActive(store.is_active ?? false);
      setRevenueSharePct(store.revenue_share_platform_pct ?? 30);
      setLogoUrl(store.logo_url || "");
      const resolvedTheme = resolveThemeConfig(store.theme_config);
      setBrand500(resolvedTheme.colors.brand["500"] || "#2D8C54");
      setAccent500(resolvedTheme.colors.accent["500"] || "#D4A843");
      setThemeJsonText(JSON.stringify(resolvedTheme, null, 2));
      setPractitionerName(store.ai_practitioner_name || "");
      setPractitionerTitle(store.ai_practitioner_title || "");
      setBookingUrl(store.ai_booking_url || "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadStore();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId]);

  async function saveSettings() {
    if (!storeId) return;
    setSaving(true);
    setError(null);
    setMessage("");
    try {
      let parsedTheme: Record<string, unknown> = {};
      try {
        parsedTheme = JSON.parse(themeJsonText) as Record<string, unknown>;
      } catch {
        throw new Error("theme.json is invalid JSON. Please fix formatting and try again.");
      }
      if (!parsedTheme || typeof parsedTheme !== "object" || Array.isArray(parsedTheme)) {
        throw new Error("theme.json must be a JSON object.");
      }
      const theme = resolveThemeConfig(parsedTheme);
      const payload = {
        is_active: isActive,
        revenue_share_platform_pct: revenueSharePct,
        logo_url: logoUrl || null,
        theme_config: theme,
        ai_practitioner_name: practitionerName || null,
        ai_practitioner_title: practitionerTitle || null,
        ai_booking_url: bookingUrl || null,
      };
      const response = await fetch(`/api/stores/${storeId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error || "Failed to save settings");
      setMessage("Store settings saved.");
      setThemeJsonText(JSON.stringify(theme, null, 2));
      await loadStore();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Store Settings</h1>
          <p className="text-[13px] text-gray-400">Theme, branding, and AI practitioner configuration</p>
        </div>
        <div className="flex gap-2">
          <Link href={`/admin/stores/${storeId}`} className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition hover:border-gray-400">
            Store Dashboard
          </Link>
          <Link href="/admin/stores" className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition hover:border-gray-400">
            ← All Stores
          </Link>
        </div>
      </div>

      {loading && (
        <div className="rounded-xl border border-gray-200 bg-white px-5 py-8 text-center text-sm text-gray-400 shadow-sm">
          Loading store settings...
        </div>
      )}
      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>}
      {message && <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">{message}</div>}

      {!loading ? (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
          {/* Main form */}
          <div className="space-y-5 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[13px] font-semibold text-gray-900">{storeName}</p>
                <p className="text-xs text-gray-400">/{storeSlug}</p>
              </div>
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <span className="text-xs font-semibold text-gray-500">Store Active</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={isActive}
                  onClick={() => setIsActive((v) => !v)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${isActive ? 'bg-[#2D8C54]' : 'bg-gray-200'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${isActive ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
                <span className={`text-xs font-semibold ${isActive ? 'text-[#2D8C54]' : 'text-gray-400'}`}>
                  {isActive ? 'Active' : 'Inactive'}
                </span>
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-1.5">
                <span className={labelCls}>Logo URL</span>
                <input className={inputCls} value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} />
              </label>
              <label className="space-y-1.5">
                <span className={labelCls}>Revenue Split — Platform %</span>
                <div className="flex items-center gap-2">
                  <input
                    type="number" min="0" max="100" step="1"
                    className={inputCls}
                    value={revenueSharePct}
                    onChange={(e) => setRevenueSharePct(Math.min(100, Math.max(0, parseInt(e.target.value, 10) || 0)))}
                  />
                  <span className="text-sm text-gray-400 whitespace-nowrap">{revenueSharePct}% platform / {100 - revenueSharePct}% store</span>
                </div>
              </label>
              <label className="space-y-1.5">
                <span className={labelCls}>Brand Color (brand_500)</span>
                <div className="flex gap-2">
                  <input type="color" className="h-9 w-10 cursor-pointer rounded border border-gray-200 p-1" value={brand500}
                    onChange={(e) => { setBrand500(e.target.value); updateThemeJson((d) => { const c = (d.colors as Record<string, unknown> | undefined) || {}; const b = (c.brand as Record<string, unknown> | undefined) || {}; b["500"] = e.target.value; c.brand = b; d.colors = c; }); }} />
                  <input className={inputCls} value={brand500}
                    onChange={(e) => { setBrand500(e.target.value); updateThemeJson((d) => { const c = (d.colors as Record<string, unknown> | undefined) || {}; const b = (c.brand as Record<string, unknown> | undefined) || {}; b["500"] = e.target.value; c.brand = b; d.colors = c; }); }} />
                </div>
              </label>
              <label className="space-y-1.5">
                <span className={labelCls}>Accent Color (accent_500)</span>
                <div className="flex gap-2">
                  <input type="color" className="h-9 w-10 cursor-pointer rounded border border-gray-200 p-1" value={accent500}
                    onChange={(e) => { setAccent500(e.target.value); updateThemeJson((d) => { const c = (d.colors as Record<string, unknown> | undefined) || {}; const a = (c.accent as Record<string, unknown> | undefined) || {}; a["500"] = e.target.value; c.accent = a; d.colors = c; }); }} />
                  <input className={inputCls} value={accent500}
                    onChange={(e) => { setAccent500(e.target.value); updateThemeJson((d) => { const c = (d.colors as Record<string, unknown> | undefined) || {}; const a = (c.accent as Record<string, unknown> | undefined) || {}; a["500"] = e.target.value; c.accent = a; d.colors = c; }); }} />
                </div>
              </label>
            </div>

            {/* Theme JSON */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-[13px] font-semibold text-gray-900">Theme JSON</p>
                <div className="flex gap-2">
                  <button type="button" onClick={() => { try { const p = JSON.parse(themeJsonText) as Record<string, unknown>; const n = resolveThemeConfig(p); setThemeJsonText(JSON.stringify(n, null, 2)); setBrand500(n.colors.brand["500"] || "#2D8C54"); setAccent500(n.colors.accent["500"] || "#D4A843"); } catch { setError("Cannot format theme.json because it is invalid JSON."); } }}
                    className="rounded-md border border-gray-200 px-2.5 py-1 text-xs text-gray-500 transition hover:border-gray-400">
                    Format + Normalize
                  </button>
                  <button type="button" onClick={() => { setThemeJsonText(JSON.stringify(DEFAULT_THEME_CONFIG, null, 2)); setBrand500(DEFAULT_THEME_CONFIG.colors.brand["500"]); setAccent500(DEFAULT_THEME_CONFIG.colors.accent["500"]); }}
                    className="rounded-md border border-gray-200 px-2.5 py-1 text-xs text-gray-500 transition hover:border-gray-400">
                    Reset Default
                  </button>
                </div>
              </div>
              <textarea
                className="min-h-[280px] w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 font-mono text-xs text-gray-700 focus:border-[#2D8C54] focus:outline-none"
                value={themeJsonText}
                onChange={(e) => setThemeJsonText(e.target.value)}
                spellCheck={false}
              />
              <p className="text-[11px] text-gray-400">Full store theme structure — colors, typography, shadows, radius, and layout tokens.</p>
            </div>

            {/* AI Practitioner */}
            <div className="space-y-3">
              <p className="text-[13px] font-semibold text-gray-900">AI Practitioner</p>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-1.5"><span className={labelCls}>Name</span><input className={inputCls} value={practitionerName} onChange={(e) => setPractitionerName(e.target.value)} /></label>
                <label className="space-y-1.5"><span className={labelCls}>Title</span><input className={inputCls} value={practitionerTitle} onChange={(e) => setPractitionerTitle(e.target.value)} /></label>
                <label className="space-y-1.5 md:col-span-2"><span className={labelCls}>Booking URL</span><input className={inputCls} value={bookingUrl} onChange={(e) => setBookingUrl(e.target.value)} /></label>
              </div>
            </div>

            <button type="button" onClick={saveSettings} disabled={saving}
              className="rounded-lg bg-[#2D8C54] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#247043] disabled:cursor-not-allowed disabled:opacity-60">
              {saving ? "Saving..." : "Save Settings"}
            </button>
          </div>

          {/* Domain Routing */}
          <div className="rounded-xl border border-blue-100 bg-blue-50 p-5 shadow-sm space-y-3">
            <div>
              <p className="text-[13px] font-semibold text-blue-900">🌐 Domain Routing</p>
              <p className="text-xs text-blue-700 mt-0.5">
                Domains that route to this store (<code className="bg-blue-100 px-1 rounded">{storeSlug}</code>).
                Edit in <code className="bg-blue-100 px-1 rounded">lib/store/domain-map.ts</code> or via the
                <code className="bg-blue-100 px-1 rounded">STORE_DOMAIN_MAP</code> env var.
              </p>
            </div>
            <div className="rounded-lg border border-blue-200 bg-white divide-y divide-blue-50 text-xs">
              {Object.entries({
                "localhost":            "pureherbhealth",
                "pureherbhealth.local": "pureherbhealth",
                "pureherbhealth.com":   "pureherbhealth",
                "drhuangclinic.local":  "dr-huang-clinic",
                "drhuangclinic.com":    "dr-huang-clinic",
                "tcm-network.local":    "tcm-network-herbs",
                "acu-flushing.local":   "acu-flushing",
                "gangshi.local":        "acu-gangshi",
              }).filter(([, slug]) => slug === storeSlug).map(([domain]) => (
                <div key={domain} className="flex items-center gap-2 px-3 py-2">
                  <span className="text-blue-500">🔗</span>
                  <span className="font-mono text-gray-700">{domain}</span>
                  <span className="ml-auto rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-600">active</span>
                </div>
              ))}
              {Object.entries({
                "localhost":            "pureherbhealth",
                "pureherbhealth.local": "pureherbhealth",
                "pureherbhealth.com":   "pureherbhealth",
                "drhuangclinic.local":  "dr-huang-clinic",
                "drhuangclinic.com":    "dr-huang-clinic",
                "tcm-network.local":    "tcm-network-herbs",
                "acu-flushing.local":   "acu-flushing",
                "gangshi.local":        "acu-gangshi",
              }).filter(([, slug]) => slug === storeSlug).length === 0 && (
                <div className="px-3 py-3 text-gray-400">No domains mapped yet — add to <code>lib/store/domain-map.ts</code></div>
              )}
            </div>
            <div className="rounded-lg border border-blue-200 bg-white p-3 text-[11px] text-gray-500 space-y-1">
              <p className="font-semibold text-gray-600">To add a domain (no redeploy):</p>
              <p>Set env var in <strong>.env.local</strong> or hosting dashboard:</p>
              <code className="block bg-blue-50 rounded p-1.5 text-[10px] break-all">
                {`STORE_DOMAIN_MAP={"newdomain.com":"${storeSlug}"}`}
              </code>
            </div>
          </div>

          {/* Live Preview */}
          <aside className="space-y-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-[13px] font-semibold text-gray-900">Live Preview</p>
            <div>
              <p className={`mb-2 ${labelCls}`}>Logo</p>
              <div className="flex h-16 items-center justify-center rounded-lg border border-gray-200 bg-gray-50">
                {logoUrl ? (
                  <Image src={logoUrl} alt={`${storeName || "Store"} logo preview`} width={180} height={48} className="h-12 w-auto object-contain" />
                ) : (
                  <span className="text-xs text-gray-400">No logo URL set</span>
                )}
              </div>
            </div>
            <div>
              <p className={`mb-2 ${labelCls}`}>Brand Colors</p>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg border border-gray-200 p-2">
                  <div className="mb-1.5 h-8 rounded border border-gray-100" style={{ backgroundColor: brand500 }} />
                  <p className="text-[10px] text-gray-400">brand_500</p>
                  <p className="font-mono text-[10px] text-gray-600">{brand500}</p>
                </div>
                <div className="rounded-lg border border-gray-200 p-2">
                  <div className="mb-1.5 h-8 rounded border border-gray-100" style={{ backgroundColor: accent500 }} />
                  <p className="text-[10px] text-gray-400">accent_500</p>
                  <p className="font-mono text-[10px] text-gray-600">{accent500}</p>
                </div>
              </div>
            </div>
            <div>
              <p className={`mb-2 ${labelCls}`}>Practitioner Card</p>
              <div className="rounded-lg border p-3" style={{ borderColor: `${brand500}60` }}>
                <div className="mb-2 h-1 rounded" style={{ backgroundColor: accent500 }} />
                <p className="font-medium" style={{ color: brand500 }}>{practitionerName || "Practitioner Name"}</p>
                <p className="text-xs text-gray-500">{practitionerTitle || "Practitioner Title"}</p>
                <p className="mt-2 truncate text-xs text-gray-400">{bookingUrl || "Booking URL preview"}</p>
              </div>
            </div>
          </aside>
        </div>
      ) : null}
    </section>
  );
}
