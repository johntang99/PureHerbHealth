export function FDADisclaimer({ locale }: { locale: string }) {
  return (
    <div className="rounded-[8px] border border-[var(--color-accent-300)] bg-[#FEF3C7] px-4 py-3 text-[12px] leading-[1.6] text-[var(--color-accent-700)]">
      ⚠️{" "}
      {locale === "zh"
        ? "免责声明：本产品声明未经美国 FDA 评估，不用于诊断、治疗、治愈或预防任何疾病。"
        : "FDA Disclaimer: These statements have not been evaluated by the FDA and are not intended to diagnose, treat, cure, or prevent any disease."}
    </div>
  );
}
