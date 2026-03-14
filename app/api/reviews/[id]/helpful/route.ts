import { ok } from "@/lib/utils/api";

export async function POST(_: Request, { params }: { params: { id: string } }) {
  return ok({ id: params.id, helpful_count_incremented: true });
}
