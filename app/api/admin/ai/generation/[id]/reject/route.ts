import { ok } from "@/lib/utils/api";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { z } from "zod";

const schema = z.object({
  notes: z.string().min(3).optional(),
});

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const body = schema.safeParse(await request.json().catch(() => ({})));
  const admin = getSupabaseAdminClient();
  const { error } = await admin
    .from("ai_generations")
    .update({
      status: "rejected",
      updated_at: new Date().toISOString(),
      output: body.success ? { rejection_notes: body.data.notes ?? null } : {},
    })
    .eq("id", params.id);
  if (error) return ok({ id: params.id, status: "error", error: error.message }, { status: 400 });
  return ok({ id: params.id, status: "rejected" });
}
