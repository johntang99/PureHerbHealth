"use client";

import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import { adminTheme as t } from "@/lib/admin/theme";

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
  view_count: number;
  published_at: string | null;
  updated_at: string;
};

const TABS = ["Content", "TCM Data", "SEO", "Preview"] as const;
type Tab = typeof TABS[number];

const TCM_FIELDS = [
  { key: "chinese_name",  label: "Chinese Name (汉字)" },
  { key: "pinyin",        label: "Pinyin" },
  { key: "latin_name",    label: "Latin / Botanical Name" },
  { key: "nature",        label: "Nature (性质)" },
  { key: "flavor",        label: "Flavor (味)" },
  { key: "meridians",     label: "Meridians (归经)" },
  { key: "actions",       label: "Actions (功效)" },
  { key: "indications",   label: "Indications (主治)" },
  { key: "contraindications", label: "Contraindications" },
  { key: "dosage",        label: "Dosage" },
  { key: "preparation",   label: "Preparation / Form" },
];

export default function HerbEditorPage({ params }: { params: { id: string } }) {
  const [item, setItem] = useState<ContentItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("Content");
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // editable fields
  const [title, setTitle] = useState("");
  const [titleZh, setTitleZh] = useState("");
  const [slug, setSlug] = useState("");
  const [body, setBody] = useState("");
  const [bodyZh, setBodyZh] = useState("");
  const [status, setStatus] = useState("draft");
  const [metaTitle, setMetaTitle] = useState("");
  const [metaDesc, setMetaDesc] = useState("");
  const [tcmData, setTcmData] = useState<Record<string, string>>({});

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
      setTcmData(d.item.tcm_data as Record<string, string> ?? {});
    }
    setLoading(false);
  }, [params.id]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => { setDirty(true); }, [title, titleZh, slug, body, bodyZh, status, metaTitle, metaDesc, tcmData]);
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
        tcm_data: tcmData,
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

  if (loading) return <div className={t.alertLoading}>Loading herb profile…</div>;
  if (!item) return <div className={t.alertError}>Herb profile not found.</div>;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/admin/content/herbs" className={t.btnOutline}>← Herb Profiles</Link>
        <div className="flex-1">
          <h1 className={`text-xl font-bold ${t.heading}`}>{title || "Untitled"}</h1>
          <p className={`text-[13px] ${t.muted}`}>herb_profile · {item.slug}</p>
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

      {/* Tabs */}
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

      {/* Content tab */}
      {tab === "Content" && (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={`mb-1 block ${t.labelClass}`}>Title (EN) *</label>
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className={t.input} />
            </div>
            <div>
              <label className={`mb-1 block ${t.labelClass}`}>Title (ZH)</label>
              <input type="text" value={titleZh} onChange={(e) => setTitleZh(e.target.value)} className={t.input} placeholder="e.g. 黄芪" />
            </div>
          </div>
          <div>
            <label className={`mb-1 block ${t.labelClass}`}>Slug</label>
            <input type="text" value={slug} onChange={(e) => setSlug(e.target.value)} className={t.input} />
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <div>
              <label className={`mb-1 block ${t.labelClass}`}>Body Markdown (EN)</label>
              <textarea rows={18} value={body} onChange={(e) => setBody(e.target.value)} className={`${t.input} font-mono text-[12px]`} placeholder="## About this herb..." />
            </div>
            <div>
              <label className={`mb-1 block ${t.labelClass}`}>Body Markdown (ZH)</label>
              <textarea rows={18} value={bodyZh} onChange={(e) => setBodyZh(e.target.value)} className={`${t.input} font-mono text-[12px]`} placeholder="## 关于此草药..." />
            </div>
          </div>
        </div>
      )}

      {/* TCM Data tab */}
      {tab === "TCM Data" && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <p className={`mb-4 ${t.sectionLabel}`}>Traditional Chinese Medicine Properties</p>
          <div className="grid gap-4 sm:grid-cols-2">
            {TCM_FIELDS.map((field) => (
              <div key={field.key}>
                <label className={`mb-1 block ${t.labelClass}`}>{field.label}</label>
                <input
                  type="text"
                  value={(tcmData[field.key] as string) ?? ""}
                  onChange={(e) => setTcmData((d) => ({ ...d, [field.key]: e.target.value }))}
                  className={t.input}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SEO tab */}
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
            <p className="text-[15px] text-blue-700 underline">{metaTitle || title || "Herb Name"}</p>
            <p className="mt-0.5 text-[12px] text-green-700">pureHerbHealth.com/learn/herbs/{slug}</p>
            <p className="mt-1 text-[13px] text-gray-600">{metaDesc || "No description set."}</p>
          </div>
        </div>
      )}

      {/* Preview tab */}
      {tab === "Preview" && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <p className={`mb-4 ${t.sectionLabel}`}>Markdown Preview (EN)</p>
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
