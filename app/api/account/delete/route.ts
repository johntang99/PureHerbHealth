import { z } from "zod";
import { handleApiError, ok, unauthorized } from "@/lib/utils/api";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { ensureProfileForAuthUser } from "@/lib/auth/profile";

const schema = z.object({
  confirmation: z.string().min(1),
});

const REQUIRED_CONFIRMATION = "DELETE MY ACCOUNT";

export async function DELETE(request: Request) {
  try {
    const body = schema.parse(await request.json());

    const supabase = await getSupabaseServerClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) return unauthorized();

    if (body.confirmation.trim().toUpperCase() !== REQUIRED_CONFIRMATION) {
      return ok({ error: `Please type "${REQUIRED_CONFIRMATION}" to confirm account deletion.` }, { status: 400 });
    }

    const profile = await ensureProfileForAuthUser(user);
    const admin = getSupabaseAdminClient();

    // Keep order records for finance/tax, but unlink from deleted profile.
    const { error: unlinkOrdersError } = await admin.from("orders").update({ profile_id: null }).eq("profile_id", profile.id);
    if (unlinkOrdersError) throw unlinkOrdersError;

    // Remove user-owned cart state and related items.
    const { error: deleteCartsError } = await admin.from("carts").delete().eq("profile_id", profile.id);
    if (deleteCartsError) throw deleteCartsError;

    // Null profile references in optional relation fields.
    const nullableUpdates: Array<{ table: string; column: string }> = [
      { table: "ai_chat_logs", column: "profile_id" },
      { table: "ai_conversations", column: "profile_id" },
      { table: "constitution_assessments", column: "profile_id" },
      { table: "ai_chat_messages", column: "profile_id" },
      { table: "ai_generations", column: "created_by" },
      { table: "returns", column: "customer_id" },
      { table: "order_internal_notes", column: "author_id" },
      { table: "stock_adjustments", column: "adjusted_by" },
    ];

    for (const update of nullableUpdates) {
      const { error } = await admin.from(update.table).update({ [update.column]: null }).eq(update.column, profile.id);
      if (error) throw error;
    }

    const { error: deleteProfileError } = await admin.from("profiles").delete().eq("id", profile.id);
    if (deleteProfileError) throw deleteProfileError;

    const { error: deleteAuthUserError } = await admin.auth.admin.deleteUser(user.id);
    if (deleteAuthUserError) throw deleteAuthUserError;

    await supabase.auth.signOut();
    return ok({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
