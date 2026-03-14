"use client";

/**
 * ImagePickerModal — full-featured image picker with 4 sources:
 *  1. Upload from local (drag-drop or click)
 *  2. Library — Supabase Storage (this folder or all media)
 *  3. Unsplash — search & import
 *  4. Pexels — search & import
 *
 * After import/upload, images are stored in Supabase Storage and always
 * returned as permanent public URLs — safe for production use.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export type MediaAssetItem = {
  id: string;
  url: string;
  path: string;
  media_type: "image" | "video" | "file";
  alt_text?: string | null;
};

type ProviderItem = {
  id: string;
  previewUrl: string;
  sourceUrl: string;
  alt: string;
  author?: string;
};

type SourceTab = "upload" | "library" | "unsplash" | "pexels";

type Props = {
  open: boolean;
  onClose: () => void;
  /** Called with ordered selected asset IDs */
  onConfirm: (selectedIds: string[]) => void;
  /** Also called with full asset objects (use this when you need URLs) */
  onConfirmAssets?: (assets: MediaAssetItem[]) => void;
  storeSlug: string;
  /** Folder to upload into and show first, e.g. "products/my-slug" */
  folder: string;
  mode?: "images" | "videos" | "both";
  initialSelected?: string[];
  /** 1 = single-select */
  maxSelect?: number;
};

const BRAND = "#2D8C54";

export function ImagePickerModal({
  open,
  onClose,
  onConfirm,
  onConfirmAssets,
  storeSlug,
  folder,
  mode = "images",
  initialSelected = [],
  maxSelect,
}: Props) {
  const [tab, setTab] = useState<SourceTab>("library");

  // ── Library state ──────────────────────────────────────────────────────────
  const [folderMedia, setFolderMedia] = useState<MediaAssetItem[]>([]);
  const [allMedia, setAllMedia] = useState<MediaAssetItem[]>([]);
  const [libraryTab, setLibraryTab] = useState<"folder" | "all">("folder");
  const [librarySearch, setLibrarySearch] = useState("");
  const [libraryLoading, setLibraryLoading] = useState(false);

  // ── Upload state ───────────────────────────────────────────────────────────
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Provider (Unsplash / Pexels) state ────────────────────────────────────
  const [providerQuery, setProviderQuery] = useState("");
  const [providerItems, setProviderItems] = useState<ProviderItem[]>([]);
  const [providerPage, setProviderPage] = useState(1);
  const [providerTotalPages, setProviderTotalPages] = useState(0);
  const [providerLoading, setProviderLoading] = useState(false);
  const [providerError, setProviderError] = useState<string | null>(null);
  const [importingId, setImportingId] = useState<string | null>(null);

  // ── Selection state ────────────────────────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState<string[]>(initialSelected);

  // Reset when modal opens
  useEffect(() => {
    if (!open) return;
    setSelectedIds(initialSelected);
    setTab("library");
    setLibrarySearch("");
    setProviderQuery("");
    setProviderItems([]);
    setProviderPage(1);
    setProviderTotalPages(0);
    setUploadError(null);
    setProviderError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // ── Load library ───────────────────────────────────────────────────────────
  const loadLibrary = useCallback(async () => {
    if (!storeSlug) return;
    setLibraryLoading(true);
    try {
      const [fRes, aRes] = await Promise.all([
        fetch(`/api/admin/media/list?store_slug=${encodeURIComponent(storeSlug)}&path_prefix=${encodeURIComponent(folder)}&limit=200`, { cache: "no-store" })
          .then((r) => r.json()) as Promise<{ items?: MediaAssetItem[] }>,
        fetch(`/api/admin/media/list?store_slug=${encodeURIComponent(storeSlug)}&limit=400`, { cache: "no-store" })
          .then((r) => r.json()) as Promise<{ items?: MediaAssetItem[] }>,
      ]);
      setFolderMedia(fRes.items ?? []);
      setAllMedia(aRes.items ?? []);
    } finally {
      setLibraryLoading(false);
    }
  }, [storeSlug, folder]);

  useEffect(() => {
    if (open) void loadLibrary();
  }, [open, loadLibrary]);

  // ── Derived library list ───────────────────────────────────────────────────
  const combined = useMemo(() => {
    const seen = new Set<string>();
    return [...folderMedia, ...allMedia].filter((m) => {
      if (seen.has(m.id)) return false;
      seen.add(m.id);
      return true;
    });
  }, [folderMedia, allMedia]);

  const libraryList = useMemo(() => {
    const base = libraryTab === "folder" ? folderMedia : allMedia;
    return base.filter((m) => {
      const typeOk = mode === "both" || (mode === "images" && m.media_type === "image") || (mode === "videos" && m.media_type === "video");
      const searchOk = !librarySearch || m.path.toLowerCase().includes(librarySearch.toLowerCase());
      return typeOk && searchOk;
    });
  }, [libraryTab, folderMedia, allMedia, mode, librarySearch]);

  const selectedAssets = useMemo(
    () => selectedIds.map((id) => combined.find((m) => m.id === id)).filter(Boolean) as MediaAssetItem[],
    [selectedIds, combined],
  );

  // ── Selection helpers ──────────────────────────────────────────────────────
  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (maxSelect === 1) return [id];
      if (maxSelect && prev.length >= maxSelect) return prev;
      return [...prev, id];
    });
  }

  function reorder(id: string, dir: -1 | 1) {
    setSelectedIds((prev) => {
      const idx = prev.indexOf(id);
      if (idx === -1) return prev;
      const next = idx + dir;
      if (next < 0 || next >= prev.length) return prev;
      const clone = [...prev];
      [clone[idx], clone[next]] = [clone[next], clone[idx]];
      return clone;
    });
  }

  // ── Upload ─────────────────────────────────────────────────────────────────
  async function uploadFiles(files: FileList | File[]) {
    const arr = Array.from(files);
    if (!arr.length) return;
    setUploading(true);
    setUploadError(null);
    const newIds: string[] = [];
    try {
      for (const file of arr) {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("folder", folder);
        fd.append("siteId", storeSlug);
        fd.append("altText", file.name.replace(/\.[^.]+$/, ""));
        const res = await fetch("/api/admin/media/upload", {
          method: "POST",
          headers: { "x-store-slug": storeSlug },
          body: fd,
        });
        const p = (await res.json()) as { id?: string; url?: string; message?: string };
        if (!res.ok) throw new Error(p.message ?? "Upload failed");
        if (p.id) newIds.push(p.id);
      }
      await loadLibrary();
      setSelectedIds((prev) => {
        const toAdd = newIds.filter((id) => !prev.includes(id));
        if (maxSelect === 1) return newIds.slice(-1);
        if (maxSelect) return [...prev, ...toAdd].slice(0, maxSelect);
        return [...prev, ...toAdd];
      });
      setTab("library");
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    void uploadFiles(Array.from(e.dataTransfer.files));
  }

  // ── Provider search ────────────────────────────────────────────────────────
  async function searchProvider(provider: "unsplash" | "pexels", page = 1) {
    if (!providerQuery.trim()) return;
    setProviderLoading(true);
    setProviderError(null);
    try {
      const params = new URLSearchParams({
        provider,
        query: providerQuery.trim(),
        page: String(page),
        perPage: "24",
      });
      const res = await fetch(`/api/admin/media/provider/search?${params.toString()}`);
      const p = (await res.json()) as { items?: ProviderItem[]; page?: number; totalPages?: number; message?: string };
      if (!res.ok) throw new Error(p.message ?? "Search failed");
      setProviderItems(p.items ?? []);
      setProviderPage(Number(p.page ?? page));
      setProviderTotalPages(Number(p.totalPages ?? 0));
    } catch (err) {
      setProviderError(err instanceof Error ? err.message : "Search failed");
    } finally {
      setProviderLoading(false);
    }
  }

  async function importProviderImage(item: ProviderItem, provider: "unsplash" | "pexels") {
    setImportingId(item.id);
    setProviderError(null);
    try {
      const res = await fetch("/api/admin/media/provider/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          siteId: storeSlug,
          provider,
          sourceUrl: item.sourceUrl,
          folder,
          altText: item.alt,
        }),
      });
      const p = (await res.json()) as { id?: string; url?: string; message?: string };
      if (!res.ok) throw new Error(p.message ?? "Import failed");

      await loadLibrary();

      if (p.id) {
        if (maxSelect === 1) {
          setSelectedIds([p.id]);
        } else {
          setSelectedIds((prev) => (prev.includes(p.id!) ? prev : [...prev, p.id!]));
        }
        setTab("library");
      }
    } catch (err) {
      setProviderError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setImportingId(null);
    }
  }

  if (!open) return null;

  const acceptAttr = mode === "images" ? "image/*" : mode === "videos" ? "video/*" : "image/*,video/*";
  const currentProvider = (tab === "unsplash" || tab === "pexels") ? tab : null;

  const tabs: Array<{ id: SourceTab; label: string }> = [
    { id: "library", label: "Library" },
    { id: "upload", label: "Upload" },
    { id: "unsplash", label: "Unsplash" },
    { id: "pexels", label: "Pexels" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="relative flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-3">
          <div>
            <h2 className="text-[15px] font-semibold text-gray-900">
              Choose {mode === "videos" ? "Video" : "Photo"}
              {selectedIds.length > 0 && maxSelect !== 1 && (
                <span className="ml-2 rounded-full px-2 py-0.5 text-[12px]" style={{ background: `${BRAND}18`, color: BRAND }}>
                  {selectedIds.length} selected
                </span>
              )}
            </h2>
            <p className="text-[11px] text-gray-400">Upload, pick from library, or search Unsplash & Pexels</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100">✕</button>
        </div>

        {/* ── Tab bar ────────────────────────────────────────────────────── */}
        <div className="flex border-b border-gray-200 px-5">
          {tabs.map((tb) => (
            <button
              key={tb.id}
              type="button"
              onClick={() => {
                setTab(tb.id);
                setProviderError(null);
                if (tb.id === "library") void loadLibrary();
                if (tb.id !== "unsplash" && tb.id !== "pexels") {
                  setProviderItems([]);
                  setProviderPage(1);
                  setProviderTotalPages(0);
                }
              }}
              className={[
                "border-b-2 px-4 py-2.5 text-[13px] font-medium transition -mb-px",
                tab === tb.id ? "border-[#2D8C54] text-[#2D8C54]" : "border-transparent text-gray-500 hover:text-gray-800",
              ].join(" ")}
            >
              {tb.label}
            </button>
          ))}
        </div>

        <div className="flex min-h-0 flex-1 overflow-hidden">
          {/* ── Left: selected panel ──────────────────────────────────────── */}
          {selectedIds.length > 0 && (
            <div className="flex w-44 shrink-0 flex-col gap-2 overflow-y-auto border-r border-gray-100 bg-gray-50 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Selected</p>
              {selectedAssets.map((asset, i) => (
                <div key={asset.id} className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
                  {asset.media_type === "image" ? (
                    <div className="relative h-20 w-full bg-gray-100">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={asset.url} alt={asset.alt_text ?? ""} className="h-full w-full object-cover" />
                      <div className="absolute left-1 top-1 flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold text-white shadow" style={{ background: BRAND }}>
                        {i + 1}
                      </div>
                    </div>
                  ) : (
                    <div className="flex h-10 items-center gap-1 px-2 text-[11px] text-gray-600">
                      <span>🎬</span>
                      <span className="truncate">{asset.path.split("/").pop()}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between px-1.5 py-1">
                    <div className="flex">
                      <button type="button" disabled={i === 0} onClick={() => reorder(asset.id, -1)} className="rounded px-0.5 py-0.5 text-[10px] text-gray-400 hover:bg-gray-100 disabled:opacity-30">↑</button>
                      <button type="button" disabled={i === selectedAssets.length - 1} onClick={() => reorder(asset.id, 1)} className="rounded px-0.5 py-0.5 text-[10px] text-gray-400 hover:bg-gray-100 disabled:opacity-30">↓</button>
                    </div>
                    <button type="button" onClick={() => toggleSelect(asset.id)} className="text-[10px] text-red-400 hover:text-red-600">✕</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── Main content area ─────────────────────────────────────────── */}
          <div className="flex min-w-0 flex-1 flex-col overflow-hidden">

            {/* ── UPLOAD tab ─────────────────────────────────────────────── */}
            {tab === "upload" && (
              <div className="flex-1 overflow-y-auto p-6">
                <div
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={[
                    "flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed py-16 text-center transition",
                    dragOver ? "border-[#2D8C54] bg-[#2D8C54]/5" : "border-gray-300 hover:border-[#2D8C54] hover:bg-gray-50",
                  ].join(" ")}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={acceptAttr}
                    multiple={maxSelect !== 1}
                    className="hidden"
                    onChange={(e) => { if (e.target.files) void uploadFiles(e.target.files); e.target.value = ""; }}
                  />
                  {uploading ? (
                    <p className="text-[14px] font-medium text-[#2D8C54]">Uploading…</p>
                  ) : (
                    <>
                      <div className="flex h-16 w-16 items-center justify-center rounded-full text-4xl" style={{ background: `${BRAND}12` }}>↑</div>
                      <p className="text-[15px] font-semibold text-gray-700">Drag & drop or click to upload</p>
                      <p className="text-[12px] text-gray-400">
                        Stored in Supabase Storage · {storeSlug}/{folder}/
                      </p>
                      <p className="text-[11px] text-gray-400">JPG, PNG, WebP, GIF supported</p>
                    </>
                  )}
                </div>
                {uploadError && <p className="mt-3 rounded-lg bg-red-50 p-3 text-[12px] text-red-600">{uploadError}</p>}
              </div>
            )}

            {/* ── LIBRARY tab ────────────────────────────────────────────── */}
            {tab === "library" && (
              <div className="flex flex-1 flex-col overflow-hidden">
                <div className="flex flex-wrap items-center gap-2 border-b border-gray-100 px-4 py-2">
                  <div className="flex overflow-hidden rounded-lg border border-gray-200 text-[12px]">
                    <button
                      type="button"
                      onClick={() => setLibraryTab("folder")}
                      className={`px-3 py-1.5 font-medium transition ${libraryTab === "folder" ? "text-white" : "bg-white text-gray-500 hover:bg-gray-50"}`}
                      style={libraryTab === "folder" ? { background: BRAND } : {}}
                    >
                      This folder ({folderMedia.filter((m) => mode === "both" || m.media_type === (mode === "images" ? "image" : "video")).length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setLibraryTab("all")}
                      className={`px-3 py-1.5 font-medium transition ${libraryTab === "all" ? "text-white" : "bg-white text-gray-500 hover:bg-gray-50"}`}
                      style={libraryTab === "all" ? { background: BRAND } : {}}
                    >
                      All media ({allMedia.filter((m) => mode === "both" || m.media_type === (mode === "images" ? "image" : "video")).length})
                    </button>
                  </div>
                  <input
                    type="text"
                    value={librarySearch}
                    onChange={(e) => setLibrarySearch(e.target.value)}
                    placeholder="Search by filename…"
                    className="min-w-0 flex-1 rounded-lg border border-gray-200 px-3 py-1.5 text-[12px] outline-none focus:border-[#2D8C54]"
                  />
                </div>
                <div className="flex-1 overflow-y-auto p-4">
                  {libraryLoading ? (
                    <p className="text-[13px] text-gray-400">Loading…</p>
                  ) : libraryList.length === 0 ? (
                    <div className="flex h-40 flex-col items-center justify-center gap-2 text-center">
                      <p className="text-[13px] text-gray-500">
                        {libraryTab === "folder" ? "No media in this folder yet. Use the Upload tab to add files." : "No media found."}
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
                      {libraryList.map((asset) => {
                        const isSelected = selectedIds.includes(asset.id);
                        const idx = selectedIds.indexOf(asset.id);
                        return (
                          <button
                            key={asset.id}
                            type="button"
                            onClick={() => toggleSelect(asset.id)}
                            className={["group relative overflow-hidden rounded-xl border-2 transition", isSelected ? "shadow-md" : "border-transparent hover:border-gray-300"].join(" ")}
                            style={isSelected ? { borderColor: BRAND } : {}}
                          >
                            {asset.media_type === "image" ? (
                              <div className="relative aspect-square w-full bg-gray-100">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={asset.url} alt={asset.alt_text ?? asset.path} className="h-full w-full object-cover" loading="lazy" />
                              </div>
                            ) : (
                              <div className="flex aspect-square w-full items-center justify-center bg-gray-100 text-3xl">🎬</div>
                            )}
                            {isSelected ? (
                              <div className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-white shadow" style={{ background: BRAND }}>
                                {maxSelect === 1 ? "✓" : idx + 1}
                              </div>
                            ) : (
                              <div className="absolute right-1 top-1 h-5 w-5 rounded-full border-2 border-white bg-black/20 opacity-0 transition group-hover:opacity-100" />
                            )}
                            <p className="truncate bg-white px-1 py-0.5 text-left text-[10px] text-gray-500">
                              {asset.path.split("/").pop()}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── UNSPLASH / PEXELS tabs ─────────────────────────────────── */}
            {currentProvider && (
              <div className="flex flex-1 flex-col overflow-hidden">
                <form
                  className="flex items-center gap-2 border-b border-gray-100 px-4 py-2"
                  onSubmit={(e) => { e.preventDefault(); void searchProvider(currentProvider, 1); }}
                >
                  <input
                    type="text"
                    value={providerQuery}
                    onChange={(e) => setProviderQuery(e.target.value)}
                    placeholder={`Search ${currentProvider === "unsplash" ? "Unsplash" : "Pexels"} photos…`}
                    className="min-w-0 flex-1 rounded-lg border border-gray-200 px-3 py-2 text-[13px] outline-none focus:border-[#2D8C54]"
                  />
                  <button
                    type="submit"
                    disabled={providerLoading || !providerQuery.trim()}
                    className="rounded-lg px-4 py-2 text-[13px] font-medium text-white disabled:opacity-50"
                    style={{ background: BRAND }}
                  >
                    {providerLoading ? "Searching…" : "Search"}
                  </button>
                </form>

                <div className="flex-1 overflow-y-auto p-4">
                  {providerError && <p className="mb-3 rounded-lg bg-red-50 p-3 text-[12px] text-red-600">{providerError}</p>}

                  {providerLoading ? (
                    <p className="text-[13px] text-gray-400">Searching…</p>
                  ) : providerItems.length === 0 ? (
                    <div className="flex h-40 flex-col items-center justify-center gap-1 text-center">
                      <p className="text-[13px] text-gray-500">
                        {providerQuery.trim() ? "No results found." : `Search for photos to import from ${currentProvider === "unsplash" ? "Unsplash" : "Pexels"}.`}
                      </p>
                      <p className="text-[11px] text-gray-400">Images are downloaded and stored in your Supabase Storage.</p>
                    </div>
                  ) : (
                    <>
                      <div className="mb-3 text-[11px] text-gray-400">{providerItems.length} results · click "Import" to save to your library</div>
                      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                        {providerItems.map((item) => (
                          <div key={item.id} className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                            <div className="aspect-[4/3] bg-gray-100">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={item.previewUrl} alt={item.alt} className="h-full w-full object-cover" loading="lazy" />
                            </div>
                            <div className="p-2 space-y-1.5">
                              <p className="line-clamp-2 text-[11px] text-gray-600">{item.alt}</p>
                              {item.author && <p className="text-[10px] text-gray-400">by {item.author}</p>}
                              <button
                                type="button"
                                disabled={Boolean(importingId)}
                                onClick={() => void importProviderImage(item, currentProvider)}
                                className="w-full rounded-lg border border-gray-200 py-1 text-[11px] font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                              >
                                {importingId === item.id ? "Importing…" : "Import"}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>

                      {providerTotalPages > 1 && (
                        <div className="mt-4 flex items-center justify-between">
                          <button
                            type="button"
                            disabled={providerPage <= 1 || providerLoading}
                            onClick={() => void searchProvider(currentProvider, providerPage - 1)}
                            className="rounded-lg border border-gray-200 px-3 py-1.5 text-[12px] disabled:opacity-50 hover:bg-gray-50"
                          >
                            ← Prev
                          </button>
                          <span className="text-[12px] text-gray-500">Page {providerPage} / {providerTotalPages}</span>
                          <button
                            type="button"
                            disabled={providerPage >= providerTotalPages || providerLoading}
                            onClick={() => void searchProvider(currentProvider, providerPage + 1)}
                            className="rounded-lg border border-gray-200 px-3 py-1.5 text-[12px] disabled:opacity-50 hover:bg-gray-50"
                          >
                            Next →
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Footer ─────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between border-t border-gray-200 px-5 py-3">
          <p className="text-[12px] text-gray-400">
            {selectedIds.length === 0 ? "No media selected" : `${selectedIds.length} item${selectedIds.length !== 1 ? "s" : ""} selected`}
          </p>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="rounded-lg border border-gray-200 px-4 py-2 text-[13px] font-medium text-gray-600 hover:bg-gray-50">
              Cancel
            </button>
            <button
              type="button"
              disabled={selectedIds.length === 0}
              onClick={() => {
                onConfirm(selectedIds);
                if (onConfirmAssets) onConfirmAssets(selectedAssets);
                onClose();
              }}
              className="rounded-lg px-5 py-2 text-[13px] font-semibold text-white disabled:opacity-40"
              style={{ background: BRAND }}
            >
              {maxSelect === 1 ? "Use Photo" : `Insert${selectedIds.length > 0 ? ` (${selectedIds.length})` : ""}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
