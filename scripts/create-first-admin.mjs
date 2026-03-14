import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";

function loadEnvLocal(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  const env = {};
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx <= 0) continue;
    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

function parseArgs(argv) {
  const map = new Map();
  for (let i = 0; i < argv.length; i += 1) {
    const part = argv[i];
    if (!part.startsWith("--")) continue;
    const key = part.slice(2);
    const value = argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[i + 1] : "true";
    map.set(key, value);
  }
  return map;
}

function generatePassword() {
  return `Adm!n-${crypto.randomBytes(9).toString("base64url")}`;
}

function toErrorMessage(error) {
  if (!error) return "Unknown error";
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  if (typeof error === "object") {
    try {
      return JSON.stringify(error);
    } catch {
      return String(error);
    }
  }
  return String(error);
}

async function main() {
  const projectRoot = process.cwd();
  const env = loadEnvLocal(path.join(projectRoot, ".env.local"));
  const args = parseArgs(process.argv.slice(2));
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  }

  const email = args.get("email") || "admin@pureherbhealth.com";
  const fullName = args.get("name") || "PureHerbHealth Admin";
  const password = args.get("password") || generatePassword();

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  let userId = null;
  const created = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });

  if (created.error) {
    const message = created.error.message.toLowerCase();
    if (!message.includes("already") && !message.includes("exists")) {
      throw new Error(`createUser failed: ${toErrorMessage(created.error)}`);
    }
  } else {
    userId = created.data.user?.id ?? null;
  }

  if (!userId) {
    const listed = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (listed.error) throw new Error(`listUsers failed: ${toErrorMessage(listed.error)}`);
    const existing = listed.data.users.find((item) => item.email?.toLowerCase() === email.toLowerCase());
    userId = existing?.id ?? null;
  }

  if (!userId) {
    throw new Error(`Could not resolve user id for ${email}`);
  }

  const updateAuth = await supabase.auth.admin.updateUserById(userId, {
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });
  if (updateAuth.error) throw new Error(`updateUserById failed: ${toErrorMessage(updateAuth.error)}`);

  const upsert = await supabase
    .from("profiles")
    .upsert(
      {
        auth_user_id: userId,
        email,
        full_name: fullName,
        role: "platform_admin",
      },
      { onConflict: "auth_user_id" },
    )
    .select("id,auth_user_id,email,full_name,role")
    .single();
  if (upsert.error) throw new Error(`profile upsert failed: ${toErrorMessage(upsert.error)}`);

  console.log(
    JSON.stringify(
      {
        success: true,
        email,
        password,
        profile: upsert.data,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(
    JSON.stringify(
      {
        success: false,
        error: toErrorMessage(error),
      },
      null,
      2,
    ),
  );
  process.exit(1);
});
