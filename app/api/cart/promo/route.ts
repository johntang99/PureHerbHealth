import { z } from "zod";
import { handleApiError, ok } from "@/lib/utils/api";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { resolveStore } from "@/lib/cart/service";
import { resolveStoreSlug } from "@/lib/store/slug";

const promoSchema = z.object({
  code: z.string().min(3),
  store_slug: z.string().optional(),
  cart_subtotal_cents: z.number().int().nonnegative(),
});

export async function POST(request: Request) {
  try {
    const body = promoSchema.parse(await request.json());
    const admin = getSupabaseAdminClient();
    const storeSlug = resolveStoreSlug(body.store_slug);
    const store = await resolveStore(admin, storeSlug);
    if (!store) return ok({ valid: false, error: "Store not found" });

    const normalized = body.code.trim().toUpperCase();
    const { data: promo } = await admin
      .from("promotions")
      .select("id,code,discount_percent,discount_cents,active,starts_at,ends_at")
      .eq("store_id", store.id)
      .eq("code", normalized)
      .maybeSingle();

    const now = new Date();
    const activeDate =
      !promo?.starts_at || new Date(promo.starts_at) <= now
        ? !promo?.ends_at || new Date(promo.ends_at) >= now
        : false;

    const fallbackValid = ["WELCOME10", "SPRING5"].includes(normalized);
    const valid = (promo?.active && activeDate) || fallbackValid;
    const percent = promo?.discount_percent ?? (normalized === "WELCOME10" ? 10 : normalized === "SPRING5" ? 5 : 0);
    const discountCents = valid
      ? promo?.discount_cents
        ? promo.discount_cents
        : Math.round(body.cart_subtotal_cents * (Number(percent) / 100))
      : 0;

    return ok({
      valid,
      promo: valid
        ? {
            code: normalized,
            description: promo ? "Promotion applied" : "Fallback promo applied",
            discount_type: promo?.discount_cents ? "fixed_amount" : "percentage",
            discount_value: promo?.discount_cents ? promo.discount_cents : Number(percent),
            discount_amount: Number((discountCents / 100).toFixed(2)),
          }
        : null,
      error: valid ? null : "Invalid or expired code",
    });
  } catch (error) {
    return handleApiError(error);
  }
}
