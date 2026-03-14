"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function AISearchBar({ locale }: { locale: string }) {
  const [query, setQuery] = useState("");
  const router = useRouter();
  const isZh = locale === "zh";

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    router.push(`/${locale}/shop/search?q=${encodeURIComponent(q)}`);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex w-full items-center overflow-hidden rounded-full border-2 border-[var(--color-brand-500,#2D8C54)] bg-white shadow-sm transition-shadow focus-within:shadow-[0_0_0_3px_rgba(45,140,84,0.15)]"
    >
      {/* Search icon */}
      <span className="flex shrink-0 items-center pl-4 pr-2 text-[var(--neutral-400)]">
        <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
        </svg>
      </span>

      {/* Input */}
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={
          isZh
            ? "搜索草药、症状、配方…  AI 驱动"
            : "Search herbs, symptoms, formulas…   AI-powered"
        }
        className="flex-1 bg-transparent py-[11px] text-[15px] text-[var(--neutral-900)] placeholder:text-[var(--neutral-400)] focus:outline-none"
      />

      {/* Clear button */}
      {query && (
        <button
          type="button"
          onClick={() => setQuery("")}
          className="shrink-0 px-3 text-xl leading-none text-[var(--neutral-300)] hover:text-[var(--neutral-600)] transition-colors"
          aria-label="Clear"
        >
          ×
        </button>
      )}

      {/* Search button — green filled, matches prototype */}
      <button
        type="submit"
        className="shrink-0 rounded-r-full bg-[var(--color-brand-500,#2D8C54)] px-6 py-[11px] text-[15px] font-semibold text-white transition-colors hover:bg-[var(--color-brand-600,#22764a)]"
      >
        {isZh ? "搜索" : "Search"}
      </button>
    </form>
  );
}
