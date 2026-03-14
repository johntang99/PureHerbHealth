import { z } from "zod";
import { handleApiError, ok } from "@/lib/utils/api";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/),
  name: z.string().min(1),
  name_zh: z.string().optional(),
  parent_id: z.string().uuid().nullable().optional(),
});

const updateSchema = createSchema.extend({
  id: z.string().uuid(),
});

const deleteSchema = z.object({
  id: z.string().uuid(),
});

export async function GET() {
  try {
    const admin = getSupabaseAdminClient();
    const { data, error } = await admin
      .from("categories")
      .select("id,slug,name,name_zh,parent_id")
      .order("name", { ascending: true });
    if (error) throw error;
    return ok({ categories: data ?? [] });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = createSchema.parse(await request.json());
    const admin = getSupabaseAdminClient();
    const { data, error } = await admin
      .from("categories")
      .insert({
        slug: body.slug,
        name: body.name,
        name_zh: body.name_zh ?? null,
        parent_id: body.parent_id ?? null,
      })
      .select("id,slug,name,name_zh,parent_id")
      .single();
    if (error) throw error;
    return ok({ category: data });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(request: Request) {
  try {
    const body = updateSchema.parse(await request.json());
    const admin = getSupabaseAdminClient();
    const { data, error } = await admin
      .from("categories")
      .update({
        slug: body.slug,
        name: body.name,
        name_zh: body.name_zh ?? null,
        parent_id: body.parent_id ?? null,
      })
      .eq("id", body.id)
      .select("id,slug,name,name_zh,parent_id")
      .single();
    if (error) throw error;
    return ok({ category: data });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const body = deleteSchema.parse(await request.json());
    const admin = getSupabaseAdminClient();
    const { error } = await admin.from("categories").delete().eq("id", body.id);
    if (error) throw error;
    return ok({ deleted: true });
  } catch (error) {
    return handleApiError(error);
  }
}
