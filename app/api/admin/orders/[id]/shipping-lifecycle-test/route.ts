import { createHmac } from "crypto";
import { z } from "zod";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { handleApiError, ok } from "@/lib/utils/api";

const bodySchema = z
  .object({
    rate_id: z.string().default("stub-usps-priority"),
    statuses: z.array(z.enum(["in_transit", "out_for_delivery", "delivered"])).min(1).max(3).optional(),
  })
  .optional();

function getWebhookSignature(payload: string) {
  const secret = process.env.EASYPOST_WEBHOOK_SECRET;
  if (!secret || secret === "...") return null;
  const digest = createHmac("sha256", secret).update(payload, "utf8").digest("hex");
  return `hmac-sha256-hex=${digest}`;
}

async function fetchJson(url: string, init?: RequestInit) {
  const response = await fetch(url, init);
  const text = await response.text();
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text };
  }
  return { status: response.status, data };
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const body = bodySchema.parse(await request.json().catch(() => undefined));
    const statuses = body?.statuses ?? ["in_transit", "out_for_delivery", "delivered"];

    const admin = getSupabaseAdminClient();
    const { data: initialOrder, error: initialError } = await admin
      .from("orders")
      .select("id,status,shipping_status,tracking_number")
      .eq("id", params.id)
      .maybeSingle();
    if (initialError) throw initialError;
    if (!initialOrder) return ok({ error: "Order not found" }, { status: 404 });

    const origin = new URL(request.url).origin;
    const label = await fetchJson(`${origin}/api/shipping/labels`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        order_id: params.id,
        rate_id: body?.rate_id ?? "stub-usps-priority",
      }),
    });
    if (label.status !== 200) {
      return ok(
        {
          error: "Label creation failed",
          label,
        },
        { status: 500 },
      );
    }

    const labelData = label.data as { tracking_number?: string };
    const trackingNumber = labelData.tracking_number;
    if (!trackingNumber) {
      return ok({ error: "Label did not return tracking number", label }, { status: 500 });
    }

    const transitions: Array<{
      input_status: string;
      webhook: { status: number; data: unknown };
      db: { status: string; shipping_status: string; delivered_at: string | null } | null;
    }> = [];

    for (const nextStatus of statuses) {
      const payload = {
        id: `evt_${Date.now()}_${nextStatus}`,
        object: "Event",
        mode: "test",
        description: `tracker.updated ${nextStatus}`,
        result: {
          id: `trk_${Date.now()}`,
          object: "Tracker",
          tracking_code: trackingNumber,
          status: nextStatus,
          status_detail: `qa_${nextStatus}`,
          tracking_details: [],
        },
      };
      const rawPayload = JSON.stringify(payload);
      const signature = getWebhookSignature(rawPayload);
      const webhook = await fetchJson(`${origin}/api/webhooks/easypost`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(signature ? { "x-hmac-signature": signature } : {}),
        },
        body: rawPayload,
      });

      const { data: db, error: dbError } = await admin
        .from("orders")
        .select("status,shipping_status,delivered_at")
        .eq("id", params.id)
        .maybeSingle();
      if (dbError) throw dbError;

      transitions.push({
        input_status: nextStatus,
        webhook,
        db: db
          ? {
              status: db.status,
              shipping_status: db.shipping_status,
              delivered_at: db.delivered_at ?? null,
            }
          : null,
      });
    }

    return ok({
      order_id: params.id,
      initial: {
        status: initialOrder.status,
        shipping_status: initialOrder.shipping_status,
        tracking_number: initialOrder.tracking_number,
      },
      label,
      transitions,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
