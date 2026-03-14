const diseaseClaimPattern =
  /\b(cure|cures|curing|treat|treats|treating|diagnose|diagnoses|diagnosing|prevent|prevents|preventing)\b[^.]{0,40}\b(cancer|diabetes|hypertension|stroke|asthma|covid|depression|anxiety)\b/gi;

export const FDA_DISCLAIMER =
  "These statements have not been evaluated by the Food and Drug Administration. These products are not intended to diagnose, treat, cure, or prevent any disease.";

export function applySafetyFilters(content: string, hasRecommendations: boolean) {
  const violations: string[] = [];
  const filtered = content.replace(diseaseClaimPattern, (match) => {
    violations.push(match);
    return "In traditional use, this may support general wellness.";
  });

  const withDisclaimer =
    hasRecommendations && !filtered.includes(FDA_DISCLAIMER)
      ? `${filtered}\n\n${FDA_DISCLAIMER}`
      : filtered;

  return {
    passed: violations.length === 0,
    filtered_content: withDisclaimer,
    violations,
    disclaimer_appended: withDisclaimer !== filtered,
  };
}
