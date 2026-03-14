import { z } from "zod";
import { handleApiError, ok } from "@/lib/utils/api";

const submitSchema = z.object({
  product_id: z.string().min(1),
  order_id: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  title: z.string().min(1),
  body: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const body = submitSchema.parse(await request.json());
    return ok({ id: `review_${Date.now()}`, ...body, status: "pending" });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function GET(request: Request) {
  const productId = new URL(request.url).searchParams.get("product_id");
  return ok({ product_id: productId, items: [] });
}
