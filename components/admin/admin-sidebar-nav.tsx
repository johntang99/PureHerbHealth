"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = {
  href: string;
  icon: string;
  label: string;
  badge?: number;
  disabled?: boolean;
  noChildMatch?: string[];
};

type NavGroup = {
  section: string;
  items: NavItem[];
};

const NAV_GROUPS: NavGroup[] = [
  {
    section: "OVERVIEW",
    items: [
      { href: "/admin",          icon: "▦",  label: "Dashboard" },
    ],
  },
  {
    section: "STORES",
    items: [
      { href: "/admin/stores",       icon: "🏪", label: "All Stores" },
      { href: "/admin/stores/new",   icon: "＋", label: "Add New Store" },
    ],
  },
  {
    section: "COMMERCE",
    items: [
      { href: "/admin/orders",              icon: "📦", label: "Orders" },
      { href: "/admin/products",            icon: "🌿", label: "Products", noChildMatch: ["/admin/products/categories"] },
      { href: "/admin/products/categories", icon: "🗂",  label: "Categories" },
      { href: "/admin/inventory",           icon: "🗄",  label: "Inventory Management" },
      { href: "/admin/customers",           icon: "👥", label: "Customer Management"   },
    ],
  },
  {
    section: "TCM CONTENT",
    items: [
      { href: "/admin/content/five-elements", icon: "☯",  label: "Five Elements CMS" },
      { href: "/admin/content/herbs",         icon: "🌱", label: "Herb Profiles" },
      { href: "/admin/content/articles",      icon: "📄", label: "Articles" },
      { href: "/admin/reviews",               icon: "⭐", label: "Reviews" },
    ],
  },
  {
    section: "INTELLIGENCE",
    items: [
      { href: "/admin/ai",                    icon: "✦",  label: "AI Engine" },
      { href: "/admin/ai/constitution",       icon: "🧬", label: "Constitution Analytics" },
      { href: "/admin/ai/recommendations",    icon: "💡", label: "Recommendations" },
    ],
  },
  {
    section: "SETTINGS",
    items: [
      { href: "/admin/staff",    icon: "👤", label: "Staff & Access" },
      { href: "/admin/settings", icon: "⚙",  label: "Platform Settings" },
    ],
  },
];

export function AdminSidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="flex-1 overflow-y-auto px-3 py-3">
      {NAV_GROUPS.map((group) => (
        <div key={group.section} className="mb-5">
          <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-white/25">
            {group.section}
          </p>
          <div className="space-y-0.5">
            {group.items.map((item) => {
              const isActive =
                item.href === "/admin"
                  ? pathname === "/admin"
                  : item.noChildMatch
                  ? pathname.startsWith(item.href) && !item.noChildMatch.some((p) => pathname.startsWith(p))
                  : pathname.startsWith(item.href);

              if (item.disabled) {
                return (
                  <div
                    key={item.href}
                    className="flex cursor-not-allowed items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium text-white/25"
                  >
                    <span className="text-sm opacity-50">{item.icon}</span>
                    {item.label}
                    <span className="ml-auto rounded-sm bg-white/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-white/30">
                      Soon
                    </span>
                  </div>
                );
              }

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={[
                    "flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors",
                    isActive
                      ? "bg-[#2D8C54]/20 text-white"
                      : "text-white/60 hover:bg-white/8 hover:text-white",
                  ].join(" ")}
                >
                  <span className={`text-sm ${isActive ? "opacity-100" : "opacity-60"}`}>
                    {item.icon}
                  </span>
                  {item.label}
                  {item.badge ? (
                    <span className="ml-auto flex h-4 min-w-4 items-center justify-center rounded-full bg-[#2D8C54] px-1 text-[10px] font-bold text-white">
                      {item.badge}
                    </span>
                  ) : null}
                  {isActive && (
                    <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#2D8C54]" />
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}
