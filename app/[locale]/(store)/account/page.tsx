import Link from "next/link";
import { redirect } from "next/navigation";
import type { Locale } from "@/lib/i18n/config";
import { getAuthenticatedUserAndProfile } from "@/lib/auth/profile";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  confirmed: "bg-blue-50 text-blue-700 border-blue-200",
  processing: "bg-blue-50 text-blue-700 border-blue-200",
  shipped: "bg-indigo-50 text-indigo-700 border-indigo-200",
  delivered: "bg-emerald-50 text-emerald-700 border-emerald-200",
  cancelled: "bg-red-50 text-red-700 border-red-200",
  refunded: "bg-gray-50 text-gray-700 border-gray-200",
};

const CONSTITUTION_COLORS: Record<string, string> = {
  balanced: "#16a34a",
  qi_deficient: "#D4A843",
  yang_deficient: "#3182CE",
  yin_deficient: "#E53E3E",
  phlegm_damp: "#737373",
  damp_heat: "#ea580c",
  blood_stasis: "#7c3aed",
  qi_stagnant: "#0284c7",
  allergic: "#dc2626",
};

const CONSTITUTION_LABELS: Record<string, { en: string; zh: string }> = {
  balanced: { en: "Balanced", zh: "平和质" },
  qi_deficient: { en: "Qi Deficient", zh: "气虚质" },
  yang_deficient: { en: "Yang Deficient", zh: "阳虚质" },
  yin_deficient: { en: "Yin Deficient", zh: "阴虚质" },
  phlegm_damp: { en: "Phlegm-Damp", zh: "痰湿质" },
  damp_heat: { en: "Damp-Heat", zh: "湿热质" },
  blood_stasis: { en: "Blood Stasis", zh: "血瘀质" },
  qi_stagnant: { en: "Qi Stagnant", zh: "气郁质" },
  allergic: { en: "Allergic", zh: "特禀质" },
};

export default async function AccountPage({
  params,
}: {
  params: { locale: Locale };
}) {
  const session = await getAuthenticatedUserAndProfile();
  if (!session) {
    redirect(
      `/${params.locale}/login?next=${encodeURIComponent(`/${params.locale}/account`)}`
    );
  }

  const { user, profile } = session;
  const isZh = params.locale === "zh";
  const admin = getSupabaseAdminClient();

  const [
    { count: ordersCount },
    { count: wishlistCount },
    { data: recentOrders },
    { data: latestAssessment },
  ] = await Promise.all([
    admin
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("profile_id", profile.id),
    admin
      .from("wishlists")
      .select("id", { count: "exact", head: true })
      .eq("profile_id", profile.id),
    admin
      .from("orders")
      .select(
        "id,order_number,status,payment_status,total_cents,currency,created_at"
      )
      .eq("profile_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(5),
    admin
      .from("constitution_assessments")
      .select("primary_constitution,confidence,created_at")
      .eq("profile_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const memberSince = new Date(
    user.created_at ?? profile.id
  ).getFullYear();

  const hour = new Date().getHours();
  const greeting =
    hour < 12
      ? isZh
        ? "早上好"
        : "Good morning"
      : hour < 17
        ? isZh
          ? "下午好"
          : "Good afternoon"
        : isZh
          ? "晚上好"
          : "Good evening";

  const displayName =
    profile.full_name?.split(" ")[0] ||
    user.email?.split("@")[0] ||
    (isZh ? "用户" : "there");

  const constitutionKey = latestAssessment?.primary_constitution;
  const constitutionColor = constitutionKey
    ? CONSTITUTION_COLORS[constitutionKey] ?? "#2D8C54"
    : null;
  const constitutionLabel = constitutionKey
    ? CONSTITUTION_LABELS[constitutionKey]
    : null;

  return (
    <div className="space-y-6">
      {/* Welcome header */}
      <div className="rounded-xl border border-[var(--neutral-200)] bg-white px-6 py-5">
        <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--color-brand-500)]">
          {isZh ? "账户概览" : "Account overview"}
        </p>
        <h1 className="mt-0.5 text-2xl font-bold text-[var(--neutral-900)]">
          {greeting}, {displayName}
        </h1>
        <p className="mt-1 text-sm text-[var(--neutral-500)]">
          {isZh
            ? "欢迎回来，以下是您的账户概况。"
            : "Welcome back. Here's a summary of your account."}
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label={isZh ? "总订单数" : "Total orders"}
          value={String(ordersCount ?? 0)}
          sub={isZh ? "全部订单" : "All time"}
          href={`/${params.locale}/account/orders`}
        />
        <StatCard
          label={isZh ? "收藏商品" : "Wishlist items"}
          value={String(wishlistCount ?? 0)}
          sub={isZh ? "已收藏" : "Saved products"}
          href={`/${params.locale}/account/wishlist`}
        />
        <StatCard
          label={isZh ? "会员年份" : "Member since"}
          value={String(memberSince)}
          sub={isZh ? "加入时间" : "Year joined"}
        />
        <StatCard
          label={isZh ? "体质档案" : "TCM profile"}
          value={
            constitutionLabel
              ? isZh
                ? constitutionLabel.zh
                : constitutionLabel.en
              : isZh
                ? "未完成"
                : "Not taken"
          }
          sub={
            latestAssessment
              ? isZh
                ? "已完成测评"
                : "Quiz completed"
              : isZh
                ? "参加体质测评"
                : "Take the quiz"
          }
          href={`/${params.locale}/account/tcm-profile`}
          accent={constitutionColor ?? undefined}
        />
      </div>

      {/* Recent orders + constitution side by side */}
      <div className="grid gap-6 lg:grid-cols-5">
        {/* Recent orders (wider) */}
        <div className="lg:col-span-3">
          <div className="rounded-xl border border-[var(--neutral-200)] bg-white">
            <div className="flex items-center justify-between border-b border-[var(--neutral-100)] px-5 py-4">
              <h2 className="font-semibold text-[var(--neutral-900)]">
                {isZh ? "最近订单" : "Recent orders"}
              </h2>
              <Link
                href={`/${params.locale}/account/orders`}
                className="text-xs font-semibold text-[var(--color-brand-600)] hover:underline"
              >
                {isZh ? "查看全部 →" : "View all →"}
              </Link>
            </div>
            {recentOrders && recentOrders.length > 0 ? (
              <div className="divide-y divide-[var(--neutral-100)]">
                {recentOrders.map((order) => (
                  <Link
                    key={order.id}
                    href={`/${params.locale}/account/orders/${order.id}`}
                    className="flex items-center justify-between px-5 py-3 hover:bg-[var(--neutral-50)] transition-colors"
                  >
                    <div>
                      <p className="text-sm font-semibold text-[var(--neutral-900)]">
                        {order.order_number}
                      </p>
                      <p className="text-xs text-[var(--neutral-500)]">
                        {new Date(order.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span
                        className={[
                          "rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize",
                          STATUS_STYLES[order.status] ??
                            "bg-gray-50 text-gray-700 border-gray-200",
                        ].join(" ")}
                      >
                        {isZh ? translateStatus(order.status) : order.status}
                      </span>
                      <span className="text-sm font-semibold text-[var(--neutral-900)]">
                        ${(order.total_cents / 100).toFixed(2)}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="px-5 py-8 text-center">
                <p className="text-sm text-[var(--neutral-500)]">
                  {isZh ? "暂无订单记录。" : "No orders yet."}
                </p>
                <Link
                  href={`/${params.locale}/shop`}
                  className="mt-2 inline-block text-sm font-semibold text-[var(--color-brand-600)] hover:underline"
                >
                  {isZh ? "前往商店 →" : "Browse the shop →"}
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* TCM constitution card (narrower) */}
        <div className="lg:col-span-2">
          <div className="rounded-xl border border-[var(--neutral-200)] bg-white h-full">
            <div className="border-b border-[var(--neutral-100)] px-5 py-4">
              <h2 className="font-semibold text-[var(--neutral-900)]">
                {isZh ? "体质档案" : "TCM Profile"}
              </h2>
            </div>
            {latestAssessment && constitutionLabel ? (
              <div className="px-5 py-5 space-y-3">
                <div
                  className="rounded-lg px-4 py-3 text-white"
                  style={{ backgroundColor: constitutionColor ?? "#2D8C54" }}
                >
                  <p className="text-xs font-semibold uppercase tracking-wide opacity-80">
                    {isZh ? "主要体质" : "Primary constitution"}
                  </p>
                  <p className="mt-0.5 text-lg font-bold">
                    {isZh ? constitutionLabel.zh : constitutionLabel.en}
                  </p>
                  <p className="text-xs opacity-75 mt-0.5">
                    {isZh ? constitutionLabel.en : constitutionLabel.zh}
                  </p>
                </div>
                <p className="text-xs text-[var(--neutral-500)]">
                  {isZh ? "置信度：" : "Confidence: "}
                  {Math.round((latestAssessment.confidence ?? 0) * 100)}%
                </p>
                <Link
                  href={`/${params.locale}/account/tcm-profile`}
                  className="block rounded-lg border border-[var(--color-brand-200,#bbf7d0)] bg-[var(--color-brand-50,#f0fdf4)] px-4 py-2.5 text-center text-sm font-semibold text-[var(--color-brand-700,#15803d)] hover:bg-[var(--color-brand-100,#dcfce7)] transition-colors"
                >
                  {isZh ? "查看完整档案 →" : "View full profile →"}
                </Link>
              </div>
            ) : (
              <div className="px-5 py-6 text-center space-y-3">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-brand-50,#f0fdf4)] text-2xl">
                  🌿
                </div>
                <div>
                  <p className="text-sm font-semibold text-[var(--neutral-900)]">
                    {isZh ? "还没有体质档案" : "No TCM profile yet"}
                  </p>
                  <p className="mt-1 text-xs text-[var(--neutral-500)]">
                    {isZh
                      ? "完成15题体质测评，获取个性化草药建议。"
                      : "Complete the 15-question quiz for personalized herb recommendations."}
                  </p>
                </div>
                <Link
                  href={`/${params.locale}/quiz`}
                  className="inline-block rounded-lg bg-[var(--color-brand-500)] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[var(--color-brand-600)] transition-colors"
                >
                  {isZh ? "开始体质测评 →" : "Take the quiz →"}
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          {
            href: `/${params.locale}/shop`,
            icon: "🛍️",
            label: isZh ? "继续购物" : "Shop",
          },
          {
            href: `/${params.locale}/learn`,
            icon: "📖",
            label: isZh ? "中医知识" : "Learn Hub",
          },
          {
            href: `/${params.locale}/quiz`,
            icon: "🧬",
            label: isZh ? "体质测评" : "Constitution Quiz",
          },
          {
            href: `/${params.locale}/account/settings`,
            icon: "⚙️",
            label: isZh ? "账户设置" : "Settings",
          },
        ].map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="flex items-center gap-2.5 rounded-xl border border-[var(--neutral-200)] bg-white px-4 py-3 text-sm font-medium text-[var(--neutral-700)] hover:bg-[var(--neutral-50)] hover:border-[var(--neutral-300)] transition-colors"
          >
            <span className="text-base">{link.icon}</span>
            {link.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  href,
  accent,
}: {
  label: string;
  value: string;
  sub: string;
  href?: string;
  accent?: string;
}) {
  const inner = (
    <div className="rounded-xl border border-[var(--neutral-200)] bg-white p-4 h-full">
      <p className="text-xs font-medium uppercase tracking-[0.06em] text-[var(--neutral-500)]">
        {label}
      </p>
      <p
        className="mt-1.5 text-xl font-bold text-[var(--neutral-900)] truncate"
        style={accent ? { color: accent } : undefined}
      >
        {value}
      </p>
      <p className="mt-0.5 text-xs text-[var(--neutral-400)]">{sub}</p>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block hover:opacity-90 transition-opacity">
        {inner}
      </Link>
    );
  }
  return inner;
}

function translateStatus(status: string): string {
  const map: Record<string, string> = {
    pending: "待处理",
    confirmed: "已确认",
    processing: "处理中",
    shipped: "已发货",
    delivered: "已送达",
    cancelled: "已取消",
    refunded: "已退款",
  };
  return map[status] ?? status;
}
