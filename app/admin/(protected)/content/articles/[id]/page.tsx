"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState, useCallback } from "react";
import { adminTheme as t } from "@/lib/admin/theme";
import { ImagePickerModal } from "@/components/admin/image-picker-modal";

const STORE_SLUG = process.env.NEXT_PUBLIC_STORE_SLUG ?? "pureherbhealth";

type FeaturedImage = { url: string; alt: string };

type ContentItem = {
  id: string;
  slug: string;
  title: string;
  title_zh: string | null;
  body_markdown: string | null;
  body_markdown_zh: string | null;
  status: string;
  meta_title: string | null;
  meta_description: string | null;
  tcm_data: Record<string, unknown>;
  featured_image: FeaturedImage | null;
  view_count: number;
  published_at: string | null;
  updated_at: string;
};

const TABS = ["Content", "SEO", "Preview"] as const;
type Tab = typeof TABS[number];

export default function ArticleEditorPage({ params }: { params: { id: string } }) {
  const [item, setItem] = useState<ContentItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("Content");
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  const [title, setTitle] = useState("");
  const [titleZh, setTitleZh] = useState("");
  const [slug, setSlug] = useState("");
  const [body, setBody] = useState("");
  const [bodyZh, setBodyZh] = useState("");
  const [status, setStatus] = useState("draft");
  const [metaTitle, setMetaTitle] = useState("");
  const [metaDesc, setMetaDesc] = useState("");
  const [featuredImage, setFeaturedImage] = useState<FeaturedImage | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/admin/content/${params.id}`, { cache: "no-store" });
    const d = (await res.json()) as { item?: ContentItem };
    if (d.item) {
      setItem(d.item);
      setTitle(d.item.title);
      setTitleZh(d.item.title_zh ?? "");
      setSlug(d.item.slug);
      setBody(d.item.body_markdown ?? "");
      setBodyZh(d.item.body_markdown_zh ?? "");
      setStatus(d.item.status);
      setMetaTitle(d.item.meta_title ?? "");
      setMetaDesc(d.item.meta_description ?? "");
      setFeaturedImage(
        d.item.featured_image && typeof d.item.featured_image === "object" && "url" in d.item.featured_image
          ? { url: String(d.item.featured_image.url), alt: String(d.item.featured_image.alt ?? "") }
          : null,
      );
    }
    setLoading(false);
  }, [params.id]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => { setDirty(true); }, [title, titleZh, slug, body, bodyZh, status, metaTitle, metaDesc, featuredImage]);
  useEffect(() => { if (item) setDirty(false); }, [item]);

  async function save() {
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/admin/content/${params.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title, title_zh: titleZh || undefined, slug, body_markdown: body,
        body_markdown_zh: bodyZh || undefined, status,
        meta_title: metaTitle || undefined, meta_description: metaDesc || undefined,
        featured_image: featuredImage ?? null,
      }),
    });
    const d = (await res.json()) as { item?: ContentItem; error?: string };
    if (!res.ok) { setError(d.error ?? "Save failed"); setSaving(false); return; }
    if (d.item) setItem(d.item);
    setSaving(false);
    setSaved(true);
    setDirty(false);
    setTimeout(() => setSaved(false), 2500);
  }

  if (loading) return <div className={t.alertLoading}>Loading article…</div>;
  if (!item) return <div className={t.alertError}>Article not found.</div>;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/admin/content/articles" className={t.btnOutline}>← Articles</Link>
        <div className="flex-1">
          <h1 className={`text-xl font-bold ${t.heading}`}>{title || "Untitled"}</h1>
          <p className={`text-[13px] ${t.muted}`}>article · {item.slug} · {item.view_count} views</p>
        </div>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-lg border border-gray-200 px-3 py-2 text-sm">
          <option value="draft">Draft</option>
          <option value="review">In Review</option>
          <option value="published">Published</option>
          <option value="archived">Archived</option>
        </select>
        <button type="button" disabled={saving || !dirty} onClick={() => void save()} className={t.btnPrimary}>
          {saving ? "Saving…" : saved ? "✓ Saved" : "Save"}
        </button>
      </div>

      {error && <div className={t.alertError}>{error}</div>}

      <div className="flex gap-1 border-b border-gray-200">
        {TABS.map((tb) => (
          <button
            key={tb}
            type="button"
            onClick={() => setTab(tb)}
            className={[
              "px-4 py-2 text-[13px] font-medium transition border-b-2 -mb-px",
              tab === tb ? "border-[#2D8C54] text-[#2D8C54]" : "border-transparent text-gray-500 hover:text-gray-900",
            ].join(" ")}
          >
            {tb}
          </button>
        ))}
      </div>

      {tab === "Content" && (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={`mb-1 block ${t.labelClass}`}>Title (EN) *</label>
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className={t.input} />
            </div>
            <div>
              <label className={`mb-1 block ${t.labelClass}`}>Title (ZH)</label>
              <input type="text" value={titleZh} onChange={(e) => setTitleZh(e.target.value)} className={t.input} />
            </div>
          </div>
          <div>
            <label className={`mb-1 block ${t.labelClass}`}>Slug</label>
            <input type="text" value={slug} onChange={(e) => setSlug(e.target.value)} className={t.input} />
          </div>

          {/* Featured Image */}
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className={t.sectionLabel}>Featured Image</p>
              <button type="button" onClick={() => setPickerOpen(true)} className={t.btnOutline}>
                {featuredImage?.url ? "Change Photo" : "Choose Photo"}
              </button>
            </div>
            {featuredImage?.url ? (
              <div className="flex items-start gap-4">
                <div className="relative shrink-0">
                  <Image
                    src={featuredImage.url}
                    alt={featuredImage.alt || title}
                    width={200}
                    height={120}
                    className="h-28 w-48 rounded-xl border object-cover shadow-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setFeaturedImage(null)}
                    className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] text-white shadow hover:bg-red-600"
                  >
                    ✕
                  </button>
                </div>
                <div className="flex-1 space-y-2">
                  <label className={`mb-1 block ${t.labelClass}`}>Alt text</label>
                  <input
                    type="text"
                    value={featuredImage.alt}
                    onChange={(e) => setFeaturedImage((prev) => prev ? { ...prev, alt: e.target.value } : null)}
                    className={t.input}
                    placeholder="Describe the image for accessibility"
                  />
                  <p className="text-[11px] text-gray-400">Stored in Supabase Storage · will work in production</p>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setPickerOpen(true)}
                className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 py-8 text-gray-400 hover:border-[#2D8C54] hover:text-[#2D8C54] transition"
              >
                <div className="text-3xl">🖼️</div>
                <p className="text-[13px] font-medium">Click to choose a featured photo</p>
                <p className="text-[11px]">Upload new or pick from your media library</p>
              </button>
            )}
            <ImagePickerModal
              open={pickerOpen}
              onClose={() => setPickerOpen(false)}
              onConfirm={() => { /* handled by onConfirmAssets */ }}
              onConfirmAssets={(assets) => {
                const asset = assets[0];
                if (asset) {
                  setFeaturedImage({ url: asset.url, alt: asset.alt_text || title || "" });
                  setDirty(true);
                }
              }}
              storeSlug={STORE_SLUG}
              folder={`articles/${slug || params.id}`}
              mode="images"
              maxSelect={1}
              initialSelected={[]}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div>
              <label className={`mb-1 block ${t.labelClass}`}>Body Markdown (EN)</label>
              <textarea rows={20} value={body} onChange={(e) => setBody(e.target.value)} className={`${t.input} font-mono text-[12px]`} placeholder="## Introduction..." />
            </div>
            <div>
              <label className={`mb-1 block ${t.labelClass}`}>Body Markdown (ZH)</label>
              <textarea rows={20} value={bodyZh} onChange={(e) => setBodyZh(e.target.value)} className={`${t.input} font-mono text-[12px]`} placeholder="## 简介..." />
            </div>
          </div>
        </div>
      )}

      {tab === "SEO" && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
          <div>
            <label className={`mb-1 block ${t.labelClass}`}>Meta Title</label>
            <input type="text" value={metaTitle} onChange={(e) => setMetaTitle(e.target.value)} className={t.input} placeholder={title} />
            <p className="mt-1 text-[11px] text-gray-400">{metaTitle.length}/60 chars</p>
          </div>
          <div>
            <label className={`mb-1 block ${t.labelClass}`}>Meta Description</label>
            <textarea rows={3} value={metaDesc} onChange={(e) => setMetaDesc(e.target.value)} className={t.input} />
            <p className="mt-1 text-[11px] text-gray-400">{metaDesc.length}/160 chars</p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <p className={`mb-2 ${t.sectionLabel}`}>Search Preview</p>
            <p className="text-[15px] text-blue-700 underline">{metaTitle || title || "Article Title"}</p>
            <p className="mt-0.5 text-[12px] text-green-700">pureHerbHealth.com/learn/{slug}</p>
            <p className="mt-1 text-[13px] text-gray-600">{metaDesc || "No description set."}</p>
          </div>
        </div>
      )}

      {tab === "Preview" && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
          {featuredImage?.url && (
            <Image
              src={featuredImage.url}
              alt={featuredImage.alt || title}
              width={1200}
              height={576}
              className="h-64 w-full rounded-lg object-cover"
            />
          )}
          <p className={`${t.sectionLabel}`}>Markdown Preview (EN)</p>
          {body ? (
            <pre className="whitespace-pre-wrap font-sans text-[14px] text-gray-700 leading-relaxed">{body}</pre>
          ) : (
            <p className="text-gray-400 italic">No content yet.</p>
          )}
        </div>
      )}
    </div>
  );
}
