import Link from "next/link";
import { WellnessChat } from "@/components/ai/wellness-chat";
import type { Locale } from "@/lib/i18n/config";

export const dynamic = "force-dynamic";

export default function AiWellnessPage({ params }: { params: { locale: Locale } }) {
  const locale = params.locale;
  const isZh = locale === "zh";

  return (
    <div className="space-y-0">
      {/* ── Hero ─────────────────────────────────────────────────── */}
      <div className="relative left-1/2 right-1/2 -mx-[50vw] -mt-8 w-screen overflow-hidden bg-gradient-to-br from-[var(--color-brand-800)] via-[var(--color-brand-700)] to-[var(--color-brand-600)] py-14 text-white">
        <div className="absolute -left-20 -top-20 h-80 w-80 rounded-full bg-[var(--color-accent-500)]/10 blur-3xl" />
        <div className="absolute right-10 top-10 h-60 w-60 rounded-full bg-white/5 blur-2xl" />
        <div className="relative mx-auto max-w-[1280px] px-6 text-center">
          <div className="mx-auto mb-4 inline-flex items-center gap-2 rounded-full border border-[var(--color-accent-300)]/40 bg-[var(--color-accent-500)]/20 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-[var(--color-accent-300)]">
            <span>✦</span>
            {isZh ? "AI 中医顾问" : "AI TCM Wellness Advisor"}
          </div>
          <h1
            className="mx-auto mt-3 max-w-3xl text-4xl font-normal leading-[1.1] text-white md:text-[52px]"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            {isZh
              ? "问我任何中医调理问题"
              : <>Ask me anything about <span className="text-[var(--color-accent-300)]">TCM wellness</span></>}
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base text-[var(--color-brand-200)]">
            {isZh
              ? "结合传统中医理论与 AI 分析，获取个性化的体质解读、草本建议与生活调理方案。非医疗建议。"
              : "Classical TCM theory meets AI analysis. Get personalised guidance on constitution, herbs, and daily wellness. Educational only."}
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              href={`/${locale}/quiz`}
              className="rounded-full bg-white/15 px-5 py-2 text-sm font-medium text-white transition hover:bg-white/25"
            >
              {isZh ? "🌿 先测体质" : "🌿 Take constitution quiz first"}
            </Link>
            <Link
              href={`/${locale}/learn`}
              className="rounded-full border border-white/30 px-5 py-2 text-sm font-medium text-white/80 transition hover:text-white"
            >
              {isZh ? "📚 学习中心" : "📚 Browse learn hub"}
            </Link>
          </div>
        </div>
      </div>

      {/* ── Main chat + sidebar ───────────────────────────────────── */}
      <div className="mx-auto max-w-[1280px] px-4 py-10">
        <div className="grid gap-8 lg:grid-cols-[1fr_300px]">

          {/* Chat panel */}
          <div>
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--color-brand-500,#2D8C54)] text-lg text-white">
                ✦
              </div>
              <div>
                <p className="font-semibold text-[var(--neutral-900)]">
                  {isZh ? "中医养生顾问" : "TCM Wellness Advisor"}
                </p>
                <p className="text-xs text-[var(--neutral-500)]">
                  {isZh ? "AI 驱动 · 非医疗建议" : "AI-powered · Educational only"}
                </p>
              </div>
              <span className="ml-auto flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700">
                <span className="h-2 w-2 rounded-full bg-green-500" />
                {isZh ? "在线" : "Online"}
              </span>
            </div>
            <WellnessChat />
          </div>

          {/* Sidebar */}
          <aside className="space-y-5">
            {/* Suggested questions */}
            <div className="rounded-xl border border-[var(--neutral-200)] bg-white px-5 py-5">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--neutral-500)]">
                {isZh ? "常见问题示例" : "Try asking about"}
              </p>
              <div className="space-y-2">
                {(isZh ? [
                  "我是什么体质类型？",
                  "推荐适合气虚体质的草本",
                  "中医如何调理失眠？",
                  "春季养生有哪些建议？",
                  "肝气郁结怎么调理？",
                  "适合女性的补血方剂",
                ] : [
                  "What is my TCM constitution?",
                  "Herbs for Qi deficiency",
                  "TCM approach to insomnia",
                  "Spring wellness tips",
                  "How to resolve Liver Qi stagnation",
                  "Blood-nourishing formulas for women",
                ]).map((q) => (
                  <button
                    key={q}
                    className="w-full rounded-lg border border-[var(--neutral-200)] px-3 py-2 text-left text-[13px] text-[var(--neutral-700)] transition-colors hover:border-[var(--color-brand-300)] hover:bg-[var(--color-brand-50,#f0fdf4)] suggestion-btn"
                    data-question={q}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>

            {/* Quiz CTA */}
            <div
              className="rounded-xl px-5 py-5 text-white"
              style={{ background: "linear-gradient(135deg, var(--color-brand-700,#166534), var(--color-brand-500,#2D8C54))" }}
            >
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide opacity-70">
                {isZh ? "个性化起点" : "Personalise first"}
              </p>
              <p className="mb-1 text-base font-bold">
                {isZh ? "先了解您的体质" : "Know your constitution"}
              </p>
              <p className="mb-4 text-xs opacity-80 leading-relaxed">
                {isZh
                  ? "完成5分钟测评，获得专属体质档案与 AI 分析建议。"
                  : "Take the 5-min quiz for a personalised profile the advisor can reference."}
              </p>
              <Link
                href={`/${locale}/quiz`}
                className="inline-block rounded-lg bg-white px-4 py-2 text-sm font-bold text-[var(--color-brand-700,#166534)] transition hover:bg-[var(--color-brand-50,#f0fdf4)]"
              >
                {isZh ? "开始体质测评 →" : "Take quiz →"}
              </Link>
            </div>

            {/* Disclaimer */}
            <p className="text-[11px] leading-relaxed text-[var(--neutral-400)]">
              {isZh
                ? "本顾问内容仅供教育参考，不构成医疗诊断或治疗建议。如有健康问题，请咨询持牌医师。"
                : "This advisor provides educational content only and does not constitute medical advice. These statements have not been evaluated by the FDA. Consult a licensed healthcare provider for any health concerns."}
            </p>
          </aside>
        </div>
      </div>
    </div>
  );
}
