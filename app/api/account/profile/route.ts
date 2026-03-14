import { z } from "zod";
import { handleApiError, ok, unauthorized } from "@/lib/utils/api";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { ensureProfileForAuthUser } from "@/lib/auth/profile";

const updateSchema = z.object({
  full_name: z.string().min(1).max(120),
});

export async function PUT(request: Request) {
  try {
    const body = updateSchema.parse(await request.json());
    const supabase = await getSupabaseServerClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) return unauthorized();

    const { error: updateAuthError } = await supabase.auth.updateUser({
      data: {
        full_name: body.full_name,
      },
    });
    if (updateAuthError) throw updateAuthError;

    const {
      data: { user: refreshedUser },
      error: refreshedError,
    } = await supabase.auth.getUser();
    if (refreshedError || !refreshedUser) return unauthorized();
    const profile = await ensureProfileForAuthUser(refreshedUser);

    const admin = getSupabaseAdminClient();
    const { data: updated, error: updateProfileError } = await admin
      .from("profiles")
      .update({
        full_name: body.full_name,
      })
      .eq("id", profile.id)
      .select("id,email,full_name,role")
      .single();
    if (updateProfileError) throw updateProfileError;

    return ok({
      profile: updated,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
