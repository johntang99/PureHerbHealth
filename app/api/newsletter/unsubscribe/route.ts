import { z } from "zod";
import { handleApiError, ok } from "@/lib/utils/api";

const schema = z.object({ email: z.string().email() });

export async function POST(request: Request) {
  try {
    const body = schema.parse(await request.json());
    return ok({ email: body.email, status: "unsubscribed" });
  } catch (error) {
    return handleApiError(error);
  }
}
