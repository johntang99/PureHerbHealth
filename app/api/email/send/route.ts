import { z } from "zod";
import { handleApiError, ok } from "@/lib/utils/api";

const schema = z.object({
  to: z.string().email(),
  subject: z.string().min(1),
  body: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const body = schema.parse(await request.json());
    return ok({ queued: true, to: body.to, subject: body.subject });
  } catch (error) {
    return handleApiError(error);
  }
}
