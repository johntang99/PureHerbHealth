import { ok } from "@/lib/utils/api";

export async function POST() {
  return ok({ code: `REF-${Date.now()}` });
}
