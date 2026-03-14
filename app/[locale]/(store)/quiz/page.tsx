"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import type { Locale } from "@/lib/i18n/config";

/* ── Quiz questions ──────────────────────────────────────────────── */

type Answer = "a" | "b" | "c" | "d";

interface Question {
  id: string;
  en: string;
  zh: string;
  options: { value: Answer; en: string; zh: string }[];
}

const QUESTIONS: Question[] = [
  {
    id: "q1",
    en: "How would you describe your energy levels throughout the day?",
    zh: "您如何描述自己全天的精力状况？",
    options: [
      { value: "a", en: "Consistently good — steady energy from morning to evening", zh: "持续良好 — 从早到晚精力稳定" },
      { value: "b", en: "Often tired — fatigue especially in the morning or after meals", zh: "容易疲倦 — 尤其是早晨或餐后" },
      { value: "c", en: "Restless at night — afternoon crash, but hard to wind down", zh: "夜间不安 — 下午精力低，夜晚反而难以入睡" },
      { value: "d", en: "Fluctuates with mood — drops whenever I feel stressed", zh: "随情绪波动 — 一有压力就感到疲惫" },
    ],
  },
  {
    id: "q2",
    en: "How sensitive are you to temperature?",
    zh: "您对温度的敏感程度如何？",
    options: [
      { value: "a", en: "Comfortable in most temperatures, rarely bothered", zh: "对大多数温度都感觉舒适，很少受影响" },
      { value: "b", en: "Often cold — especially hands, feet, and lower back", zh: "经常感到寒冷，尤其是手脚和腰部" },
      { value: "c", en: "Often warm — hot flushes, warm palms and soles, night sweats", zh: "经常感到燥热，手足心热，容易盗汗" },
      { value: "d", en: "Temperature feels fine but I carry internal tension or tightness", zh: "体温正常，但内心常感压抑或紧绷" },
    ],
  },
  {
    id: "q3",
    en: "How well do you sleep?",
    zh: "您的睡眠质量如何？",
    options: [
      { value: "a", en: "Sleep soundly — wake refreshed, rarely remember dreams", zh: "睡眠良好 — 醒来神清气爽，很少记得梦" },
      { value: "b", en: "Light sleeper — hard to fall asleep, still tired after 8 hours", zh: "睡眠浅，难以入睡，即使睡8小时仍感疲倦" },
      { value: "c", en: "Vivid dreams or night sweats — mind races after midnight", zh: "多梦或盗汗，半夜后思绪难以平静" },
      { value: "d", en: "Overthink at bedtime — worry or stress makes me lie awake", zh: "睡前思绪过多，忧虑或压力让我辗转反侧" },
    ],
  },
  {
    id: "q4",
    en: "How is your digestion?",
    zh: "您的消化功能如何？",
    options: [
      { value: "a", en: "Regular and comfortable — no bloating, no discomfort", zh: "规律且舒适 — 无腹胀，无不适" },
      { value: "b", en: "Weak digestion — loose stools, poor appetite, heavy feeling after meals", zh: "消化较弱 — 大便偏稀，食欲不振，饭后腹胀沉重" },
      { value: "c", en: "Dry tendency — constipation, thirsty, stools can be hard", zh: "偏燥 — 便秘倾向，口干，大便偏干" },
      { value: "d", en: "Stress-related — bloating, IBS symptoms, worse when anxious", zh: "与情绪相关 — 腹胀、肠易激，紧张时症状加重" },
    ],
  },
  {
    id: "q5",
    en: "How would you describe your skin?",
    zh: "您如何描述自己的皮肤状况？",
    options: [
      { value: "a", en: "Normal and clear — rarely breaks out, good elasticity", zh: "正常且有光泽 — 很少长痘，弹性良好" },
      { value: "b", en: "Pale or dull — loses colour easily, some puffiness", zh: "面色苍白或暗淡，容易浮肿" },
      { value: "c", en: "Dry or sensitive — eczema tendency, thin and easily irritated", zh: "干燥或敏感 — 有湿疹倾向，皮肤薄且易受刺激" },
      { value: "d", en: "Oily or breakout-prone when stressed", zh: "压力大时皮肤油腻或容易长痘" },
    ],
  },
  {
    id: "q6",
    en: "How do you tend to process emotions?",
    zh: "您通常如何处理情绪？",
    options: [
      { value: "a", en: "Calm and resilient — emotions pass without lingering", zh: "平静有弹性 — 情绪能自然消散，不会积压" },
      { value: "b", en: "Prone to anxiety or worry — self-doubt comes easily", zh: "容易焦虑或担忧，自我怀疑较多" },
      { value: "c", en: "Irritable or quick to frustration — mood swings when tired", zh: "容易烦躁，疲劳时情绪波动较大" },
      { value: "d", en: "Moodiness and overthinking — feel stuck or emotionally constrained", zh: "情绪郁结，反复思虑，常感受到情绪压抑" },
    ],
  },
  {
    id: "q7",
    en: "What is your relationship with exercise?",
    zh: "您与运动的关系如何？",
    options: [
      { value: "a", en: "Enjoy regular exercise and recover well afterwards", zh: "喜欢定期运动，恢复状态良好" },
      { value: "b", en: "Find exercise draining — prefer gentle walks or stretching", zh: "运动后感到消耗过大，更倾向散步或拉伸" },
      { value: "c", en: "Get hot and sweaty easily, or feel agitated during intense exercise", zh: "运动时容易燥热出汗，或剧烈运动后感到烦躁" },
      { value: "d", en: "Rarely motivated — know I should exercise but feel blocked", zh: "缺乏运动动力，明知需要运动但就是提不起劲" },
    ],
  },
  {
    id: "q8",
    en: "How do you experience thirst and beverage preferences?",
    zh: "您的口渴情况和饮品偏好如何？",
    options: [
      { value: "a", en: "Normal thirst — drink water naturally throughout the day", zh: "口渴程度正常，一天中自然饮水" },
      { value: "b", en: "Low thirst — prefer warm drinks, avoid cold beverages", zh: "口渴感较低，偏好热饮，避免冷饮" },
      { value: "c", en: "Frequently thirsty — prefer cold or room-temperature water", zh: "经常感到口渴，偏好常温或冷饮" },
      { value: "d", en: "Variable — thirst depends on stress levels or how busy I am", zh: "口渴感不定，取决于压力和忙碌程度" },
    ],
  },
  {
    id: "q9",
    en: "How do you handle stress and recover from it?",
    zh: "您如何应对并从压力中恢复？",
    options: [
      { value: "a", en: "Bounce back well — stress doesn't linger long", zh: "恢复能力强 — 压力不会持续很久" },
      { value: "b", en: "Stress leaves me exhausted and depleted for days", zh: "压力过后疲惫不堪，需要好几天才能恢复" },
      { value: "c", en: "Stress makes me hot, irritable, and unable to relax", zh: "压力让我感到燥热、烦躁，难以放松" },
      { value: "d", en: "Stress causes tension, overthinking, and emotional tightness", zh: "压力带来身体紧绷、反复思虑和情绪压抑" },
    ],
  },
  {
    id: "q10",
    en: "Check your tongue: what does it look like?",
    zh: "观察一下您的舌头：它看起来是什么样的？",
    options: [
      { value: "a", en: "Pink, moist, thin white coating — looks healthy", zh: "淡红色、湿润、薄白苔 — 看起来健康" },
      { value: "b", en: "Pale or slightly swollen, little coating or teeth marks on edges", zh: "舌色偏淡或略胖，苔薄或边有齿痕" },
      { value: "c", en: "Red or dark pink, thin or no coating, dry surface", zh: "舌色偏红，苔少或无苔，舌面偏干" },
      { value: "d", en: "Purplish or dusky tinge, or coating is thick and white/yellow", zh: "舌色偏紫暗，或苔厚白腻/黄腻" },
    ],
  },
  {
    id: "q11",
    en: "Which season affects you the most negatively?",
    zh: "哪个季节对您的影响最为明显？",
    options: [
      { value: "a", en: "None in particular — I adapt well to all seasons", zh: "没有特别的 — 我对各季节适应良好" },
      { value: "b", en: "Winter — cold and damp leaves me drained", zh: "冬季 — 寒冷潮湿让我精力消耗过大" },
      { value: "c", en: "Summer — heat makes me irritable, restless, and parched", zh: "夏季 — 炎热让我烦躁不安、口干舌燥" },
      { value: "d", en: "Spring — mood fluctuates, more tension and frustration", zh: "春季 — 情绪起伏较大，烦躁和压抑感增加" },
    ],
  },
  {
    id: "q12",
    en: "What is your primary health goal right now?",
    zh: "您目前最主要的健康目标是什么？",
    options: [
      { value: "a", en: "Maintain and preserve my current good health and vitality", zh: "维持并巩固当前的健康状态与活力" },
      { value: "b", en: "Increase energy, strengthen immunity, feel more physically capable", zh: "提升精力，增强免疫，增强体能" },
      { value: "c", en: "Calm internal heat, ease dryness, improve skin and hydration", zh: "清虚火，缓解干燥，改善皮肤与水分代谢" },
      { value: "d", en: "Reduce stress, improve mood, ease tension and digestive discomfort", zh: "减轻压力，改善情绪，缓解紧张与消化不适" },
    ],
  },
];

/* ── Constitution display config ─────────────────────────────────── */

const CONSTITUTION_CONFIG: Record<
  string,
  { en: string; zh: string; pinyin: string; color: string; element: string; tagline_en: string; tagline_zh: string }
> = {
  balanced:          { en: "Balanced",        zh: "平和质",  pinyin: "Píng Hé Zhì",  color: "#16a34a", element: "All Five",  tagline_en: "The ideal constitution — harmonious energy, sound sleep, and robust health.", tagline_zh: "最理想体质 — 阴阳平衡，精力充沛，身心健康。" },
  qi_deficient:      { en: "Qi Deficient",    zh: "气虚质",  pinyin: "Qì Xū Zhì",    color: "#D4A843", element: "Earth",     tagline_en: "Low vital energy. Focus on nourishing Spleen and Lung Qi to restore vitality.", tagline_zh: "气力不足。重在补益脾肺之气，恢复活力。" },
  yang_deficient:    { en: "Yang Deficient",  zh: "阳虚质",  pinyin: "Yáng Xū Zhì",  color: "#3182CE", element: "Water",     tagline_en: "Always cold, slow metabolism. Warm and tonify Kidney Yang.", tagline_zh: "畏寒怕冷，代谢偏慢。以温补肾阳为主。" },
  yin_deficient:     { en: "Yin Deficient",   zh: "阴虚质",  pinyin: "Yīn Xū Zhì",   color: "#E53E3E", element: "Fire",      tagline_en: "Dryness and internal heat. Nourish Kidney and Liver Yin.", tagline_zh: "内热干燥。以滋养肾肝之阴为主。" },
  phlegm_damp:       { en: "Phlegm-Damp",     zh: "痰湿质",  pinyin: "Tán Shī Zhì",  color: "#737373", element: "Earth",     tagline_en: "Heaviness and damp accumulation. Transform phlegm and dry dampness.", tagline_zh: "身体沉重，痰湿内聚。以化痰祛湿为主。" },
  damp_heat:         { en: "Damp-Heat",       zh: "湿热质",  pinyin: "Shī Rè Zhì",   color: "#ea580c", element: "Earth/Fire",tagline_en: "Oily skin, heat signs, and internal congestion. Clear heat and resolve dampness.", tagline_zh: "油腻燥热，湿热蕴结。以清热化湿为主。" },
  blood_stagnation:  { en: "Blood Stasis",    zh: "血瘀质",  pinyin: "Xuè Yū Zhì",   color: "#7c3aed", element: "Wood",      tagline_en: "Stagnant circulation patterns. Activate blood and resolve stasis.", tagline_zh: "血行不畅。以活血化瘀为主。" },
  qi_stagnation:     { en: "Qi Stagnant",     zh: "气郁质",  pinyin: "Qì Yù Zhì",    color: "#0284c7", element: "Wood",      tagline_en: "Emotional sensitivity and constrained Qi flow. Soothe Liver and move Qi.", tagline_zh: "情志不畅，气机郁滞。以疏肝理气为主。" },
  inherited_special: { en: "Allergic/Special",zh: "特禀质",  pinyin: "Tè Bǐng Zhì",  color: "#dc2626", element: "Metal",     tagline_en: "Heightened sensitivity and reactivity. Tonify Defensive Qi and stabilise immunity.", tagline_zh: "敏感体质，易发过敏。以补益卫气、稳定免疫为主。" },
};

/* ── Types ───────────────────────────────────────────────────────── */

type Stage = "intro" | "quiz" | "loading" | "result";

interface AssessmentResult {
  assessment_id: string;
  constitution: {
    primary: string;
    secondary: string | null;
    english_name: string;
    chinese_name: string;
  };
  explanation: string;
  lifestyle_tips: string[];
  product_recommendations: Array<{ slug: string; relevance_reason: string }>;
  confidence: number;
}

/* ── Component ───────────────────────────────────────────────────── */

export default function QuizPage() {
  const params = useParams();
  const locale = (params.locale as Locale) ?? "en";
  const isZh = locale === "zh";

  const [stage, setStage] = useState<Stage>("intro");
  const [step, setStep] = useState(0); // 0-indexed
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [selected, setSelected] = useState<Answer | null>(null);
  const [result, setResult] = useState<AssessmentResult | null>(null);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [animating, setAnimating] = useState(false);

  // Check auth
  useEffect(() => {
    fetch("/api/account/me")
      .then((r) => r.json())
      .then((d) => { if (d?.profile?.id) setProfileId(d.profile.id); })
      .catch(() => {});
  }, []);

  const question = QUESTIONS[step];
  const totalSteps = QUESTIONS.length;
  const progress = ((step + (selected ? 1 : 0)) / totalSteps) * 100;

  function selectAnswer(value: Answer) {
    setSelected(value);
  }

  function goNext() {
    if (!selected) return;
    const newAnswers = { ...answers, [question.id]: selected };
    setAnswers(newAnswers);
    setSelected(null);

    if (step < totalSteps - 1) {
      setAnimating(true);
      setTimeout(() => {
        setStep((s) => s + 1);
        setAnimating(false);
      }, 180);
    } else {
      submitQuiz(newAnswers);
    }
  }

  function goPrev() {
    if (step === 0) { setStage("intro"); return; }
    setAnimating(true);
    setTimeout(() => {
      setStep((s) => s - 1);
      setSelected(answers[QUESTIONS[step - 1].id] ?? null);
      setAnimating(false);
    }, 180);
  }

  const submitQuiz = useCallback(async (finalAnswers: Record<string, Answer>) => {
    setStage("loading");
    setError(null);
    try {
      const res = await fetch("/api/ai/constitution-quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          store_slug: "pureherbhealth",
          answers: finalAnswers,
          customer_id: profileId ?? undefined,
          session_id: `quiz_${Date.now()}`,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong");
      setResult(data);
      setStage("result");
    } catch (e) {
      setError(e instanceof Error ? e.message : "An error occurred");
      setStage("quiz");
      setStep(totalSteps - 1);
      setSelected(finalAnswers[QUESTIONS[totalSteps - 1].id] ?? null);
    }
  }, [profileId, totalSteps]);

  /* ── Intro ─────────────────────────────────────────────────────── */
  if (stage === "intro") {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12 text-center">
        <div className="mb-6 inline-flex h-20 w-20 items-center justify-center rounded-full bg-[var(--color-brand-50,#f0fdf4)] text-4xl">
          🌿
        </div>
        <h1
          className="text-3xl font-bold text-[var(--neutral-900)]"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          {isZh ? "中医体质测评" : "TCM Constitution Quiz"}
        </h1>
        <p className="mt-3 text-base text-[var(--neutral-500)]">
          {isZh
            ? "回答12道问题，AI 将为您分析专属体质类型，并推荐对应的草本调理方案。约需5分钟。"
            : "Answer 12 questions and our AI will identify your TCM constitution type and recommend the right herbal formulas for your body. Takes about 5 minutes."}
        </p>

        {/* The 9 types preview */}
        <div className="mt-8 flex flex-wrap justify-center gap-2">
          {Object.values(CONSTITUTION_CONFIG).map((c) => (
            <span
              key={c.en}
              className="rounded-full px-3 py-1 text-xs font-semibold text-white"
              style={{ backgroundColor: c.color + "cc" }}
            >
              {isZh ? c.zh : c.en}
            </span>
          ))}
        </div>

        <div className="mt-6 rounded-xl border border-[var(--neutral-200)] bg-white px-6 py-4 text-left text-sm text-[var(--neutral-600)]">
          <p className="font-semibold text-[var(--neutral-800)] mb-2">
            {isZh ? "测评说明" : "How it works"}
          </p>
          <ul className="space-y-1.5 list-none">
            {(isZh ? [
              "12道关于您的能量、睡眠、消化等方面的问题",
              "AI 分析您的回答，识别主要和次要体质类型",
              "获得个性化的草本推荐和生活方式建议",
              "登录后结果自动保存到您的健康档案",
            ] : [
              "12 questions about your energy, sleep, digestion, and more",
              "AI analyses your answers to identify your primary and secondary constitution",
              "Receive personalised herbal recommendations and lifestyle tips",
              "Sign in to save your results to your wellness profile",
            ]).map((item, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="mt-0.5 text-[var(--color-brand-500)]">✓</span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        <button
          onClick={() => { setStage("quiz"); setStep(0); setAnswers({}); setSelected(null); }}
          className="mt-8 rounded-xl bg-[var(--color-brand-500,#2D8C54)] px-10 py-4 text-base font-bold text-white transition-colors hover:bg-[var(--color-brand-600,#22764a)]"
        >
          {isZh ? "开始测评 →" : "Start Quiz →"}
        </button>

        <p className="mt-3 text-xs text-[var(--neutral-400)]">
          {isZh
            ? "本测评仅供参考，不构成医疗建议。"
            : "For educational purposes only. Not medical advice."}
        </p>
      </div>
    );
  }

  /* ── Loading ────────────────────────────────────────────────────── */
  if (stage === "loading") {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <div className="mb-6 inline-flex h-20 w-20 items-center justify-center rounded-full bg-[var(--color-brand-50,#f0fdf4)]">
          <svg className="h-10 w-10 animate-spin text-[var(--color-brand-500,#2D8C54)]" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-[var(--neutral-800)]">
          {isZh ? "AI 正在分析您的体质…" : "Analysing your constitution…"}
        </h2>
        <p className="mt-2 text-sm text-[var(--neutral-500)]">
          {isZh
            ? "我们的 AI 正在对照中医理论解读您的回答，请稍候。"
            : "Our AI is interpreting your answers against TCM theory. This takes a few seconds."}
        </p>
      </div>
    );
  }

  /* ── Result ─────────────────────────────────────────────────────── */
  if (stage === "result" && result) {
    const primaryKey = result.constitution.primary;
    const config = CONSTITUTION_CONFIG[primaryKey];
    const secondaryKey = result.constitution.secondary;
    const secondaryConfig = secondaryKey ? CONSTITUTION_CONFIG[secondaryKey] : null;

    return (
      <div className="mx-auto max-w-2xl space-y-5 px-4 py-8">
        {/* Hero card */}
        <div
          className="rounded-2xl px-7 py-7 text-white shadow-md"
          style={{ background: `linear-gradient(135deg, ${config?.color ?? "#16a34a"}, ${config?.color ?? "#16a34a"}bb)` }}
        >
          <p className="text-xs font-semibold uppercase tracking-widest opacity-70">
            {isZh ? "您的体质类型" : "Your constitution type"}
          </p>
          <h1
            className="mt-1 text-3xl font-bold"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            {isZh ? config?.zh : config?.en}
          </h1>
          <p className="mt-0.5 text-sm opacity-75">
            {config?.pinyin}
            {!isZh && config?.zh ? ` · ${config.zh}` : ""}
          </p>
          <p className="mt-4 text-sm leading-relaxed opacity-90">
            {isZh ? config?.tagline_zh : config?.tagline_en}
          </p>
          {secondaryConfig && (
            <p className="mt-3 inline-block rounded-full bg-white/20 px-3 py-1 text-xs">
              {isZh ? "次要体质：" : "Secondary: "}
              <span className="font-semibold">{isZh ? secondaryConfig.zh : secondaryConfig.en}</span>
            </p>
          )}
          <div className="mt-4 flex items-center gap-2">
            <div className="h-1.5 flex-1 rounded-full bg-white/30">
              <div
                className="h-1.5 rounded-full bg-white"
                style={{ width: `${Math.round(result.confidence * 100)}%` }}
              />
            </div>
            <span className="text-xs font-semibold">
              {Math.round(result.confidence * 100)}% {isZh ? "置信度" : "confidence"}
            </span>
          </div>
        </div>

        {/* AI Explanation */}
        {result.explanation && (
          <div className="rounded-xl border border-[var(--color-brand-200,#bbf7d0)] bg-[var(--color-brand-50,#f0fdf4)] px-5 py-4">
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-[var(--color-brand-600,#16a34a)]">
              {isZh ? "✦ AI 分析" : "✦ AI Analysis"}
            </p>
            <p className="text-sm leading-relaxed text-[var(--neutral-700)]">
              {result.explanation}
            </p>
          </div>
        )}

        {/* Lifestyle tips */}
        {result.lifestyle_tips.length > 0 && (
          <div className="rounded-xl border border-[var(--neutral-200)] bg-white px-5 py-5">
            <h2 className="mb-3 font-semibold text-[var(--neutral-900)]">
              {isZh ? "生活调理建议" : "Lifestyle recommendations"}
            </h2>
            <ul className="space-y-2.5">
              {result.lifestyle_tips.map((tip, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm text-[var(--neutral-700)]">
                  <span
                    className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white"
                    style={{ backgroundColor: config?.color ?? "#16a34a" }}
                  >
                    {i + 1}
                  </span>
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Save / CTA row */}
        <div className="rounded-xl border border-[var(--neutral-200)] bg-white px-5 py-5">
          {profileId ? (
            <>
              <p className="text-sm font-semibold text-[var(--neutral-800)]">
                {isZh ? "✓ 结果已保存到您的健康档案" : "✓ Results saved to your wellness profile"}
              </p>
              <p className="mt-1 text-xs text-[var(--neutral-500)]">
                {isZh ? "您可以在账户中随时查看历史测评记录。" : "You can view your assessment history anytime in your account."}
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <Link
                  href={`/${locale}/account/tcm-profile`}
                  className="rounded-lg bg-[var(--color-brand-500,#2D8C54)] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-brand-600,#22764a)]"
                >
                  {isZh ? "查看我的体质档案 →" : "View TCM Profile →"}
                </Link>
                <Link
                  href={`/${locale}/shop`}
                  className="rounded-lg border border-[var(--neutral-300)] px-5 py-2.5 text-sm font-semibold text-[var(--neutral-700)] transition-colors hover:bg-[var(--neutral-50)]"
                >
                  {isZh ? "探索推荐产品 →" : "Browse recommended products →"}
                </Link>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm font-semibold text-[var(--neutral-800)]">
                {isZh ? "保存您的测评结果" : "Save your results"}
              </p>
              <p className="mt-1 text-xs text-[var(--neutral-500)]">
                {isZh
                  ? "创建免费账户，将体质档案永久保存，并追踪健康变化。"
                  : "Create a free account to save your constitution profile and track changes over time."}
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <Link
                  href={`/${locale}/register?next=${encodeURIComponent(`/${locale}/account/tcm-profile`)}`}
                  className="rounded-lg bg-[var(--color-brand-500,#2D8C54)] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-brand-600,#22764a)]"
                >
                  {isZh ? "免费注册，保存档案 →" : "Create free account →"}
                </Link>
                <Link
                  href={`/${locale}/shop`}
                  className="rounded-lg border border-[var(--neutral-300)] px-5 py-2.5 text-sm font-semibold text-[var(--neutral-700)] transition-colors hover:bg-[var(--neutral-50)]"
                >
                  {isZh ? "直接浏览产品 →" : "Browse products →"}
                </Link>
              </div>
            </>
          )}
        </div>

        {/* Retake */}
        <div className="text-center">
          <button
            onClick={() => { setStage("intro"); setStep(0); setAnswers({}); setSelected(null); setResult(null); }}
            className="text-sm text-[var(--neutral-500)] underline hover:text-[var(--neutral-700)]"
          >
            {isZh ? "重新测评" : "Retake quiz"}
          </button>
        </div>

        {/* Disclaimer */}
        <p className="text-[11px] leading-relaxed text-[var(--neutral-400)]">
          {isZh
            ? "以上内容仅供健康参考，不构成医疗建议。如有健康问题，请咨询持牌医师。"
            : "This information is for educational purposes only and does not constitute medical advice. These statements have not been evaluated by the FDA. Consult a licensed healthcare provider for medical concerns."}
        </p>
      </div>
    );
  }

  /* ── Quiz step ──────────────────────────────────────────────────── */
  return (
    <div className="mx-auto max-w-xl px-4 py-8">
      {/* Progress bar */}
      <div className="mb-6">
        <div className="mb-2 flex items-center justify-between text-xs text-[var(--neutral-500)]">
          <span>
            {isZh ? `第 ${step + 1} 题，共 ${totalSteps} 题` : `Question ${step + 1} of ${totalSteps}`}
          </span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-[var(--neutral-100)]">
          <div
            className="h-1.5 rounded-full bg-[var(--color-brand-500,#2D8C54)] transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Question card */}
      <div
        className={`rounded-2xl border border-[var(--neutral-200)] bg-white p-6 shadow-sm transition-opacity duration-150 ${
          animating ? "opacity-0" : "opacity-100"
        }`}
      >
        <h2
          className="mb-5 text-lg font-bold leading-snug text-[var(--neutral-900)]"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          {isZh ? question.zh : question.en}
        </h2>

        <div className="space-y-2.5">
          {question.options.map((opt) => {
            const isSelected = selected === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => selectAnswer(opt.value)}
                className={[
                  "w-full rounded-xl border-2 px-4 py-3.5 text-left text-sm font-medium transition-all",
                  isSelected
                    ? "border-[var(--color-brand-500,#2D8C54)] bg-[var(--color-brand-50,#f0fdf4)] text-[var(--color-brand-800,#14532d)]"
                    : "border-[var(--neutral-200)] bg-white text-[var(--neutral-700)] hover:border-[var(--color-brand-300)] hover:bg-[var(--color-brand-50,#f0fdf4)]",
                ].join(" ")}
              >
                <span
                  className={[
                    "mr-2.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold align-middle",
                    isSelected
                      ? "border-[var(--color-brand-500,#2D8C54)] bg-[var(--color-brand-500,#2D8C54)] text-white"
                      : "border-[var(--neutral-300)] text-[var(--neutral-500)]",
                  ].join(" ")}
                >
                  {opt.value.toUpperCase()}
                </span>
                {isZh ? opt.zh : opt.en}
              </button>
            );
          })}
        </div>

        {error && (
          <p className="mt-3 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600">{error}</p>
        )}
      </div>

      {/* Navigation */}
      <div className="mt-5 flex items-center justify-between">
        <button
          onClick={goPrev}
          className="rounded-lg border border-[var(--neutral-200)] px-5 py-2.5 text-sm font-medium text-[var(--neutral-600)] transition-colors hover:bg-[var(--neutral-50)]"
        >
          {isZh ? "← 上一题" : "← Back"}
        </button>
        <button
          onClick={goNext}
          disabled={!selected}
          className={[
            "rounded-lg px-8 py-2.5 text-sm font-bold text-white transition-colors",
            selected
              ? "bg-[var(--color-brand-500,#2D8C54)] hover:bg-[var(--color-brand-600,#22764a)]"
              : "cursor-not-allowed bg-[var(--neutral-300)]",
          ].join(" ")}
        >
          {step < totalSteps - 1
            ? (isZh ? "下一题 →" : "Next →")
            : (isZh ? "查看结果 →" : "See Results →")}
        </button>
      </div>
    </div>
  );
}
