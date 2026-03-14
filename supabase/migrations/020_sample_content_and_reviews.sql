-- ============================================================
-- Sample Articles (10) + Product Reviews (10)
-- Uses slug-based lookups so it works regardless of UUID order
-- ============================================================

DO $$
DECLARE
  v_store_id   UUID;
  v_a1  UUID; v_a2  UUID; v_a3  UUID; v_a4  UUID; v_a5  UUID;
  v_a6  UUID; v_a7  UUID; v_a8  UUID; v_a9  UUID; v_a10 UUID;
  v_p_astragalus    UUID;
  v_p_adaptogen     UUID;
  v_p_blood_nourish UUID;
  v_p_calm_mind     UUID;
  v_p_sleep         UUID;
  v_p_digestion     UUID;
  v_p_stress        UUID;
  v_p_immune        UUID;
BEGIN
  -- Resolve store
  SELECT id INTO v_store_id FROM stores WHERE slug = 'pureherbhealth' LIMIT 1;
  IF v_store_id IS NULL THEN
    RAISE NOTICE 'Store pureherbhealth not found — skipping sample content';
    RETURN;
  END IF;

  -- Resolve products by slug (NULL if not found — handled below)
  SELECT id INTO v_p_astragalus    FROM products WHERE slug = 'astragalus-root-extract'     LIMIT 1;
  SELECT id INTO v_p_adaptogen     FROM products WHERE slug = 'adaptogen-performance-blend'  LIMIT 1;
  SELECT id INTO v_p_blood_nourish FROM products WHERE slug = 'blood-nourish-tonic'          LIMIT 1;
  SELECT id INTO v_p_calm_mind     FROM products WHERE slug = 'calm-mind-drops'              LIMIT 1;
  SELECT id INTO v_p_sleep         FROM products WHERE slug ILIKE '%sleep%'                  LIMIT 1;
  SELECT id INTO v_p_digestion     FROM products WHERE slug ILIKE '%digest%'                 LIMIT 1;
  SELECT id INTO v_p_stress        FROM products WHERE slug ILIKE '%stress%'                 LIMIT 1;
  SELECT id INTO v_p_immune        FROM products WHERE slug ILIKE '%immune%'                 LIMIT 1;

  -- Fallback: use any enabled product if specific slugs not found
  IF v_p_astragalus    IS NULL THEN SELECT id INTO v_p_astragalus    FROM products WHERE enabled = TRUE ORDER BY name LIMIT 1; END IF;
  IF v_p_adaptogen     IS NULL THEN SELECT id INTO v_p_adaptogen     FROM products WHERE enabled = TRUE ORDER BY name OFFSET 1 LIMIT 1; END IF;
  IF v_p_blood_nourish IS NULL THEN SELECT id INTO v_p_blood_nourish FROM products WHERE enabled = TRUE ORDER BY name OFFSET 2 LIMIT 1; END IF;
  IF v_p_calm_mind     IS NULL THEN SELECT id INTO v_p_calm_mind     FROM products WHERE enabled = TRUE ORDER BY name OFFSET 3 LIMIT 1; END IF;
  IF v_p_sleep         IS NULL THEN SELECT id INTO v_p_sleep         FROM products WHERE enabled = TRUE ORDER BY name OFFSET 4 LIMIT 1; END IF;
  IF v_p_digestion     IS NULL THEN SELECT id INTO v_p_digestion     FROM products WHERE enabled = TRUE ORDER BY name OFFSET 5 LIMIT 1; END IF;
  IF v_p_stress        IS NULL THEN SELECT id INTO v_p_stress        FROM products WHERE enabled = TRUE ORDER BY name OFFSET 6 LIMIT 1; END IF;
  IF v_p_immune        IS NULL THEN SELECT id INTO v_p_immune        FROM products WHERE enabled = TRUE ORDER BY name OFFSET 7 LIMIT 1; END IF;

  -- ─────────────────────────────────────────────────────────
  -- ARTICLE 1: What Is Wei Qi? Understanding Your Body's Defense Shield
  -- ─────────────────────────────────────────────────────────
  IF NOT EXISTS (SELECT 1 FROM content WHERE slug = 'what-is-wei-qi' AND store_id = v_store_id) THEN
    INSERT INTO content (store_id, type, slug, title, title_zh, body_markdown, body_markdown_zh, status, published_at, meta_title, meta_description)
    VALUES (
      v_store_id, 'article', 'what-is-wei-qi',
      'What Is Wei Qi? Understanding Your Body''s Defense Shield',
      '什么是卫气？了解您的防御之盾',
      E'## What Is Wei Qi?\n\nIn Traditional Chinese Medicine (TCM), **Wei Qi** (卫气, *wèi qì*) is the body''s outermost defensive energy — often translated as "Defensive Qi" or "Protective Qi." Think of it as an invisible shield that circulates just beneath the skin, guarding against external pathogens TCM calls *Wind, Cold, Heat, and Dampness*.\n\n## How Wei Qi Works\n\nWei Qi moves in the superficial layers of the body, flowing along the skin and muscles. Its primary functions are:\n\n- **Protecting** the body from external invaders\n- **Warming** the muscles and skin\n- **Regulating** the opening and closing of pores (sweat regulation)\n- **Nourishing** skin and body hair\n\nHealthy Wei Qi means your pores open to cool you in heat and close to warm you in cold. When Wei Qi is deficient, the pores malfunction — you sweat when you shouldn''t, or stay cold when others are warm.\n\n## Signs of Weak Wei Qi\n\n- Frequent colds and respiratory infections\n- Sensitivity to wind and drafts\n- Excessive spontaneous sweating\n- Slow recovery from illness\n- Pale, dull complexion\n\n## The Root of Wei Qi: The Lungs and Spleen\n\nAccording to TCM theory, the **Lungs** distribute Wei Qi across the body''s surface, while the **Spleen** (digestive system) generates the nutritive Qi that Wei Qi derives from. This is why digestive health directly impacts immunity in TCM — a weak Spleen means less raw material for Wei Qi production.\n\n## Strengthening Wei Qi Naturally\n\n### Herbal Support\nThe most celebrated Wei Qi tonic herb is **Astragalus Root** (*Huang Qi*, 黄芪). Dozens of clinical studies confirm its ability to upregulate immune markers and reduce the incidence of seasonal illness.\n\n### Lifestyle Practices\n- **Regular sleep schedule** — Wei Qi regenerates at night\n- **Warm, cooked foods** — support Spleen Qi, the root of Wei Qi\n- **Qi Gong and Tai Chi** — move Qi through the surface channels\n- **Avoid excessive raw or cold foods** in winter\n\n## The TCM Approach to Immunity\n\nUnlike Western medicine''s "kill the germ" model, TCM focuses on building the host''s resilience. A strong Wei Qi doesn''t just fight infection — it prevents it from taking hold in the first place.\n\n> *"The superior physician treats disease before it arises."*\n> — Huangdi Neijing (Yellow Emperor''s Classic of Medicine)\n\n---\n*These statements have not been evaluated by the FDA. This content is educational and does not constitute medical advice.*',
      E'## 什么是卫气？\n\n在中医理论中，**卫气**是人体最外层的防御之气，被称为"护卫之气"。可以将其理解为循行于皮肤之下的无形屏障，抵御中医所称的风、寒、热、湿等外邪侵袭。\n\n## 卫气的功能\n\n卫气运行于体表肌肤之间，其主要功能包括：\n\n- **防御**外邪侵入\n- **温煦**肌肤与肌肉\n- **调节**汗孔的开合\n- **滋养**皮毛\n\n## 卫气不足的表现\n\n- 反复感冒、呼吸系统感染\n- 对风寒敏感\n- 自汗\n- 病后恢复缓慢\n- 面色苍白暗淡\n\n## 卫气的根本：肺与脾\n\n根据中医理论，**肺**负责将卫气布散至体表，而**脾**（消化系统）则生化营气，为卫气的来源提供原料。这也是为何消化健康在中医中与免疫力直接相关——脾虚则卫气生化不足。\n\n---\n*本内容仅供教育参考，不构成医疗建议。*',
      'published', NOW() - INTERVAL '8 days',
      'What Is Wei Qi? Your Body''s Defense Shield | pureHerbHealth',
      'Learn how Wei Qi (Defensive Qi) protects your body in Traditional Chinese Medicine, and how to strengthen it naturally with Astragalus and TCM lifestyle practices.'
    ) RETURNING id INTO v_a1;
    -- Link to Astragalus product
    IF v_a1 IS NOT NULL AND v_p_astragalus IS NOT NULL THEN
      INSERT INTO content_products (content_id, product_id) VALUES (v_a1, v_p_astragalus) ON CONFLICT DO NOTHING;
    END IF;
  END IF;

  -- ─────────────────────────────────────────────────────────
  -- ARTICLE 2: The 5 Elements of TCM: A Beginner's Guide
  -- ─────────────────────────────────────────────────────────
  IF NOT EXISTS (SELECT 1 FROM content WHERE slug = 'five-elements-beginners-guide' AND store_id = v_store_id) THEN
    INSERT INTO content (store_id, type, slug, title, title_zh, body_markdown, body_markdown_zh, status, published_at, meta_title, meta_description)
    VALUES (
      v_store_id, 'article', 'five-elements-beginners-guide',
      'The Five Elements of TCM: A Beginner''s Complete Guide',
      '中医五行入门完整指南',
      E'## The Five Elements: The Framework Behind TCM\n\nTraditional Chinese Medicine is built on an elegant system of correspondences known as the **Five Elements** (*Wu Xing*, 五行): **Wood, Fire, Earth, Metal, and Water**. Unlike the Western concept of "elements" as physical substances, the TCM Five Elements are dynamic patterns of energy that describe how all phenomena — including the human body — move, interact, and transform.\n\n## Understanding Each Element\n\n### 🌳 Wood (木 Mù)\n- **Season:** Spring\n- **Organs:** Liver & Gallbladder\n- **Emotion:** Anger / Frustration\n- **Quality:** Growth, flexibility, vision\n- **Imbalance signs:** Irritability, tight neck/shoulders, eye problems, irregular menstruation\n\n### 🔥 Fire (火 Huǒ)\n- **Season:** Summer\n- **Organs:** Heart & Small Intestine\n- **Emotion:** Joy / Overexcitement\n- **Quality:** Warmth, connection, clarity\n- **Imbalance signs:** Anxiety, palpitations, insomnia, scattered thinking\n\n### 🌍 Earth (土 Tǔ)\n- **Season:** Late Summer\n- **Organs:** Spleen & Stomach\n- **Emotion:** Worry / Overthinking\n- **Quality:** Nourishment, centering, digestion\n- **Imbalance signs:** Fatigue, bloating, poor appetite, loose stools, brain fog\n\n### 🌬 Metal (金 Jīn)\n- **Season:** Autumn\n- **Organs:** Lung & Large Intestine\n- **Emotion:** Grief / Sadness\n- **Quality:** Clarity, boundaries, letting go\n- **Imbalance signs:** Frequent colds, dry skin, constipation, melancholy\n\n### 💧 Water (水 Shuǐ)\n- **Season:** Winter\n- **Organs:** Kidney & Bladder\n- **Emotion:** Fear / Insecurity\n- **Quality:** Stillness, restoration, willpower\n- **Imbalance signs:** Lower back pain, fatigue, hair loss, hearing issues, low libido\n\n## The Generating and Controlling Cycles\n\nThe Five Elements don''t exist in isolation — they nourish and check each other:\n\n**Generating Cycle (相生):** Wood → Fire → Earth → Metal → Water → Wood\nEach element feeds the next, like a mother nurturing a child.\n\n**Controlling Cycle (相克):** Wood → Earth → Water → Fire → Metal → Wood\nEach element restrains another, preventing any single element from dominating.\n\n## Applying Five Element Theory to Your Health\n\nIdentifying your dominant element can guide dietary, herbal, and lifestyle choices:\n\n| Element | Support Foods | Avoid |\n|---------|--------------|-------|\n| Wood    | Leafy greens, sour foods | Alcohol, greasy foods |\n| Fire    | Bitter greens, red foods | Stimulants, spicy excess |\n| Earth   | Root vegetables, yellow foods | Raw/cold foods, sugar |\n| Metal   | White foods, pungent herbs | Smoking, dairy excess |\n| Water   | Dark foods, salty (moderate) | Cold drinks, overwork |\n\n---\n*These statements have not been evaluated by the FDA. This content is educational only.*',
      E'## 五行：中医理论的基础框架\n\n中医建立在一套优雅的对应体系之上，即**五行**（木、火、土、金、水）。与西方"元素"概念不同，中医五行是描述人体及万物运动、相互作用与转化的动态能量模式。\n\n## 各行的对应关系\n\n### 🌳 木\n- **季节：** 春\n- **脏腑：** 肝与胆\n- **情志：** 怒\n- **失衡表现：** 易怒、颈肩紧张、眼部问题\n\n### 🔥 火\n- **季节：** 夏\n- **脏腑：** 心与小肠\n- **情志：** 喜（过度）\n- **失衡表现：** 焦虑、心悸、失眠\n\n### 🌍 土\n- **季节：** 长夏\n- **脏腑：** 脾与胃\n- **情志：** 思（忧虑）\n- **失衡表现：** 疲劳、腹胀、食欲不振\n\n### 🌬 金\n- **季节：** 秋\n- **脏腑：** 肺与大肠\n- **情志：** 悲\n- **失衡表现：** 反复感冒、皮肤干燥\n\n### 💧 水\n- **季节：** 冬\n- **脏腑：** 肾与膀胱\n- **情志：** 恐\n- **失衡表现：** 腰痛、脱发、听力下降\n\n---\n*本内容仅供教育参考，不构成医疗建议。*',
      'published', NOW() - INTERVAL '15 days',
      'Five Elements of TCM: Complete Beginner''s Guide | pureHerbHealth',
      'Discover the Five Elements of Traditional Chinese Medicine — Wood, Fire, Earth, Metal, Water — and how they map to your organs, emotions, and seasonal health.'
    ) RETURNING id INTO v_a2;
  END IF;

  -- ─────────────────────────────────────────────────────────
  -- ARTICLE 3: Adaptogenic Herbs and Stress
  -- ─────────────────────────────────────────────────────────
  IF NOT EXISTS (SELECT 1 FROM content WHERE slug = 'adaptogenic-herbs-stress-guide' AND store_id = v_store_id) THEN
    INSERT INTO content (store_id, type, slug, title, title_zh, body_markdown, body_markdown_zh, status, published_at, meta_title, meta_description)
    VALUES (
      v_store_id, 'article', 'adaptogenic-herbs-stress-guide',
      'Adaptogenic Herbs: How TCM Has Been Managing Stress for 2,000 Years',
      '适应原草药：中医两千年的抗压之道',
      E'## The Modern Stress Epidemic\n\nChronic stress is one of the defining health challenges of the 21st century. Elevated cortisol, disrupted sleep, immune suppression, and adrenal fatigue are conditions that modern medicine often treats symptom by symptom. Traditional Chinese Medicine, however, has recognized and treated the underlying pattern for millennia.\n\n## What Is an Adaptogen?\n\nThe term "adaptogen" was coined in 1947 by Soviet pharmacologist Nikolai Lazarev, but the concept is ancient. An adaptogen is an herb that:\n\n1. **Increases resistance** to physical, chemical, and biological stressors\n2. **Normalizes** physiological functions regardless of the direction of imbalance\n3. **Is non-toxic** at normal therapeutic doses\n\nIn TCM, these would be classified as **tonic herbs** — substances that build the body''s fundamental reserves.\n\n## The Top TCM Adaptogens\n\n### 人参 Ren Shen (Panax Ginseng)\nThe "king of herbs" — tonifies all five organ systems, dramatically boosts energy and mental clarity. Best for Qi deficiency with fatigue.\n\n### 黄芪 Huang Qi (Astragalus)\nThe premier Wei Qi tonic. Builds immune resilience and sustained energy without the stimulating effect of ginseng. Ideal for long-term daily use.\n\n### 灵芝 Ling Zhi (Reishi Mushroom)\nThe "mushroom of immortality." Calms the mind, supports sleep, and modulates immune response. Powerful for stress-related insomnia.\n\n### 五味子 Wu Wei Zi (Schisandra Berry)\nUnique for containing all five flavors. Protects the liver, calms the nervous system, and is excellent for mental performance under stress.\n\n### 枸杞子 Gou Qi Zi (Goji Berry)\nNourishes Liver and Kidney Yin. Combats the depleting effects of chronic stress on deeper reserves.\n\n## The HPA Axis and TCM Kidney Qi\n\nModern research links chronic stress to HPA (hypothalamic-pituitary-adrenal) axis dysregulation. In TCM, this maps remarkably well to **Kidney Qi deficiency** — the Kidneys store *Jing* (essence), the deepest form of vitality. Overwork, fear, and chronic stress all deplete Kidney Jing.\n\nThis explains why many stressed individuals experience lower back pain, hearing changes, hair loss, and reduced reproductive function — all Kidney domain symptoms.\n\n## Building a Daily Anti-Stress Protocol\n\n**Morning:** Astragalus root tea or capsule — builds day-time Wei Qi\n**Afternoon:** Schisandra berry extract — sustains cognitive performance\n**Evening:** Reishi mushroom — winds down the nervous system\n\n> *"The cure of the part should not be attempted without treatment of the whole."*\n> — Plato, echoing the TCM holistic approach\n\n---\n*Consult a qualified TCM practitioner before starting any herbal protocol.*',
      E'## 现代压力困境\n\n慢性压力是21世纪最普遍的健康挑战之一。皮质醇升高、睡眠紊乱、免疫力下降——这些症状在西医中往往被逐一治疗，而中医几千年来已认识到其背后的整体规律。\n\n## 什么是适应原？\n\n适应原草药具有以下特点：\n1. 增强对各类压力的抵抗力\n2. 使生理功能趋向平衡\n3. 在正常剂量下无毒副作用\n\n## 主要适应原草药\n\n### 人参\n补益五脏，大补元气，适合气虚乏力者。\n\n### 黄芪\n固表止汗，益气升阳，是卫气调理的首选药物。\n\n### 灵芝\n安神定志，扶正固本，适合因压力导致的失眠。\n\n### 五味子\n收敛固涩，宁心安神，改善压力下的认知表现。\n\n---\n*请在开始任何草药方案前咨询合格的中医师。*',
      'published', NOW() - INTERVAL '22 days',
      'Adaptogenic Herbs for Stress: TCM''s 2,000-Year Solution | pureHerbHealth',
      'Explore how TCM adaptogenic herbs like Astragalus, Reishi, and Schisandra help your body manage stress, balance cortisol, and build lasting resilience.'
    ) RETURNING id INTO v_a3;
    IF v_a3 IS NOT NULL AND v_p_adaptogen IS NOT NULL THEN
      INSERT INTO content_products (content_id, product_id) VALUES (v_a3, v_p_adaptogen) ON CONFLICT DO NOTHING;
    END IF;
    IF v_a3 IS NOT NULL AND v_p_astragalus IS NOT NULL THEN
      INSERT INTO content_products (content_id, product_id) VALUES (v_a3, v_p_astragalus) ON CONFLICT DO NOTHING;
    END IF;
  END IF;

  -- ─────────────────────────────────────────────────────────
  -- ARTICLE 4: TCM Guide to Better Sleep
  -- ─────────────────────────────────────────────────────────
  IF NOT EXISTS (SELECT 1 FROM content WHERE slug = 'tcm-guide-better-sleep' AND store_id = v_store_id) THEN
    INSERT INTO content (store_id, type, slug, title, title_zh, body_markdown, body_markdown_zh, status, published_at, meta_title, meta_description)
    VALUES (
      v_store_id, 'article', 'tcm-guide-better-sleep',
      'The TCM Guide to Better Sleep: Why You Wake at 3am (and What to Do)',
      '中医睡眠指南：为何凌晨三点醒来，如何改善',
      E'## Sleep Through the TCM Lens\n\nIn TCM, sleep is governed by the balance of **Yin and Yang**. Daytime activity is Yang; nighttime rest is Yin. Quality sleep requires Yin to be sufficient to anchor the restless Yang-natured spirit (*Shen*) that resides in the Heart.\n\nWhen Yin is deficient — from overwork, stress, excessive stimulation, or aging — the Shen floats upward at night, causing insomnia, vivid dreams, and waking in the early hours.\n\n## The Organ Clock: Why You Wake at 3am\n\nTCM maps each organ to a 2-hour peak time in the 24-hour cycle. Waking consistently at a particular time often indicates an imbalance in that organ''s meridian:\n\n| Time      | Organ          | Common Cause of Waking |\n|-----------|----------------|------------------------|\n| 11pm–1am  | Gallbladder     | Decision fatigue, resentment |\n| 1am–3am   | Liver           | Anger, alcohol, Blood deficiency |\n| 3am–5am   | Lung            | Grief, unprocessed sadness |\n| 5am–7am   | Large Intestine | Holding on, constipation |\n\nThe classic **3am wake-up** is the most common complaint — pointing to **Liver Blood deficiency** or **Liver Qi stagnation**. This is especially common in women, people who overwork, or those with high stress.\n\n## TCM Patterns of Insomnia\n\n### Heart-Kidney Disharmony\nAnxiety, palpitations, vivid dreams, hot palms/feet at night. The Fire of the Heart fails to descend and harmonize with the Water of the Kidneys.\n\n### Liver Blood Deficiency\nDifficulty falling asleep, waking between 1–3am, anxiety, eye strain. Common in women, especially after menstruation.\n\n### Spleen Qi Deficiency\nExcessive dreaming, heavy sleep but not refreshing, waking unrestored. Overthinking disrupts Spleen, which fails to transport Qi upward to the Heart.\n\n### Stomach Disharmony\nDifficulty settling, vivid dreams about eating or being chased. "Restless Stomach disturbs the Heart."\n\n## Herbal Sleep Protocols\n\n**Suan Zao Ren Tang** (Sour Jujube Decoction) — the classical formula for Liver Blood deficiency insomnia. Contains *Suan Zao Ren* (jujube seed), *Fu Ling* (poria), *Zhi Mu*, *Chuan Xiong*, and *Gan Cao*.\n\n**Tian Wang Bu Xin Dan** — for Heart-Kidney disharmony with night sweats, anxiety, and dryness.\n\n## Evening Lifestyle Practices\n\n1. **Dim lights** after 8pm — stimulates melatonin production\n2. **Warm foot soak** with salt or ginger for 15 minutes — draws Yang energy downward\n3. **Avoid screens** 1 hour before bed\n4. **Eat earlier** — a busy Stomach at night disturbs the Heart\n5. **Gentle stretching** of the inner leg (Liver meridian) before sleep\n\n---\n*Persistent sleep disorders should be evaluated by a healthcare professional.*',
      E'## 中医视角下的睡眠\n\n中医认为，睡眠由阴阳平衡所主导。白天为阳，夜晚为阴。优质睡眠需要充足的阴气来敛藏居于心中的神。\n\n当阴虚时——由于过度劳累、压力或衰老——神无法安定，导致失眠、多梦，以及凌晨早醒。\n\n## 子午流注：为何凌晨三点醒来\n\n| 时间      | 对应脏腑       | 醒来的常见原因 |\n|-----------|----------------|---------------|\n| 23–1时    | 胆              | 决策疲劳、郁怒 |\n| 1–3时     | 肝              | 怒气、饮酒、血虚 |\n| 3–5时     | 肺              | 悲伤、情绪未消化 |\n| 5–7时     | 大肠            | 执着、便秘 |\n\n凌晨三点醒来最为常见，通常指向**肝血不足**或**肝气郁结**。\n\n## 改善睡眠的生活建议\n\n1. 晚八点后调暗灯光\n2. 睡前用温水泡脚15分钟，引阳下行\n3. 睡前一小时避免使用电子设备\n4. 早晚饭，避免睡前进食\n\n---\n*持续性睡眠障碍请寻求专业医疗评估。*',
      'published', NOW() - INTERVAL '30 days',
      'TCM Guide to Better Sleep: Why You Wake at 3am | pureHerbHealth',
      'Discover why you wake at 3am according to TCM''s organ clock, and learn herbal and lifestyle solutions for each insomnia pattern including Liver Blood deficiency.'
    ) RETURNING id INTO v_a4;
    IF v_a4 IS NOT NULL AND v_p_sleep IS NOT NULL THEN
      INSERT INTO content_products (content_id, product_id) VALUES (v_a4, v_p_sleep) ON CONFLICT DO NOTHING;
    END IF;
    IF v_a4 IS NOT NULL AND v_p_calm_mind IS NOT NULL THEN
      INSERT INTO content_products (content_id, product_id) VALUES (v_a4, v_p_calm_mind) ON CONFLICT DO NOTHING;
    END IF;
  END IF;

  -- ─────────────────────────────────────────────────────────
  -- ARTICLE 5: Spleen Qi — The Engine of Digestion and Energy
  -- ─────────────────────────────────────────────────────────
  IF NOT EXISTS (SELECT 1 FROM content WHERE slug = 'spleen-qi-digestion-energy' AND store_id = v_store_id) THEN
    INSERT INTO content (store_id, type, slug, title, title_zh, body_markdown, body_markdown_zh, status, published_at, meta_title, meta_description)
    VALUES (
      v_store_id, 'article', 'spleen-qi-digestion-energy',
      'Spleen Qi: The TCM Engine Behind Digestion, Energy, and Mental Clarity',
      '脾气：消化、精力与思维清晰的中医核心',
      E'## The TCM Spleen Is Not Your Anatomical Spleen\n\nThis is one of the first things to clarify: in TCM, the **Spleen** (*Pí*, 脾) is an energetic organ system that encompasses your entire digestive and metabolic function — including what Western medicine attributes to the pancreas, small intestine, and lymph system.\n\nThe TCM Spleen is the **central pivot of your health**. It transforms food and drink into Qi and Blood, then transports that nourishment to every cell in the body.\n\n## Core Functions of Spleen Qi\n\n1. **Transformation** — converting food into usable energy (Gu Qi)\n2. **Transportation** — distributing Qi and nutrients throughout the body\n3. **Holding** — keeping organs in place (prolapse indicates Spleen Qi deficiency)\n4. **Governing Blood** — holding blood within the vessels\n5. **Opening to the mouth** — governing taste and appetite\n6. **Housing thought** (Yi) — responsible for thinking, studying, and memory\n\n## Signs Your Spleen Qi Is Deficient\n\n**Digestive signs:**\n- Bloating after meals\n- Loose or unformed stools\n- Poor appetite, no sense of hunger\n- Undigested food in stool\n- Fatigue directly after eating\n\n**Systemic signs:**\n- Chronic fatigue and heaviness\n- Brain fog, poor concentration\n- Easy bruising\n- Pale lips and complexion\n- Tendency toward worry and overthinking\n\n**Advanced (Spleen Yang Deficiency):**\n- Cold abdomen, cold limbs\n- Watery, frequent loose stools\n- Swelling in extremities\n\n## The #1 Enemy of Spleen Qi: Cold and Raw Foods\n\nThe Spleen functions like a pilot light — it needs warmth to transform food. Cold drinks, raw salads, green smoothies, and ice cream tax this "pilot light" enormously. TCM practitioners often see dramatic digestive improvement when patients simply switch from cold to room-temperature or warm liquids.\n\n## Healing the Spleen Through Diet\n\n**Most supportive:**\n- Warm, cooked grains (congee, oatmeal, rice)\n- Root vegetables (sweet potato, carrot, squash)\n- Mildly sweet foods (dates, pumpkin, corn)\n- Ginger tea (warms the middle)\n- Small, frequent meals\n\n**Most damaging:**\n- Iced drinks\n- Raw salads in excess\n- Dairy (creates Dampness)\n- Sugar and processed foods\n- Eating while stressed or distracted\n\n## Key Spleen Tonic Herbs\n\n- **Huang Qi** (Astragalus) — Tonifies Spleen and Lung Qi\n- **Ren Shen** (Ginseng) — Powerfully tonifies Spleen Qi\n- **Bai Zhu** (White Atractylodes) — Dries Dampness, strengthens Spleen\n- **Fu Ling** (Poria) — Calms Shen, drains Dampness\n- **Shan Yao** (Chinese Yam) — Gently tonifies Spleen and Kidney\n\nThe classical formula **Si Jun Zi Tang** (Four Gentlemen Decoction) combines Ren Shen, Bai Zhu, Fu Ling, and Gan Cao — the foundational Spleen Qi tonic prescription.\n\n---\n*Please consult a qualified TCM practitioner for personalized guidance.*',
      E'## 中医的"脾"与解剖学不同\n\n首先要明确：中医的**脾**是一个功能性器官系统，涵盖整个消化和代谢功能。\n\n脾是健康的中枢轴。它将饮食转化为气血，再输布至全身。\n\n## 脾气的核心功能\n\n1. **运化**——将食物转化为可利用的能量\n2. **升清**——将精微物质输布全身\n3. **统血**——使血液循行于脉内\n4. **主思**——负责思维与记忆\n\n## 脾气虚的表现\n\n- 餐后腹胀\n- 大便溏薄\n- 食欲不振\n- 慢性疲劳\n- 思维迟钝\n\n---\n*请咨询合格中医师以获得个性化指导。*',
      'published', NOW() - INTERVAL '45 days',
      'Spleen Qi in TCM: Digestion, Energy & Mental Clarity | pureHerbHealth',
      'Learn how Spleen Qi governs digestion, energy, and thinking in Traditional Chinese Medicine — including the foods and herbs that strengthen or weaken it.'
    ) RETURNING id INTO v_a5;
    IF v_a5 IS NOT NULL AND v_p_digestion IS NOT NULL THEN
      INSERT INTO content_products (content_id, product_id) VALUES (v_a5, v_p_digestion) ON CONFLICT DO NOTHING;
    END IF;
  END IF;

  -- ─────────────────────────────────────────────────────────
  -- ARTICLE 6: Blood Deficiency in Women
  -- ─────────────────────────────────────────────────────────
  IF NOT EXISTS (SELECT 1 FROM content WHERE slug = 'blood-deficiency-women-tcm' AND store_id = v_store_id) THEN
    INSERT INTO content (store_id, type, slug, title, title_zh, body_markdown, body_markdown_zh, status, published_at, meta_title, meta_description)
    VALUES (
      v_store_id, 'article', 'blood-deficiency-women-tcm',
      'Blood Deficiency in Women: TCM''s Most Common Overlooked Pattern',
      '女性血虚：中医最常被忽视的体质类型',
      E'## The Most Widespread Imbalance You''ve Never Heard Of\n\nIf you''re a woman who experiences any combination of the following — fatigue, poor sleep, anxiety, irregular periods, pale complexion, dry skin, or hair thinning — there''s a high probability that Traditional Chinese Medicine would diagnose you with **Blood Deficiency** (*Xue Xu*, 血虚).\n\nThis isn''t necessarily low hemoglobin in the Western sense (though sometimes there''s overlap). TCM Blood (*Xue*) is a denser, more nutritive form of energy that:\n\n- **Nourishes** tissues, organs, and especially the nervous system\n- **Anchors** the Shen (spirit/mind) at night, enabling restful sleep\n- **Moistens** the eyes, joints, skin, and hair\n- **Regulates** the menstrual cycle\n\n## Why Women Are More Vulnerable\n\nMenstruation represents a regular expenditure of Blood. Without consistent replenishment, monthly blood loss gradually depletes the body''s reserves. Pregnancy and breastfeeding further deplete Blood and Essence. Combined with modern stressors — overwork, undereating, poor sleep — Blood deficiency becomes very common.\n\n## Recognizing Blood Deficiency\n\n**Physical signs:**\n- Pale or sallow face, lips, and tongue\n- Brittle nails, hair loss or thinning\n- Dry skin, eyes, and scalp\n- Muscle cramps and twitches (Blood fails to nourish tendons)\n- Dizziness on standing\n\n**Sleep/mental signs:**\n- Difficulty falling asleep\n- Vivid dreams, waking 1–3am\n- Mild anxiety or "heart palpitations" at rest\n- Poor memory, difficulty concentrating\n\n**Menstrual signs:**\n- Light, scanty periods\n- Pale menstrual blood\n- Delayed cycle (longer than 30 days)\n- Spotting rather than flow\n\n## Building Blood Through Diet\n\nFoods that nourish Blood in TCM:\n\n- **Red and dark-colored foods:** beets, dark cherries, red dates (*Hong Zao*)\n- **Animal proteins:** especially liver, red meat (in moderation), eggs\n- **Dark leafy greens:** spinach, kale, nettles\n- **Cooked black sesame seeds** — classic Blood tonic\n- **Longan fruit** (*Long Yan Rou*) — directly nourishes Heart Blood\n\n## Key Blood-Nourishing Herbs\n\n- **Dang Gui** (Angelica Sinensis) — the queen herb for female Blood disorders\n- **Shu Di Huang** (Rehmannia) — deeply nourishes Blood and Essence\n- **Bai Shao** (White Peony) — nourishes Blood, softens the Liver\n- **He Shou Wu** (Fo-Ti) — rebuilds Liver and Kidney, restores hair\n\nThe formula **Si Wu Tang** (Four Substance Decoction) is the foundational Blood tonic — Dang Gui, Shu Di Huang, Bai Shao, and Chuan Xiong.\n\n---\n*Individual patterns vary. Consult a TCM practitioner for a personalized diagnosis.*',
      E'## 最普遍却被忽视的失衡\n\n如果您是一位经历疲劳、睡眠不佳、焦虑、月经不调、面色苍白或脱发的女性，中医很可能会诊断您为**血虚**。\n\n## 为何女性更易血虚\n\n月经是气血的定期消耗。若不能持续补充，每月失血会逐渐耗竭气血储备。结合现代生活压力，血虚在女性中极为常见。\n\n## 血虚的表现\n\n- 面色苍白或萎黄，唇舌色淡\n- 指甲脆弱，脱发\n- 皮肤、眼睛干燥\n- 入睡困难，多梦，凌晨1-3点醒来\n- 月经量少、色淡，周期推迟\n\n---\n*个体体质有所差异，请咨询中医师获得个性化诊断。*',
      'published', NOW() - INTERVAL '12 days',
      'Blood Deficiency in Women: TCM Signs & Solutions | pureHerbHealth',
      'Understand Blood Deficiency — TCM''s most overlooked pattern in women. Learn the signs, dietary solutions, and key herbs like Dang Gui and Rehmannia.'
    ) RETURNING id INTO v_a6;
    IF v_a6 IS NOT NULL AND v_p_blood_nourish IS NOT NULL THEN
      INSERT INTO content_products (content_id, product_id) VALUES (v_a6, v_p_blood_nourish) ON CONFLICT DO NOTHING;
    END IF;
  END IF;

  -- ─────────────────────────────────────────────────────────
  -- ARTICLE 7: Seasonal Eating in TCM
  -- ─────────────────────────────────────────────────────────
  IF NOT EXISTS (SELECT 1 FROM content WHERE slug = 'seasonal-eating-tcm-guide' AND store_id = v_store_id) THEN
    INSERT INTO content (store_id, type, slug, title, title_zh, body_markdown, body_markdown_zh, status, published_at, meta_title, meta_description)
    VALUES (
      v_store_id, 'article', 'seasonal-eating-tcm-guide',
      'Eating With the Seasons: The Ancient TCM Blueprint for Year-Round Vitality',
      '顺应四季饮食：中医全年活力的古老蓝图',
      E'## Why Seasonal Eating Matters in TCM\n\nIn TCM, humans are seen as a microcosm of nature. The same energetic forces that govern the seasons — contraction, expansion, warmth, cold — also govern your physiology. Eating in alignment with the season is not just a dietary philosophy; it''s a fundamental health practice.\n\n## Spring (Wood Element): Cleanse and Grow\n\n**Energy:** Upward and outward movement, like a sprouting seed\n**Focus:** Liver and Gallbladder detoxification, free flow of Qi\n\n**Foods to emphasize:**\n- Young, tender greens: sprouts, dandelion, watercress, asparagus\n- Lightly cooked or raw (the only season where some raw is beneficial)\n- Sour and slightly bitter flavors\n- Small amounts of vinegar to aid Liver function\n\n**Foods to reduce:** Heavy, fatty, fried foods that burden the Liver\n\n**Herbs:** Milk thistle, dandelion root, bupleurum (Chai Hu)\n\n## Summer (Fire Element): Nourish and Cool\n\n**Energy:** Full expansion, outward expression, peak Yang\n**Focus:** Heart and Small Intestine; cooling without depleting\n\n**Foods to emphasize:**\n- Cooling vegetables: cucumber, bitter melon, zucchini\n- Light proteins: fish, tofu, mung beans\n- Bitter flavors (in moderation) — cool the Heart\n- Chrysanthemum tea, mint, watermelon\n\n**Caution:** Avoid excessive iced beverages even in summer — they shock the Spleen\n\n## Late Summer (Earth Element): Ground and Digest\n\n**Energy:** Center, stability, nourishment\n**Focus:** Spleen and Stomach; building Blood and Qi for autumn\n\n**Foods to emphasize:**\n- Yellow and orange foods: sweet potato, squash, corn, millet\n- Congee (rice porridge) — the ultimate Spleen food\n- Mildly sweet flavors\n- Moderate portions eaten slowly\n\n## Autumn (Metal Element): Consolidate and Moisten\n\n**Energy:** Inward contraction; letting go\n**Focus:** Lung and Large Intestine; protecting against dryness\n\n**Foods to emphasize:**\n- White and pungent foods: daikon, garlic, onion, pear\n- Moistening foods: pear soup, white fungus, lotus root, sesame\n- Reduce cold and raw; emphasize cooked and warming\n\n**Herbs:** Astragalus (Wei Qi builder for cold season ahead), Lily Bulb (Bai He)\n\n## Winter (Water Element): Store and Restore\n\n**Energy:** Deep inward storage; conservation\n**Focus:** Kidney and Bladder; preserving Jing (essence)\n\n**Foods to emphasize:**\n- Dark, warming foods: black beans, black sesame, walnuts, lamb\n- Bone broths and slow-cooked stews\n- Mildly salty (supports Kidney) — but not excessive\n- Warming spices: cinnamon, cardamom, dried ginger\n\n**Key principle:** Sleep longer in winter; conserve energy\n\n---\n*These are general principles. Individual constitution should guide personalized dietary choices.*',
      E'## 为何顺应四季饮食如此重要\n\n中医认为人体是自然的缩影。与四季相应的饮食不仅是一种哲学，更是基本的健康实践。\n\n### 春季：疏肝解郁\n嫩绿蔬菜、酸味食物，清淡烹饪\n\n### 夏季：清心消暑\n清凉蔬菜、菊花茶，避免过度冰冷饮品\n\n### 长夏：健脾养胃\n小米、南瓜、粥，平和甘甜之味\n\n### 秋季：润肺防燥\n梨、银耳、莲藕，温热烹饪\n\n### 冬季：补肾藏精\n黑豆、核桃、骨汤，温补收藏\n\n---\n*这些为一般原则，个人体质不同，请咨询中医师获得个性化建议。*',
      'published', NOW() - INTERVAL '5 days',
      'Seasonal Eating in TCM: Year-Round Vitality Guide | pureHerbHealth',
      'Learn TCM''s ancient seasonal eating principles for Spring, Summer, Autumn, and Winter — including the best foods and herbs for each season''s energetic needs.'
    ) RETURNING id INTO v_a7;
  END IF;

  -- ─────────────────────────────────────────────────────────
  -- ARTICLE 8: Qi Stagnation — The Root of Stress and Pain
  -- ─────────────────────────────────────────────────────────
  IF NOT EXISTS (SELECT 1 FROM content WHERE slug = 'qi-stagnation-stress-pain' AND store_id = v_store_id) THEN
    INSERT INTO content (store_id, type, slug, title, title_zh, body_markdown, body_markdown_zh, status, published_at, meta_title, meta_description)
    VALUES (
      v_store_id, 'article', 'qi-stagnation-stress-pain',
      'Qi Stagnation: The TCM Root Cause of Stress, Tension, and Chronic Pain',
      '气滞：压力、紧张与慢性疼痛的中医根源',
      E'## "Where There Is Flow, There Is No Pain"\n\n*Tōng zé bù tòng, tòng zé bù tōng* (通则不痛，痛则不通) — this ancient TCM axiom translates to "free flow = no pain; obstruction = pain." It is perhaps the single most important principle in understanding pain and disease from a TCM perspective.\n\n**Qi Stagnation** is the most common pattern in modern clinical practice. When the smooth, continuous circulation of Qi through the body''s meridian network becomes impeded, stagnation develops.\n\n## What Causes Qi Stagnation?\n\n- **Emotional suppression** — unexpressed anger, grief, or frustration\n- **Chronic stress** — the Liver, responsible for smooth Qi flow, bears the brunt of stress\n- **Sedentary lifestyle** — physical movement is essential for Qi circulation\n- **Irregular eating habits** — skipping meals or eating at desks disrupts Spleen function\n- **Overwork** — depletes Yin, causing Yang Qi to stagnate without its counterbalance\n\n## Signs of Qi Stagnation\n\n**Physical:**\n- Moving, wandering pain that shifts location\n- Chest tightness, difficulty taking a deep breath\n- Abdominal bloating (especially flank area)\n- Sighing frequently (the body''s attempt to move Qi)\n- PMS — breast tenderness, irritability before menstruation\n- Neck and shoulder tension\n\n**Emotional:**\n- Irritability, frustration, impatience\n- Feeling "stuck" in life circumstances\n- Mood fluctuations\n- Depression that fluctuates with circumstances (vs. constitutional depression)\n\n**Digestive:**\n- Bloating and gas, worse with stress\n- Alternating constipation and loose stools (IBS pattern)\n\n## The Liver''s Role\n\nIn TCM, the **Liver** (*Gan*, 肝) is the organ responsible for the *smooth flow of Qi* throughout the body. When emotional stress, overwork, or suppressed feelings accumulate, Liver Qi stagnates — creating the cascade of symptoms above.\n\nThe Liver also stores Blood. When Qi stagnates long enough, Blood stagnation follows, leading to more fixed, stabbing pains and chronic conditions.\n\n## Moving Qi: Therapeutic Approaches\n\n### Herbal\n- **Chai Hu** (Bupleurum) — the primary Liver Qi mover\n- **Xiang Fu** (Cyperus) — moves Qi, relieves pain, regulates menstruation\n- **Chuan Lian Zi** (Sichuan Pagoda Tree) — calms Liver, moves Qi downward\n\nClassic formula: **Chai Hu Shu Gan San** (Bupleurum Liver-Soothing Powder)\n\n### Physical\n- **Regular aerobic exercise** — even 20 minutes of brisk walking significantly moves Qi\n- **Acupuncture** — directly stimulates Qi flow in targeted meridians\n- **Deep breathing** and sighing (yes, it''s therapeutic)\n\n### Lifestyle\n- **Express emotions** — journaling, creative arts, therapy\n- **Regular meal times** — especially breakfast\n- **Limit alcohol** — short-term Qi mover, long-term Liver damager\n\n---\n*Chronic pain should always be evaluated by a healthcare professional.*',
      E'## 通则不痛，痛则不通\n\n气滞是现代临床中最常见的证型。当气在经络中的运行受阻，便会产生气滞。\n\n## 气滞的原因\n\n- 情志压抑——怒、悲、郁闷等未宣泄的情绪\n- 慢性压力——肝主疏泄，承受压力最多\n- 久坐少动\n- 饮食不规律\n\n## 气滞的表现\n\n- 游走性疼痛\n- 胸闷气短\n- 腹胀，尤其是两肋部位\n- 善太息（叹气）\n- 经前乳房胀痛、烦躁\n- 颈肩紧张\n\n---\n*慢性疼痛应由专业医疗人员进行评估。*',
      'published', NOW() - INTERVAL '18 days',
      'Qi Stagnation: TCM Root Cause of Stress and Pain | pureHerbHealth',
      'Discover how Qi stagnation — the most common TCM pattern — causes stress, tension, bloating, and chronic pain, and how to restore free flow naturally.'
    ) RETURNING id INTO v_a8;
    IF v_a8 IS NOT NULL AND v_p_stress IS NOT NULL THEN
      INSERT INTO content_products (content_id, product_id) VALUES (v_a8, v_p_stress) ON CONFLICT DO NOTHING;
    END IF;
  END IF;

  -- ─────────────────────────────────────────────────────────
  -- ARTICLE 9: Kidney Jing — Your Life Force Savings Account
  -- ─────────────────────────────────────────────────────────
  IF NOT EXISTS (SELECT 1 FROM content WHERE slug = 'kidney-jing-life-essence-tcm' AND store_id = v_store_id) THEN
    INSERT INTO content (store_id, type, slug, title, title_zh, body_markdown, body_markdown_zh, status, published_at, meta_title, meta_description)
    VALUES (
      v_store_id, 'article', 'kidney-jing-life-essence-tcm',
      'Kidney Jing: Your Life Force Savings Account in TCM',
      '肾精：中医中的生命储备账户',
      E'## The Concept of Jing\n\nIn the hierarchy of vital substances in TCM, **Jing** (精, *essence*) sits at the top. It is the most fundamental, densest, and most precious substance in the body — the biological substrate of life itself.\n\nJing is stored primarily in the **Kidneys**, though it circulates throughout the body. It represents:\n\n- Your constitutional inheritance — the Jing received from your parents at conception (**Pre-Heaven Jing**)\n- The essence distilled from food and air throughout your life (**Post-Heaven Jing**)\n\nThink of Jing as your **life force savings account**. Pre-Heaven Jing is the principal deposit you cannot replace. Post-Heaven Jing is the interest — earned through healthy living and spent through daily activity.\n\n## Jing and the Stages of Life\n\nThe *Huangdi Neijing* describes human development in 7-year (female) and 8-year (male) cycles, each governed by Kidney Jing:\n\n- **Age 7/8:** Teeth change, hair grows — Kidney Qi fills\n- **Age 14/16:** Menstruation/reproductive maturity — Jing peaks\n- **Age 35/40:** Physiological decline begins — facial changes, energy shifts\n- **Age 49/64:** Reproductive capacity wanes — Jing heavily spent\n\nThis isn''t destiny — it''s a map. Consciously conserving and supplementing Jing can significantly slow this decline.\n\n## Signs of Kidney Jing Deficiency\n\n- Premature aging, gray hair before 40\n- Poor memory and cognitive decline\n- Weakened bones and teeth\n- Developmental issues in children\n- Infertility or reduced reproductive vitality\n- Tinnitus (ringing in the ears)\n- Lower back and knee weakness\n- Sexual dysfunction\n\n## The Great Jing Depleter: Chronic Stress\n\nEvery time you run on cortisol to meet a deadline, stay up past midnight, push through illness, or operate in chronic sympathetic nervous system overdrive — you are burning Jing. The body dips into its savings when its current reserves are exhausted.\n\n## Protecting and Supplementing Jing\n\n### Lifestyle\n- **Adequate sleep** — Jing replenishes at night, especially midnight to 4am\n- **Moderate sexual activity** — Jing is metabolically expensive\n- **Meditation and stillness** — quiets the Kidney''s enemy: fear\n- **Avoid overwork** — work with intensity, rest with equal intensity\n\n### Food\n- Bone marrow broths\n- Black sesame seeds, walnuts, kidney beans\n- Wild-caught salmon and sardines\n- Organic eggs\n- Dark berries and goji berries\n\n### Key Jing-Building Herbs\n- **He Shou Wu** (Fo-Ti) — the premier hair-restoring, Jing-building herb\n- **Lu Rong** (Deer Antler Velvet) — warms Kidney Yang, replenishes Essence\n- **Gou Qi Zi** (Goji Berry) — nourishes Yin and Blood, brightens eyes\n- **Nu Zhen Zi** (Privet Berry) — cool Jing tonic for Yin deficiency\n\n---\n*These are general educational principles. Consult a TCM practitioner for personalized care.*',
      E'## 精的概念\n\n在中医生命物质的层级中，**精**居于最高位。它是人体最根本、最珍贵的物质——生命本身的生物基础。\n\n精主要储存于**肾**中，主要分为先天之精与后天之精。\n\n**先天之精**：父母给予的遗传禀赋，无法再生\n**后天之精**：通过健康生活从饮食与呼吸中提炼，可以补充\n\n## 肾精亏虚的表现\n\n- 早衰，四十岁前出现白发\n- 记忆力减退\n- 骨骼与牙齿脆弱\n- 耳鸣\n- 腰膝酸软\n- 性功能减退\n\n---\n*这些为一般教育原则，请咨询中医师获得个性化指导。*',
      'published', NOW() - INTERVAL '35 days',
      'Kidney Jing in TCM: Your Life Force Savings Account | pureHerbHealth',
      'Understand Kidney Jing — TCM''s concept of life essence — how it''s depleted by stress and aging, and how to preserve it with diet, lifestyle, and tonic herbs.'
    ) RETURNING id INTO v_a9;
  END IF;

  -- ─────────────────────────────────────────────────────────
  -- ARTICLE 10: TCM vs. Western Medicine — Complementary Approaches
  -- ─────────────────────────────────────────────────────────
  IF NOT EXISTS (SELECT 1 FROM content WHERE slug = 'tcm-western-medicine-complementary' AND store_id = v_store_id) THEN
    INSERT INTO content (store_id, type, slug, title, title_zh, body_markdown, body_markdown_zh, status, published_at, meta_title, meta_description)
    VALUES (
      v_store_id, 'article', 'tcm-western-medicine-complementary',
      'TCM and Western Medicine: Why They''re Better Together',
      '中医与西医：为何两者相辅相成',
      E'## Two Medicines, One Patient\n\nThe debate of "TCM vs. Western medicine" is largely a false dichotomy. In China''s integrated hospital system — and increasingly in integrative clinics worldwide — both systems operate side by side, each doing what it does best.\n\nUnderstanding their complementary strengths helps you make more informed healthcare decisions.\n\n## What Western Medicine Does Best\n\n- **Acute emergency care:** trauma, surgery, acute infection, heart attacks\n- **Diagnostic precision:** imaging, labs, biopsies, genetic testing\n- **Pharmaceutical intervention:** antibiotics, antivirals, cancer chemotherapy\n- **Structural repair:** joint replacement, reconstructive surgery\n\n## What TCM Does Best\n\n- **Chronic condition management:** digestive disorders, autoimmune patterns, hormonal imbalances\n- **Prevention and optimization:** building resilience before disease arises\n- **Functional symptoms:** fatigue, insomnia, anxiety, pain without clear structural cause\n- **Side effect mitigation:** supporting the body during and after chemotherapy\n- **Holistic assessment:** treating the person, not just the diagnosis\n\n## Where the Two Systems Diverge (and Why That''s OK)\n\nWestern medicine asks: *"What pathogen or malfunction is causing this?"*\nTCM asks: *"What is this person''s overall pattern of imbalance?"*\n\nThese are genuinely different questions — and both are worth asking. A patient with chronic fatigue might receive a clean bill of health in Western medicine (no detectable pathology) yet present clearly as Spleen and Kidney Qi deficiency in TCM. Both assessments are valid; together they''re more complete.\n\n## Evidence-Based TCM\n\nThe scientific literature on TCM herbs is growing rapidly:\n\n- **Astragalus (Huang Qi):** 200+ clinical studies on immune modulation\n- **Berberine** (from Huang Lian): comparable to Metformin in blood sugar management in several trials\n- **Artemisinin** (from Qing Hao): Nobel Prize-winning antimalarial derived from a TCM herb\n- **Acupuncture:** endorsed by the WHO for 43 conditions; documented neurological mechanisms\n\n## Practical Integration for Patients\n\n1. **For chronic conditions:** Consider TCM as a primary approach or adjunct\n2. **For acute illness:** Use Western medicine; add TCM for recovery\n3. **For prevention:** TCM seasonal protocols, diet, and herbs are excellent\n4. **Always disclose:** Tell both your MD and TCM practitioner about ALL treatments\n5. **Herb-drug interactions:** Some herbs (e.g., St. John''s Wort, Dan Shen) interact with pharmaceuticals\n\n## The Patient''s Advantage\n\nHaving access to both systems means you have more tools. The goal isn''t to choose a side — it''s to get well.\n\n> *"Medicine is a science of uncertainty and an art of probability."*\n> — Sir William Osler\n\n---\n*This content is educational. Always consult qualified practitioners for medical decisions.*',
      E'## 两种医学，同一个患者\n\n"中医与西医"的争论在很大程度上是一个虚假的二元对立。在中国的综合医院体系——以及全球越来越多的整合医学诊所中——两种体系并驾齐驱，各展所长。\n\n## 西医的优势\n\n- 急救与手术\n- 精确诊断：影像、化验、活检\n- 抗生素、抗病毒药物、化疗\n\n## 中医的优势\n\n- 慢性病管理\n- 预防与体质调理\n- 功能性症状\n- 减轻化疗副作用\n- 整体评估\n\n## 循证中医\n\n- **黄芪：** 200余项免疫调节临床研究\n- **小檗碱（黄连）：** 多项试验显示其降糖效果与二甲双胍相当\n- **青蒿素：** 来自青蒿，获诺贝尔奖的抗疟药物\n- **针灸：** 世卫组织认可43种适应症\n\n---\n*本内容仅供教育参考。医疗决策请咨询合格的专业人员。*',
      'published', NOW() - INTERVAL '3 days',
      'TCM and Western Medicine: Why They Work Better Together | pureHerbHealth',
      'Explore how Traditional Chinese Medicine and Western medicine complement each other — their unique strengths, evidence-based integration, and practical guidance for patients.'
    ) RETURNING id INTO v_a10;
    IF v_a10 IS NOT NULL AND v_p_astragalus IS NOT NULL THEN
      INSERT INTO content_products (content_id, product_id) VALUES (v_a10, v_p_astragalus) ON CONFLICT DO NOTHING;
    END IF;
  END IF;

  -- ============================================================
  -- PRODUCT REVIEWS (10)
  -- ============================================================

  -- Reviews for Astragalus / immune product
  IF v_p_astragalus IS NOT NULL THEN
    INSERT INTO product_reviews (product_id, rating, title, body, reviewer_name, reviewer_email, status, verified_purchase, created_at)
    SELECT v_p_astragalus, 5,
      'Finally sleeping through the night — and my energy is back',
      'I''ve been taking this for about 6 weeks now and the difference is remarkable. I work long hours and used to get sick every time the season changed. Since starting this formula I''ve gone through two full months without a single cold. My acupuncturist also recommended it and confirmed it''s the right formula for my constitution. The capsule size is easy to swallow and there''s no strong taste. Will absolutely continue taking this.',
      'Sarah M.', 'sarah.m@example.com', 'approved', TRUE, NOW() - INTERVAL '4 days'
    WHERE NOT EXISTS (SELECT 1 FROM product_reviews WHERE reviewer_email = 'sarah.m@example.com' AND product_id = v_p_astragalus);

    INSERT INTO product_reviews (product_id, rating, title, body, reviewer_name, reviewer_email, status, verified_purchase, created_at)
    SELECT v_p_astragalus, 5,
      'My TCM doctor recommended this — exceeded expectations',
      'Dr. Huang specifically recommended this product for my Qi deficiency pattern. After 3 months of consistent use I feel more grounded, my digestion has improved, and I haven''t needed a sick day. What I appreciate most is that this isn''t just about immunity — I feel better overall. Less fatigue, better recovery after workouts. I''ve started recommending it to everyone in my family.',
      'David L.', 'davidl88@example.com', 'approved', TRUE, NOW() - INTERVAL '12 days'
    WHERE NOT EXISTS (SELECT 1 FROM product_reviews WHERE reviewer_email = 'davidl88@example.com' AND product_id = v_p_astragalus);

    INSERT INTO product_reviews (product_id, rating, title, body, reviewer_name, reviewer_email, status, verified_purchase, created_at)
    SELECT v_p_astragalus, 4,
      'Good quality, takes a few weeks to feel the difference',
      'I want to give an honest review. I didn''t notice anything the first two weeks and almost gave up. But by week 4, I realized I had more sustained energy in the afternoons, which is when I usually crash. I''ve been using it for 2 months now and my seasonal allergies were noticeably milder this spring. Four stars only because the effects are subtle — but I think that''s actually how tonic herbs work.',
      'Jennifer K.', 'jen.k@example.com', 'approved', TRUE, NOW() - INTERVAL '20 days'
    WHERE NOT EXISTS (SELECT 1 FROM product_reviews WHERE reviewer_email = 'jen.k@example.com' AND product_id = v_p_astragalus);
  END IF;

  -- Reviews for Adaptogen / energy product
  IF v_p_adaptogen IS NOT NULL THEN
    INSERT INTO product_reviews (product_id, rating, title, body, reviewer_name, reviewer_email, status, verified_purchase, created_at)
    SELECT v_p_adaptogen, 5,
      'Game changer for my afternoon energy slumps',
      'I work in a high-stress environment and used to rely on 3–4 cups of coffee a day just to function. I started this formula on my TCM practitioner''s advice and within two weeks I was down to one coffee in the morning. The energy from this is different — it''s clean and steady, not jittery. I''m also handling stressful situations more calmly. Incredible product.',
      'Michael T.', 'michael.t@example.com', 'approved', TRUE, NOW() - INTERVAL '7 days'
    WHERE NOT EXISTS (SELECT 1 FROM product_reviews WHERE reviewer_email = 'michael.t@example.com' AND product_id = v_p_adaptogen);

    INSERT INTO product_reviews (product_id, rating, title, body, reviewer_name, reviewer_email, status, verified_purchase, created_at)
    SELECT v_p_adaptogen, 5,
      'Best adaptogen blend I''ve tried — and I''ve tried many',
      'I''ve been exploring adaptogens for about 3 years and have tried products from many different brands. This formula stands out because of the quality of the herbs and the obvious care in the formulation. You can taste the difference compared to cheap products. I take 2 capsules in the morning and feel focused and balanced all day. Highly recommend.',
      'Rachel W.', 'rachel.w@example.com', 'approved', TRUE, NOW() - INTERVAL '25 days'
    WHERE NOT EXISTS (SELECT 1 FROM product_reviews WHERE reviewer_email = 'rachel.w@example.com' AND product_id = v_p_adaptogen);
  END IF;

  -- Reviews for Blood Nourish / women's product
  IF v_p_blood_nourish IS NOT NULL THEN
    INSERT INTO product_reviews (product_id, rating, title, body, reviewer_name, reviewer_email, status, verified_purchase, created_at)
    SELECT v_p_blood_nourish, 5,
      'My cycles are finally regular after years of struggle',
      'I''ve had irregular, very light periods for years and was told by Western doctors there wasn''t much to do about it. My TCM practitioner diagnosed me with Blood deficiency and recommended this formula. After 3 months, my cycle has become regular for the first time in years. My hair has also stopped falling out at the rate it was. I can''t say enough good things.',
      'Lisa C.', 'lisa.c@example.com', 'approved', TRUE, NOW() - INTERVAL '9 days'
    WHERE NOT EXISTS (SELECT 1 FROM product_reviews WHERE reviewer_email = 'lisa.c@example.com' AND product_id = v_p_blood_nourish);

    INSERT INTO product_reviews (product_id, rating, title, body, reviewer_name, reviewer_email, status, verified_purchase, created_at)
    SELECT v_p_blood_nourish, 4,
      'Noticeable improvement in energy and complexion',
      'I started this after my TCM practitioner noted I had classic Blood deficiency signs — pale complexion, light periods, waking at 3am. After 6 weeks the 3am waking has stopped completely. My face also has more color. I''m giving 4 stars rather than 5 only because I wish the capsules came in a slightly larger bottle. The formula itself is excellent and the quality is clearly premium.',
      'Emma R.', 'emma.r@example.com', 'approved', TRUE, NOW() - INTERVAL '16 days'
    WHERE NOT EXISTS (SELECT 1 FROM product_reviews WHERE reviewer_email = 'emma.r@example.com' AND product_id = v_p_blood_nourish);
  END IF;

  -- Reviews for Calm Mind / sleep product
  IF v_p_calm_mind IS NOT NULL THEN
    INSERT INTO product_reviews (product_id, rating, title, body, reviewer_name, reviewer_email, status, verified_purchase, created_at)
    SELECT v_p_calm_mind, 5,
      'Finally a sleep product that actually works without making me groggy',
      'I''ve tried melatonin, magnesium, every "sleep supplement" out there. They either don''t work or leave me foggy in the morning. This formula is different. I fall asleep faster, stay asleep, and wake up feeling genuinely refreshed. I take 2 capsules about an hour before bed. It''s been 5 weeks and the results have been consistent throughout. No dependency, no side effects.',
      'Thomas B.', 'thomas.b@example.com', 'approved', TRUE, NOW() - INTERVAL '11 days'
    WHERE NOT EXISTS (SELECT 1 FROM product_reviews WHERE reviewer_email = 'thomas.b@example.com' AND product_id = v_p_calm_mind);
  END IF;

  -- One review for the immune product (if different from astragalus)
  IF v_p_immune IS NOT NULL AND v_p_immune != v_p_astragalus THEN
    INSERT INTO product_reviews (product_id, rating, title, body, reviewer_name, reviewer_email, status, verified_purchase, created_at)
    SELECT v_p_immune, 5,
      'My whole family takes this now — highly recommend',
      'We''ve been using this as our family''s seasonal immune support for the past year. My kids get sick far less frequently at school, and when something does go around the house we recover much faster. The quality is excellent — you can tell these herbs are properly sourced. We stock up on the 3-pack each autumn and it gets us through the winter beautifully.',
      'Angela F.', 'angela.f@example.com', 'approved', TRUE, NOW() - INTERVAL '6 days'
    WHERE NOT EXISTS (SELECT 1 FROM product_reviews WHERE reviewer_email = 'angela.f@example.com' AND product_id = v_p_immune);
  ELSE
    -- Extra review for astragalus if no separate immune product
    IF v_p_astragalus IS NOT NULL THEN
      INSERT INTO product_reviews (product_id, rating, title, body, reviewer_name, reviewer_email, status, verified_purchase, created_at)
      SELECT v_p_astragalus, 5,
        'Whole family switched to this — best purchase of the year',
        'After my TCM practitioner recommended this for my constitution, I bought bottles for my husband and teenage kids as well. We''ve all noticed fewer sick days. My teenage son was getting 3–4 colds a year; this winter he''s had zero. The quality is clearly premium and the company''s commitment to GMP certification gives me confidence in what I''m taking.',
        'Angela F.', 'angela.f2@example.com', 'approved', TRUE, NOW() - INTERVAL '6 days'
      WHERE NOT EXISTS (SELECT 1 FROM product_reviews WHERE reviewer_email = 'angela.f2@example.com' AND product_id = v_p_astragalus);
    END IF;
  END IF;

  RAISE NOTICE 'Sample content and reviews seeded successfully.';
END $$;
