"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { locales, type Locale } from "@/lib/i18n/config";

export function LanguageSwitcher({ locale }: { locale: Locale }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const withoutLocale = pathname.replace(/^\/(en|zh)/, "") || "/";
  const query = searchParams.toString();
  const hrefFor = (nextLocale: Locale) => `/${nextLocale}${withoutLocale}${query ? `?${query}` : ""}`;

  return (
    <div className="flex items-center rounded-full border border-[var(--color-brand-200)] bg-[var(--color-brand-100)] p-0.5 text-[11px]">
      {locales.map((nextLocale) => (
        <Link
          key={nextLocale}
          href={hrefFor(nextLocale)}
          className={`rounded-full px-2.5 py-0.5 transition ${
            nextLocale === locale
              ? "bg-white font-semibold text-[var(--color-brand-700)] shadow-sm"
              : "text-[var(--color-brand-700)]/70 hover:text-[var(--color-brand-700)]"
          }`}
        >
          {nextLocale.toUpperCase()}
        </Link>
      ))}
    </div>
  );
}
