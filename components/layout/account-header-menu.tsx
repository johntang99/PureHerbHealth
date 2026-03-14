"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Me = {
  user: { id: string; email: string | null };
  profile: { full_name: string | null; role: string };
};

export function AccountHeaderMenu({ locale }: { locale: string }) {
  const isZh = locale === "zh";
  const [me, setMe] = useState<Me | null | "loading">("loading");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/account/me", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: Me | null) => setMe(data))
      .catch(() => setMe(null));
  }, []);

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  async function handleSignOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    setMe(null);
    setOpen(false);
    router.refresh();
  }

  // Loading skeleton
  if (me === "loading") {
    return (
      <div className="h-8 w-8 animate-pulse rounded-full bg-[var(--color-brand-100)]" />
    );
  }

  // Not signed in
  if (!me) {
    return (
      <div className="flex items-center gap-1">
        <Link
          href={`/${locale}/login`}
          className="rounded-md px-3 py-2 text-sm font-medium text-[var(--neutral-700)] transition hover:bg-[var(--color-brand-100)] hover:text-[var(--color-brand-600)]"
        >
          {isZh ? "登录" : "Sign in"}
        </Link>
        <Link
          href={`/${locale}/register`}
          className="rounded-md bg-[var(--color-brand-500)] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[var(--color-brand-600)]"
        >
          {isZh ? "注册" : "Register"}
        </Link>
      </div>
    );
  }

  const initials = me.profile.full_name
    ? me.profile.full_name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : (me.user.email?.[0] ?? "U").toUpperCase();

  const displayName =
    me.profile.full_name?.split(" ")[0] ||
    me.user.email?.split("@")[0] ||
    (isZh ? "账户" : "Account");

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition hover:bg-[var(--color-brand-100)]"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--color-brand-500)] text-[11px] font-bold text-white">
          {initials}
        </span>
        <span className="hidden font-medium text-[var(--neutral-700)] lg:block">
          {displayName}
        </span>
        <svg
          className={[
            "h-3.5 w-3.5 text-[var(--neutral-400)] transition-transform",
            open ? "rotate-180" : "",
          ].join(" ")}
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-52 overflow-hidden rounded-xl border border-[var(--neutral-200)] bg-white shadow-lg">
          {/* User header */}
          <div className="border-b border-[var(--neutral-100)] bg-[var(--color-brand-50,#f0fdf4)] px-4 py-3">
            <p className="text-xs font-semibold text-[var(--neutral-500)]">
              {isZh ? "已登录账户" : "Signed in as"}
            </p>
            <p className="mt-0.5 truncate text-sm font-semibold text-[var(--neutral-900)]">
              {me.user.email}
            </p>
          </div>

          {/* Nav links */}
          <nav className="p-1.5">
            {[
              {
                href: `/${locale}/account`,
                label: isZh ? "我的账户" : "My account",
                icon: "👤",
              },
              {
                href: `/${locale}/account/orders`,
                label: isZh ? "订单记录" : "Orders",
                icon: "📦",
              },
              {
                href: `/${locale}/account/wishlist`,
                label: isZh ? "收藏夹" : "Wishlist",
                icon: "♡",
              },
              {
                href: `/${locale}/account/tcm-profile`,
                label: isZh ? "体质档案" : "TCM Profile",
                icon: "🌿",
              },
              {
                href: `/${locale}/account/settings`,
                label: isZh ? "账户设置" : "Settings",
                icon: "⚙️",
              },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-[var(--neutral-700)] hover:bg-[var(--neutral-100)] transition-colors"
              >
                <span className="text-base">{item.icon}</span>
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Sign out */}
          <div className="border-t border-[var(--neutral-100)] p-1.5">
            <button
              type="button"
              onClick={() => void handleSignOut()}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
            >
              <span>→</span>
              {isZh ? "退出登录" : "Sign out"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
