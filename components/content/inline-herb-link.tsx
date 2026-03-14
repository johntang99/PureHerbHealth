import Link from "next/link";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Locale } from "@/lib/i18n/config";

export async function InlineHerbLink({ herbSlug, locale }: { herbSlug: string; locale: Locale }) {
  const admin = getSupabaseAdminClient();
  const { data } = await admin.from("content").select("slug,title,title_zh").eq("slug", herbSlug).eq("type", "herb_profile").maybeSingle();
  if (!data) return <span className="text-sm text-slate-500">{herbSlug}</span>;
  const title = locale === "zh" && data.title_zh ? `${data.title} (${data.title_zh})` : data.title;
  return (
    <Link href={`/${locale}/learn/herbs/${data.slug}`} className="text-brand underline">
      {title}
    </Link>
  );
}
