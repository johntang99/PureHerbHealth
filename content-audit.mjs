import fs from "fs";
import { createClient } from "@supabase/supabase-js";

const TOKEN_REGEX = /\{\{(\w+):([^}]+)\}\}/g;

function loadEnv() {
  const raw = fs.readFileSync(".env.local", "utf8");
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index === -1) continue;
    const key = trimmed.slice(0, index).trim();
    let value = trimmed.slice(index + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    process.env[key] = value;
  }
}

function extractTokens(body) {
  const tokens = [];
  let match = null;
  while ((match = TOKEN_REGEX.exec(body)) !== null) {
    tokens.push({ type: match[1].trim(), value: match[2].trim() });
  }
  TOKEN_REGEX.lastIndex = 0;
  return tokens;
}

function countInternalContentLinks(body) {
  const markdownLinks = body.match(/\[[^\]]+\]\((\/en\/learn\/[^)]+|\/zh\/learn\/[^)]+)\)/g) || [];
  return markdownLinks.length;
}

async function main() {
  loadEnv();
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const [{ data: products }, { data: categories }, { data: herbs }, { data: content }] = await Promise.all([
    supabase.from("products").select("slug").eq("enabled", true),
    supabase.from("categories").select("slug"),
    supabase.from("content").select("slug").eq("status", "published").eq("type", "herb_profile"),
    supabase.from("content").select("slug,body_markdown,linked_product_ids,status").eq("status", "published"),
  ]);

  const productSet = new Set((products || []).map((p) => p.slug));
  const categorySet = new Set((categories || []).map((c) => c.slug));
  const herbSet = new Set((herbs || []).map((h) => h.slug));
  const issues = [];

  for (const item of content || []) {
    const body = item.body_markdown || "";
    const tokens = extractTokens(body);
    const missing = [];
    let productTokenCount = 0;
    let ctaCount = 0;

    for (const token of tokens) {
      if (token.type === "product") {
        productTokenCount += 1;
        if (!productSet.has(token.value)) missing.push(`Missing product slug: ${token.value}`);
      } else if (token.type === "products") {
        productTokenCount += 1;
        if (!categorySet.has(token.value)) missing.push(`Missing category slug: ${token.value}`);
      } else if (token.type === "cta") {
        ctaCount += 1;
        if (!["quiz", "chat"].includes(token.value)) missing.push(`Unsupported CTA token: ${token.value}`);
      } else if (token.type === "herb") {
        if (!herbSet.has(token.value)) missing.push(`Missing herb slug: ${token.value}`);
      } else {
        missing.push(`Unsupported token type: ${token.type}`);
      }
    }

    const linkedProductCount = Array.isArray(item.linked_product_ids) ? item.linked_product_ids.length : 0;
    const internalContentLinks = countInternalContentLinks(body) + tokens.filter((t) => t.type === "herb").length;
    const productLinks = productTokenCount + linkedProductCount;

    if (internalContentLinks < 2) missing.push("Needs 2+ internal content links");
    if (productLinks < 2) missing.push("Needs 2+ product links");
    if (ctaCount < 1) missing.push("Needs 1+ CTA token");

    if (missing.length > 0) {
      issues.push({ content_slug: item.slug, missing });
    }
  }

  const result = {
    valid: issues.length === 0,
    total_content: content?.length || 0,
    issues,
  };
  console.log(JSON.stringify(result, null, 2));
  if (issues.length > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
