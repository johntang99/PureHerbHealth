import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { handleApiError, ok } from "@/lib/utils/api";

function parseCsv(text: string) {
  const rows = text
    .split(/\r?\n/)
    .map((row) => row.trim())
    .filter(Boolean);
  if (rows.length < 2) return [];
  const headers = rows[0].split(",").map((v) => v.trim().toLowerCase());
  return rows.slice(1).map((row, index) => {
    const values = row.split(",").map((v) => v.trim());
    const out: Record<string, string> = { _row: String(index + 2) };
    headers.forEach((header, headerIndex) => {
      out[header] = values[headerIndex] || "";
    });
    return out;
  });
}

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!file || !(file instanceof File)) {
      return ok({ error: "CSV file is required under form field `file`." }, { status: 400 });
    }

    const csvText = await file.text();
    const rows = parseCsv(csvText);
    const admin = getSupabaseAdminClient();

    let successful = 0;
    const errors: Array<{ row: number; sku: string; error: string }> = [];

    for (const row of rows) {
      const sku = row.sku || "";
      if (!sku) {
        errors.push({ row: Number(row._row), sku: "", error: "Missing SKU" });
        continue;
      }

      const { data: product, error: productError } = await admin
        .from("products")
        .select("id,stock_quantity")
        .eq("sku", sku)
        .maybeSingle();
      if (productError) throw productError;
      if (!product) {
        errors.push({ row: Number(row._row), sku, error: "SKU not found" });
        continue;
      }

      let adjustment = 0;
      if (row.adjustment) {
        const parsed = Number(row.adjustment);
        if (!Number.isFinite(parsed) || !Number.isInteger(parsed)) {
          errors.push({ row: Number(row._row), sku, error: "Invalid adjustment" });
          continue;
        }
        adjustment = parsed;
      } else if (row.quantity) {
        const nextQuantity = Number(row.quantity);
        if (!Number.isFinite(nextQuantity) || !Number.isInteger(nextQuantity) || nextQuantity < 0) {
          errors.push({ row: Number(row._row), sku, error: "Invalid quantity" });
          continue;
        }
        adjustment = nextQuantity - (product.stock_quantity ?? 0);
      } else {
        errors.push({ row: Number(row._row), sku, error: "Missing quantity or adjustment column" });
        continue;
      }

      const { error: rpcError } = await admin.rpc("adjust_stock", {
        p_product_id: product.id,
        p_adjustment: adjustment,
        p_reason: "restock",
        p_notes: "CSV import",
        p_variant_id: null,
        p_reference_id: null,
        p_adjusted_by: null,
      });

      if (rpcError) {
        errors.push({ row: Number(row._row), sku, error: rpcError.message });
      } else {
        successful += 1;
      }
    }

    return ok({
      total_rows: rows.length,
      successful,
      failed: errors.length,
      errors,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
