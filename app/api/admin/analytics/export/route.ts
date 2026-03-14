import { ok } from "@/lib/utils/api";

export async function GET() {
  return ok({ url: "https://example.com/analytics-export.csv" });
}
