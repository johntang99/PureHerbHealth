/**
 * Seed script: 10 sample articles + 10 sample reviews
 * Run with: npx tsx scripts/seed-articles-reviews.ts
 */
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL ?? "";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ─── helpers ─────────────────────────────────────────────────────────────────

async function getStoreId(): Promise<string> {
  const { data, error } = await admin
    .from("stores")
    .select("id")
    .eq("slug", "pureherbhealth")
    .maybeSingle();
  if (error || !data) throw new Error(`Store not found: ${error?.message}`);
  return data.id as string;
}

async function getProductId(slugPattern: string, fallbackOffset = 0): Promise<string | null> {
  // Try exact slug first
  const { data: exact } = await admin.from("products").select("id").eq("slug", slugPattern).eq("enabled", true).maybeSingle();
  if (exact?.id) return exact.id as string;
  // Try ILIKE pattern
  const { data: fuzzy } = await admin.from("products").select("id").ilike("slug", `%${slugPattern}%`).eq("enabled", true).limit(1).maybeSingle();
  if (fuzzy?.id) return fuzzy.id as string;
  // Fallback: Nth enabled product
  const { data: fallback } = await admin.from("products").select("id").eq("enabled", true).order("name").range(fallbackOffset, fallbackOffset);
  return (fallback?.[0]?.id as string) ?? null;
}

async function upsertArticle(
  storeId: string,
  slug: string,
  article: {
    title: string; title_zh: string;
    body_markdown: string; body_markdown_zh: string;
    status: string; published_at: string;
    meta_title: string; meta_description: string;
  },
  productIds: (string | null)[],
) {
  const { data: existing } = await admin.from("content").select("id").eq("slug", slug).eq("store_id", storeId).maybeSingle();
  if (existing?.id) {
    console.log(`  ⏭  Article already exists: ${slug}`);
    return existing.id as string;
  }

  const { data, error } = await admin
    .from("content")
    .insert({ store_id: storeId, type: "article", slug, ...article })
    .select("id")
    .single();

  if (error) throw new Error(`Article insert failed (${slug}): ${error.message}`);
  const contentId = data.id as string;

  for (const pid of productIds) {
    if (!pid) continue;
    await admin.from("content_products").insert({ content_id: contentId, product_id: pid }).select().maybeSingle();
  }

  console.log(`  ✓  Created article: ${article.title}`);
  return contentId;
}

async function upsertReview(review: {
  product_id: string; rating: number; title: string; body: string;
  reviewer_name: string; reviewer_email: string;
  status: string; verified_purchase: boolean;
}) {
  const { data: existing } = await admin
    .from("product_reviews")
    .select("id")
    .eq("reviewer_email", review.reviewer_email)
    .eq("product_id", review.product_id)
    .maybeSingle();
  if (existing?.id) { console.log(`  ⏭  Review already exists: ${review.reviewer_email}`); return; }

  const { error } = await admin.from("product_reviews").insert(review);
  if (error) throw new Error(`Review insert failed (${review.reviewer_email}): ${error.message}`);
  console.log(`  ✓  Created review: "${review.title.slice(0, 50)}…"`);
}

// ─── main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("🌿 Seeding articles and reviews…\n");

  const storeId = await getStoreId();
  console.log(`Store ID: ${storeId}\n`);

  // Resolve product IDs
  const [pAstragalus, pAdaptogen, pBloodNourish, pCalmMind, pSleep, pDigestion, pStress, pImmune] =
    await Promise.all([
      getProductId("astragalus-root-extract", 0),
      getProductId("adaptogen-performance-blend", 1),
      getProductId("blood-nourish-tonic", 2),
      getProductId("calm-mind-drops", 3),
      getProductId("sleep", 4),
      getProductId("digest", 5),
      getProductId("stress", 6),
      getProductId("immune", 7),
    ]);

  console.log("Products resolved:");
  console.log(`  Astragalus:   ${pAstragalus ?? "not found"}`);
  console.log(`  Adaptogen:    ${pAdaptogen ?? "not found"}`);
  console.log(`  Blood Nourish:${pBloodNourish ?? "not found"}`);
  console.log(`  Calm Mind:    ${pCalmMind ?? "not found"}`);
  console.log();

  // ── ARTICLES ────────────────────────────────────────────────────────────────
  console.log("📄 Inserting articles…");

  await upsertArticle(storeId, "what-is-wei-qi", {
    title: "What Is Wei Qi? Understanding Your Body's Defense Shield",
    title_zh: "什么是卫气？了解您的防御之盾",
    body_markdown: `## What Is Wei Qi?

In Traditional Chinese Medicine (TCM), **Wei Qi** (卫气, *wèi qì*) is the body's outermost defensive energy — often translated as "Defensive Qi" or "Protective Qi." Think of it as an invisible shield that circulates just beneath the skin, guarding against external pathogens TCM calls *Wind, Cold, Heat, and Dampness*.

## How Wei Qi Works

Wei Qi moves in the superficial layers of the body, flowing along the skin and muscles. Its primary functions are:

- **Protecting** the body from external invaders
- **Warming** the muscles and skin
- **Regulating** the opening and closing of pores (sweat regulation)
- **Nourishing** skin and body hair

## Signs of Weak Wei Qi

- Frequent colds and respiratory infections
- Sensitivity to wind and drafts
- Excessive spontaneous sweating
- Slow recovery from illness
- Pale, dull complexion

## The Root of Wei Qi: The Lungs and Spleen

The **Lungs** distribute Wei Qi across the body's surface, while the **Spleen** generates the nutritive Qi that Wei Qi derives from. This is why digestive health directly impacts immunity in TCM.

## Strengthening Wei Qi Naturally

The most celebrated Wei Qi tonic herb is **Astragalus Root** (*Huang Qi*, 黄芪). Dozens of clinical studies confirm its ability to upregulate immune markers and reduce the incidence of seasonal illness.

### Lifestyle Practices
- Regular sleep schedule — Wei Qi regenerates at night
- Warm, cooked foods — support Spleen Qi, the root of Wei Qi
- Qi Gong and Tai Chi — move Qi through the surface channels

> *"The superior physician treats disease before it arises."*
> — Huangdi Neijing

---
*These statements have not been evaluated by the FDA. This content is educational and does not constitute medical advice.*`,
    body_markdown_zh: `## 什么是卫气？

在中医理论中，**卫气**是人体最外层的防御之气，被称为"护卫之气"。可以将其理解为循行于皮肤之下的无形屏障，抵御风、寒、热、湿等外邪侵袭。

## 卫气的功能

- **防御**外邪侵入
- **温煦**肌肤与肌肉
- **调节**汗孔的开合
- **滋养**皮毛

## 卫气不足的表现

- 反复感冒、呼吸系统感染
- 对风寒敏感
- 自汗
- 病后恢复缓慢

## 强化卫气

**黄芪**是最著名的卫气补益药，数十项临床研究证实其免疫调节作用。

---
*本内容仅供教育参考，不构成医疗建议。*`,
    status: "published",
    published_at: new Date(Date.now() - 8 * 86400000).toISOString(),
    meta_title: "What Is Wei Qi? Your Body's Defense Shield | pureHerbHealth",
    meta_description: "Learn how Wei Qi (Defensive Qi) protects your body in Traditional Chinese Medicine, and how to strengthen it with Astragalus and TCM lifestyle practices.",
  }, [pAstragalus]);

  await upsertArticle(storeId, "five-elements-beginners-guide", {
    title: "The Five Elements of TCM: A Beginner's Complete Guide",
    title_zh: "中医五行入门完整指南",
    body_markdown: `## The Five Elements: The Framework Behind TCM

Traditional Chinese Medicine is built on an elegant system known as the **Five Elements** (*Wu Xing*, 五行): **Wood, Fire, Earth, Metal, and Water**. These are dynamic patterns of energy that describe how all phenomena — including the human body — move, interact, and transform.

## Understanding Each Element

### 🌳 Wood (木)
- **Season:** Spring | **Organs:** Liver & Gallbladder
- **Emotion:** Anger / Frustration
- **Imbalance:** Irritability, tight shoulders, eye problems, irregular menstruation

### 🔥 Fire (火)
- **Season:** Summer | **Organs:** Heart & Small Intestine
- **Emotion:** Joy / Overexcitement
- **Imbalance:** Anxiety, palpitations, insomnia

### 🌍 Earth (土)
- **Season:** Late Summer | **Organs:** Spleen & Stomach
- **Emotion:** Worry / Overthinking
- **Imbalance:** Fatigue, bloating, brain fog

### 🌬 Metal (金)
- **Season:** Autumn | **Organs:** Lung & Large Intestine
- **Emotion:** Grief / Sadness
- **Imbalance:** Frequent colds, dry skin, melancholy

### 💧 Water (水)
- **Season:** Winter | **Organs:** Kidney & Bladder
- **Emotion:** Fear / Insecurity
- **Imbalance:** Lower back pain, hair loss, hearing issues

## The Generating and Controlling Cycles

**Generating (相生):** Wood → Fire → Earth → Metal → Water → Wood

**Controlling (相克):** Wood → Earth → Water → Fire → Metal → Wood

---
*These statements have not been evaluated by the FDA. This content is educational only.*`,
    body_markdown_zh: `## 五行：中医理论的基础框架

中医建立在**五行**（木、火、土、金、水）体系之上，是描述人体及万物运动、相互作用与转化的动态能量模式。

### 🌳 木 — 春 — 肝胆 — 怒
### 🔥 火 — 夏 — 心与小肠 — 喜
### 🌍 土 — 长夏 — 脾胃 — 思
### 🌬 金 — 秋 — 肺与大肠 — 悲
### 💧 水 — 冬 — 肾与膀胱 — 恐

---
*本内容仅供教育参考，不构成医疗建议。*`,
    status: "published",
    published_at: new Date(Date.now() - 15 * 86400000).toISOString(),
    meta_title: "Five Elements of TCM: Complete Beginner's Guide | pureHerbHealth",
    meta_description: "Discover the Five Elements of Traditional Chinese Medicine — Wood, Fire, Earth, Metal, Water — and how they map to your organs, emotions, and seasonal health.",
  }, []);

  await upsertArticle(storeId, "adaptogenic-herbs-stress-guide", {
    title: "Adaptogenic Herbs: How TCM Has Been Managing Stress for 2,000 Years",
    title_zh: "适应原草药：中医两千年的抗压之道",
    body_markdown: `## The Modern Stress Epidemic

Chronic stress is one of the defining health challenges of the 21st century. Traditional Chinese Medicine has recognized and treated the underlying pattern for millennia through what modern science now calls **adaptogens**.

## What Is an Adaptogen?

An adaptogen is an herb that:

1. **Increases resistance** to physical, chemical, and biological stressors
2. **Normalizes** physiological functions regardless of the direction of imbalance
3. **Is non-toxic** at normal therapeutic doses

## The Top TCM Adaptogens

### 人参 Ren Shen (Panax Ginseng)
The "king of herbs" — tonifies all five organ systems, boosts energy and mental clarity. Best for Qi deficiency with fatigue.

### 黄芪 Huang Qi (Astragalus)
The premier Wei Qi tonic. Builds immune resilience and sustained energy. Ideal for long-term daily use.

### 灵芝 Ling Zhi (Reishi Mushroom)
The "mushroom of immortality." Calms the mind, supports sleep, and modulates immune response.

### 五味子 Wu Wei Zi (Schisandra Berry)
Protects the liver, calms the nervous system. Excellent for mental performance under stress.

### 枸杞子 Gou Qi Zi (Goji Berry)
Nourishes Liver and Kidney Yin. Combats the depleting effects of chronic stress.

## The HPA Axis and TCM Kidney Qi

Modern research links chronic stress to HPA axis dysregulation. In TCM, this maps to **Kidney Qi deficiency** — the Kidneys store *Jing* (essence), the deepest form of vitality. Overwork and chronic stress all deplete Kidney Jing.

---
*Consult a qualified TCM practitioner before starting any herbal protocol.*`,
    body_markdown_zh: `## 适应原草药的概念

适应原草药具有：增强抵抗力、使生理功能趋向平衡、在正常剂量下无毒副作用的特点。

## 主要适应原草药

- **人参** — 大补元气
- **黄芪** — 固表益气，卫气调理首选
- **灵芝** — 安神定志，适合压力性失眠
- **五味子** — 宁心安神，改善认知
- **枸杞子** — 滋补肝肾

---
*请在开始任何草药方案前咨询合格的中医师。*`,
    status: "published",
    published_at: new Date(Date.now() - 22 * 86400000).toISOString(),
    meta_title: "Adaptogenic Herbs for Stress: TCM's 2,000-Year Solution | pureHerbHealth",
    meta_description: "Explore how TCM adaptogenic herbs like Astragalus, Reishi, and Schisandra help manage stress, balance cortisol, and build lasting resilience.",
  }, [pAdaptogen, pAstragalus]);

  await upsertArticle(storeId, "tcm-guide-better-sleep", {
    title: "The TCM Guide to Better Sleep: Why You Wake at 3am",
    title_zh: "中医睡眠指南：为何凌晨三点醒来",
    body_markdown: `## Sleep Through the TCM Lens

In TCM, sleep is governed by the balance of **Yin and Yang**. Quality sleep requires Yin to be sufficient to anchor the restless Yang-natured spirit (*Shen*) that resides in the Heart.

## The Organ Clock: Why You Wake at 3am

TCM maps each organ to a 2-hour peak time in the 24-hour cycle:

| Time | Organ | Common Cause |
|------|-------|-------------|
| 11pm–1am | Gallbladder | Decision fatigue, resentment |
| 1am–3am | Liver | Anger, Blood deficiency |
| 3am–5am | Lung | Grief, unprocessed sadness |
| 5am–7am | Large Intestine | Holding on, constipation |

The classic **3am wake-up** points to **Liver Blood deficiency** — especially common in women and those with high stress.

## TCM Patterns of Insomnia

### Heart-Kidney Disharmony
Anxiety, palpitations, vivid dreams, hot palms at night.

### Liver Blood Deficiency
Waking 1–3am, anxiety, eye strain. Common in women.

### Spleen Qi Deficiency
Excessive dreaming, heavy sleep but not refreshing.

## Evening Practices

1. Dim lights after 8pm
2. Warm foot soak for 15 minutes — draws Yang energy downward
3. Avoid screens 1 hour before bed
4. Eat dinner earlier

---
*Persistent sleep disorders should be evaluated by a healthcare professional.*`,
    body_markdown_zh: `## 中医视角下的睡眠

中医认为，睡眠由阴阳平衡所主导。优质睡眠需要充足的阴气来敛藏心神。

## 子午流注

| 时间 | 脏腑 | 原因 |
|------|------|------|
| 23–1时 | 胆 | 郁怒 |
| 1–3时 | 肝 | 血虚 |
| 3–5时 | 肺 | 悲伤 |

凌晨三点醒来通常指向**肝血不足**。

## 改善建议

1. 晚八点后调暗灯光
2. 睡前温水泡脚
3. 早吃晚饭

---
*持续性睡眠障碍请寻求专业医疗评估。*`,
    status: "published",
    published_at: new Date(Date.now() - 30 * 86400000).toISOString(),
    meta_title: "TCM Guide to Better Sleep: Why You Wake at 3am | pureHerbHealth",
    meta_description: "Discover why you wake at 3am according to TCM's organ clock, and learn herbal and lifestyle solutions for each insomnia pattern.",
  }, [pSleep, pCalmMind]);

  await upsertArticle(storeId, "spleen-qi-digestion-energy", {
    title: "Spleen Qi: The TCM Engine Behind Digestion, Energy, and Mental Clarity",
    title_zh: "脾气：消化、精力与思维清晰的中医核心",
    body_markdown: `## The TCM Spleen Is Not Your Anatomical Spleen

In TCM, the **Spleen** (*Pí*, 脾) is the central pivot of health — it transforms food and drink into Qi and Blood, then transports nourishment to every cell.

## Core Functions of Spleen Qi

1. **Transformation** — converting food into usable energy
2. **Transportation** — distributing Qi and nutrients throughout the body
3. **Holding** — keeping organs in place
4. **Governing Blood** — holding blood within the vessels
5. **Housing thought** — responsible for thinking, studying, and memory

## Signs Your Spleen Qi Is Deficient

- Bloating after meals
- Loose or unformed stools
- Poor appetite
- Chronic fatigue and heaviness
- Brain fog, poor concentration
- Tendency toward worry and overthinking

## The #1 Enemy: Cold and Raw Foods

The Spleen functions like a pilot light — it needs warmth to transform food. Cold drinks, raw salads, and ice cream tax this "pilot light" enormously.

## Healing Foods

**Most supportive:** Warm cooked grains, root vegetables, ginger tea

**Most damaging:** Iced drinks, raw salads in excess, sugar, eating while stressed

## Key Herbs

- **Huang Qi** (Astragalus) — Tonifies Spleen and Lung Qi
- **Ren Shen** (Ginseng) — Powerfully tonifies Spleen Qi
- **Bai Zhu** (White Atractylodes) — Dries Dampness, strengthens Spleen

---
*Please consult a qualified TCM practitioner for personalized guidance.*`,
    body_markdown_zh: `## 中医的"脾"与解剖学不同

中医的**脾**是功能性器官系统，是健康的中枢轴。

## 脾气的核心功能

1. **运化** — 将食物转化为可利用的能量
2. **升清** — 将精微物质输布全身
3. **统血** — 使血液循行于脉内
4. **主思** — 负责思维与记忆

## 脾气虚的表现

- 餐后腹胀 · 大便溏薄 · 食欲不振
- 慢性疲劳 · 思维迟钝

---
*请咨询合格中医师获得个性化指导。*`,
    status: "published",
    published_at: new Date(Date.now() - 45 * 86400000).toISOString(),
    meta_title: "Spleen Qi in TCM: Digestion, Energy & Mental Clarity | pureHerbHealth",
    meta_description: "Learn how Spleen Qi governs digestion, energy, and thinking in TCM — including the foods and herbs that strengthen or weaken it.",
  }, [pDigestion]);

  await upsertArticle(storeId, "blood-deficiency-women-tcm", {
    title: "Blood Deficiency in Women: TCM's Most Common Overlooked Pattern",
    title_zh: "女性血虚：中医最常被忽视的体质类型",
    body_markdown: `## The Most Widespread Imbalance You've Never Heard Of

If you experience fatigue, poor sleep, anxiety, irregular periods, pale complexion, dry skin, or hair thinning — TCM would likely diagnose **Blood Deficiency** (*Xue Xu*, 血虚).

TCM Blood (*Xue*) nourishes tissues, anchors the Shen at night, moistens the eyes and skin, and regulates the menstrual cycle.

## Why Women Are More Vulnerable

Menstruation represents a regular expenditure of Blood. Without consistent replenishment, monthly blood loss gradually depletes reserves. Pregnancy and breastfeeding further deplete Blood and Essence.

## Recognizing Blood Deficiency

**Physical signs:** Pale face and lips, brittle nails, hair thinning, dry skin, dizziness on standing

**Sleep/mental:** Difficulty falling asleep, waking 1–3am, mild anxiety, poor memory

**Menstrual:** Light, scanty periods, pale menstrual blood, delayed cycle (>30 days)

## Building Blood Through Diet

- Red dates (*Hong Zao*), dark cherries, beets
- Dark leafy greens: spinach, nettles
- Cooked black sesame seeds
- Longan fruit (*Long Yan Rou*)

## Key Blood-Nourishing Herbs

- **Dang Gui** — the queen herb for female Blood disorders
- **Shu Di Huang** (Rehmannia) — deeply nourishes Blood and Essence
- **Bai Shao** (White Peony) — nourishes Blood, softens the Liver

The formula **Si Wu Tang** (Four Substance Decoction) is the foundational Blood tonic.

---
*Consult a TCM practitioner for a personalized diagnosis.*`,
    body_markdown_zh: `## 最普遍却被忽视的失衡

如果您经历疲劳、睡眠不佳、月经不调或脱发，中医很可能诊断为**血虚**。

## 血虚的表现

- 面色苍白，唇舌色淡
- 指甲脆弱，脱发
- 入睡困难，凌晨1-3点醒来
- 月经量少、色淡，周期推迟

## 补血食物

- 红枣、黑芝麻、菠菜、龙眼肉

---
*请咨询中医师获得个性化诊断。*`,
    status: "published",
    published_at: new Date(Date.now() - 12 * 86400000).toISOString(),
    meta_title: "Blood Deficiency in Women: TCM Signs & Solutions | pureHerbHealth",
    meta_description: "Understand Blood Deficiency — TCM's most overlooked pattern in women. Learn the signs, dietary solutions, and key herbs like Dang Gui and Rehmannia.",
  }, [pBloodNourish]);

  await upsertArticle(storeId, "seasonal-eating-tcm-guide", {
    title: "Eating With the Seasons: The Ancient TCM Blueprint for Year-Round Vitality",
    title_zh: "顺应四季饮食：中医全年活力的古老蓝图",
    body_markdown: `## Why Seasonal Eating Matters in TCM

In TCM, humans are a microcosm of nature. Eating in alignment with the season is a fundamental health practice.

## Spring (Wood): Cleanse and Grow
Tender greens, asparagus, lightly cooked foods, sour flavors. Support Liver and Gallbladder.

## Summer (Fire): Nourish and Cool
Cucumber, bitter melon, mung beans, chrysanthemum tea. Avoid excessive iced beverages.

## Late Summer (Earth): Ground and Digest
Sweet potato, squash, millet, congee (rice porridge). The ultimate Spleen food season.

## Autumn (Metal): Consolidate and Moisten
Pear soup, white fungus, daikon, lotus root. Protect against autumn dryness.

**Herbs for autumn:** Astragalus builds Wei Qi for the cold season ahead.

## Winter (Water): Store and Restore
Black beans, walnuts, bone broths, warming spices. Sleep longer; conserve energy.

---
*These are general principles. Individual constitution should guide personalized choices.*`,
    body_markdown_zh: `## 顺应四季饮食的重要性

中医认为人体是自然的缩影，与四季相应的饮食是基本健康实践。

- **春季** — 嫩绿蔬菜，疏肝解郁
- **夏季** — 清凉食物，避免过凉饮品
- **长夏** — 健脾食物，粥类为佳
- **秋季** — 润肺防燥，梨与银耳
- **冬季** — 补肾藏精，骨汤与温补食材

---
*这些为一般原则，请根据个人体质调整。*`,
    status: "published",
    published_at: new Date(Date.now() - 5 * 86400000).toISOString(),
    meta_title: "Seasonal Eating in TCM: Year-Round Vitality Guide | pureHerbHealth",
    meta_description: "Learn TCM's ancient seasonal eating principles for Spring, Summer, Autumn, and Winter — the best foods and herbs for each season's energy.",
  }, []);

  await upsertArticle(storeId, "qi-stagnation-stress-pain", {
    title: "Qi Stagnation: The TCM Root Cause of Stress, Tension, and Chronic Pain",
    title_zh: "气滞：压力、紧张与慢性疼痛的中医根源",
    body_markdown: `## "Where There Is Flow, There Is No Pain"

*Tōng zé bù tòng, tòng zé bù tōng* — "free flow = no pain; obstruction = pain." This is the single most important principle in understanding pain and disease from a TCM perspective.

**Qi Stagnation** is the most common pattern in modern clinical practice.

## What Causes Qi Stagnation?

- Emotional suppression — unexpressed anger or frustration
- Chronic stress — the Liver bears the brunt
- Sedentary lifestyle
- Irregular eating habits
- Overwork — depletes Yin, causing Yang Qi to stagnate

## Signs of Qi Stagnation

**Physical:** Moving pain that shifts location, chest tightness, abdominal bloating, frequent sighing, PMS, neck and shoulder tension

**Emotional:** Irritability, feeling "stuck," mood fluctuations

## Moving Qi

### Herbal
- **Chai Hu** (Bupleurum) — primary Liver Qi mover
- **Xiang Fu** (Cyperus) — moves Qi, relieves pain

Classic formula: **Chai Hu Shu Gan San**

### Physical
- Regular aerobic exercise — even 20 minutes significantly moves Qi
- Acupuncture
- Deep breathing

---
*Chronic pain should always be evaluated by a healthcare professional.*`,
    body_markdown_zh: `## 通则不痛，痛则不通

气滞是现代临床中最常见的证型。

## 气滞的原因

- 情志压抑 · 慢性压力 · 久坐少动

## 气滞的表现

- 游走性疼痛 · 胸闷气短 · 腹胀
- 善太息 · 经前乳胀 · 颈肩紧张

---
*慢性疼痛应由专业医疗人员评估。*`,
    status: "published",
    published_at: new Date(Date.now() - 18 * 86400000).toISOString(),
    meta_title: "Qi Stagnation: TCM Root Cause of Stress and Pain | pureHerbHealth",
    meta_description: "Discover how Qi stagnation causes stress, tension, bloating, and chronic pain, and how to restore free flow with TCM herbs and movement.",
  }, [pStress]);

  await upsertArticle(storeId, "kidney-jing-life-essence-tcm", {
    title: "Kidney Jing: Your Life Force Savings Account in TCM",
    title_zh: "肾精：中医中的生命储备账户",
    body_markdown: `## The Concept of Jing

**Jing** (精, *essence*) is the most fundamental, precious substance in the body — stored primarily in the **Kidneys**.

Think of Jing as your **life force savings account**:
- **Pre-Heaven Jing** — constitutional inheritance from your parents (cannot be replaced)
- **Post-Heaven Jing** — earned through healthy living (can be supplemented)

## Jing and the Stages of Life

The *Huangdi Neijing* describes human development in 7-year (female) and 8-year (male) cycles, each governed by Kidney Jing — from teething and puberty through reproductive maturity and decline.

## Signs of Kidney Jing Deficiency

- Premature gray hair before age 40
- Poor memory and cognitive decline
- Weakened bones and teeth
- Tinnitus (ringing in the ears)
- Lower back and knee weakness
- Reduced sexual vitality

## Protecting and Supplementing Jing

### Lifestyle
- Adequate sleep — Jing replenishes midnight to 4am
- Meditation and stillness — quiets fear (Kidney's enemy)
- Avoid overwork

### Food
- Bone marrow broths, black sesame seeds, walnuts, goji berries

### Key Herbs
- **He Shou Wu** (Fo-Ti) — premier hair-restoring, Jing-building herb
- **Gou Qi Zi** (Goji Berry) — nourishes Yin and Blood

---
*Consult a TCM practitioner for personalized care.*`,
    body_markdown_zh: `## 精的概念

**精**是人体最根本、最珍贵的物质，储存于**肾**中。

- **先天之精** — 父母给予，无法再生
- **后天之精** — 通过健康生活补充

## 肾精亏虚的表现

- 早白发 · 记忆力减退 · 骨骼脆弱
- 耳鸣 · 腰膝酸软

---
*请咨询中医师获得个性化指导。*`,
    status: "published",
    published_at: new Date(Date.now() - 35 * 86400000).toISOString(),
    meta_title: "Kidney Jing in TCM: Your Life Force Savings Account | pureHerbHealth",
    meta_description: "Understand Kidney Jing — TCM's concept of life essence — how it's depleted by stress and aging, and how to preserve it with diet, lifestyle, and tonic herbs.",
  }, []);

  await upsertArticle(storeId, "tcm-western-medicine-complementary", {
    title: "TCM and Western Medicine: Why They're Better Together",
    title_zh: "中医与西医：为何两者相辅相成",
    body_markdown: `## Two Medicines, One Patient

The debate of "TCM vs. Western medicine" is largely a false dichotomy. Both systems work side by side, each doing what it does best.

## What Western Medicine Does Best

- Acute emergency care: trauma, surgery, acute infections
- Diagnostic precision: imaging, labs, genetic testing
- Pharmaceutical intervention: antibiotics, antivirals

## What TCM Does Best

- Chronic condition management: digestive disorders, hormonal imbalances
- Prevention and optimization: building resilience before disease arises
- Functional symptoms: fatigue, insomnia, anxiety without structural cause
- Side effect mitigation: supporting the body during chemotherapy
- Holistic assessment: treating the person, not just the diagnosis

## Evidence-Based TCM

- **Astragalus (Huang Qi):** 200+ clinical studies on immune modulation
- **Berberine:** Comparable to Metformin for blood sugar in several trials
- **Artemisinin:** Nobel Prize-winning antimalarial from a TCM herb
- **Acupuncture:** Endorsed by the WHO for 43 conditions

## Practical Integration

1. For chronic conditions: Consider TCM as primary or adjunct
2. For acute illness: Use Western medicine; add TCM for recovery
3. For prevention: TCM seasonal protocols are excellent
4. Always tell both practitioners about ALL treatments

---
*Always consult qualified practitioners for medical decisions.*`,
    body_markdown_zh: `## 两种医学，同一个患者

"中医与西医"的争论是虚假的二元对立。两者各有所长，相辅相成。

## 西医优势

- 急救与手术 · 精确诊断 · 抗生素等药物治疗

## 中医优势

- 慢性病管理 · 预防调理 · 功能性症状 · 整体评估

## 循证中医

- 黄芪：200余项免疫研究
- 小檗碱：降糖效果接近二甲双胍
- 青蒿素：诺贝尔奖抗疟药物

---
*医疗决策请咨询合格的专业人员。*`,
    status: "published",
    published_at: new Date(Date.now() - 3 * 86400000).toISOString(),
    meta_title: "TCM and Western Medicine: Why They Work Better Together | pureHerbHealth",
    meta_description: "Explore how Traditional Chinese Medicine and Western medicine complement each other, with evidence-based integration guidance for patients.",
  }, [pAstragalus]);

  // ── REVIEWS ──────────────────────────────────────────────────────────────────
  console.log("\n⭐ Inserting reviews…");

  const reviewsToCreate = [
    pAstragalus && {
      product_id: pAstragalus, rating: 5,
      title: "Finally — my energy is back and I haven't had a cold in months",
      body: "I've been taking this for about 6 weeks and the difference is remarkable. I work long hours and used to get sick every time the season changed. Since starting this formula I've gone through two full months without a single cold. My acupuncturist also confirmed it's the right formula for my constitution. The capsule size is easy to swallow. Will absolutely continue.",
      reviewer_name: "Sarah M.", reviewer_email: "sarah.m@example.com",
      status: "approved", verified_purchase: true,
    },
    pAstragalus && {
      product_id: pAstragalus, rating: 5,
      title: "My TCM doctor recommended this — exceeded expectations",
      body: "Dr. Huang specifically recommended this for my Qi deficiency pattern. After 3 months I feel more grounded, my digestion has improved, and I haven't needed a sick day. I feel better overall — less fatigue, better recovery after workouts. Started recommending it to everyone in my family.",
      reviewer_name: "David L.", reviewer_email: "davidl88@example.com",
      status: "approved", verified_purchase: true,
    },
    pAstragalus && {
      product_id: pAstragalus, rating: 4,
      title: "Good quality — takes a few weeks but worth it",
      body: "I didn't notice anything the first two weeks and almost gave up. But by week 4, I had more sustained energy in the afternoons — that's when I usually crash. My seasonal allergies were also noticeably milder this spring. Four stars only because effects are subtle, but I think that's how tonic herbs are supposed to work.",
      reviewer_name: "Jennifer K.", reviewer_email: "jen.k@example.com",
      status: "approved", verified_purchase: true,
    },
    pAdaptogen && {
      product_id: pAdaptogen, rating: 5,
      title: "Game changer for afternoon energy — replaced my 3pm coffee",
      body: "I work in a high-stress environment and used to need 3–4 cups of coffee a day. I started this on my TCM practitioner's advice and within two weeks I was down to one coffee in the morning. The energy from this is different — clean and steady, not jittery. I'm also handling stressful situations more calmly. Incredible.",
      reviewer_name: "Michael T.", reviewer_email: "michael.t@example.com",
      status: "approved", verified_purchase: true,
    },
    pAdaptogen && {
      product_id: pAdaptogen, rating: 5,
      title: "Best adaptogen blend I've tried — and I've tried many",
      body: "I've been exploring adaptogens for 3 years and tried many brands. This formula stands out for the quality of herbs and obvious care in formulation. I take 2 capsules in the morning and feel focused and balanced all day. Highly recommend.",
      reviewer_name: "Rachel W.", reviewer_email: "rachel.w@example.com",
      status: "approved", verified_purchase: true,
    },
    pBloodNourish && {
      product_id: pBloodNourish, rating: 5,
      title: "My cycles are finally regular after years of struggle",
      body: "I've had irregular, very light periods for years. My TCM practitioner diagnosed me with Blood deficiency and recommended this formula. After 3 months, my cycle has become regular for the first time in years. My hair has also stopped falling out at the rate it was. I can't say enough good things.",
      reviewer_name: "Lisa C.", reviewer_email: "lisa.c@example.com",
      status: "approved", verified_purchase: true,
    },
    pBloodNourish && {
      product_id: pBloodNourish, rating: 4,
      title: "Noticeable improvement in energy and complexion",
      body: "My TCM practitioner noted Blood deficiency signs — pale complexion, light periods, waking at 3am. After 6 weeks the 3am waking has stopped completely. My face has more color. Giving 4 stars rather than 5 only because I wish the bottle were larger. The formula itself is excellent.",
      reviewer_name: "Emma R.", reviewer_email: "emma.r@example.com",
      status: "approved", verified_purchase: true,
    },
    pCalmMind && {
      product_id: pCalmMind, rating: 5,
      title: "Finally a sleep product that works without morning grogginess",
      body: "I've tried melatonin, magnesium, every sleep supplement out there. They either don't work or leave me foggy. This formula is different. I fall asleep faster, stay asleep, and wake up genuinely refreshed. I take 2 capsules an hour before bed. 5 weeks in and results are consistent. No dependency, no side effects.",
      reviewer_name: "Thomas B.", reviewer_email: "thomas.b@example.com",
      status: "approved", verified_purchase: true,
    },
    pImmune && pImmune !== pAstragalus && {
      product_id: pImmune!, rating: 5,
      title: "My whole family takes this — highly recommend",
      body: "We've been using this as our family's seasonal immune support for the past year. My kids get sick far less frequently at school, and when something does go around we recover much faster. We stock up on the 3-pack each autumn and it gets us through the winter beautifully.",
      reviewer_name: "Angela F.", reviewer_email: "angela.f@example.com",
      status: "approved", verified_purchase: true,
    },
    pAstragalus && {
      product_id: pAstragalus, rating: 5,
      title: "3-pack is excellent value — stocking up every season",
      body: "Ordered the 3-pack and so glad I did. It's become a non-negotiable part of my morning routine. I'm a nurse and skeptical of supplements, but the research on Huang Qi is solid and I can feel the difference in my resilience during flu season. My patients have started asking what I'm doing differently.",
      reviewer_name: "Patricia N.", reviewer_email: "patricia.n@example.com",
      status: "approved", verified_purchase: true,
    },
  ].filter(Boolean) as NonNullable<typeof reviewsToCreate[number]>[];

  for (const review of reviewsToCreate) {
    await upsertReview(review);
  }

  console.log("\n✅ Seed complete.");
}

main().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
