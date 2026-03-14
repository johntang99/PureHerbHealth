import Link from "next/link";
import { redirect } from "next/navigation";
import type { Locale } from "@/lib/i18n/config";
import { getAuthenticatedUserAndProfile } from "@/lib/auth/profile";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const CONSTITUTION_CONFIG: Record<
  string,
  { en: string; zh: string; pinyin: string; color: string; element: string; description_en: string; description_zh: string }
> = {
  balanced: {
    en: "Balanced",
    zh: "平和质",
    pinyin: "Píng Hé Zhì",
    color: "#16a34a",
    element: "All Five Elements",
    description_en:
      "The healthiest constitution type. Good energy, sound sleep, and balanced digestion. The goal for all constitution types.",
    description_zh: "最理想的体质类型。精力充沛、睡眠良好、消化均衡，是所有体质类型的目标状态。",
  },
  qi_deficient: {
    en: "Qi Deficient",
    zh: "气虚质",
    pinyin: "Qì Xū Zhì",
    color: "#D4A843",
    element: "Earth",
    description_en:
      "Low energy, easily fatigued, speaks softly, prone to catching colds. Focus on tonifying Spleen and Lung Qi.",
    description_zh: "容易疲劳、说话声音低、易感冒。重点在补益脾肺之气。",
  },
  yang_deficient: {
    en: "Yang Deficient",
    zh: "阳虚质",
    pinyin: "Yáng Xū Zhì",
    color: "#3182CE",
    element: "Water",
    description_en:
      "Always cold, especially hands and feet. Prefers warmth, low metabolism, frequent urination. Warm and tonify Kidney Yang.",
    description_zh: "手脚冰冷、喜温、代谢较慢、夜尿频繁。以温补肾阳为主。",
  },
  yin_deficient: {
    en: "Yin Deficient",
    zh: "阴虚质",
    pinyin: "Yīn Xū Zhì",
    color: "#E53E3E",
    element: "Fire",
    description_en:
      "Dry skin, warm palms and soles, night sweats, light sleeper. Nourish Kidney and Liver Yin.",
    description_zh: "皮肤干燥、手足心热、盗汗、睡眠较浅。以滋养肾肝之阴为主。",
  },
  phlegm_damp: {
    en: "Phlegm-Damp",
    zh: "痰湿质",
    pinyin: "Tán Shī Zhì",
    color: "#737373",
    element: "Earth",
    description_en:
      "Tendency to gain weight, heavy feeling in body, often feels sleepy after meals. Transform phlegm, dry dampness.",
    description_zh: "容易体重增加、身体沉重、饭后易困倦。以化痰祛湿为主。",
  },
  damp_heat: {
    en: "Damp-Heat",
    zh: "湿热质",
    pinyin: "Shī Rè Zhì",
    color: "#ea580c",
    element: "Earth/Fire",
    description_en:
      "Oily skin, acne prone, bitter taste in mouth, yellow coating on tongue. Clear heat and resolve dampness.",
    description_zh: "皮肤油腻、易生痤疮、口苦、舌苔黄腻。以清热化湿为主。",
  },
  blood_stasis: {
    en: "Blood Stasis",
    zh: "血瘀质",
    pinyin: "Xuè Yū Zhì",
    color: "#7c3aed",
    element: "Wood",
    description_en:
      "Dark complexion, visible veins, prone to bruising, sharp pains. Activate blood circulation and resolve stasis.",
    description_zh: "面色暗沉、静脉明显、易瘀青、刺痛感。以活血化瘀为主。",
  },
  qi_stagnant: {
    en: "Qi Stagnant",
    zh: "气郁质",
    pinyin: "Qì Yù Zhì",
    color: "#0284c7",
    element: "Wood",
    description_en:
      "Emotional sensitivity, chest tightness, sighing frequently, mood fluctuations. Soothe Liver and regulate Qi flow.",
    description_zh: "情绪敏感、胸闷、喜叹气、情绪波动大。以疏肝理气为主。",
  },
  allergic: {
    en: "Allergic",
    zh: "特禀质",
    pinyin: "Tè Bǐng Zhì",
    color: "#dc2626",
    element: "Metal",
    description_en:
      "Heightened immune sensitivity, seasonal allergies, skin reactions. Tonify Defensive Qi and stabilise the immune response.",
    description_zh: "免疫敏感性高、季节性过敏、皮肤易反应。以补益卫气、稳定免疫为主。",
  },
};

export default async function TCMProfilePage({
  params,
}: {
  params: { locale: Locale };
}) {
  const session = await getAuthenticatedUserAndProfile();
  if (!session) {
    redirect(
      `/${params.locale}/login?next=${encodeURIComponent(`/${params.locale}/account/tcm-profile`)}`
    );
  }

  const isZh = params.locale === "zh";
  const admin = getSupabaseAdminClient();

  const { data: assessments } = await admin
    .from("constitution_assessments")
    .select(
      `id, primary_constitution, secondary_constitution,
       normalized_scores, element_scores, confidence,
       explanation, product_recommendations, lifestyle_tips, created_at`
    )
    .eq("profile_id", session.profile.id)
    .order("created_at", { ascending: false })
    .limit(5);

  const latest = assessments?.[0] ?? null;
  const config = latest
    ? CONSTITUTION_CONFIG[latest.primary_constitution]
    : null;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--color-brand-500)]">
          {isZh ? "账户" : "Account"}
        </p>
        <h1
          className="text-2xl font-bold text-[var(--neutral-900)]"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          {isZh ? "体质档案" : "TCM Profile"}
        </h1>
      </div>

      {!latest || !config ? (
        /* ── No quiz taken ── */
        <div className="rounded-xl border border-[var(--neutral-200)] bg-white px-6 py-12 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-brand-50,#f0fdf4)] text-3xl">
            🌿
          </div>
          <h2 className="text-lg font-bold text-[var(--neutral-900)]">
            {isZh ? "尚未完成体质测评" : "No constitution assessment yet"}
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-[var(--neutral-500)]">
            {isZh
              ? "完成15道体质测评题，我们将为您分析体质类型，并推荐最适合您的草本配方与生活建议。"
              : "Complete the 15-question TCM constitution quiz. We'll identify your body type and recommend the right herbal formulas and lifestyle practices for you."}
          </p>
          <Link
            href={`/${params.locale}/quiz`}
            className="mt-5 inline-block rounded-xl bg-[var(--color-brand-500)] px-8 py-3 font-semibold text-white hover:bg-[var(--color-brand-600)] transition-colors"
          >
            {isZh ? "开始体质测评 →" : "Take the constitution quiz →"}
          </Link>
          <p className="mt-3 text-xs text-[var(--neutral-400)]">
            {isZh ? "约5分钟即可完成" : "Takes about 5 minutes"}
          </p>

          {/* Constitution types preview */}
          <div className="mt-8 border-t border-[var(--neutral-100)] pt-6">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--neutral-400)]">
              {isZh ? "九种体质类型" : "The 9 constitution types"}
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {Object.entries(CONSTITUTION_CONFIG).map(([key, c]) => (
                <span
                  key={key}
                  className="rounded-full px-3 py-1 text-xs font-medium text-white"
                  style={{ backgroundColor: c.color }}
                >
                  {isZh ? c.zh : c.en}
                </span>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* ── Quiz taken ── */
        <div className="space-y-5">
          {/* Constitution hero card */}
          <div
            className="rounded-xl px-6 py-6 text-white"
            style={{ backgroundColor: config.color }}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider opacity-80">
                  {isZh ? "主要体质" : "Primary constitution"}
                </p>
                <h2 className="mt-1 text-2xl font-bold">{isZh ? config.zh : config.en}</h2>
                <p className="mt-0.5 text-sm opacity-75">{config.pinyin}</p>
                {isZh ? null : <p className="mt-0.5 text-sm opacity-75">{config.zh}</p>}
              </div>
              <div className="text-right">
                <p className="text-xs font-semibold uppercase tracking-wider opacity-80">
                  {isZh ? "置信度" : "Confidence"}
                </p>
                <p className="mt-1 text-2xl font-bold">
                  {Math.round((latest.confidence ?? 0) * 100)}%
                </p>
              </div>
            </div>
            <p className="mt-4 text-sm opacity-90 leading-relaxed">
              {isZh ? config.description_zh : config.description_en}
            </p>
            {latest.secondary_constitution &&
              CONSTITUTION_CONFIG[latest.secondary_constitution] && (
                <p className="mt-2 text-xs opacity-70">
                  {isZh ? "次要体质：" : "Secondary: "}
                  {isZh
                    ? CONSTITUTION_CONFIG[latest.secondary_constitution].zh
                    : CONSTITUTION_CONFIG[latest.secondary_constitution].en}
                </p>
              )}
          </div>

          {/* Normalized scores bar chart */}
          {latest.normalized_scores &&
            typeof latest.normalized_scores === "object" && (
              <div className="rounded-xl border border-[var(--neutral-200)] bg-white px-5 py-5">
                <h3 className="mb-4 font-semibold text-[var(--neutral-900)]">
                  {isZh ? "体质分布" : "Constitution scores"}
                </h3>
                <div className="space-y-2.5">
                  {Object.entries(
                    latest.normalized_scores as Record<string, number>
                  )
                    .sort(([, a], [, b]) => b - a)
                    .map(([key, score]) => {
                      const c = CONSTITUTION_CONFIG[key];
                      if (!c) return null;
                      const pct = Math.min(100, Math.round(score * 100));
                      return (
                        <div key={key}>
                          <div className="mb-1 flex items-center justify-between text-xs">
                            <span className="font-medium text-[var(--neutral-700)]">
                              {isZh ? c.zh : c.en}
                            </span>
                            <span className="text-[var(--neutral-500)]">
                              {pct}%
                            </span>
                          </div>
                          <div className="h-2 rounded-full bg-[var(--neutral-100)]">
                            <div
                              className="h-2 rounded-full transition-all"
                              style={{
                                width: `${pct}%`,
                                backgroundColor: c.color,
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

          {/* AI explanation */}
          {latest.explanation && (
            <div className="rounded-xl border border-[var(--color-brand-200,#bbf7d0)] bg-[var(--color-brand-50,#f0fdf4)] px-5 py-4">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-[var(--color-brand-600,#16a34a)]">
                {isZh ? "AI 分析" : "AI Analysis"}
              </p>
              <p className="text-sm leading-relaxed text-[var(--neutral-700)]">
                {latest.explanation}
              </p>
            </div>
          )}

          {/* Lifestyle tips */}
          {Array.isArray(latest.lifestyle_tips) &&
            latest.lifestyle_tips.length > 0 && (
              <div className="rounded-xl border border-[var(--neutral-200)] bg-white px-5 py-5">
                <h3 className="mb-3 font-semibold text-[var(--neutral-900)]">
                  {isZh ? "生活建议" : "Lifestyle recommendations"}
                </h3>
                <ul className="space-y-2">
                  {(latest.lifestyle_tips as string[]).map((tip, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-[var(--neutral-700)]">
                      <span
                        className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
                        style={{ backgroundColor: config.color }}
                      >
                        {i + 1}
                      </span>
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>
            )}

          {/* Retake / history */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--neutral-200)] bg-white px-5 py-4">
            <div>
              <p className="text-sm font-medium text-[var(--neutral-700)]">
                {isZh ? "最近测评时间：" : "Last assessed: "}
                {new Date(latest.created_at).toLocaleDateString(
                  isZh ? "zh-CN" : "en-US",
                  { year: "numeric", month: "long", day: "numeric" }
                )}
              </p>
              {assessments && assessments.length > 1 && (
                <p className="text-xs text-[var(--neutral-500)]">
                  {isZh
                    ? `共完成 ${assessments.length} 次测评`
                    : `${assessments.length} assessments total`}
                </p>
              )}
            </div>
            <Link
              href={`/${params.locale}/quiz`}
              className="rounded-lg border border-[var(--neutral-300)] px-4 py-2 text-sm font-semibold text-[var(--neutral-700)] hover:bg-[var(--neutral-100)] transition-colors"
            >
              {isZh ? "重新测评" : "Retake quiz"}
            </Link>
          </div>

          {/* FDA disclaimer */}
          <p className="text-[11px] leading-relaxed text-[var(--neutral-400)]">
            {isZh
              ? "以上内容仅供健康参考，不构成医疗建议。如有健康问题，请咨询持牌医师。"
              : "This information is for educational purposes only and does not constitute medical advice. These statements have not been evaluated by the FDA. Consult a licensed healthcare provider for medical concerns."}
          </p>
        </div>
      )}
    </div>
  );
}
