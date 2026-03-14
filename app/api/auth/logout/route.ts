import { ok, unauthorized } from "@/lib/utils/api";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function POST() {
  const supabase = await getSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return unauthorized();

  await supabase.auth.signOut();
  return ok({ success: true });
}
