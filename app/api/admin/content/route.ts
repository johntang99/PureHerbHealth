import { z } from "zod";
import { handleApiError, ok } from "@/lib/utils/api";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

const querySchema = z.object({
  type: z.string().default("article"),
  search: z.string().optional(),
  status: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  per_page: z.coerce.number().int().positive().max(200).default(50),
});

const createSchema = z.object({
  type: z.string().min(1),
  slug: z.string().min(1),
  title: z.string().min(1),
  title_zh: z.string().optional(),
  body_markdown: z.string().optional(),
  body_markdown_zh: z.string().optional(),
  status: z.enum(["draft", "review", "published", "archived"]).default("draft"),
  meta_title: z.string().optional(),
  meta_description: z.string().optional(),
  tcm_data: z.record(z.string(), z.unknown()).optional(),
  store_slug: z.string().optional(),
});

export const dynamic = "force-dynamic";

async function resolveStoreId(admin: ReturnType<typeof getSupabaseAdminClient>, storeSlug?: string) {
  const slug = storeSlug || process.env.NEXT_PUBLIC_STORE_SLUG || "pureherbhealth";
  const { data } = await admin.from("stores").select("id").eq("slug", slug).maybeSingle();
  return data?.id ?? null;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = querySchema.parse(Object.fromEntries(searchParams.entries()));
    const admin = getSupabaseAdminClient();

    let builder = admin
      .from("content")
      .select("id,slug,title,title_zh,status,type,view_count,published_at,created_at,updated_at", { count: "exact" })
      .eq("type", q.type)
      .order("updated_at", { ascending: false })
      .range((q.page - 1) * q.per_page, q.page * q.per_page - 1);

    if (q.search) builder = builder.ilike("title", `%${q.search}%`);
    if (q.status) builder = builder.eq("status", q.status);

    const { data, error, count } = await builder;
    if (error) throw error;

    return ok({ items: data ?? [], total: count ?? 0, page: q.page, per_page: q.per_page });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = createSchema.parse(await request.json());
    const admin = getSupabaseAdminClient();
    const storeId = await resolveStoreId(admin, body.store_slug);
    if (!storeId) throw new Error("Store not found");

    const { data, error } = await admin
      .from("content")
      .insert({
        store_id: storeId,
        type: body.type,
        slug: body.slug,
        title: body.title,
        title_zh: body.title_zh ?? null,
        body_markdown: body.body_markdown ?? null,
        body_markdown_zh: body.body_markdown_zh ?? null,
        status: body.status,
        meta_title: body.meta_title ?? null,
        meta_description: body.meta_description ?? null,
        tcm_data: body.tcm_data ?? {},
      })
      .select("*")
      .single();
    if (error) throw error;

    return ok({ item: data });
  } catch (error) {
    return handleApiError(error);
  }
}
