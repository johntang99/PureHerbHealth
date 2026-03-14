import type { Locale } from "./config";

export function getLocalized<T extends Record<string, unknown>>(
  item: T,
  field: string,
  locale: Locale,
): string {
  const localizedField = `${field}_zh`;
  if (locale === "zh" && typeof item[localizedField] === "string") {
    return item[localizedField] as string;
  }
  return (item[field] as string) || "";
}
