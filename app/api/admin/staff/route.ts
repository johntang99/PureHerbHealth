import { z } from "zod";
import { handleApiError, ok } from "@/lib/utils/api";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const ADMIN_ROLES = ["platform_admin", "platform_super_admin"] as const;

export async function GET() {
  try {
    const admin = getSupabaseAdminClient();
    const { data, error } = await admin
      .from("profiles")
      .select("id,auth_user_id,email,full_name,role,created_at,updated_at")
      .in("role", [...ADMIN_ROLES])
      .order("created_at", { ascending: true });
    if (error) throw error;
    return ok({ staff: data ?? [] });
  } catch (error) {
    return handleApiError(error);
  }
}

const createSchema = z.object({
  email: z.string().email(),
  full_name: z.string().min(1).optional(),
  role: z.enum(ADMIN_ROLES).default("platform_admin"),
  password: z.string().min(8).max(128),
});

export async function POST(request: Request) {
  try {
    const body = createSchema.parse(await request.json());
    const admin = getSupabaseAdminClient();

    // Check if a profile with this email already exists
    const { data: existing } = await admin
      .from("profiles")
      .select("id,auth_user_id,role")
      .eq("email", body.email)
      .maybeSingle();

    if (existing) {
      if (ADMIN_ROLES.includes(existing.role as typeof ADMIN_ROLES[number])) {
        return ok({ error: "A staff member with this email already exists" }, { status: 409 });
      }
      // Promote existing user: update role + reset password
      const updates: Record<string, string> = { role: body.role };
      if (body.full_name) updates.full_name = body.full_name;
      const { error: promoteError } = await admin.from("profiles").update(updates).eq("id", existing.id);
      if (promoteError) throw promoteError;
      if (existing.auth_user_id) {
        await admin.auth.admin.updateUserById(existing.auth_user_id, { password: body.password });
      }
      return ok({ id: existing.id, promoted: true });
    }

    // Create new auth user with confirmed email and set password immediately — no email needed
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email: body.email,
      password: body.password,
      email_confirm: true,
      user_metadata: { full_name: body.full_name ?? "" },
    });
    if (createError) throw createError;

    // Upsert profile with admin role
    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .upsert(
        {
          auth_user_id: created.user.id,
          email: body.email,
          full_name: body.full_name ?? null,
          role: body.role,
        },
        { onConflict: "auth_user_id" },
      )
      .select("id")
      .maybeSingle();
    if (profileError) throw profileError;

    return ok({ id: profile?.id ?? created.user.id, created: true });
  } catch (error) {
    return handleApiError(error);
  }
}
