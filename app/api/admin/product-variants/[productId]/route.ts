import { z } from "zod";
import { handleApiError, ok } from "@/lib/utils/api";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  name: z.string().min(1),
  name_zh: z.string().optional(),
  price_cents: z.number().int().nonnegative(),
  compare_at_price_cents: z.number().int().nonnegative().nullable().optional(),
  sku: z.string().optional(),
  sort_order: z.number().int().default(0),
  is_default: z.boolean().default(false),
});

const updateSchema = createSchema.extend({
  id: z.string().uuid(),
});

const deleteSchema = z.object({
  id: z.string().uuid(),
});

export async function GET(
  _request: Request,
  { params }: { params: { productId: string } },
) {
  try {
    const admin = getSupabaseAdminClient();
    const { data, error } = await admin
      .from("product_variants")
      .select("*")
      .eq("product_id", params.productId)
      .order("sort_order", { ascending: true });
    if (error) throw error;
    return ok({ variants: data ?? [] });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(
  request: Request,
  { params }: { params: { productId: string } },
) {
  try {
    const body = createSchema.parse(await request.json());
    const admin = getSupabaseAdminClient();

    // If setting as default, clear existing defaults first
    if (body.is_default) {
      await admin
        .from("product_variants")
        .update({ is_default: false })
        .eq("product_id", params.productId);
    }

    const { data, error } = await admin
      .from("product_variants")
      .insert({ ...body, product_id: params.productId })
      .select("*")
      .single();
    if (error) throw error;
    return ok({ variant: data });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { productId: string } },
) {
  try {
    const body = updateSchema.parse(await request.json());
    const admin = getSupabaseAdminClient();

    if (body.is_default) {
      await admin
        .from("product_variants")
        .update({ is_default: false })
        .eq("product_id", params.productId)
        .neq("id", body.id);
    }

    const { data, error } = await admin
      .from("product_variants")
      .update({
        name: body.name,
        name_zh: body.name_zh ?? null,
        price_cents: body.price_cents,
        compare_at_price_cents: body.compare_at_price_cents ?? null,
        sku: body.sku ?? null,
        sort_order: body.sort_order,
        is_default: body.is_default,
        updated_at: new Date().toISOString(),
      })
      .eq("id", body.id)
      .eq("product_id", params.productId)
      .select("*")
      .single();
    if (error) throw error;
    return ok({ variant: data });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { productId: string } },
) {
  try {
    const body = deleteSchema.parse(await request.json());
    const admin = getSupabaseAdminClient();
    const { error } = await admin
      .from("product_variants")
      .delete()
      .eq("id", body.id)
      .eq("product_id", params.productId);
    if (error) throw error;
    return ok({ deleted: true });
  } catch (error) {
    return handleApiError(error);
  }
}
