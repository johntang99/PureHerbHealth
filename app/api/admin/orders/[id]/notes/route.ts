import { z } from "zod";
import { handleApiError, ok } from "@/lib/utils/api";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

const schema = z.object({
  content: z.string().min(1),
  author_id: z.string().uuid().optional(),
});

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const raw = (await request.json()) as Record<string, unknown>;
    const body = schema.parse({
      content: raw.content ?? raw.note,
      author_id: raw.author_id,
    });
    const admin = getSupabaseAdminClient();
    const { data, error } = await admin
      .from("order_internal_notes")
      .insert({
        order_id: params.id,
        author_id: body.author_id ?? null,
        content: body.content,
      })
      .select("id,order_id,author_id,content,created_at")
      .single();
    if (error) throw error;

    await admin.from("order_timeline_events").insert({
      order_id: params.id,
      event_type: "internal_note_added",
      description: "Internal note added",
      metadata: { note_id: data.id },
    });

    return ok(data);
  } catch (error) {
    return handleApiError(error);
  }
}
