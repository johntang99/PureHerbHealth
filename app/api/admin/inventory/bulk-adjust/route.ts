import { z } from "zod";
import { handleApiError, ok } from "@/lib/utils/api";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

const schema = z.object({
  adjustments: z.array(
    z.object({
      product_id: z.string().uuid(),
      variant_id: z.string().uuid().optional(),
      adjustment: z.number().int(),
      reason: z.enum(["sale", "return", "restock", "manual", "damaged"]).default("manual"),
      notes: z.string().optional(),
      reference_id: z.string().uuid().optional(),
      adjusted_by: z.string().uuid().optional(),
    }),
  ).min(1),
});

export async function POST(request: Request) {
  try {
    const body = schema.parse(await request.json());
    const admin = getSupabaseAdminClient();
    const results: Array<{ product_id: string; previous_quantity: number | null; new_quantity: number | null }> = [];

    for (const adjustment of body.adjustments) {
      const { data, error } = await admin.rpc("adjust_stock", {
        p_product_id: adjustment.product_id,
        p_variant_id: adjustment.variant_id ?? null,
        p_adjustment: adjustment.adjustment,
        p_reason: adjustment.reason,
        p_notes: adjustment.notes ?? null,
        p_reference_id: adjustment.reference_id ?? null,
        p_adjusted_by: adjustment.adjusted_by ?? null,
      });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      results.push({
        product_id: adjustment.product_id,
        previous_quantity: row?.previous_qty ?? null,
        new_quantity: row?.new_qty ?? null,
      });
    }

    return ok({ applied: results.length, results });
  } catch (error) {
    return handleApiError(error);
  }
}
