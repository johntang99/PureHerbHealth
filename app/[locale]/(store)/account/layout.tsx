import { redirect } from "next/navigation";
import type { Locale } from "@/lib/i18n/config";
import { getAuthenticatedUserAndProfile } from "@/lib/auth/profile";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { LogoutButton } from "@/components/account/logout-button";
import {
  AccountSidebarNav,
  AccountMobileNav,
} from "@/components/account/account-sidebar-nav";

export default async function AccountLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { locale: Locale };
}) {
  const session = await getAuthenticatedUserAndProfile();
  if (!session) {
    redirect(`/${params.locale}/login`);
  }

  const { user, profile } = session;
  const isZh = params.locale === "zh";
  const admin = getSupabaseAdminClient();

  const { count: wishlistCount } = await admin
    .from("wishlists")
    .select("id", { count: "exact", head: true })
    .eq("profile_id", profile.id);

  const initials = profile.full_name
    ? profile.full_name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : (user.email?.[0] ?? "U").toUpperCase();

  const navItems = [
    {
      href: `/${params.locale}/account`,
      label: isZh ? "概览" : "Dashboard",
    },
    {
      href: `/${params.locale}/account/orders`,
      label: isZh ? "我的订单" : "Orders",
    },
    {
      href: `/${params.locale}/account/tcm-profile`,
      label: isZh ? "体质档案" : "TCM Profile",
    },
    {
      href: `/${params.locale}/account/wishlist`,
      label: isZh ? "收藏夹" : "Wishlist",
      badge: wishlistCount ?? 0,
    },
    {
      href: `/${params.locale}/account/settings`,
      label: isZh ? "账户设置" : "Settings",
    },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* Mobile nav */}
      <AccountMobileNav items={navItems} />

      <div className="flex gap-6">
        {/* Desktop sidebar */}
        <aside className="hidden w-56 shrink-0 lg:block">
          <div className="sticky top-24 overflow-hidden rounded-xl border border-[var(--neutral-200)] bg-white">
            {/* User header */}
            <div className="border-b border-[var(--neutral-200)] bg-[var(--color-brand-50,#f0fdf4)] px-4 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--color-brand-500)] text-sm font-bold text-white">
                  {initials}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[var(--neutral-900)]">
                    {profile.full_name || (isZh ? "用户" : "My Account")}
                  </p>
                  <p className="truncate text-xs text-[var(--neutral-500)]">
                    {user.email}
                  </p>
                </div>
              </div>
            </div>

            {/* Nav items */}
            <AccountSidebarNav items={navItems} />

            {/* Logout */}
            <div className="border-t border-[var(--neutral-200)] p-3">
              <LogoutButton locale={params.locale} />
            </div>
          </div>
        </aside>

        {/* Main content */}
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
