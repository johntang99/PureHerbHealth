import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthenticatedUserAndProfile } from "@/lib/auth/profile";
import { AdminSidebarNav } from "@/components/admin/admin-sidebar-nav";
import { AdminLogoutButton } from "@/components/admin/admin-logout-button";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getAuthenticatedUserAndProfile();
  if (!session) redirect("/admin/login");

  const isAdminRole =
    session.profile.role === "platform_admin" ||
    session.profile.role === "platform_super_admin";
  if (!isAdminRole) redirect("/en/account");

  const initials = session.profile.full_name
    ? session.profile.full_name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()
    : (session.user.email?.[0] ?? "A").toUpperCase();

  return (
    <div className="flex min-h-screen bg-[#f4f6f8]">
      {/* ── Sidebar ───────────────────────────────────────────────── */}
      <aside className="flex w-[228px] shrink-0 flex-col border-r border-white/8 bg-[#0c0f16]">
        {/* Logo / Brand */}
        <div className="flex items-center gap-2.5 border-b border-white/8 px-5 py-[14px]">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[#2D8C54] text-xs font-bold text-white shadow-lg shadow-[#2D8C54]/30">
            ✦
          </div>
          <div>
            <p className="text-[13px] font-bold leading-tight text-white">pureHerbHealth</p>
            <p className="text-[10px] text-white/35">Admin Platform</p>
          </div>
        </div>

        {/* Categorized nav — client component for active states */}
        <AdminSidebarNav />

        {/* User footer */}
        <div className="border-t border-white/8 px-4 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#2D8C54] text-xs font-bold text-white">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="truncate text-[12px] font-semibold text-white">
                {session.profile.full_name ?? "Admin"}
              </p>
              <p className="truncate text-[10px] text-white/40">{session.user.email}</p>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <Link
              href="/en/account"
              className="text-[11px] text-white/30 transition hover:text-white/60"
            >
              ← Store
            </Link>
            <AdminLogoutButton />
          </div>
        </div>
      </aside>

      {/* ── Main content ──────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-3">
          <p className="text-[13px] text-gray-400">pureHerbHealth · Platform Admin</p>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 rounded-full bg-green-50 px-2.5 py-1 text-[11px] font-medium text-green-600 ring-1 ring-green-200">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-500" />
              Live
            </span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto bg-[#f4f6f8] px-6 py-6 text-gray-900">
          {children}
        </main>
      </div>
    </div>
  );
}
