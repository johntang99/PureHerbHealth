"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type ElementConfig = {
  element_id: "wood" | "fire" | "earth" | "metal" | "water";
  label: string;
  emoji: string;
  color: string;
  season: string;
  organs: string;
  summary: string;
  generates_element_id: "wood" | "fire" | "earth" | "metal" | "water";
  controls_element_id: "wood" | "fire" | "earth" | "metal" | "water";
  display_order: number;
};

type StoreOption = { id: string; slug: string; name: string };

const DEFAULT_ITEMS: ElementConfig[] = [
  { element_id: "wood",  label: "Wood",  emoji: "🪵", color: "#22c55e", season: "Spring",      organs: "Liver / Gallbladder",      summary: "Growth, direction, flexibility, and smooth qi flow.",          generates_element_id: "fire",  controls_element_id: "earth", display_order: 1 },
  { element_id: "fire",  label: "Fire",  emoji: "🔥", color: "#ef4444", season: "Summer",      organs: "Heart / Small Intestine",  summary: "Warmth, circulation, joy, and mental clarity.",               generates_element_id: "earth", controls_element_id: "metal", display_order: 2 },
  { element_id: "earth", label: "Earth", emoji: "🌍", color: "#eab308", season: "Late Summer", organs: "Spleen / Stomach",         summary: "Nourishment, digestion, centering, and transformation.",      generates_element_id: "metal", controls_element_id: "water", display_order: 3 },
  { element_id: "metal", label: "Metal", emoji: "🌬️", color: "#94a3b8", season: "Autumn",      organs: "Lung / Large Intestine",   summary: "Boundary, breath, release, and resilience.",                  generates_element_id: "water", controls_element_id: "wood",  display_order: 4 },
  { element_id: "water", label: "Water", emoji: "💧", color: "#3b82f6", season: "Winter",      organs: "Kidney / Bladder",         summary: "Essence, restoration, adaptability, and willpower.",          generates_element_id: "wood",  controls_element_id: "fire",  display_order: 5 },
];

const ELEMENT_OPTIONS: Array<ElementConfig["element_id"]> = ["wood", "fire", "earth", "metal", "water"];

const inputCls = "w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 focus:border-[#2D8C54] focus:outline-none focus:ring-1 focus:ring-[#2D8C54]/20";
const labelCls = "text-[11px] font-semibold uppercase tracking-wide text-gray-400";
const selectCls = "w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 focus:border-[#2D8C54] focus:outline-none";

export default function AdminFiveElementsPage() {
  const [stores, setStores] = useState<StoreOption[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState<string>("");
  const [items, setItems] = useState<ElementConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string>("");

  async function loadStores() {
    const response = await fetch("/api/stores", { cache: "no-store" });
    const payload = (await response.json()) as { stores?: StoreOption[]; error?: string };
    if (!response.ok) throw new Error(payload.error || "Failed to load stores.");
    const nextStores = payload.stores || [];
    setStores(nextStores);
    if (!selectedStoreId && nextStores.length > 0) setSelectedStoreId(nextStores[0].id);
  }

  useEffect(() => {
    setLoading(true);
    setError(null);
    void loadStores()
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load stores."))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadData(storeId: string) {
    if (!storeId) return;
    setLoading(true);
    setError(null);
    setMessage("");
    try {
      const response = await fetch(`/api/admin/content/five-elements?store_id=${storeId}`, { cache: "no-store" });
      const payload = (await response.json()) as { items?: ElementConfig[]; error?: string };
      if (!response.ok) throw new Error(payload.error || "Failed to load config.");
      setItems(payload.items && payload.items.length > 0 ? payload.items : DEFAULT_ITEMS);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load config.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!selectedStoreId) return;
    void loadData(selectedStoreId);
  }, [selectedStoreId]);

  const sorted = useMemo(() => [...items].sort((a, b) => a.display_order - b.display_order), [items]);
  const selectedStore = stores.find((store) => store.id === selectedStoreId) || null;

  function updateItem(elementId: ElementConfig["element_id"], patch: Partial<ElementConfig>) {
    setItems((prev) => prev.map((item) => (item.element_id === elementId ? { ...item, ...patch } : item)));
  }

  async function saveAll() {
    setSaving(true);
    setError(null);
    setMessage("");
    try {
      const response = await fetch("/api/admin/content/five-elements", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ store_id: selectedStoreId, items: sorted }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error || "Failed to save.");
      setMessage(`Five Elements config saved for ${selectedStore?.name || "selected store"}.`);
      await loadData(selectedStoreId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Five Elements Config</h1>
          <p className="text-[13px] text-gray-400">CMS configuration for TCM Five Elements content</p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin" className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition hover:border-gray-400">Dashboard</Link>
          <Link href="/en/learn/five-elements" className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition hover:border-[#2D8C54] hover:text-[#2D8C54]">Preview Page ↗</Link>
        </div>
      </div>

      {/* Store selector */}
      <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
        <label className="inline-flex items-center gap-3">
          <span className={labelCls}>Editing store</span>
          <select className={selectCls} style={{ width: "auto" }} value={selectedStoreId} onChange={(e) => setSelectedStoreId(e.target.value)}>
            {stores.map((store) => (
              <option key={store.id} value={store.id}>{store.name} ({store.slug}) [{store.id.slice(0, 8)}]</option>
            ))}
          </select>
        </label>
      </div>

      {loading && <div className="rounded-xl border border-gray-200 bg-white px-5 py-8 text-center text-sm text-gray-400 shadow-sm">Loading config...</div>}
      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>}
      {message && <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">{message}</div>}

      <div className="space-y-4">
        {sorted.map((item) => (
          <article key={item.element_id} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
              <span className="text-2xl">{item.emoji}</span>
              <div>
                <p className="font-semibold text-gray-900">{item.label}</p>
                <p className="text-xs text-gray-400">{item.element_id}</p>
              </div>
              <div className="ml-auto h-5 w-5 rounded-full border border-gray-200 shadow-sm" style={{ backgroundColor: item.color }} />
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <label className="space-y-1.5"><span className={labelCls}>Label</span><input className={inputCls} value={item.label} onChange={(e) => updateItem(item.element_id, { label: e.target.value })} /></label>
              <label className="space-y-1.5"><span className={labelCls}>Emoji</span><input className={inputCls} value={item.emoji} onChange={(e) => updateItem(item.element_id, { emoji: e.target.value })} /></label>
              <label className="space-y-1.5">
                <span className={labelCls}>Color</span>
                <div className="flex gap-2">
                  <input type="color" className="h-9 w-10 cursor-pointer rounded border border-gray-200 p-1" value={item.color} onChange={(e) => updateItem(item.element_id, { color: e.target.value })} />
                  <input className={inputCls} value={item.color} onChange={(e) => updateItem(item.element_id, { color: e.target.value })} />
                </div>
              </label>
              <label className="space-y-1.5"><span className={labelCls}>Season</span><input className={inputCls} value={item.season} onChange={(e) => updateItem(item.element_id, { season: e.target.value })} /></label>
              <label className="space-y-1.5"><span className={labelCls}>Organs</span><input className={inputCls} value={item.organs} onChange={(e) => updateItem(item.element_id, { organs: e.target.value })} /></label>
              <label className="space-y-1.5"><span className={labelCls}>Display Order</span><input type="number" className={inputCls} value={item.display_order} onChange={(e) => updateItem(item.element_id, { display_order: Number(e.target.value || "0") })} /></label>
              <label className="space-y-1.5"><span className={labelCls}>Generates →</span><select className={selectCls} value={item.generates_element_id} onChange={(e) => updateItem(item.element_id, { generates_element_id: e.target.value as ElementConfig["generates_element_id"] })}>{ELEMENT_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}</select></label>
              <label className="space-y-1.5"><span className={labelCls}>Controls →</span><select className={selectCls} value={item.controls_element_id} onChange={(e) => updateItem(item.element_id, { controls_element_id: e.target.value as ElementConfig["controls_element_id"] })}>{ELEMENT_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}</select></label>
              <label className="space-y-1.5 md:col-span-3"><span className={labelCls}>Summary</span><textarea className={inputCls} rows={2} value={item.summary} onChange={(e) => updateItem(item.element_id, { summary: e.target.value })} /></label>
            </div>
          </article>
        ))}
      </div>

      <button type="button" onClick={() => void saveAll()} disabled={saving || loading || sorted.length === 0 || !selectedStoreId}
        className="rounded-lg bg-[#2D8C54] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#247043] disabled:cursor-not-allowed disabled:opacity-60">
        {saving ? "Saving..." : "Save Five Elements Config"}
      </button>
    </section>
  );
}
