import { ok } from "@/lib/utils/api";

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token");
  return ok({ token, status: "active" });
}
