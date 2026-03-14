import type { User } from "@supabase/supabase-js";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export type ProfileRow = {
  id: string;
  auth_user_id: string | null;
  email: string | null;
  full_name: string | null;
  role: string;
  store_id: string | null;
};

function deriveFullName(user: User): string | null {
  const fromMetadata =
    (typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name : null) ||
    (typeof user.user_metadata?.name === "string" ? user.user_metadata.name : null);
  return fromMetadata?.trim() || null;
}

export async function ensureProfileForAuthUser(user: User): Promise<ProfileRow> {
  const admin = getSupabaseAdminClient();
  const email = user.email ?? null;
  const fullName = deriveFullName(user);

  const { data: existing, error: existingError } = await admin
    .from("profiles")
    .select("id,auth_user_id,email,full_name,role,store_id")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (existingError) throw existingError;

  if (existing) {
    const needsUpdate = existing.email !== email || (fullName && existing.full_name !== fullName);
    if (needsUpdate) {
      const { data: updated, error: updateError } = await admin
        .from("profiles")
        .update({
          email,
          full_name: fullName ?? existing.full_name,
        })
        .eq("id", existing.id)
        .select("id,auth_user_id,email,full_name,role,store_id")
        .single();
      if (updateError) throw updateError;
      return updated as ProfileRow;
    }
    return existing as ProfileRow;
  }

  const { data: created, error: createError } = await admin
    .from("profiles")
    .insert({
      auth_user_id: user.id,
      email,
      full_name: fullName,
      role: "customer",
    })
    .select("id,auth_user_id,email,full_name,role,store_id")
    .single();
  if (createError) throw createError;
  return created as ProfileRow;
}

export async function getAuthenticatedUserAndProfile() {
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error) {
    const message = error.message.toLowerCase();
    // Treat any token/session error as "not authenticated" — cart and public APIs must not break
    if (
      message.includes("auth session missing") ||
      message.includes("invalid jwt") ||
      message.includes("jwt expired") ||
      message.includes("token expired") ||
      message.includes("refresh token") ||
      message.includes("session_not_found") ||
      message.includes("token_not_found")
    ) return null;
    throw error;
  }
  const user = data.user;
  if (!user) return null;
  const profile = await ensureProfileForAuthUser(user);
  return { user, profile };
}
