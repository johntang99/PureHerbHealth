import type { MetadataRoute } from "next";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3010";
  const staticEntries: MetadataRoute.Sitemap = [
    { url: `${base}/en`, priority: 1 },
    { url: `${base}/zh`, priority: 1 },
    { url: `${base}/en/shop`, priority: 0.9 },
    { url: `${base}/zh/shop`, priority: 0.9 },
    { url: `${base}/en/learn`, priority: 0.9 },
    { url: `${base}/zh/learn`, priority: 0.9 },
    { url: `${base}/en/learn/herbs`, priority: 0.8 },
    { url: `${base}/zh/learn/herbs`, priority: 0.8 },
    { url: `${base}/en/learn/conditions`, priority: 0.8 },
    { url: `${base}/zh/learn/conditions`, priority: 0.8 },
    { url: `${base}/en/learn/five-elements`, priority: 0.7 },
    { url: `${base}/zh/learn/five-elements`, priority: 0.7 },
  ];

  try {
    const admin = getSupabaseAdminClient();
    const { data: rows, error } = await admin
      .from("content")
      .select("slug,type,updated_at")
      .eq("status", "published")
      .in("type", ["herb_profile", "condition_guide"])
      .limit(500);
    if (error) throw error;

    const dynamicEntries: MetadataRoute.Sitemap = [];
    for (const row of rows || []) {
      if (row.type === "herb_profile") {
        dynamicEntries.push({ url: `${base}/en/learn/herbs/${row.slug}`, lastModified: row.updated_at });
        dynamicEntries.push({ url: `${base}/zh/learn/herbs/${row.slug}`, lastModified: row.updated_at });
      } else if (row.type === "condition_guide") {
        dynamicEntries.push({ url: `${base}/en/learn/conditions/${row.slug}`, lastModified: row.updated_at });
        dynamicEntries.push({ url: `${base}/zh/learn/conditions/${row.slug}`, lastModified: row.updated_at });
      }
    }
    return [...staticEntries, ...dynamicEntries];
  } catch {
    return staticEntries;
  }
}
