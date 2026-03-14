import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { DEFAULT_THEME_CONFIG, resolveThemeConfig, themeToCssVars, type ThemeConfig } from "@/lib/theme/config";

export type StoreSiteConfig = {
  id: string | null;
  slug: string;
  name: string;
  name_zh: string | null;
  logo_url: string | null;
  business_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  ai_practitioner_name: string | null;
  ai_practitioner_title: string | null;
  ai_booking_url: string | null;
  theme: ThemeConfig;
  themeCssVars: Record<string, string>;
};

const DEFAULT_STORE_SLUG = process.env.NEXT_PUBLIC_STORE_SLUG || "pureherbhealth";
export async function getStoreSiteConfig(requestedSlug?: string): Promise<StoreSiteConfig> {
  const admin = getSupabaseAdminClient();
  const targetSlug = requestedSlug?.trim() || DEFAULT_STORE_SLUG;

  let { data: store } = await admin
    .from("stores")
    .select("id,slug,name,name_zh,logo_url,business_name,contact_email,contact_phone,theme_config,ai_practitioner_name,ai_practitioner_title,ai_booking_url")
    .eq("slug", targetSlug)
    .maybeSingle();

  if (!store && targetSlug !== DEFAULT_STORE_SLUG) {
    const fallback = await admin
      .from("stores")
      .select("id,slug,name,name_zh,logo_url,business_name,contact_email,contact_phone,theme_config,ai_practitioner_name,ai_practitioner_title,ai_booking_url")
      .eq("slug", DEFAULT_STORE_SLUG)
      .maybeSingle();
    store = fallback.data || null;
  }

  if (!store) {
    return {
      id: null,
      slug: targetSlug,
      name: "pureHerbHealth",
      name_zh: "本草健康",
      logo_url: null,
      business_name: null,
      contact_email: null,
      contact_phone: null,
      ai_practitioner_name: null,
      ai_practitioner_title: null,
      ai_booking_url: null,
      theme: DEFAULT_THEME_CONFIG,
      themeCssVars: themeToCssVars(DEFAULT_THEME_CONFIG),
    };
  }

  const resolvedTheme = resolveThemeConfig(store.theme_config);

  return {
    id: store.id,
    slug: store.slug,
    name: store.name,
    name_zh: store.name_zh,
    logo_url: store.logo_url,
    business_name: store.business_name,
    contact_email: store.contact_email,
    contact_phone: store.contact_phone,
    ai_practitioner_name: store.ai_practitioner_name,
    ai_practitioner_title: store.ai_practitioner_title,
    ai_booking_url: store.ai_booking_url,
    theme: resolvedTheme,
    themeCssVars: themeToCssVars(resolvedTheme),
  };
}
