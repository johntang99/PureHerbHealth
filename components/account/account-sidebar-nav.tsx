"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = {
  href: string;
  label: string;
  badge?: number;
};

export function AccountSidebarNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();

  return (
    <nav className="p-2">
      {items.map((item) => {
        // exact match for dashboard, prefix match for sub-pages
        const isActive =
          item.href === pathname ||
          (item.href !== pathname.split("/account")[0] + "/account" &&
            pathname.startsWith(item.href) &&
            !item.href.endsWith("/account"));

        return (
          <Link
            key={item.href}
            href={item.href}
            className={[
              "relative flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              isActive
                ? "bg-[var(--color-brand-50,#f0fdf4)] text-[var(--color-brand-700,#15803d)]"
                : "text-[var(--neutral-700)] hover:bg-[var(--neutral-100)] hover:text-[var(--neutral-900)]",
            ].join(" ")}
          >
            <span>{item.label}</span>
            {item.badge ? (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--color-brand-100,#dcfce7)] px-1 text-xs font-semibold text-[var(--color-brand-700,#15803d)]">
                {item.badge}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}

export function AccountMobileNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();

  return (
    <div className="mb-4 flex gap-1 overflow-x-auto rounded-xl border border-[var(--neutral-200)] bg-white p-1 lg:hidden">
      {items.map((item) => {
        const isActive =
          item.href === pathname ||
          (pathname.startsWith(item.href) && !item.href.endsWith("/account"));
        return (
          <Link
            key={item.href}
            href={item.href}
            className={[
              "relative flex-shrink-0 rounded-lg px-3 py-2 text-xs font-medium transition-colors",
              isActive
                ? "bg-[var(--color-brand-500)] text-white"
                : "text-[var(--neutral-600)] hover:bg-[var(--neutral-100)]",
            ].join(" ")}
          >
            {item.label}
            {item.badge ? (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--color-brand-500)] text-[10px] font-bold text-white">
                {item.badge}
              </span>
            ) : null}
          </Link>
        );
      })}
    </div>
  );
}
