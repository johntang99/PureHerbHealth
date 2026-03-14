import { z } from "zod";
import { handleApiError, ok, unauthorized } from "@/lib/utils/api";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { ensureProfileForAuthUser } from "@/lib/auth/profile";

const securitySchema = z
  .object({
    email: z.string().email().optional(),
    password: z.string().min(8).max(128).optional(),
  })
  .refine((value) => Boolean(value.email || value.password), "At least one field is required.");

export async function PUT(request: Request) {
  try {
    const body = securitySchema.parse(await request.json());
    const supabase = await getSupabaseServerClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) return unauthorized();

    const currentEmail = (user.email || "").trim().toLowerCase();
    const requestedEmail = (body.email || "").trim().toLowerCase();
    const emailChanged = Boolean(requestedEmail) && requestedEmail !== currentEmail;

    const updatePayload: { email?: string; password?: string } = {};
    if (emailChanged) updatePayload.email = body.email;
    if (body.password) updatePayload.password = body.password;
    if (!updatePayload.email && !updatePayload.password) {
      return ok({
        success: true,
        requires_email_confirmation: false,
        message: "No security changes detected.",
      });
    }

    const { data, error } = await supabase.auth.updateUser(updatePayload);
    if (error) throw error;

    if (data.user) {
      await ensureProfileForAuthUser(data.user);
    }

    return ok({
      success: true,
      requires_email_confirmation: emailChanged,
      message: emailChanged
        ? "Email update requested. Please confirm using the link sent to your new email."
        : "Password updated successfully.",
    });
  } catch (error) {
    return handleApiError(error);
  }
}
