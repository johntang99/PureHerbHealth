import { z } from "zod";
import { handleApiError, ok } from "@/lib/utils/api";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

const updateSchema = z.object({
  title: z.string().min(1).optional(),
  title_zh: z.string().optional(),
  slug: z.string().min(1).optional(),
  body_markdown: z.string().optional(),
  body_markdown_zh: z.string().optional(),
  status: z.enum(["draft", "review", "published", "archived"]).optional(),
  meta_title: z.string().optional(),
  meta_description: z.string().optional(),
  tcm_data: z.record(z.string(), z.unknown()).optional(),
  featured_image: z.object({ url: z.string(), alt: z.string() }).nullable().optional(),
});

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const admin = getSupabaseAdminClient();
    const { data, error } = await admin
      .from("content")
      .select("*")
      .eq("id", params.id)
      .single();
    if (error) throw error;
    return ok({ item: data });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const body = updateSchema.parse(await request.json());
    const admin = getSupabaseAdminClient();

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (body.title !== undefined) updates.title = body.title;
    if (body.title_zh !== undefined) updates.title_zh = body.title_zh;
    if (body.slug !== undefined) updates.slug = body.slug;
    if (body.body_markdown !== undefined) updates.body_markdown = body.body_markdown;
    if (body.body_markdown_zh !== undefined) updates.body_markdown_zh = body.body_markdown_zh;
    if (body.meta_title !== undefined) updates.meta_title = body.meta_title;
    if (body.meta_description !== undefined) updates.meta_description = body.meta_description;
    if (body.tcm_data !== undefined) updates.tcm_data = body.tcm_data;
    if (body.featured_image !== undefined) updates.featured_image = body.featured_image;
    if (body.status !== undefined) {
      updates.status = body.status;
      if (body.status === "published") updates.published_at = new Date().toISOString();
    }

    const { data, error } = await admin
      .from("content")
      .update(updates)
      .eq("id", params.id)
      .select("*")
      .single();
    if (error) throw error;
    return ok({ item: data });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const admin = getSupabaseAdminClient();
    const { error } = await admin.from("content").delete().eq("id", params.id);
    if (error) throw error;
    return ok({ deleted: true });
  } catch (error) {
    return handleApiError(error);
  }
}
