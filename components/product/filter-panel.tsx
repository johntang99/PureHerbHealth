"use client";

import { useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type CategoryFilter = { slug: string; name: string; count: number };

export function FilterPanel({ categories }: { categories: CategoryFilter[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeCategory = searchParams.get("category");

  const baseParams = useMemo(() => new URLSearchParams(searchParams.toString()), [searchParams]);

  const setCategory = (slug?: string) => {
    const params = new URLSearchParams(baseParams.toString());
    if (slug) params.set("category", slug);
    else params.delete("category");
    params.set("page", "1");
    router.replace(`${pathname}?${params.toString()}`);
  };

  return (
    <aside className="sticky top-24 overflow-hidden rounded-[12px] border border-[var(--neutral-200)] bg-white">
      <div className="flex items-center justify-between border-b border-[var(--neutral-200)] px-5 py-4">
        <h3 className="text-[15px] font-bold text-[var(--neutral-900)]">Filters</h3>
        <button type="button" onClick={() => setCategory(undefined)} className="text-xs font-semibold text-[var(--color-brand-500)]">
          Clear all
        </button>
      </div>

      <div className="border-b border-[var(--neutral-100)] px-5 py-4">
        <p className="mb-3 text-[12px] font-bold uppercase tracking-[0.06em] text-[var(--neutral-900)]">Category</p>
        <div className="space-y-2">
          <button
            onClick={() => setCategory(undefined)}
            className={`flex w-full items-center gap-2 text-left text-[13px] ${!activeCategory ? "font-semibold text-[var(--color-brand-700)]" : "text-[var(--neutral-700)]"}`}
          >
            <input type="checkbox" readOnly checked={!activeCategory} className="h-[15px] w-[15px] accent-[var(--color-brand-500)]" />
            <span className="flex-1">All Products</span>
          </button>
          {categories.map((item) => (
            <button
              key={item.slug}
              onClick={() => setCategory(item.slug)}
              className={`flex w-full items-center gap-2 text-left text-[13px] ${activeCategory === item.slug ? "font-semibold text-[var(--color-brand-700)]" : "text-[var(--neutral-700)]"}`}
            >
              <input type="checkbox" readOnly checked={activeCategory === item.slug} className="h-[15px] w-[15px] accent-[var(--color-brand-500)]" />
              <span className="flex-1">{item.name}</span>
              <span className="text-[11px] text-[var(--neutral-400)]">{item.count}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="border-b border-[var(--neutral-100)] px-5 py-4">
        <p className="mb-3 text-[12px] font-bold uppercase tracking-[0.06em] text-[var(--neutral-900)]">Five Elements</p>
        <div className="grid grid-cols-2 gap-2">
          <span className="rounded border border-[#4AA370] bg-[#4AA37014] px-2 py-1 text-center text-xs font-semibold text-[#4AA370]">🌿 Wood</span>
          <span className="rounded border border-[#DC4A3F] bg-[#DC4A3F14] px-2 py-1 text-center text-xs font-semibold text-[#DC4A3F]">🔥 Fire</span>
          <span className="rounded border border-[#D4A843] bg-[#D4A84314] px-2 py-1 text-center text-xs font-semibold text-[#D4A843]">🌍 Earth</span>
          <span className="rounded border border-[#2563EB] bg-[#2563EB14] px-2 py-1 text-center text-xs font-semibold text-[#2563EB]">💧 Water</span>
        </div>
      </div>

      <div className="border-b border-[var(--neutral-100)] px-5 py-4">
        <p className="mb-3 text-[12px] font-bold uppercase tracking-[0.06em] text-[var(--neutral-900)]">TCM Nature</p>
        <div className="space-y-2 text-[13px] text-[var(--neutral-700)]">
          <label className="flex items-center gap-2"><input type="checkbox" className="h-[15px] w-[15px] accent-[var(--color-brand-500)]" />Warm (温) <span className="ml-auto text-[11px] text-[var(--neutral-400)]">42</span></label>
          <label className="flex items-center gap-2"><input type="checkbox" className="h-[15px] w-[15px] accent-[var(--color-brand-500)]" />Hot (热) <span className="ml-auto text-[11px] text-[var(--neutral-400)]">12</span></label>
          <label className="flex items-center gap-2"><input type="checkbox" className="h-[15px] w-[15px] accent-[var(--color-brand-500)]" />Neutral (平) <span className="ml-auto text-[11px] text-[var(--neutral-400)]">34</span></label>
        </div>
      </div>

      <div className="px-5 py-4">
        <p className="mb-3 text-[12px] font-bold uppercase tracking-[0.06em] text-[var(--neutral-900)]">Rating</p>
        <div className="space-y-2 text-[13px] text-[var(--neutral-700)]">
          <label className="flex items-center gap-2"><input type="checkbox" className="h-[15px] w-[15px] accent-[var(--color-brand-500)]" />★★★★★ (4.0+) <span className="ml-auto text-[11px] text-[var(--neutral-400)]">89</span></label>
          <label className="flex items-center gap-2"><input type="checkbox" className="h-[15px] w-[15px] accent-[var(--color-brand-500)]" />In Stock Only</label>
          <label className="flex items-center gap-2"><input type="checkbox" className="h-[15px] w-[15px] accent-[var(--color-brand-500)]" />Practitioner Picks Only</label>
        </div>
      </div>
    </aside>
  );
}
