"use client";

import { useState } from "react";
import Link from "next/link";
import type { Locale } from "@/lib/i18n/config";

type NavItem = { href: string; label: string; isSearch?: boolean };

export function MobileNavMenu({ locale, navLinks }: { locale: Locale; navLinks: NavItem[] }) {
  const [open, setOpen] = useState(false);
  const isZh = locale === "zh";

  return (
    <>
      {/* Hamburger button — only visible on mobile */}
      <button
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--neutral-200)] text-[var(--neutral-700)] transition hover:bg-[var(--neutral-50)] lg:hidden"
        onClick={() => setOpen((v) => !v)}
        aria-label="Menu"
        aria-expanded={open}
      >
        {open ? (
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        )}
      </button>

      {/* Dropdown overlay */}
      {open && (
        <div
          className="fixed inset-0 z-20 bg-black/20 backdrop-blur-[2px] lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Mobile menu panel */}
      {open && (
        <div className="absolute left-0 right-0 top-full z-30 border-b border-[var(--neutral-200)] bg-white px-4 py-4 shadow-lg lg:hidden">
          <nav className="space-y-1">
            {navLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={[
                  "block rounded-lg px-4 py-3 text-[15px] font-medium transition-colors",
                  item.isSearch
                    ? "text-[var(--color-brand-700)] bg-[var(--color-brand-50,#f0fdf4)]"
                    : "text-[var(--neutral-700)] hover:bg-[var(--neutral-50)]",
                ].join(" ")}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="mt-4 border-t border-[var(--neutral-100)] pt-4 text-sm text-[var(--neutral-500)]">
            {isZh ? "选择语言：" : "Language:"}
            <div className="mt-2 flex gap-2">
              {[
                { href: `/en`, label: "EN" },
                { href: `/zh`, label: "中文" },
              ].map((lang) => (
                <Link
                  key={lang.href}
                  href={lang.href}
                  onClick={() => setOpen(false)}
                  className="rounded-full border border-[var(--neutral-200)] px-3 py-1 text-xs font-semibold text-[var(--neutral-700)] hover:bg-[var(--neutral-50)]"
                >
                  {lang.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
