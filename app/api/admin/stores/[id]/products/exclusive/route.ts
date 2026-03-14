import { ok } from "@/lib/utils/api";
import { z } from "zod";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

const schema = z.object({
  name: z.string().min(2),
  slug: z.string().min(2),
  short_description: z.string().optional(),
  description: z.string().optional(),
  price: z.number().nonnegative(),
  category_id: z.string().uuid().optional(),
  images: z.array(z.object({ url: z.string().url(), alt: z.string().optional() })).default([]),
  sku: z.string().optional(),
});

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const body = schema.parse(await request.json());
  const admin = getSupabaseAdminClient();

  const { data: product, error: productError } = await admin
    .from("products")
    .insert({
      owner_store_id: params.id,
      name: body.name,
      slug: body.slug,
      short_description: body.short_description || null,
      description: body.description || null,
      price_cents: Math.round(body.price * 100),
      category_id: body.category_id || null,
      images: body.images,
      sku: body.sku || null,
      enabled: true,
    })
    .select("id,name,slug,price_cents,owner_store_id")
    .single();
  if (productError) return ok({ error: productError.message }, { status: 500 });

  const { error: storeProductError } = await admin.from("store_products").upsert(
    {
      store_id: params.id,
      product_id: product.id,
      enabled: true,
    },
    { onConflict: "store_id,product_id" },
  );
  if (storeProductError) return ok({ error: storeProductError.message }, { status: 500 });

  return ok({ store_id: params.id, created: true, product });
}
