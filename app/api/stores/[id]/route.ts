import { z } from "zod";
import { handleApiError, ok } from "@/lib/utils/api";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

const nullableUrl = z.string().url().nullish().transform((v) => v ?? null);

const schema = z.object({
  name: z.string().optional(),
  business_name: z.string().optional(),
  contact_email: z.string().email().nullish().transform((v) => v ?? null),
  contact_phone: z.string().optional(),
  logo_url: nullableUrl,
  favicon_url: nullableUrl,
  hero_image_url: nullableUrl,
  domain: z.string().optional(),
  email_from_name: z.string().optional(),
  email_from_address: z.string().email().nullish().transform((v) => v ?? null),
  invoice_company_name: z.string().optional(),
  invoice_tax_id: z.string().optional(),
  ai_practitioner_name: z.string().nullish().transform((v) => v ?? null),
  ai_practitioner_title: z.string().nullish().transform((v) => v ?? null),
  ai_booking_url: nullableUrl,
  revenue_share_platform_pct: z.number().min(0).max(100).optional(),
  is_active: z.boolean().optional(),
  theme_config: z.record(z.string(), z.unknown()).optional(),
  ai_config: z.record(z.string(), z.unknown()).optional(),
});

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const body = schema.parse(await request.json());
    const admin = getSupabaseAdminClient();
    const { data, error } = await admin
      .from("stores")
      .update({
        ...body,
        updated_at: new Date().toISOString(),
      })
      .eq("id", params.id)
      .select(
        "id,slug,name,business_name,contact_email,contact_phone,logo_url,domain,is_active,revenue_share_platform_pct,stripe_connect_account_id,stripe_connect_onboarded,theme_config,ai_config",
      )
      .single();
    if (error) throw error;

    return ok({ updated: true, store: data });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  try {
    const admin = getSupabaseAdminClient();

    // Soft-check: refuse to delete the platform's own store (slug = "pureherbhealth")
    const { data: store } = await admin.from("stores").select("slug").eq("id", params.id).single();
    if (store?.slug === "pureherbhealth") {
      return ok({ error: "Cannot delete the platform store" }, { status: 400 });
    }

    const { error } = await admin.from("stores").delete().eq("id", params.id);
    if (error) throw error;

    return ok({ deleted: true, id: params.id });
  } catch (error) {
    return handleApiError(error);
  }
}
