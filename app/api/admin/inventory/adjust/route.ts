import { z } from "zod";
import { handleApiError, ok } from "@/lib/utils/api";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

const schema = z.object({
  product_id: z.string().uuid(),
  variant_id: z.string().uuid().optional(),
  adjustment: z.number().int(),
  reason: z.enum(["sale", "return", "restock", "manual", "damaged"]),
  notes: z.string().optional(),
  reference_id: z.string().uuid().optional(),
  adjusted_by: z.string().uuid().optional(),
});

export async function POST(request: Request) {
  try {
    const body = schema.parse(await request.json());
    const admin = getSupabaseAdminClient();
    const { data, error } = await admin.rpc("adjust_stock", {
      p_product_id: body.product_id,
      p_variant_id: body.variant_id ?? null,
      p_adjustment: body.adjustment,
      p_reason: body.reason,
      p_notes: body.notes ?? null,
      p_reference_id: body.reference_id ?? null,
      p_adjusted_by: body.adjusted_by ?? null,
    });

    if (error) throw error;
    const row = Array.isArray(data) ? data[0] : data;

    return ok({
      product_id: body.product_id,
      previous_quantity: row?.previous_qty ?? null,
      new_quantity: row?.new_qty ?? null,
      applied_adjustment: body.adjustment,
      reason: body.reason,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
