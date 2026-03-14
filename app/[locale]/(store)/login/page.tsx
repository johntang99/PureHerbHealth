"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { resolveStoreSlug } from "@/lib/store/slug";

export default function LoginPage() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const locale = pathname.split("/").filter(Boolean)[0] || "en";
  const isZh = locale === "zh";
  const nextPath = searchParams.get("next") || `/${locale}/account`;
  const storeSlug = useMemo(() => resolveStoreSlug(searchParams.get("store_slug")), [searchParams]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [infoMessage, setInfoMessage] = useState("");

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (isSubmitting) return;
    setSubmitting(true);
    setErrorMessage("");
    setInfoMessage("");

    try {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setErrorMessage(error.message);
        return;
      }

      if (!data.user) {
        setErrorMessage(isZh ? "登录失败，请重试。" : "Unable to sign in. Please try again.");
        return;
      }

      const bootstrapRes = await Promise.race([
        fetch("/api/account/bootstrap", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ store_slug: storeSlug }),
        }),
        new Promise<Response>((resolve) =>
          setTimeout(() => resolve(new Response(JSON.stringify({ error: "bootstrap timeout" }), { status: 504 })), 6000),
        ),
      ]);

      if (!bootstrapRes.ok) {
        const payload = (await bootstrapRes.json().catch(() => ({}))) as { error?: string };
        setInfoMessage(payload.error || (isZh ? "已登录，但账户初始化需要重试。" : "Signed in, but account bootstrap needs retry."));
      }

      await supabase.auth.getSession();
      window.location.href = nextPath;
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="mx-auto max-w-[460px] space-y-5">
      <div className="space-y-1 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--color-brand-500)]">{isZh ? "账户" : "Account"}</p>
        <h1 className="text-[34px]" style={{ fontFamily: "var(--font-heading)" }}>
          {isZh ? "登录" : "Sign in"}
        </h1>
      </div>

      <form onSubmit={onSubmit} className="space-y-3 rounded-xl border border-[var(--neutral-200)] bg-white p-5">
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-[var(--neutral-700)]">{isZh ? "邮箱" : "Email"}</span>
          <input
            className="h-10 w-full rounded-md border border-[var(--neutral-300)] px-3 text-sm"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-[var(--neutral-700)]">{isZh ? "密码" : "Password"}</span>
          <input
            className="h-10 w-full rounded-md border border-[var(--neutral-300)] px-3 text-sm"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>

        {errorMessage ? <p className="text-sm text-red-600">{errorMessage}</p> : null}
        {infoMessage ? <p className="text-sm text-amber-600">{infoMessage}</p> : null}

        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex h-11 w-full items-center justify-center rounded-md bg-[var(--color-brand-500)] px-4 text-sm font-semibold text-white hover:bg-[var(--color-brand-600)] disabled:opacity-60"
        >
          {isSubmitting ? (isZh ? "正在登录..." : "Signing in...") : isZh ? "登录" : "Sign in"}
        </button>
      </form>

      <p className="text-center text-sm text-[var(--neutral-600)]">
        {isZh ? "还没有账户？" : "No account yet?"}{" "}
        <Link href={`/${locale}/register?next=${encodeURIComponent(nextPath)}`} className="font-semibold text-[var(--color-brand-600)]">
          {isZh ? "立即注册" : "Create one"}
        </Link>
      </p>
    </section>
  );
}
