import { z } from "zod";
import { handleApiError, ok } from "@/lib/utils/api";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const ADMIN_ROLES = ["platform_admin", "platform_super_admin"] as const;

const patchSchema = z.object({
  role: z.enum(ADMIN_ROLES).optional(),
  full_name: z.string().optional(),
  password: z.string().min(8).max(128).optional(),
});

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const body = patchSchema.parse(await request.json());
    const admin = getSupabaseAdminClient();
    const updates: Record<string, string> = {};
    if (body.role)      updates.role      = body.role;
    if (body.full_name) updates.full_name = body.full_name;

    if (body.password) {
      // Get auth_user_id to update password
      const { data: profile } = await admin.from("profiles").select("auth_user_id").eq("id", params.id).maybeSingle();
      if (profile?.auth_user_id) {
        const { error: pwError } = await admin.auth.admin.updateUserById(profile.auth_user_id, { password: body.password });
        if (pwError) throw pwError;
      }
    }

    if (Object.keys(updates).length === 0) return ok({ id: params.id });
    const { error } = await admin.from("profiles").update(updates).eq("id", params.id);
    if (error) throw error;
    return ok({ id: params.id });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  try {
    const admin = getSupabaseAdminClient();

    // Get the staff member's auth_user_id before downgrading
    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("id,auth_user_id,role")
      .eq("id", params.id)
      .maybeSingle();
    if (profileError) throw profileError;
    if (!profile) return ok({ error: "Staff member not found" }, { status: 404 });

    // Downgrade role to customer (don't delete the account entirely)
    const { error } = await admin
      .from("profiles")
      .update({ role: "customer" })
      .eq("id", params.id);
    if (error) throw error;

    return ok({ id: params.id, removed: true });
  } catch (error) {
    return handleApiError(error);
  }
}
