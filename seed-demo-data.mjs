import fs from "fs";
import { createClient } from "@supabase/supabase-js";

function loadEnv() {
  const raw = fs.readFileSync(".env.local", "utf8");
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index === -1) continue;
    const key = trimmed.slice(0, index).trim();
    let value = trimmed.slice(index + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

function markdownForHerb(name, chineseName, pinyin, primaryToken) {
  return `## Overview
${name} (${chineseName}, ${pinyin}) is a classic herb in traditional Chinese medicine with broad wellness support use.

## Traditional Uses
- Supports qi and vitality
- Helps seasonal transitions
- Supports digestion and resilience

## Modern Notes
Recent studies suggest botanical compounds in ${name} may support immune modulation and stress response.

[Explore condition guides](/en/learn/conditions)
[Review the Five Elements model](/en/learn/five-elements)

## How to Use
- Decoction: 9-15g
- Extract capsules: follow label
- Culinary: add to soups and broths

{{product:${primaryToken}}}

{{cta:chat}}
`;
}

function markdownForCondition(title, bodySystem, productToken) {
  return `## What Is ${title}?
${title} is approached through both modern wellness understanding and TCM pattern differentiation.

## TCM Perspective
This pattern is commonly associated with ${bodySystem} imbalance. TCM treatment focuses on restoring functional harmony.

[Browse herb encyclopedia](/en/learn/herbs)
[Read adaptogen guide](/en/learn/complete-guide-adaptogens)

## Lifestyle Recommendations
### Diet
- Prioritize warm, cooked meals
- Reduce highly processed foods

### Exercise
- Gentle daily movement (walking, tai chi, mobility)

### Habits
- Keep regular sleep schedule
- Use breathing exercises during stress

{{product:${productToken}}}
{{products:immune-support}}
{{cta:quiz}}
`;
}

function markdownSectionsForProduct(name, nameZh, primaryToken) {
  return {
    description_markdown: `## Overview
${name} is a clinic-grade TCM formula designed for daily support and constitutional balance.

## Key Benefits
- Supports healthy qi and resilience
- Integrates traditional use with modern quality control
- Suitable for structured wellness routines

## Quick Reference
- Dosage: 2 capsules twice daily
- Count: 60 capsules
- Supply: 30 days
- Form: Capsule

{{product:${primaryToken}}}`,
    description_markdown_zh: `## 概述
${nameZh} 是临床级中医配方，适用于日常调理与体质平衡。

## 主要功效
- 支持气机与整体活力
- 结合传统应用与现代质量标准
- 适合阶段性调养计划

## 快速参考
- 用量：每日两次，每次2粒
- 规格：60粒
- 供应期：30天
- 剂型：胶囊`,
    tcm_guide_markdown: `## When to Use This Formula
Use this formula when your presentation aligns with qi deficiency, seasonal vulnerability, or low vitality patterns.

## Classical Context
- Category: Tonifying formulas
- Focus: Support defensive qi and constitutional stability

## Cautions
- Pause during acute fever or active infection
- Consult practitioner if pregnant or using prescription medication`,
    tcm_guide_markdown_zh: `## 何时使用本方
当体质偏气虚、季节交替易感或精力不足时可考虑使用。

## 方剂背景
- 类别：补益剂
- 方向：扶助卫气与体质稳定

## 注意事项
- 发热或急性感染期暂停使用
- 孕期或合并处方药请先咨询专业医师`,
    ingredients_markdown: `## Ingredients
- Astragalus Root (Huang Qi)
- Reishi Mushroom (Ling Zhi)
- Codonopsis Root (Dang Shen)
- Atractylodes (Bai Zhu)
- Licorice Root (Zhi Gan Cao)

## Other Ingredients
Vegetarian capsule (hypromellose), rice flour.`,
    ingredients_markdown_zh: `## 配方成分
- 黄芪
- 灵芝
- 党参
- 白术
- 炙甘草

## 其他成分
植物胶囊（羟丙基甲基纤维素）、米粉。`,
    usage_markdown: `## Directions
Take **2 capsules twice daily**, preferably with warm water before meals.

## Storage
- Store in a cool, dry place below 25C (77F)
- Keep away from direct sunlight
- Keep out of reach of children`,
    usage_markdown_zh: `## 用法用量
每日**两次，每次2粒**，建议饭前温水送服。

## 储存方式
- 置于阴凉干燥处（25C以下）
- 避免阳光直射
- 请置于儿童不可触及处`,
  };
}

async function main() {
  loadEnv();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRole) throw new Error("Missing Supabase env vars.");
  const supabase = createClient(url, serviceRole, { auth: { persistSession: false, autoRefreshToken: false } });

  const storeSlug = process.env.NEXT_PUBLIC_STORE_SLUG || "pureherbhealth";
  const siteId = storeSlug;

  const storeInput = {
    slug: storeSlug,
    name: "pureHerbHealth",
    name_zh: "纯草本健康",
    enabled: true,
    is_active: true,
    business_name: "pureHerbHealth Clinic Store",
    contact_email: "support@pureherbhealth.com",
    contact_phone: "+1-415-555-0117",
    logo_url: "https://images.unsplash.com/photo-1591348278999-3f0d7ad2af6f?auto=format&fit=crop&w=400&q=80",
    order_number_prefix: "PHH",
    theme_config: {
      colors: { brand_500: "#3f7d58", accent_500: "#d97706" },
    },
    ai_config: {
      model: "claude-sonnet-4-6",
      tone: "professional-warm",
    },
    ai_practitioner_name: "Dr. Mei Lin",
    ai_practitioner_title: "Licensed TCM Practitioner",
    ai_booking_url: "https://pureherbhealth.com/book",
    revenue_share_platform_pct: 30.0,
    stripe_connect_onboarded: true,
  };

  const { error: storeError } = await supabase.from("stores").upsert(storeInput, { onConflict: "slug" });
  if (storeError) throw storeError;
  const { data: store } = await supabase.from("stores").select("id").eq("slug", storeSlug).single();
  const storeId = store.id;

  const fiveElementsConfig = [
    {
      store_id: storeId,
      element_id: "wood",
      label: "Wood",
      emoji: "🪵",
      color: "#22c55e",
      season: "Spring",
      organs: "Liver / Gallbladder",
      summary: "Growth, direction, flexibility, and smooth qi flow.",
      generates_element_id: "fire",
      controls_element_id: "earth",
      display_order: 1,
    },
    {
      store_id: storeId,
      element_id: "fire",
      label: "Fire",
      emoji: "🔥",
      color: "#ef4444",
      season: "Summer",
      organs: "Heart / Small Intestine",
      summary: "Warmth, circulation, joy, and mental clarity.",
      generates_element_id: "earth",
      controls_element_id: "metal",
      display_order: 2,
    },
    {
      store_id: storeId,
      element_id: "earth",
      label: "Earth",
      emoji: "🌍",
      color: "#eab308",
      season: "Late Summer",
      organs: "Spleen / Stomach",
      summary: "Nourishment, digestion, centering, and transformation.",
      generates_element_id: "metal",
      controls_element_id: "water",
      display_order: 3,
    },
    {
      store_id: storeId,
      element_id: "metal",
      label: "Metal",
      emoji: "🌬️",
      color: "#94a3b8",
      season: "Autumn",
      organs: "Lung / Large Intestine",
      summary: "Boundary, breath, release, and resilience.",
      generates_element_id: "water",
      controls_element_id: "wood",
      display_order: 4,
    },
    {
      store_id: storeId,
      element_id: "water",
      label: "Water",
      emoji: "💧",
      color: "#3b82f6",
      season: "Winter",
      organs: "Kidney / Bladder",
      summary: "Essence, restoration, adaptability, and willpower.",
      generates_element_id: "wood",
      controls_element_id: "fire",
      display_order: 5,
    },
  ];
  const { error: elementConfigError } = await supabase.from("five_elements_config").upsert(fiveElementsConfig, { onConflict: "store_id,element_id" });
  if (elementConfigError) throw elementConfigError;

  const mediaSeed = [
    ["hero-learn.jpg", "https://images.unsplash.com/photo-1471193945509-9ad0617afabf?auto=format&fit=crop&w=1200&q=80", "TCM herbs and tea set"],
    ["herb-astragalus.jpg", "https://images.unsplash.com/photo-1514995669114-6081e934b693?auto=format&fit=crop&w=900&q=80", "Astragalus slices"],
    ["herb-angelica.jpg", "https://images.unsplash.com/photo-1545239351-1141bd82e8a6?auto=format&fit=crop&w=900&q=80", "Angelica root"],
    ["herb-licorice.jpg", "https://images.unsplash.com/photo-1564110333849-65f3f8b44f8b?auto=format&fit=crop&w=900&q=80", "Licorice herb"],
    ["herb-reishi.jpg", "https://images.unsplash.com/photo-1576086213369-97a306d36557?auto=format&fit=crop&w=900&q=80", "Reishi mushroom"],
    ["condition-immune.jpg", "https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=1000&q=80", "Immune wellness concept"],
    ["condition-digestive.jpg", "https://images.unsplash.com/photo-1490645935967-10de6ba17061?auto=format&fit=crop&w=1000&q=80", "Digestive health foods"],
    ["condition-stress.jpg", "https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=1000&q=80", "Calm nature scene"],
    ["condition-sleep.jpg", "https://images.unsplash.com/photo-1455642305367-68834a7d3f7b?auto=format&fit=crop&w=1000&q=80", "Sleep and rest concept"],
    ["blog-adaptogens.jpg", "https://images.unsplash.com/photo-1502740479091-635887520276?auto=format&fit=crop&w=1200&q=80", "Adaptogenic herbs spread"],
    ["blog-qi.jpg", "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=1200&q=80", "Qi and wellness tea ritual"],
    ["blog-five-elements.jpg", "https://images.unsplash.com/photo-1515377905703-c4788e51af15?auto=format&fit=crop&w=1200&q=80", "Five elements visual concept"],
    ["product-immune-boost.jpg", "https://images.unsplash.com/photo-1585435557343-3b092031a831?auto=format&fit=crop&w=900&q=80", "Supplement bottle"],
    ["product-reishi-complex.jpg", "https://images.unsplash.com/photo-1607619056574-7b8d3ee536b2?auto=format&fit=crop&w=900&q=80", "Mushroom capsules"],
    ["product-digestive-tea.jpg", "https://images.unsplash.com/photo-1515823662972-da6a2e4d3002?auto=format&fit=crop&w=900&q=80", "Herbal tea cup"],
    ["product-stress-balance.jpg", "https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&w=900&q=80", "Herbal powder and spoon"],
    ["product-sleep-calm.jpg", "https://images.unsplash.com/photo-1511988617509-a57c8a288659?auto=format&fit=crop&w=900&q=80", "Night calming tea"],
    ["product-liver-flow.jpg", "https://images.unsplash.com/photo-1470165518248-ff1b9f6d2f84?auto=format&fit=crop&w=900&q=80", "Bottled tincture"],
  ];

  const mediaRows = mediaSeed.map(([path, urlValue, alt]) => ({
    store_id: storeId,
    site_id: siteId,
    bucket: "media",
    path,
    url: urlValue,
    media_type: "image",
    mime_type: "image/jpeg",
    alt_text: alt,
  }));
  const { error: mediaUpsertError } = await supabase.from("media_assets").upsert(mediaRows, { onConflict: "site_id,path" });
  if (mediaUpsertError) throw mediaUpsertError;
  const { data: mediaAssets, error: mediaSelectError } = await supabase.from("media_assets").select("id,path,url,alt_text").eq("site_id", siteId);
  if (mediaSelectError) throw mediaSelectError;
  const mediaByPath = Object.fromEntries((mediaAssets || []).map((m) => [m.path, m]));

  const categories = [
    ["immune-support", "Immune Support", "免疫支持"],
    ["digestive-health", "Digestive Health", "消化健康"],
    ["stress-sleep", "Stress & Sleep", "压力与睡眠"],
    ["women-wellness", "Women's Wellness", "女性健康"],
    ["energy-vitality", "Energy & Vitality", "能量与活力"],
  ];
  const categoryRows = categories.map(([slug, name, nameZh]) => ({ slug, name, name_zh: nameZh }));
  const { error: categoryError } = await supabase.from("categories").upsert(categoryRows, { onConflict: "slug" });
  if (categoryError) throw categoryError;
  const { data: categoryData, error: categorySelectError } = await supabase.from("categories").select("id,slug");
  if (categorySelectError) throw categorySelectError;
  const categoryBySlug = Object.fromEntries((categoryData || []).map((c) => [c.slug, c.id]));

  const productSeed = [
    ["immune-boost-formula", "Immune Boost Formula", "免疫增强配方", "Clinical immune support blend", "临床免疫支持配方", "immune-support", 3499, "SKU-PHH-001", "product-immune-boost.jpg"],
    ["reishi-defense-complex", "Reishi Defense Complex", "灵芝防护复方", "Mushroom-powered daily defense", "蘑菇复方日常防护", "immune-support", 2899, "SKU-PHH-002", "product-reishi-complex.jpg"],
    ["astragalus-root-extract", "Astragalus Root Extract", "黄芪提取物", "Qi and defensive energy support", "补气固表支持", "immune-support", 1899, "SKU-PHH-003", "herb-astragalus.jpg"],
    ["digestive-harmony-tea", "Digestive Harmony Tea", "和胃养脾茶", "Warm digestive support tea", "温和养胃草本茶", "digestive-health", 2499, "SKU-PHH-004", "product-digestive-tea.jpg"],
    ["spleen-qi-tonic", "Spleen Qi Tonic", "健脾益气补剂", "Traditional spleen qi nourishment", "传统健脾益气配方", "digestive-health", 3199, "SKU-PHH-005", "herb-licorice.jpg"],
    ["stress-balance-elixir", "Stress Balance Elixir", "舒压平衡精华", "Liver qi soothing botanical blend", "疏肝解郁草本配方", "stress-sleep", 2699, "SKU-PHH-006", "product-stress-balance.jpg"],
    ["sleep-calm-capsules", "Sleep Calm Capsules", "安睡宁心胶囊", "Night support for restful sleep", "夜间安睡支持", "stress-sleep", 2799, "SKU-PHH-007", "product-sleep-calm.jpg"],
    ["liver-flow-support", "Liver Flow Support", "肝气疏通配方", "Supports emotional and cycle balance", "支持情绪与周期平衡", "women-wellness", 3299, "SKU-PHH-008", "product-liver-flow.jpg"],
    ["blood-nourish-tonic", "Blood Nourish Tonic", "养血调经补剂", "Nourishes blood and supports vitality", "养血益气支持", "women-wellness", 3599, "SKU-PHH-009", "herb-angelica.jpg"],
    ["morning-qi-recharge", "Morning Qi Recharge", "晨间补气焕能", "Daily energy and resilience support", "日常补气提神支持", "energy-vitality", 3099, "SKU-PHH-010", "blog-qi.jpg"],
    ["adaptogen-performance-blend", "Adaptogen Performance Blend", "适应原活力复方", "Adaptogenic support for high-demand days", "高压日常适应原支持", "energy-vitality", 3399, "SKU-PHH-011", "blog-adaptogens.jpg"],
    ["seasonal-defense-tea", "Seasonal Defense Tea", "四季防护草本茶", "Seasonal transition herbal tea", "换季防护草本茶", "immune-support", 2199, "SKU-PHH-012", "hero-learn.jpg"],
  ];

  const productRows = productSeed.map(([slug, name, nameZh, short, shortZh, categorySlug, price, sku, imagePath]) => {
    const image = mediaByPath[imagePath];
    const backupPaths = {
      "immune-support": ["hero-learn.jpg", "herb-astragalus.jpg"],
      "digestive-health": ["product-digestive-tea.jpg", "herb-licorice.jpg"],
      "stress-sleep": ["product-sleep-calm.jpg", "condition-stress.jpg"],
      "women-wellness": ["product-liver-flow.jpg", "herb-angelica.jpg"],
      "energy-vitality": ["blog-adaptogens.jpg", "blog-qi.jpg"],
    };
    const galleryPaths = [imagePath, ...(backupPaths[categorySlug] || []), "hero-learn.jpg"];
    const gallery = galleryPaths
      .map((path, idx) => {
        const asset = mediaByPath[path];
        if (!asset) return null;
        return {
          media_asset_id: asset.id,
          url: asset.url,
          alt: asset.alt_text || name,
          position: idx,
          is_primary: idx === 0,
        };
      })
      .filter(Boolean);
    const markdownSections = markdownSectionsForProduct(name, nameZh, slug);
    return {
      slug,
      name,
      name_zh: nameZh,
      short_description: short,
      short_description_zh: shortZh,
      description: `${name} is part of our clinic-grade traditional formula lineup for daily support.`,
      description_zh: `${nameZh} 是我们临床级传统配方产品系列的一部分，适合日常调养。`,
      category_id: categoryBySlug[categorySlug],
      price_cents: price,
      enabled: true,
      sku,
      stock_quantity: 120,
      low_stock_threshold: 15,
      images: gallery.length ? gallery : image ? [{ media_asset_id: image.id, url: image.url, alt: image.alt_text || name, position: 0, is_primary: true }] : [],
      videos: [],
      ...markdownSections,
    };
  });
  const { error: productError } = await supabase.from("products").upsert(productRows, { onConflict: "slug" });
  if (productError) throw productError;
  const { data: products, error: productSelectError } = await supabase.from("products").select("id,slug,price_cents,images");
  if (productSelectError) throw productSelectError;
  const productBySlug = Object.fromEntries((products || []).map((p) => [p.slug, p]));

  const storeProducts = (products || []).map((p, index) => ({
    store_id: storeId,
    product_id: p.id,
    enabled: true,
    practitioner_recommended: index % 2 === 0,
    sort_order: index,
    is_featured: index < 6,
    practitioner_note: index % 2 === 0 ? "Recommended for foundational constitutional support." : "Suitable for seasonal support protocols.",
  }));
  const { error: storeProductError } = await supabase.from("store_products").upsert(storeProducts, { onConflict: "store_id,product_id" });
  if (storeProductError) throw storeProductError;

  const herbContent = [
    ["astragalus", "Astragalus Root", "黄芪", "Huáng Qí", "warm", ["earth", "metal"], ["lung", "spleen"], "qi-tonics", ["astragalus-root-extract", "immune-boost-formula"], "herb-astragalus.jpg"],
    ["angelica-sinensis", "Angelica Root", "当归", "Dāng Guī", "warm", ["wood", "fire"], ["liver", "heart"], "blood-tonics", ["blood-nourish-tonic", "liver-flow-support"], "herb-angelica.jpg"],
    ["reishi", "Reishi Mushroom", "灵芝", "Líng Zhī", "neutral", ["water", "earth"], ["heart", "lung"], "shen-calming", ["reishi-defense-complex", "sleep-calm-capsules"], "herb-reishi.jpg"],
    ["licorice-root", "Licorice Root", "甘草", "Gān Cǎo", "neutral", ["earth"], ["spleen", "lung"], "harmonizing", ["spleen-qi-tonic", "digestive-harmony-tea"], "herb-licorice.jpg"],
  ];

  const conditionContent = [
    ["immune-support-guide", "Immune Support", "免疫支持指南", "immune", "metal", ["lung", "spleen"], "Wei Qi Deficiency", ["immune-boost-formula", "reishi-defense-complex"], "condition-immune.jpg"],
    ["digestive-health-guide", "Digestive Health", "消化健康指南", "digestive", "earth", ["spleen", "stomach"], "Spleen Qi Deficiency", ["digestive-harmony-tea", "spleen-qi-tonic"], "condition-digestive.jpg"],
    ["stress-anxiety-guide", "Stress & Anxiety", "压力焦虑指南", "mind", "wood", ["liver", "heart"], "Liver Qi Stagnation", ["stress-balance-elixir", "liver-flow-support"], "condition-stress.jpg"],
    ["sleep-support-guide", "Sleep Support", "睡眠支持指南", "sleep", "water", ["heart", "kidney"], "Heart-Kidney Disharmony", ["sleep-calm-capsules", "reishi-defense-complex"], "condition-sleep.jpg"],
  ];

  const blogContent = [
    ["complete-guide-adaptogens", "The Complete Guide to Adaptogenic Herbs", "适应原草本完整指南", "blog_post", "blog-adaptogens.jpg", ["adaptogen-performance-blend", "astragalus-root-extract"]],
    ["understanding-qi", "Understanding Qi: The Foundation of TCM", "理解气：中医基础", "blog_post", "blog-qi.jpg", ["morning-qi-recharge", "spleen-qi-tonic"]],
    ["five-elements-health", "Five Elements: How They Shape Your Health", "五行如何塑造你的健康", "element_guide", "blog-five-elements.jpg", ["liver-flow-support", "sleep-calm-capsules"]],
    ["spring-wellness-wood-element", "Spring Wellness: Wood Element Practices", "春季养生：木元素实践", "seasonal_guide", "hero-learn.jpg", ["liver-flow-support", "stress-balance-elixir"]],
  ];

  const contentRows = [];

  for (const herb of herbContent) {
    const [slug, title, titleZh, pinyin, nature, elements, meridians, category, productSlugs, imagePath] = herb;
    const img = mediaByPath[imagePath];
    contentRows.push({
      store_id: storeId,
      type: "herb_profile",
      slug,
      title,
      title_zh: titleZh,
      body_markdown: markdownForHerb(title, titleZh, pinyin, productSlugs[0]),
      body_markdown_zh: `## 概述\n${titleZh}（${pinyin}）是中医常用草本。\n\n{{product:${productSlugs[0]}}}\n{{cta:chat}}`,
      status: "published",
      featured_image: img ? { media_asset_id: img.id, url: img.url, alt: img.alt_text || title } : null,
      images: img ? [{ media_asset_id: img.id, url: img.url, alt: img.alt_text || title }] : [],
      videos: [],
      tcm_data: {
        chinese_name: titleZh,
        pinyin,
        nature,
        flavors: ["sweet"],
        meridians,
        elements,
        category,
        traditional_uses: ["Tonifies qi", "Supports resilience"],
        contraindications: ["Consult practitioner during acute conditions"],
        dosage: "9-15g decoction equivalent",
        preparation_methods: [{ method: "Decoction", instructions: "Simmer 30-45 minutes." }],
        modern_research: [{ finding: "Supports adaptive stress response", citation: "Clinical review, 2024" }],
      },
      view_count: 220,
      published_at: new Date().toISOString(),
      meta_title: `${title} Herb Profile | pureHerbHealth`,
      meta_description: `Learn ${title} (${titleZh}) properties, uses, and product recommendations.`,
    });
  }

  for (const condition of conditionContent) {
    const [slug, title, titleZh, bodySystem, element, organs, pattern, productSlugs, imagePath] = condition;
    const img = mediaByPath[imagePath];
    contentRows.push({
      store_id: storeId,
      type: "condition_guide",
      slug,
      title,
      title_zh: titleZh,
      body_markdown: markdownForCondition(title, bodySystem, productSlugs[0]),
      body_markdown_zh: `## ${titleZh}\n中医角度下的调理建议。\n\n{{product:${productSlugs[0]}}}\n{{cta:quiz}}`,
      status: "published",
      featured_image: img ? { media_asset_id: img.id, url: img.url, alt: img.alt_text || title } : null,
      images: img ? [{ media_asset_id: img.id, url: img.url, alt: img.alt_text || title }] : [],
      videos: [],
      tcm_data: {
        body_system: bodySystem,
        element,
        organ_systems: organs,
        pattern,
        tcm_perspective: `${title} is commonly framed as ${pattern}.`,
        lifestyle: {
          diet: ["Warm cooked meals", "Hydration and regular meal timing"],
          exercise: ["Daily low-intensity movement", "Breathwork"],
          habits: ["Sleep before 11pm", "Reduce chronic stress load"],
        },
        ai_recommendation_reasoning: "Selected for pattern alignment and constitutional support.",
      },
      view_count: 180,
      published_at: new Date().toISOString(),
      meta_title: `${title} TCM Guide | pureHerbHealth`,
      meta_description: `Understand ${title} through the lens of traditional Chinese medicine and practical lifestyle recommendations.`,
    });
  }

  for (const blog of blogContent) {
    const [slug, title, titleZh, type, imagePath, productSlugs] = blog;
    const img = mediaByPath[imagePath];
    contentRows.push({
      store_id: storeId,
      type,
      slug,
      title,
      title_zh: titleZh,
      body_markdown: `## Introduction\n${title} is one of our foundational educational pieces.\n\n{{product:${productSlugs[0]}}}\n\n## Product Discovery\n{{products:immune-support}}\n\n[Explore all herbs](/en/learn/herbs)\n[Read condition guides](/en/learn/conditions)\n\n## Keep Learning\n{{herb:astragalus}}\n{{cta:quiz}}`,
      body_markdown_zh: `## 介绍\n${titleZh}\n\n{{product:${productSlugs[0]}}}\n{{cta:quiz}}`,
      status: "published",
      featured_image: img ? { media_asset_id: img.id, url: img.url, alt: img.alt_text || title } : null,
      images: img ? [{ media_asset_id: img.id, url: img.url, alt: img.alt_text || title }] : [],
      videos: [],
      tcm_data: {
        body_system: type === "seasonal_guide" ? "seasonal" : "education",
      },
      view_count: 260,
      published_at: new Date().toISOString(),
      meta_title: `${title} | pureHerbHealth Learn`,
      meta_description: `Read ${title} and discover matching TCM products and guidance.`,
    });
  }

  const { error: contentError } = await supabase.from("content").upsert(contentRows, { onConflict: "store_id,slug" });
  if (contentError) throw contentError;
  const { data: contentRowsSaved, error: contentSavedError } = await supabase.from("content").select("id,slug");
  if (contentSavedError) throw contentSavedError;
  const contentBySlug = Object.fromEntries((contentRowsSaved || []).map((row) => [row.slug, row.id]));

  const contentLinks = [
    ["astragalus", ["astragalus-root-extract", "immune-boost-formula"]],
    ["angelica-sinensis", ["blood-nourish-tonic", "liver-flow-support"]],
    ["reishi", ["reishi-defense-complex", "sleep-calm-capsules"]],
    ["licorice-root", ["spleen-qi-tonic", "digestive-harmony-tea"]],
    ["immune-support-guide", ["immune-boost-formula", "reishi-defense-complex", "seasonal-defense-tea"]],
    ["digestive-health-guide", ["digestive-harmony-tea", "spleen-qi-tonic"]],
    ["stress-anxiety-guide", ["stress-balance-elixir", "liver-flow-support"]],
    ["sleep-support-guide", ["sleep-calm-capsules", "reishi-defense-complex"]],
    ["complete-guide-adaptogens", ["adaptogen-performance-blend", "astragalus-root-extract", "reishi-defense-complex"]],
    ["understanding-qi", ["morning-qi-recharge", "spleen-qi-tonic"]],
    ["five-elements-health", ["liver-flow-support", "sleep-calm-capsules", "adaptogen-performance-blend"]],
    ["spring-wellness-wood-element", ["liver-flow-support", "stress-balance-elixir"]],
  ];

  const contentProductRows = [];
  const linkedProductUpdates = [];
  for (const [contentSlug, productSlugs] of contentLinks) {
    const contentId = contentBySlug[contentSlug];
    if (!contentId) continue;
    const productIds = productSlugs.map((s) => productBySlug[s]?.id).filter(Boolean);
    linkedProductUpdates.push({ id: contentId, linked_product_ids: productIds });
    for (const productId of productIds) {
      contentProductRows.push({ content_id: contentId, product_id: productId });
    }
  }
  const { error: contentProductError } = await supabase.from("content_products").upsert(contentProductRows, { onConflict: "content_id,product_id" });
  if (contentProductError) throw contentProductError;
  for (const update of linkedProductUpdates) {
    const { error } = await supabase.from("content").update({ linked_product_ids: update.linked_product_ids }).eq("id", update.id);
    if (error) throw error;
  }

  const orderTemplates = [
    ["PHH-20260311-0001", "confirmed", "succeeded", "label_created", "Liu Wei", "liu@example.com", ["immune-boost-formula", "reishi-defense-complex"]],
    ["PHH-20260311-0002", "processing", "succeeded", "in_transit", "Anna Chen", "anna@example.com", ["digestive-harmony-tea", "spleen-qi-tonic"]],
    ["PHH-20260311-0003", "shipped", "succeeded", "out_for_delivery", "David Wang", "david@example.com", ["sleep-calm-capsules"]],
    ["PHH-20260311-0004", "delivered", "succeeded", "delivered", "Mei Zhao", "mei@example.com", ["adaptogen-performance-blend", "morning-qi-recharge"]],
    ["PHH-20260311-0005", "pending", "pending", "pending", "Jin Park", "jin@example.com", ["seasonal-defense-tea"]],
  ];

  const orderRows = orderTemplates.map(([orderNumber, status, paymentStatus, shippingStatus, customerName, customerEmail, productSlugs], index) => {
    const productItems = productSlugs.map((slug) => productBySlug[slug]).filter(Boolean);
    const subtotalCents = productItems.reduce((sum, p) => sum + p.price_cents, 0);
    const shippingCents = subtotalCents >= 7500 ? 0 : 699;
    const taxCents = Math.round(subtotalCents * 0.08);
    return {
      store_id: storeId,
      order_number: orderNumber,
      status,
      payment_status: paymentStatus,
      shipping_status: shippingStatus,
      subtotal_cents: subtotalCents,
      shipping_cents: shippingCents,
      tax_cents: taxCents,
      total_cents: subtotalCents + shippingCents + taxCents,
      currency: "usd",
      customer_name: customerName,
      customer_email: customerEmail,
      customer_phone: "+1-415-555-01" + String(index + 10),
      shipping_address: {
        line1: `${100 + index} Market Street`,
        city: "San Francisco",
        state: "CA",
        postal_code: "94105",
        country: "US",
      },
      shipping_carrier: shippingStatus === "pending" ? null : "USPS",
      shipping_service: shippingStatus === "pending" ? null : "Priority",
      tracking_number: shippingStatus === "pending" ? null : `PHHTRK${1000 + index}`,
      tracking_url: shippingStatus === "pending" ? null : `https://tools.usps.com/go/TrackConfirmAction?tLabels=PHHTRK${1000 + index}`,
      stripe_payment_intent_id: `pi_demo_${orderNumber.replace(/-/g, "").toLowerCase()}`,
      shipped_at: ["in_transit", "out_for_delivery", "delivered"].includes(shippingStatus) ? new Date().toISOString() : null,
      delivered_at: shippingStatus === "delivered" ? new Date().toISOString() : null,
    };
  });

  const { error: orderUpsertError } = await supabase.from("orders").upsert(orderRows, { onConflict: "order_number" });
  if (orderUpsertError) throw orderUpsertError;
  const { data: orders, error: orderSelectError } = await supabase
    .from("orders")
    .select("id,order_number,status,payment_status,shipping_status")
    .in(
      "order_number",
      orderTemplates.map((o) => o[0]),
    );
  if (orderSelectError) throw orderSelectError;
  const orderByNumber = Object.fromEntries((orders || []).map((o) => [o.order_number, o.id]));

  const orderIds = Object.values(orderByNumber);
  if (orderIds.length > 0) {
    await supabase.from("order_items").delete().in("order_id", orderIds);
    await supabase.from("order_timeline_events").delete().in("order_id", orderIds);
  }

  const orderItems = [];
  const timelineEvents = [];
  for (const [orderNumber, status, paymentStatus, shippingStatus, customerName, customerEmail, productSlugs] of orderTemplates) {
    const orderId = orderByNumber[orderNumber];
    if (!orderId) continue;
    for (const slug of productSlugs) {
      const product = productBySlug[slug];
      if (!product) continue;
      orderItems.push({
        order_id: orderId,
        product_id: product.id,
        quantity: 1,
        unit_price_cents: product.price_cents,
        sku: null,
        title_snapshot: slug.replace(/-/g, " "),
        image_url: product.images?.[0]?.url || null,
      });
    }
    timelineEvents.push({
      order_id: orderId,
      event_type: "order_created",
      description: `Order ${orderNumber} created for ${customerName} (${customerEmail}).`,
      metadata: { status, payment_status: paymentStatus, shipping_status: shippingStatus },
    });
  }
  const { error: orderItemsError } = await supabase.from("order_items").insert(orderItems);
  if (orderItemsError) throw orderItemsError;
  const { error: timelineError } = await supabase.from("order_timeline_events").insert(timelineEvents);
  if (timelineError) throw timelineError;

  const [storeCount, categoryCount, productCount, contentCount, orderCount, elementsCount] = await Promise.all([
    supabase.from("stores").select("*", { count: "exact", head: true }).then((r) => r.count || 0),
    supabase.from("categories").select("*", { count: "exact", head: true }).then((r) => r.count || 0),
    supabase.from("products").select("*", { count: "exact", head: true }).then((r) => r.count || 0),
    supabase.from("content").select("*", { count: "exact", head: true }).then((r) => r.count || 0),
    supabase.from("orders").select("*", { count: "exact", head: true }).then((r) => r.count || 0),
    supabase.from("five_elements_config").select("*", { count: "exact", head: true }).then((r) => r.count || 0),
  ]);

  console.log(
    JSON.stringify(
      {
        seeded: true,
        store_slug: storeSlug,
        counts: {
          stores: storeCount,
          categories: categoryCount,
          products: productCount,
          content: contentCount,
          orders: orderCount,
          five_elements_config: elementsCount,
        },
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
