import Link from "next/link";
import type { CSSProperties } from "react";
import type { Locale } from "@/lib/i18n/config";
import { LanguageSwitcher } from "./language-switcher";
import { CartHeaderLink } from "./cart-header-link";
import { AccountHeaderMenu } from "./account-header-menu";
import { AISearchBar } from "./ai-search-bar";
import { MobileNavMenu } from "./mobile-nav-menu";

type Props = {
  locale: Locale;
  siteName: string;
  logoUrl?: string | null;
  storeSlug?: string;
  contactEmail?: string | null;
  contactPhone?: string | null;
  businessName?: string | null;
  themeCssVars?: Record<string, string>;
  children: React.ReactNode;
};

const NAV_LINKS = (locale: string) => [
  { href: `/${locale}/shop`,        label: locale === "zh" ? "选购"     : "Shop"   },
  { href: `/${locale}/shop/search`, label: locale === "zh" ? "AI 搜索"  : "Search", isSearch: true },
  { href: `/${locale}/learn`,       label: locale === "zh" ? "学习中心" : "Learn"  },
  { href: `/${locale}/quiz`,        label: locale === "zh" ? "体质测评" : "Quiz"   },
  { href: `/${locale}/ai-wellness`, label: locale === "zh" ? "AI 顾问"  : "Clinic" },
];

export function StoreShell({
  locale,
  siteName,
  logoUrl: _logoUrl, // eslint-disable-line @typescript-eslint/no-unused-vars
  storeSlug,
  contactEmail,
  contactPhone,
  businessName,
  themeCssVars,
  children,
}: Props) {
  const style = themeCssVars ? ({ ...themeCssVars } as CSSProperties) : undefined;

  // Split siteName for accent colouring: "pureHerbHealth" → pure + Herb + Health
  // Falls back to rendering the whole name if pattern doesn't match
  const herbMatch = siteName.match(/^(pure)(Herb)(Health.*)$/i);

  return (
    <div className="min-h-screen bg-[var(--neutral-50,#fafafa)]" style={style}>
      {/* Top promo bar */}
      <div className="bg-[var(--color-brand-800,#14532d)] px-4 py-2 text-center text-[13px] text-[var(--color-brand-100,#dcfce7)]">
        <span>
          {locale === "zh"
            ? "🌿 满 $75 包邮 · 首单优惠码 "
            : "🌿 Free shipping on orders over $65 · Use code "}
        </span>
        <span className="font-bold text-[var(--color-accent-300,#fcd34d)]">
          {locale === "zh" ? "WELCOME10" : "TCM15"}
        </span>
        <span>
          {locale === "zh" ? " 立减 10%" : " for 15% off your first order"}
        </span>
      </div>

      {/* Main header */}
      <header className="relative sticky top-0 z-30 border-b border-[var(--neutral-200,#e5e5e5)] bg-white shadow-sm">
        <div className="mx-auto flex max-w-[1280px] items-center gap-5 px-6 py-[14px]">

          {/* Logo */}
          {/* Use <a> instead of <Link> to force full-page navigation.
              When rendered inside a proxied checkout (e.g. tcm-network → pureherbhealth),
              Next.js <Link> tries to load the home-page JS chunk from the upstream origin,
              causing a ChunkLoadError. A plain anchor avoids that. */}
          <a
            href={`/${locale}`}
            className="flex shrink-0 items-center gap-2"
            aria-label={siteName}
          >
            {/* Leaf SVG — always renders, no broken image */}
            <svg
              width="28" height="28" viewBox="0 0 28 28" fill="none"
              aria-hidden="true"
            >
              <path
                d="M14 3C14 3 5 8 5 16a9 9 0 0018 0C23 8 14 3 14 3z"
                fill="var(--color-brand-500,#2D8C54)"
                opacity="0.9"
              />
              <path
                d="M14 3 C14 3 14 12 14 22"
                stroke="var(--color-brand-200,#bbf7d0)"
                strokeWidth="1.2"
                strokeLinecap="round"
              />
              <path
                d="M14 12 C11 10 8 11 7 14"
                stroke="var(--color-brand-200,#bbf7d0)"
                strokeWidth="0.9"
                strokeLinecap="round"
              />
              <path
                d="M14 16 C17 14 20 15 21 18"
                stroke="var(--color-brand-200,#bbf7d0)"
                strokeWidth="0.9"
                strokeLinecap="round"
              />
            </svg>
            <span
              className="text-[22px] leading-none"
              style={{ fontFamily: "var(--font-heading, 'Georgia', serif)" }}
            >
              {herbMatch ? (
                <>
                  <span className="text-[var(--color-brand-700,#166534)]">{herbMatch[1]}</span>
                  <span className="text-[var(--color-accent-500,#D4A843)]">{herbMatch[2]}</span>
                  <span className="text-[var(--color-brand-700,#166534)]">{herbMatch[3]}</span>
                </>
              ) : (
                <span className="text-[var(--color-brand-700,#166534)]">{siteName}</span>
              )}
            </span>
          </a>

          {/* Primary nav */}
          <nav className="hidden flex-1 items-center gap-0.5 lg:flex">
            {NAV_LINKS(locale).map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={[
                  "rounded-[8px] px-3 py-[7px] text-[13px] font-medium transition-colors",
                  item.isSearch
                    ? "text-[var(--color-brand-700,#166534)] bg-[var(--color-brand-50,#f0fdf4)] hover:bg-[var(--color-brand-100,#dcfce7)]"
                    : "text-[var(--neutral-700)] hover:bg-[var(--neutral-100)]",
                ].join(" ")}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Right controls */}
          <div className="flex shrink-0 items-center gap-2">
            {/* Language toggle pill */}
            <LanguageSwitcher locale={locale} />
            {/* Account dropdown */}
            <AccountHeaderMenu locale={locale} />
            {/* Cart — filled green button */}
            <CartHeaderLink locale={locale} />
            {/* Mobile hamburger */}
            <MobileNavMenu locale={locale} navLinks={NAV_LINKS(locale)} />
          </div>
        </div>

        {/* ── Search row — always visible on every page ── */}
        <div className="border-t border-[var(--neutral-100,#f5f5f5)] bg-white px-6 py-2.5">
          <div className="mx-auto max-w-[860px]">
            <AISearchBar locale={locale} />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1280px] px-4 py-8">{children}</main>

      <footer className="mt-12 border-t bg-[var(--color-brand-900,#052e16)] text-[var(--color-brand-200,#bbf7d0)]">
        <div className="mx-auto grid max-w-[1280px] gap-8 px-4 py-10 md:grid-cols-4">
          <div className="space-y-2">
            <p className="text-lg font-semibold text-white">{businessName ?? siteName}</p>
            {storeSlug ? <p className="text-xs opacity-60">Store: {storeSlug}</p> : null}
            <p className="text-sm text-[var(--color-brand-300,#86efac)]">
              {locale === "zh"
                ? "提供中医知识内容与精选调理产品，帮助你建立可持续的健康习惯。"
                : "Evidence-informed TCM education and curated products for practical daily wellness."}
            </p>
          </div>
          <div className="space-y-2 text-sm">
            <p className="font-semibold text-white">{locale === "zh" ? "选购" : "Shop"}</p>
            <Link href={`/${locale}/shop`} className="block hover:text-white transition-colors">
              {locale === "zh" ? "全部产品" : "All products"}
            </Link>
            <Link href={`/${locale}/shop?category=single-herbs`} className="block hover:text-white transition-colors">
              {locale === "zh" ? "单味本草" : "Single Herbs"}
            </Link>
            <Link href={`/${locale}/shop?category=herbal-formulas`} className="block hover:text-white transition-colors">
              {locale === "zh" ? "经典方剂" : "Herbal Formulas"}
            </Link>
          </div>
          <div className="space-y-2 text-sm">
            <p className="font-semibold text-white">{locale === "zh" ? "学习中心" : "Learn"}</p>
            <Link href={`/${locale}/learn`} className="block hover:text-white transition-colors">
              {locale === "zh" ? "学习首页" : "Learn hub"}
            </Link>
            <Link href={`/${locale}/learn/herbs`} className="block hover:text-white transition-colors">
              {locale === "zh" ? "本草图鉴" : "Herb directory"}
            </Link>
            <Link href={`/${locale}/learn/conditions`} className="block hover:text-white transition-colors">
              {locale === "zh" ? "症状指南" : "Condition guides"}
            </Link>
            <Link href={`/${locale}/quiz`} className="block hover:text-white transition-colors">
              {locale === "zh" ? "体质测评" : "Constitution quiz"}
            </Link>
          </div>
          <div className="space-y-2 text-sm">
            <p className="font-semibold text-white">{locale === "zh" ? "支持" : "Support"}</p>
            {contactEmail ? <p className="opacity-80">{contactEmail}</p> : null}
            {contactPhone ? <p className="opacity-80">{contactPhone}</p> : null}
            <Link href={`/${locale}/ai-wellness`} className="block hover:text-white transition-colors">
              {locale === "zh" ? "AI 顾问" : "AI Wellness Advisor"}
            </Link>
            <p className="mt-2 text-xs text-[var(--color-brand-400,#4ade80)] opacity-70">
              {locale === "zh"
                ? "教育内容不替代医疗建议。"
                : "Educational content is not a substitute for medical advice."}
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
