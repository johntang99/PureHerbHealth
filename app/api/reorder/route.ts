import { ok } from "@/lib/utils/api";

export async function GET(request: Request) {
  const url = new URL(request.url);
  return ok({
    product: url.searchParams.get("product"),
    customer: url.searchParams.get("customer"),
    redirect_to: "/en/cart",
  });
}
