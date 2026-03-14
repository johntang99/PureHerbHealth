"use client";

import Image from "next/image";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { adminTheme as t } from "@/lib/admin/theme";
import { ImagePickerModal } from "@/components/admin/image-picker-modal";


type CategoryNode = { id: string; name: string; children: CategoryNode[] };
type CategoryFlat = { id: string; name: string; depth: number };

function flattenCategories(nodes: CategoryNode[], depth = 0): CategoryFlat[] {
  const result: CategoryFlat[] = [];
  for (const n of nodes) {
    result.push({ id: n.id, name: n.name, depth });
    result.push(...flattenCategories(n.children ?? [], depth + 1));
  }
  return result;
}

type ProductData = {
  id: string; slug: string; name: string; name_zh?: string | null;
  short_description?: string | null; short_description_zh?: string | null;
  description?: string | null; description_zh?: string | null;
  description_markdown?: string | null; description_markdown_zh?: string | null;
  tcm_guide_markdown?: string | null; tcm_guide_markdown_zh?: string | null;
  ingredients_markdown?: string | null; ingredients_markdown_zh?: string | null;
  usage_markdown?: string | null; usage_markdown_zh?: string | null;
  price_cents: number; enabled: boolean;
  product_type?: string | null; category_id?: string | null;
  bundle_items?: BundleItem[] | null;
  images?: Array<{ media_asset_id?: string; url?: string; alt?: string }>;
  videos?: Array<{ media_asset_id?: string; url?: string }>;
};

type Variant = {
  id: string; product_id: string;
  name: string; name_zh?: string | null;
  price_cents: number; compare_at_price_cents?: number | null;
  sku?: string | null; sort_order: number; is_default: boolean;
};

type BundleItem = {
  product_id: string; product_name: string; quantity: number;
};

type MediaAsset = {
  id: string; path: string; url: string;
  media_type: "image" | "video" | "file"; alt_text?: string | null;
};

type EditorState = {
  name: string; name_zh: string; slug: string;
  shortDescription: string; shortDescriptionZh: string;
  longDescription: string; longDescriptionZh: string;
  price: string; categoryId: string; enabled: boolean;
  productType: "standard" | "bundle";
  bundleItems: BundleItem[];
  descriptionMd: string; tcmGuideMd: string; ingredientsMd: string; usageMd: string;
  descriptionMdZh: string; tcmGuideMdZh: string; ingredientsMdZh: string; usageMdZh: string;
};

type PreviewTabKey = "description" | "tcm" | "ingredients" | "usage";
type ActiveTab = "basic" | "variants" | "bundle" | "content" | "media" | "preview";

function defaultEditor(): EditorState {
  return {
    name: "", name_zh: "", slug: "",
    shortDescription: "", shortDescriptionZh: "",
    longDescription: "", longDescriptionZh: "",
    price: "0.00", categoryId: "", enabled: true,
    productType: "standard", bundleItems: [],
    descriptionMd: "", tcmGuideMd: "", ingredientsMd: "", usageMd: "",
    descriptionMdZh: "", tcmGuideMdZh: "", ingredientsMdZh: "", usageMdZh: "",
  };
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function EditProductPage() {
  const params = useParams<{ id: string }>();
  const productId = params.id;

  const [product, setProduct] = useState<ProductData | null>(null);
  const [categories, setCategories] = useState<CategoryFlat[]>([]);
  const [stores, setStores] = useState<Array<{ id: string; slug: string; name: string }>>([]);
  const [storeSlug, setStoreSlug] = useState("");
  const [editor, setEditor] = useState<EditorState>(defaultEditor);

  const [variants, setVariants] = useState<Variant[]>([]);
  const [variantsLoading, setVariantsLoading] = useState(false);

  const [imageAssetIds, setImageAssetIds] = useState<string[]>([]);
  const [videoAssetIds, setVideoAssetIds] = useState<string[]>([]);
  const [productMedia, setProductMedia] = useState<MediaAsset[]>([]);
  const [allMedia, setAllMedia] = useState<MediaAsset[]>([]);
  const [mediaTab, _setMediaTab] = useState<"product" | "all">("product");
  const [_mediaLoading, setMediaLoading] = useState(false);

  const [pickerOpen, setPickerOpen] = useState<"images" | "videos" | null>(null);

  const [saving, setSaving] = useState(false);
  const [_uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [previewLocale, setPreviewLocale] = useState<"en" | "zh">("en");
  const [previewTab, setPreviewTab] = useState<PreviewTabKey>("description");
  const [activeTab, setActiveTab] = useState<ActiveTab>("basic");

  useEffect(() => {
    void fetch("/api/admin/categories").then((r) => r.json()).then((d: { categories?: CategoryNode[] }) => {
      setCategories(flattenCategories(d.categories ?? []));
    });
    void fetch("/api/stores").then((r) => r.json()).then((d: { stores?: Array<{ id: string; slug: string; name: string }> }) => {
      const list = d.stores ?? [];
      setStores(list);
      if (list[0]) setStoreSlug(list[0].slug);
    });
  }, []);

  useEffect(() => {
    if (!productId) return;
    void fetch(`/api/admin/products/${productId}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d: { product?: ProductData; error?: string }) => {
        if (!d.product) { setError(d.error ?? "Product not found."); return; }
        const p = d.product;
        setProduct(p);
        setEditor({
          name: p.name ?? "", name_zh: p.name_zh ?? "", slug: p.slug ?? "",
          shortDescription: p.short_description ?? "",
          shortDescriptionZh: p.short_description_zh ?? "",
          longDescription: p.description ?? "",
          longDescriptionZh: p.description_zh ?? "",
          price: ((p.price_cents ?? 0) / 100).toFixed(2),
          categoryId: p.category_id ?? "",
          enabled: p.enabled ?? true,
          productType: p.product_type === "bundle" ? "bundle" : "standard",
          bundleItems: (p.bundle_items as BundleItem[] | null) ?? [],
          descriptionMd: p.description_markdown ?? "",
          tcmGuideMd: p.tcm_guide_markdown ?? "",
          ingredientsMd: p.ingredients_markdown ?? "",
          usageMd: p.usage_markdown ?? "",
          descriptionMdZh: p.description_markdown_zh ?? "",
          tcmGuideMdZh: p.tcm_guide_markdown_zh ?? "",
          ingredientsMdZh: p.ingredients_markdown_zh ?? "",
          usageMdZh: p.usage_markdown_zh ?? "",
        });
        const imgIds = (p.images ?? []).map((img) => img.media_asset_id).filter((id): id is string => Boolean(id));
        const vidIds = (p.videos ?? []).map((v) => v.media_asset_id).filter((id): id is string => Boolean(id));
        setImageAssetIds(imgIds);
        setVideoAssetIds(vidIds);
      });
  }, [productId]);

  const loadVariants = useCallback(() => {
    if (!productId) return;
    setVariantsLoading(true);
    void fetch(`/api/admin/product-variants/${productId}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d: { variants?: Variant[] }) => { setVariants(d.variants ?? []); setVariantsLoading(false); });
  }, [productId]);

  useEffect(() => { loadVariants(); }, [loadVariants]);

  useEffect(() => {
    if (!storeSlug || !product?.slug) return;
    setMediaLoading(true);
    const folder = `products/${product.slug}`;
    void Promise.all([
      fetch(`/api/admin/media/list?store_slug=${encodeURIComponent(storeSlug)}&path_prefix=${encodeURIComponent(folder)}&limit=200`, { cache: "no-store" })
        .then((r) => r.json()).then((d: { items?: MediaAsset[] }) => setProductMedia(d.items ?? [])),
      fetch(`/api/admin/media/list?store_slug=${encodeURIComponent(storeSlug)}&limit=400`, { cache: "no-store" })
        .then((r) => r.json()).then((d: { items?: MediaAsset[] }) => setAllMedia(d.items ?? [])),
    ]).then(() => setMediaLoading(false));
  }, [storeSlug, product?.slug]);

  const mediaItems = mediaTab === "product" ? productMedia : allMedia;
  const allMediaCombined = useMemo(() => {
    const seen = new Set<string>();
    return [...productMedia, ...allMedia].filter((m) => { if (seen.has(m.id)) return false; seen.add(m.id); return true; });
  }, [productMedia, allMedia]);
  const selectedImages = useMemo(
    () => imageAssetIds.map((id) => allMediaCombined.find((m) => m.id === id)).filter(Boolean) as MediaAsset[],
    [imageAssetIds, allMediaCombined],
  );
  const selectedVideos = useMemo(
    () => videoAssetIds.map((id) => allMediaCombined.find((m) => m.id === id)).filter(Boolean) as MediaAsset[],
    [videoAssetIds, allMediaCombined],
  );
  const _availableImages = useMemo(
    () => mediaItems.filter((m) => m.media_type === "image" && !imageAssetIds.includes(m.id)),
    [mediaItems, imageAssetIds],
  );
  const _availableVideos = useMemo(
    () => mediaItems.filter((m) => m.media_type === "video" && !videoAssetIds.includes(m.id)),
    [mediaItems, videoAssetIds],
  );


  async function refreshProductMedia(addIds: string[] = []) {
    if (!storeSlug || !product?.slug) return;
    const d = await fetch(
      `/api/admin/media/list?store_slug=${encodeURIComponent(storeSlug)}&path_prefix=${encodeURIComponent(`products/${product.slug}`)}&limit=200`,
      { cache: "no-store" },
    ).then((r) => r.json()) as { items?: MediaAsset[] };
    setProductMedia(d.items ?? []);
    if (addIds.length) setImageAssetIds((prev) => [...prev, ...addIds.filter((id) => !prev.includes(id))]);
  }

  async function _handleUpload(files: FileList | null, type: "image" | "video") {
    if (!files || files.length === 0 || !storeSlug || !product?.slug) return;
    setUploading(true); setError(null);
    try {
      const addedIds: string[] = [];
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("folder", `products/${product.slug}`);
        formData.append("siteId", storeSlug);
        formData.append("altText", file.name.replace(/\.[^.]+$/, ""));
        const res = await fetch("/api/admin/media/upload", {
          method: "POST", headers: { "x-store-slug": storeSlug }, body: formData,
        });
        const payload = (await res.json()) as { id?: string; message?: string };
        if (!res.ok) throw new Error(payload.message ?? "Upload failed.");
        if (payload.id) addedIds.push(payload.id);
      }
      await refreshProductMedia(type === "image" ? addedIds : []);
      if (type === "video") setVideoAssetIds((prev) => [...prev, ...addedIds.filter((id) => !prev.includes(id))]);
      setSuccess(`Uploaded ${files.length} file(s) to products/${product.slug}/`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally { setUploading(false); }
  }

  function reorderImage(id: string, direction: -1 | 1) {
    setImageAssetIds((prev) => {
      const idx = prev.indexOf(id);
      if (idx === -1) return prev;
      const next = idx + direction;
      if (next < 0 || next >= prev.length) return prev;
      const clone = [...prev];
      [clone[idx], clone[next]] = [clone[next], clone[idx]];
      return clone;
    });
  }

  async function saveProduct() {
    if (!productId) return;
    setSaving(true); setError(null); setSuccess(null);
    try {
      const response = await fetch("/api/products", {
        method: "PUT",
        headers: { "content-type": "application/json", "x-store-slug": storeSlug },
        body: JSON.stringify({
          id: productId, slug: editor.slug,
          name: editor.name, name_zh: editor.name_zh || undefined,
          short_description: editor.shortDescription || undefined,
          short_description_zh: editor.shortDescriptionZh || undefined,
          description: editor.longDescription || undefined,
          description_zh: editor.longDescriptionZh || undefined,
          category_id: editor.categoryId || undefined,
          price_cents: Math.max(0, Math.round(Number(editor.price || "0") * 100)),
          product_type: editor.productType,
          bundle_items: editor.productType === "bundle" ? editor.bundleItems : undefined,
          description_markdown: editor.descriptionMd,
          description_markdown_zh: editor.descriptionMdZh,
          tcm_guide_markdown: editor.tcmGuideMd,
          tcm_guide_markdown_zh: editor.tcmGuideMdZh,
          ingredients_markdown: editor.ingredientsMd,
          ingredients_markdown_zh: editor.ingredientsMdZh,
          usage_markdown: editor.usageMd,
          usage_markdown_zh: editor.usageMdZh,
          image_asset_ids: imageAssetIds,
          video_asset_ids: videoAssetIds,
        }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Save failed.");
      setSuccess("Product saved successfully.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed.");
    } finally { setSaving(false); }
  }

  const tabs: Array<{ id: ActiveTab; label: string }> = [
    { id: "basic",    label: "Basic Info" },
    { id: "variants", label: `Variants (${variants.length})` },
    { id: "bundle",   label: "Bundle Items" },
    { id: "content",  label: "Content" },
    { id: "media",    label: "Photos & Videos" },
    { id: "preview",  label: "Preview" },
  ];

  if (error && !product) {
    return (
      <div className="space-y-4">
        <p className={t.alertError}>{error}</p>
        <a href="/admin/products" className={t.btnOutline}>← Back to products</a>
      </div>
    );
  }
  if (!product) return <div className={t.alertLoading}>Loading product…</div>;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <a href="/admin/products" className="text-[13px] text-gray-400 hover:text-gray-600">← Products</a>
          <h1 className={`mt-1 text-xl font-bold ${t.heading}`}>{editor.name || "Edit Product"}</h1>
          <div className="mt-0.5 flex items-center gap-2">
            <p className={`font-mono text-[12px] ${t.muted}`}>{editor.slug}</p>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
              editor.productType === "bundle" ? "bg-purple-50 text-purple-700" : "bg-blue-50 text-blue-700"
            }`}>{editor.productType}</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <select value={storeSlug} onChange={(e) => setStoreSlug(e.target.value)} className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-700 focus:border-[#2D8C54] focus:outline-none">
            {stores.map((s) => <option key={s.id} value={s.slug}>{s.name}</option>)}
          </select>
          <button onClick={() => void saveProduct()} disabled={saving} className={t.btnPrimary}>
            {saving ? "Saving…" : "Save Product"}
          </button>
        </div>
      </div>

      {error && <p className={t.alertError}>{error}</p>}
      {success && <p className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">{success}</p>}

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 rounded-xl border border-gray-200 bg-white p-1 shadow-sm">
        {tabs.map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`rounded-lg px-3 py-2 text-[12px] font-medium transition ${activeTab === tab.id ? "bg-[#2D8C54] text-white shadow-sm" : "text-gray-500 hover:bg-gray-50 hover:text-gray-700"}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── BASIC INFO ──────────────────────────────────────────────────────── */}
      {activeTab === "basic" && (
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-1.5">
              <span className={t.labelClass}>Name (English) *</span>
              <input value={editor.name} onChange={(e) => setEditor((p) => ({ ...p, name: e.target.value }))} className={t.input} />
            </label>
            <label className="space-y-1.5">
              <span className={t.labelClass}>Name (Chinese)</span>
              <input value={editor.name_zh} onChange={(e) => setEditor((p) => ({ ...p, name_zh: e.target.value }))} className={t.input} placeholder="产品名称" />
            </label>
            <label className="space-y-1.5">
              <span className={t.labelClass}>URL Slug *</span>
              <input value={editor.slug} onChange={(e) => setEditor((p) => ({ ...p, slug: e.target.value }))} className={`${t.input} font-mono`} />
            </label>
            <label className="space-y-1.5">
              <span className={t.labelClass}>Base Price (USD)</span>
              <input type="number" step="0.01" min="0" value={editor.price} onChange={(e) => setEditor((p) => ({ ...p, price: e.target.value }))} className={t.input} />
              <p className="text-[11px] text-gray-400">Bundle price or fallback when no variant selected.</p>
            </label>
            <label className="space-y-1.5">
              <span className={t.labelClass}>Category</span>
              <select value={editor.categoryId} onChange={(e) => setEditor((p) => ({ ...p, categoryId: e.target.value }))} className={t.input}>
                <option value="">— No category —</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{"  ".repeat(c.depth)}{c.depth > 0 ? "└ " : ""}{c.name}</option>
                ))}
              </select>
            </label>
            <label className="space-y-1.5">
              <span className={t.labelClass}>Product Type</span>
              <select
                value={editor.productType}
                onChange={(e) => {
                  const pt = e.target.value as "standard" | "bundle";
                  setEditor((p) => ({ ...p, productType: pt }));
                  setActiveTab(pt === "bundle" ? "bundle" : "variants");
                }}
                className={t.input}
              >
                <option value="standard">Standard — use Variants tab for pack sizes</option>
                <option value="bundle">Bundle — combine different products at one price</option>
              </select>
            </label>
            <label className="flex items-center gap-3 self-end pb-2">
              <input type="checkbox" checked={editor.enabled} onChange={(e) => setEditor((p) => ({ ...p, enabled: e.target.checked }))} className="h-4 w-4 rounded border-gray-300 accent-[#2D8C54]" />
              <span className="text-sm text-gray-700">Active / visible in store</span>
            </label>
            <label className="space-y-1.5 md:col-span-2">
              <span className={t.labelClass}>Short Description (English)</span>
              <input value={editor.shortDescription} onChange={(e) => setEditor((p) => ({ ...p, shortDescription: e.target.value }))} className={t.input} />
            </label>
            <label className="space-y-1.5 md:col-span-2">
              <span className={t.labelClass}>Short Description (Chinese)</span>
              <input value={editor.shortDescriptionZh} onChange={(e) => setEditor((p) => ({ ...p, shortDescriptionZh: e.target.value }))} className={t.input} placeholder="一句话描述" />
            </label>
            <label className="space-y-1.5 md:col-span-2">
              <span className={t.labelClass}>Long Description (English)</span>
              <textarea rows={4} value={editor.longDescription} onChange={(e) => setEditor((p) => ({ ...p, longDescription: e.target.value }))} className={`${t.input} resize-y`} />
            </label>
            <label className="space-y-1.5 md:col-span-2">
              <span className={t.labelClass}>Long Description (Chinese)</span>
              <textarea rows={4} value={editor.longDescriptionZh} onChange={(e) => setEditor((p) => ({ ...p, longDescriptionZh: e.target.value }))} className={`${t.input} resize-y`} />
            </label>
          </div>
        </div>
      )}

      {/* ── VARIANTS ────────────────────────────────────────────────────────── */}
      {activeTab === "variants" && (
        <VariantsTab productId={productId} variants={variants} loading={variantsLoading} onRefresh={loadVariants} />
      )}

      {/* ── BUNDLE ──────────────────────────────────────────────────────────── */}
      {activeTab === "bundle" && (
        <BundleTab
          items={editor.bundleItems}
          onChange={(items) => setEditor((p) => ({ ...p, bundleItems: items }))}
          storeSlug={storeSlug}
          currentProductId={productId}
        />
      )}

      {/* ── CONTENT ─────────────────────────────────────────────────────────── */}
      {activeTab === "content" && (
        <div className="space-y-4">
          <MarkdownEditors title="English Content" value={editor} onChange={setEditor} locale="en" />
          <MarkdownEditors title="Chinese Content (中文内容)" value={editor} onChange={setEditor} locale="zh" />
        </div>
      )}

      {/* ── MEDIA ───────────────────────────────────────────────────────────── */}
      {activeTab === "media" && (
        <div className="space-y-4">
          {/* Photos card */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className={`text-[13px] font-semibold ${t.heading}`}>Photos</p>
                <p className={`text-[11px] ${t.muted}`}>
                  {selectedImages.length > 0 ? `${selectedImages.length} photo${selectedImages.length !== 1 ? "s" : ""} selected` : "No photos selected"}
                </p>
              </div>
              <button type="button" onClick={() => setPickerOpen("images")} className={t.btnPrimary}>
                Choose Photos
              </button>
            </div>

            {selectedImages.length > 0 ? (
              <div className="flex flex-wrap gap-3">
                {selectedImages.map((asset, index) => (
                  <div key={asset.id} className="group relative">
                    <div className="relative h-28 w-28 overflow-hidden rounded-xl border border-gray-200 bg-gray-50 shadow-sm">
                      <Image src={asset.url} alt={asset.alt_text ?? asset.path} fill className="object-cover" />
                      <div className="absolute inset-0 hidden items-center justify-center gap-1 bg-black/40 group-hover:flex">
                        <button type="button" onClick={() => reorderImage(asset.id, -1)} className="rounded bg-white/90 px-2 py-1 text-[11px] font-bold shadow">←</button>
                        <button type="button" onClick={() => reorderImage(asset.id, 1)} className="rounded bg-white/90 px-2 py-1 text-[11px] font-bold shadow">→</button>
                        <button type="button" onClick={() => setImageAssetIds((prev) => prev.filter((id) => id !== asset.id))} className="rounded bg-red-500 px-2 py-1 text-[11px] font-bold text-white shadow">✕</button>
                      </div>
                      <div className="absolute left-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-[#2D8C54] text-[10px] font-bold text-white shadow">
                        {index + 1}
                      </div>
                    </div>
                    <p className="mt-1 text-center text-[10px] text-gray-400 truncate max-w-[112px]">{asset.path.split("/").pop()}</p>
                  </div>
                ))}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setPickerOpen("images")}
                className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 py-10 text-gray-400 hover:border-[#2D8C54] hover:text-[#2D8C54] transition"
              >
                <div className="text-3xl">🖼️</div>
                <p className="text-[13px] font-medium">Click to choose photos</p>
                <p className="text-[11px]">Upload new or pick from your media library</p>
              </button>
            )}
          </div>

          {/* Videos card */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className={`text-[13px] font-semibold ${t.heading}`}>Videos</p>
                <p className={`text-[11px] ${t.muted}`}>
                  {selectedVideos.length > 0 ? `${selectedVideos.length} video${selectedVideos.length !== 1 ? "s" : ""} selected` : "No videos selected"}
                </p>
              </div>
              <button type="button" onClick={() => setPickerOpen("videos")} className={t.btnOutline}>
                Choose Videos
              </button>
            </div>
            {selectedVideos.length > 0 ? (
              <div className="space-y-2">
                {selectedVideos.map((asset) => (
                  <div key={asset.id} className="flex items-center gap-3 rounded-lg border border-gray-200 px-3 py-2">
                    <span className="text-xl">🎬</span>
                    <p className="flex-1 truncate text-[13px] text-gray-700">{asset.path.split("/").pop()}</p>
                    <button type="button" onClick={() => setVideoAssetIds((prev) => prev.filter((id) => id !== asset.id))} className="rounded border border-red-200 px-2 py-1 text-[11px] text-red-600 hover:bg-red-50">Remove</button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[13px] text-gray-400">No videos selected.</p>
            )}
          </div>

          {/* Image picker modal */}
          <ImagePickerModal
            open={pickerOpen === "images"}
            onClose={() => setPickerOpen(null)}
            onConfirm={(ids) => setImageAssetIds(ids)}
            onConfirmAssets={(assets) => {
              // Merge any newly imported assets (e.g. from Unsplash) into local state
              // so selectedImages can resolve IDs → display URLs immediately
              setAllMedia((prev) => {
                const existing = new Set(prev.map((m) => m.id));
                const newOnes = assets.filter((a) => !existing.has(a.id));
                return newOnes.length ? [...prev, ...newOnes] : prev;
              });
              setProductMedia((prev) => {
                const existing = new Set(prev.map((m) => m.id));
                const newOnes = assets.filter((a) => !existing.has(a.id));
                return newOnes.length ? [...prev, ...newOnes] : prev;
              });
            }}
            storeSlug={storeSlug}
            folder={`products/${product.slug}`}
            mode="images"
            initialSelected={imageAssetIds}
          />
          <ImagePickerModal
            open={pickerOpen === "videos"}
            onClose={() => setPickerOpen(null)}
            onConfirm={(ids) => setVideoAssetIds(ids)}
            onConfirmAssets={(assets) => {
              setAllMedia((prev) => {
                const existing = new Set(prev.map((m) => m.id));
                const newOnes = assets.filter((a) => !existing.has(a.id));
                return newOnes.length ? [...prev, ...newOnes] : prev;
              });
            }}
            storeSlug={storeSlug}
            folder={`products/${product.slug}`}
            mode="videos"
            initialSelected={videoAssetIds}
          />
        </div>
      )}

      {/* ── PREVIEW ─────────────────────────────────────────────────────────── */}
      {activeTab === "preview" && (
        <LivePdpPreview
          productName={editor.name} selectedImages={selectedImages} editor={editor}
          locale={previewLocale} onLocaleChange={setPreviewLocale}
          tab={previewTab} onTabChange={setPreviewTab}
        />
      )}
    </div>
  );
}

// ─── Variants Tab ─────────────────────────────────────────────────────────────

function VariantsTab({
  productId, variants, loading, onRefresh,
}: {
  productId: string; variants: Variant[]; loading: boolean; onRefresh: () => void;
}) {
  const emptyForm = { name: "", name_zh: "", price: "", compare_at_price: "", sku: "", is_default: false };
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  function startEdit(v: Variant) {
    setEditingId(v.id);
    setForm({ name: v.name, name_zh: v.name_zh ?? "", price: (v.price_cents / 100).toFixed(2), compare_at_price: v.compare_at_price_cents ? (v.compare_at_price_cents / 100).toFixed(2) : "", sku: v.sku ?? "", is_default: v.is_default });
    setError(null);
  }

  function cancelEdit() { setEditingId(null); setForm(emptyForm); setError(null); }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.price) { setError("Name and price are required."); return; }
    setSaving(true); setError(null);
    try {
      const isEdit = Boolean(editingId);
      const payload: Record<string, unknown> = {
        name: form.name, name_zh: form.name_zh || undefined,
        price_cents: Math.round(Number(form.price) * 100),
        compare_at_price_cents: form.compare_at_price ? Math.round(Number(form.compare_at_price) * 100) : null,
        sku: form.sku || undefined,
        sort_order: isEdit ? (variants.find((v) => v.id === editingId)?.sort_order ?? 0) : variants.length,
        is_default: form.is_default,
      };
      if (isEdit) payload.id = editingId;
      const res = await fetch(`/api/admin/product-variants/${productId}`, {
        method: isEdit ? "PUT" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const d = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(d.error ?? "Failed to save.");
      setEditingId(null); setForm(emptyForm); onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed.");
    } finally { setSaving(false); }
  }

  async function handleDelete(id: string) {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/product-variants/${productId}`, {
        method: "DELETE", headers: { "content-type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error("Delete failed.");
      setDeleteConfirm(null); onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed.");
    } finally { setSaving(false); }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <p className="mb-4 text-[12px] text-gray-500">
          Use variants for same-product pack options — e.g. Single ($29.99), 3-Pack ($79.99), 6-Pack ($139.99). Each variant has its own price and optional SKU.
        </p>

        {/* Add/Edit form */}
        <form onSubmit={(e) => void handleSave(e)} className="mb-5 rounded-lg border border-gray-200 bg-gray-50 p-4">
          <p className={`mb-3 text-[12px] font-semibold ${t.label}`}>{editingId ? "Edit variant" : "Add new variant"}</p>
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
            <label className="space-y-1">
              <span className={t.labelClass}>Variant Name *</span>
              <input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} className={t.input} placeholder="e.g. 3-Pack" required />
            </label>
            <label className="space-y-1">
              <span className={t.labelClass}>Name (Chinese)</span>
              <input value={form.name_zh} onChange={(e) => setForm((p) => ({ ...p, name_zh: e.target.value }))} className={t.input} placeholder="e.g. 3瓶装" />
            </label>
            <label className="space-y-1">
              <span className={t.labelClass}>Price (USD) *</span>
              <input type="number" step="0.01" min="0" value={form.price} onChange={(e) => setForm((p) => ({ ...p, price: e.target.value }))} className={t.input} placeholder="79.99" required />
            </label>
            <label className="space-y-1">
              <span className={t.labelClass}>Compare-at Price (strikethrough)</span>
              <input type="number" step="0.01" min="0" value={form.compare_at_price} onChange={(e) => setForm((p) => ({ ...p, compare_at_price: e.target.value }))} className={t.input} placeholder="89.99" />
            </label>
            <label className="space-y-1">
              <span className={t.labelClass}>SKU</span>
              <input value={form.sku} onChange={(e) => setForm((p) => ({ ...p, sku: e.target.value }))} className={t.input} placeholder="e.g. GIN-3PK" />
            </label>
            <label className="flex items-center gap-2 self-end pb-2">
              <input type="checkbox" checked={form.is_default} onChange={(e) => setForm((p) => ({ ...p, is_default: e.target.checked }))} className="h-4 w-4 rounded border-gray-300 accent-[#2D8C54]" />
              <span className="text-sm text-gray-700">Default selection</span>
            </label>
          </div>
          {error && <p className={`mt-3 ${t.alertError}`}>{error}</p>}
          <div className="mt-3 flex gap-2">
            {editingId && <button type="button" onClick={cancelEdit} className={t.btnOutline}>Cancel</button>}
            <button type="submit" disabled={saving} className={t.btnPrimary}>
              {saving ? "Saving…" : editingId ? "Update Variant" : "Add Variant"}
            </button>
          </div>
        </form>

        {/* Table */}
        {loading ? (
          <p className="text-[13px] text-gray-400">Loading…</p>
        ) : variants.length === 0 ? (
          <p className="text-[13px] text-gray-400">No variants yet. Add your first option above (e.g. Single, 3-Pack, 6-Pack).</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  {["Name", "Price", "Compare-at", "SKU", "Default", ""].map((h) => (
                    <th key={h} className={`px-4 py-2.5 text-left ${t.tableHeader}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {variants.map((v) => (
                  <tr key={v.id} className={t.tableRow}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{v.name}</p>
                      {v.name_zh && <p className="text-[11px] text-gray-400">{v.name_zh}</p>}
                    </td>
                    <td className="px-4 py-3 font-semibold text-gray-900">${(v.price_cents / 100).toFixed(2)}</td>
                    <td className="px-4 py-3 text-gray-400">
                      {v.compare_at_price_cents ? <span className="line-through">${(v.compare_at_price_cents / 100).toFixed(2)}</span> : "—"}
                    </td>
                    <td className="px-4 py-3 font-mono text-[12px] text-gray-500">{v.sku ?? "—"}</td>
                    <td className="px-4 py-3">
                      {v.is_default && <span className="rounded-full bg-[#2D8C54]/10 px-2 py-0.5 text-[11px] font-semibold text-[#2D8C54]">Default</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1.5">
                        <button onClick={() => startEdit(v)} className="rounded-md border border-gray-200 px-2.5 py-1 text-[11px] font-medium text-gray-600 hover:border-[#2D8C54] hover:text-[#2D8C54]">Edit</button>
                        {deleteConfirm === v.id ? (
                          <div className="flex gap-1">
                            <button onClick={() => void handleDelete(v.id)} disabled={saving} className="rounded-md border border-red-200 bg-red-50 px-2.5 py-1 text-[11px] font-medium text-red-600">Confirm delete</button>
                            <button onClick={() => setDeleteConfirm(null)} className="rounded-md border border-gray-200 px-2.5 py-1 text-[11px] text-gray-500">Cancel</button>
                          </div>
                        ) : (
                          <button onClick={() => setDeleteConfirm(v.id)} className="rounded-md border border-gray-200 px-2.5 py-1 text-[11px] font-medium text-gray-400 hover:border-red-200 hover:text-red-500">Delete</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Bundle Tab ───────────────────────────────────────────────────────────────

function BundleTab({
  items, onChange, storeSlug: _storeSlug, currentProductId,
}: {
  items: BundleItem[]; onChange: (items: BundleItem[]) => void;
  storeSlug: string; currentProductId: string;
}) {
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<Array<{ id: string; name: string; price_cents: number }>>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (!search.trim()) { setSearchResults([]); return; }
    const timer = setTimeout(() => {
      setSearching(true);
      void fetch(`/api/admin/products?search=${encodeURIComponent(search)}&per_page=20`, { cache: "no-store" })
        .then((r) => r.json())
        .then((d: { products?: Array<{ id: string; name: string; price_cents: number }> }) => {
          setSearchResults((d.products ?? []).filter((p) => p.id !== currentProductId));
          setSearching(false);
        });
    }, 300);
    return () => clearTimeout(timer);
  }, [search, currentProductId]);

  function addItem(p: { id: string; name: string; price_cents: number }) {
    if (items.some((i) => i.product_id === p.id)) return;
    onChange([...items, { product_id: p.id, product_name: p.name, quantity: 1 }]);
    setSearch(""); setSearchResults([]);
  }

  function updateQty(productId: string, qty: number) {
    onChange(items.map((i) => i.product_id === productId ? { ...i, quantity: Math.max(1, qty) } : i));
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <p className="mb-4 text-[12px] text-gray-500">
        A bundle combines different products into one package sold at a single price (set in Basic Info tab). Add any product below — specify how many units of each are included.
      </p>

      <div className="mb-5">
        <p className={`mb-2 ${t.labelClass}`}>Add Products to Bundle</p>
        <div className="relative">
          <input value={search} onChange={(e) => setSearch(e.target.value)} className={t.input} placeholder="Type product name to search…" />
          {search && (searching || searchResults.length > 0) && (
            <div className="absolute top-full left-0 right-0 z-10 mt-1 rounded-lg border border-gray-200 bg-white shadow-lg">
              {searching && <p className="px-4 py-3 text-[13px] text-gray-400">Searching…</p>}
              {!searching && searchResults.length === 0 && <p className="px-4 py-3 text-[13px] text-gray-400">No products found.</p>}
              {searchResults.map((product) => (
                <button
                  key={product.id} type="button"
                  onClick={() => addItem(product)}
                  disabled={items.some((i) => i.product_id === product.id)}
                  className="flex w-full items-center justify-between px-4 py-2.5 text-left hover:bg-gray-50 disabled:opacity-40"
                >
                  <span className="text-[13px] font-medium text-gray-900">{product.name}</span>
                  <span className="text-[12px] text-gray-400">${(product.price_cents / 100).toFixed(2)}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {items.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-gray-200 px-5 py-8 text-center">
          <p className="text-[13px] text-gray-400">No products in this bundle yet. Search above to add products.</p>
        </div>
      ) : (
        <div className="space-y-2">
          <p className={`${t.labelClass} mb-2`}>Bundle Contents — {items.length} product{items.length !== 1 ? "s" : ""}</p>
          {items.map((item, idx) => (
            <div key={item.product_id} className="flex items-center gap-3 rounded-lg border border-gray-200 px-4 py-3">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-100 text-[12px] font-semibold text-gray-500">{idx + 1}</div>
              <p className="flex-1 font-medium text-gray-900">{item.product_name}</p>
              <div className="flex items-center gap-2">
                <span className="text-[12px] text-gray-400">Qty:</span>
                <div className="flex items-center overflow-hidden rounded-lg border border-gray-200">
                  <button type="button" onClick={() => updateQty(item.product_id, item.quantity - 1)} className="px-2.5 py-1 text-gray-500 hover:bg-gray-50">−</button>
                  <span className="min-w-[2rem] text-center text-[13px] font-semibold text-gray-900">{item.quantity}</span>
                  <button type="button" onClick={() => updateQty(item.product_id, item.quantity + 1)} className="px-2.5 py-1 text-gray-500 hover:bg-gray-50">+</button>
                </div>
              </div>
              <button type="button" onClick={() => onChange(items.filter((i) => i.product_id !== item.product_id))} className="rounded-md border border-red-200 px-2.5 py-1 text-[11px] text-red-500 hover:bg-red-50">Remove</button>
            </div>
          ))}
          <p className="pt-1 text-[11px] text-gray-400">Remember to click Save Product (top right) to persist the bundle contents.</p>
        </div>
      )}
    </div>
  );
}

// ─── Markdown Editors ─────────────────────────────────────────────────────────

function MarkdownEditors({
  title, value, onChange, locale,
}: {
  title: string; value: EditorState;
  onChange: Dispatch<SetStateAction<EditorState>>; locale: "en" | "zh";
}) {
  const keys =
    locale === "en"
      ? { description: "descriptionMd" as const, tcmGuide: "tcmGuideMd" as const, ingredients: "ingredientsMd" as const, usage: "usageMd" as const }
      : { description: "descriptionMdZh" as const, tcmGuide: "tcmGuideMdZh" as const, ingredients: "ingredientsMdZh" as const, usage: "usageMdZh" as const };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <p className={`mb-4 text-[13px] font-semibold ${t.heading}`}>{title}</p>
      <div className="grid gap-4 md:grid-cols-2">
        {(["description", "tcmGuide", "ingredients", "usage"] as const).map((section) => {
          const labelMap = { description: "Description", tcmGuide: "TCM Guide", ingredients: "Ingredients", usage: "Usage & Dosage" };
          const k = keys[section];
          return (
            <label key={section} className="space-y-1.5">
              <span className={t.labelClass}>{labelMap[section]}</span>
              <textarea
                rows={10}
                value={value[k]}
                onChange={(e) => onChange((prev) => ({ ...prev, [k]: e.target.value }))}
                className="w-full resize-y rounded-lg border border-gray-200 bg-white px-3 py-2 font-mono text-xs text-gray-800 focus:border-[#2D8C54] focus:outline-none focus:ring-1 focus:ring-[#2D8C54]/20"
                placeholder={`# ${labelMap[section]}\n\nWrite markdown here…`}
              />
            </label>
          );
        })}
      </div>
    </div>
  );
}

// ─── Live Preview ─────────────────────────────────────────────────────────────

function LivePdpPreview({
  productName, selectedImages, editor, locale, onLocaleChange, tab, onTabChange,
}: {
  productName: string; selectedImages: MediaAsset[]; editor: EditorState;
  locale: "en" | "zh"; onLocaleChange: (l: "en" | "zh") => void;
  tab: PreviewTabKey; onTabChange: (t: PreviewTabKey) => void;
}) {
  const markdown = useMemo(() => {
    const zh = locale === "zh";
    if (tab === "description") return zh ? editor.descriptionMdZh : editor.descriptionMd;
    if (tab === "tcm") return zh ? editor.tcmGuideMdZh : editor.tcmGuideMd;
    if (tab === "ingredients") return zh ? editor.ingredientsMdZh : editor.ingredientsMd;
    return zh ? editor.usageMdZh : editor.usageMd;
  }, [editor, locale, tab]);

  return (
    <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[13px] font-semibold text-gray-900">Live PDP Preview</p>
        <div className="inline-flex overflow-hidden rounded-lg border border-gray-200">
          {(["en", "zh"] as const).map((l) => (
            <button key={l} onClick={() => onLocaleChange(l)} className={`px-3 py-1.5 text-xs font-medium transition ${locale === l ? "bg-[#2D8C54] text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}>
              {l === "en" ? "English" : "中文"}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 p-4">
        <p className="mb-3 font-semibold text-gray-900">{productName || "(product name)"}</p>
        <div className="flex flex-wrap gap-2">
          {selectedImages.length === 0
            ? <p className="text-[13px] text-gray-400">No images selected yet.</p>
            : selectedImages.map((a, i) => (
              <div key={a.id}>
                <div className="relative h-20 w-20 overflow-hidden rounded-lg border bg-gray-50">
                  <Image src={a.url} alt={a.alt_text ?? a.path} fill className="object-cover" />
                </div>
                <p className="mt-1 text-center text-[10px] text-gray-400">#{i + 1}</p>
              </div>
            ))
          }
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 p-4">
        <div className="mb-3 flex flex-wrap gap-1.5">
          {([["description", "Description"], ["tcm", "TCM Guide"], ["ingredients", "Ingredients"], ["usage", "Usage"]] as [PreviewTabKey, string][]).map(([id, label]) => (
            <button key={id} onClick={() => onTabChange(id)} className={`rounded-md border px-2.5 py-1 text-[12px] font-medium transition ${tab === id ? "border-[#2D8C54] bg-[#2D8C54]/10 text-[#2D8C54]" : "border-gray-200 text-gray-500 hover:border-gray-300"}`}>
              {label}
            </button>
          ))}
        </div>
        <div className="max-h-[360px] overflow-y-auto rounded-lg border border-gray-100 bg-gray-50 p-4">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              h1: ({ children }) => <h3 className="mb-2 mt-4 text-xl font-semibold first:mt-0">{children}</h3>,
              h2: ({ children }) => <h3 className="mb-2 mt-4 text-lg font-semibold first:mt-0">{children}</h3>,
              h3: ({ children }) => <h4 className="mb-2 mt-3 text-base font-semibold first:mt-0">{children}</h4>,
              p: ({ children }) => <p className="mb-2 text-sm leading-7 text-gray-700">{children}</p>,
              ul: ({ children }) => <ul className="mb-3 list-disc space-y-1 pl-5 text-sm text-gray-700">{children}</ul>,
              ol: ({ children }) => <ol className="mb-3 list-decimal space-y-1 pl-5 text-sm text-gray-700">{children}</ol>,
            }}
          >
            {markdown || "_No content in this section yet._"}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
}
