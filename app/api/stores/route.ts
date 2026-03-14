import { z } from "zod";
import { handleApiError, ok } from "@/lib/utils/api";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

const schema = z.object({
  name: z.string().min(2).optional(),
  slug: z.string().min(2).optional(),
  type: z.enum(["standalone", "embedded"]).default("embedded"),
  business_name: z.string().min(2).optional(),
  contact_email: z.string().email().optional(),
  intake: z
    .object({
      business: z
        .object({
          name: z.string().min(2).optional(),
          storeName: z.string().min(2),
          email: z.string().email().optional(),
          supportEmail: z.string().email().optional(),
          phone: z.string().optional(),
        })
        .optional(),
      shipping: z
        .object({
          freeShippingThreshold: z.number().nonnegative().optional(),
        })
        .optional(),
    })
    .optional(),
});

function toSlug(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function toOrderPrefix(input: string) {
  const letters = input.replace(/[^A-Za-z]/g, "").toUpperCase();
  return (letters.slice(0, 3) || "STR").padEnd(3, "X");
}

export async function GET() {
  try {
    const admin = getSupabaseAdminClient();
    const { data, error } = await admin
      .from("stores")
      .select(
        "id,slug,name,type,is_active,business_name,contact_email,contact_phone,logo_url,theme_config,ai_practitioner_name,ai_practitioner_title,ai_booking_url,stripe_connect_account_id,stripe_connect_onboarded,revenue_share_platform_pct,created_at",
      )
      .order("created_at", { ascending: false });
    if (error) throw error;
    return ok({ stores: data || [] });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = schema.parse(await request.json());
    const admin = getSupabaseAdminClient();

    const intakeStoreName = body.intake?.business?.storeName;
    const name = body.name || intakeStoreName || "New Store";
    const slug = body.slug || toSlug(name);
    const businessName = body.business_name || body.intake?.business?.name || name;
    const contactEmail = body.contact_email || body.intake?.business?.supportEmail || body.intake?.business?.email || null;
    const contactPhone = body.intake?.business?.phone || null;
    const orderPrefix = toOrderPrefix(name);

    const { data, error } = await admin
      .from("stores")
      .insert({
        name,
        slug,
        type: body.type,
        enabled: true,
        is_active: false,
        business_name: businessName,
        contact_email: contactEmail,
        contact_phone: contactPhone,
        order_number_prefix: orderPrefix,
        theme_config: {},
        ai_config: {},
      })
      .select("id,slug,name,order_number_prefix")
      .single();
    if (error) throw error;

    return ok({
      store_id: data.id,
      store_slug: data.slug,
      order_number_prefix: data.order_number_prefix || orderPrefix,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
