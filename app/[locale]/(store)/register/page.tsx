"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { resolveStoreSlug } from "@/lib/store/slug";

export default function RegisterPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const locale = pathname.split("/").filter(Boolean)[0] || "en";
  const isZh = locale === "zh";
  const nextPath = searchParams.get("next") || `/${locale}/account`;
  const storeSlug = useMemo(() => resolveStoreSlug(searchParams.get("store_slug")), [searchParams]);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (successMessage) return;
    if (isSubmitting) return;
    setSubmitting(true);
    setErrorMessage("");
    setSuccessMessage("");

    const supabase = getSupabaseBrowserClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
      },
    });

    if (error) {
      setErrorMessage(error.message);
      setSubmitting(false);
      return;
    }

    if (data.session) {
      await fetch("/api/account/bootstrap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ store_slug: storeSlug }),
      });
      router.replace(nextPath);
      router.refresh();
      return;
    }

    setSuccessMessage(isZh ? "账户已创建。请先到邮箱确认，再登录。" : "Account created. Please check your email to confirm, then sign in.");
    setSubmitting(false);
  }

  return (
    <section className="mx-auto max-w-[460px] space-y-5">
      <div className="space-y-1 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--color-brand-500)]">{isZh ? "账户" : "Account"}</p>
        <h1 className="text-[34px]" style={{ fontFamily: "var(--font-heading)" }}>
          {isZh ? "创建账户" : "Create account"}
        </h1>
      </div>

      <form onSubmit={onSubmit} className="space-y-3 rounded-xl border border-[var(--neutral-200)] bg-white p-5">
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-[var(--neutral-700)]">{isZh ? "姓名" : "Full name"}</span>
          <input
            className="h-10 w-full rounded-md border border-[var(--neutral-300)] px-3 text-sm"
            type="text"
            autoComplete="name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
          />
        </label>
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
            autoComplete="new-password"
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>

        {errorMessage ? <p className="text-sm text-red-600">{errorMessage}</p> : null}
        {successMessage ? <p className="text-sm text-emerald-700">{successMessage}</p> : null}

        <button
          type="submit"
          disabled={isSubmitting || Boolean(successMessage)}
          className="inline-flex h-11 w-full items-center justify-center rounded-md bg-[var(--color-brand-500)] px-4 text-sm font-semibold text-white hover:bg-[var(--color-brand-600)] disabled:opacity-60"
        >
          {successMessage
            ? isZh
              ? "账户已创建"
              : "Account created"
            : isSubmitting
              ? isZh
                ? "正在创建账户..."
                : "Creating account..."
              : isZh
                ? "创建账户"
                : "Create account"}
        </button>
      </form>

      <p className="text-center text-sm text-[var(--neutral-600)]">
        {isZh ? "已有账户？" : "Already have an account?"}{" "}
        <Link href={`/${locale}/login?next=${encodeURIComponent(nextPath)}`} className="font-semibold text-[var(--color-brand-600)]">
          {isZh ? "去登录" : "Sign in"}
        </Link>
      </p>
    </section>
  );
}
