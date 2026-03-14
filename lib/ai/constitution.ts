export const CONSTITUTION_TYPES = [
  "balanced",
  "qi_deficient",
  "yang_deficient",
  "yin_deficient",
  "phlegm_damp",
  "damp_heat",
  "blood_stagnation",
  "qi_stagnation",
  "inherited_special",
] as const;

export type ConstitutionType = (typeof CONSTITUTION_TYPES)[number];

export const CONSTITUTION_METADATA: Record<ConstitutionType, { chinese_name: string; english_name: string; description: string }> = {
  balanced: { chinese_name: "Ping He", english_name: "Balanced Constitution", description: "Yin and Yang are in good balance." },
  qi_deficient: { chinese_name: "Qi Xu", english_name: "Qi Deficiency", description: "Lower vital energy and easy fatigue." },
  yang_deficient: { chinese_name: "Yang Xu", english_name: "Yang Deficiency", description: "Tendency toward cold and low drive." },
  yin_deficient: { chinese_name: "Yin Xu", english_name: "Yin Deficiency", description: "Dryness, heat sensations, and restlessness." },
  phlegm_damp: { chinese_name: "Tan Shi", english_name: "Phlegm-Dampness", description: "Heaviness and damp accumulation tendencies." },
  damp_heat: { chinese_name: "Shi Re", english_name: "Damp-Heat", description: "Dampness combined with internal heat signs." },
  blood_stagnation: { chinese_name: "Xue Yu", english_name: "Blood Stagnation", description: "Slower circulation and fixed discomfort patterns." },
  qi_stagnation: { chinese_name: "Qi Yu", english_name: "Qi Stagnation", description: "Constrained Qi often linked to stress." },
  inherited_special: { chinese_name: "Te Bing", english_name: "Inherited/Special", description: "Sensitivity-prone constitutional pattern." },
};

export function scoreConstitution(answers: Record<string, string>) {
  const scores: Record<ConstitutionType, number> = {
    balanced: 0,
    qi_deficient: 0,
    yang_deficient: 0,
    yin_deficient: 0,
    phlegm_damp: 0,
    damp_heat: 0,
    blood_stagnation: 0,
    qi_stagnation: 0,
    inherited_special: 0,
  };

  Object.values(answers).forEach((value) => {
    if (value === "a") scores.balanced += 2;
    if (value === "b") scores.qi_deficient += 2;
    if (value === "c") scores.yin_deficient += 2;
    if (value === "d") scores.qi_stagnation += 2;
  });

  const sorted = (Object.entries(scores) as Array<[ConstitutionType, number]>).sort((a, b) => b[1] - a[1]);
  const primary = sorted[0][0];
  const secondary = sorted[1][1] > 0 ? sorted[1][0] : null;
  const total = Object.values(scores).reduce((sum, value) => sum + value, 0) || 1;

  const normalized = Object.fromEntries(
    CONSTITUTION_TYPES.map((key) => [key, Math.round((scores[key] / total) * 100)]),
  ) as Record<ConstitutionType, number>;

  const rawConfidence = (scores[primary] - (secondary ? scores[secondary] : 0)) / total + 0.5;
  const confidence = Math.max(0, Math.min(1, Number(rawConfidence.toFixed(2))));

  return {
    primary,
    secondary,
    scores,
    normalized_scores: normalized,
    confidence,
    element_scores: {
      wood: normalized.qi_stagnation,
      fire: normalized.yin_deficient,
      earth: normalized.qi_deficient,
      metal: normalized.inherited_special,
      water: normalized.yang_deficient,
    },
  };
}
