"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function LogoutButton({ locale }: { locale: string }) {
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();
  const isZh = locale === "zh";

  return (
    <button
      type="button"
      disabled={submitting}
      className="inline-flex h-9 items-center justify-center rounded-md border border-[var(--neutral-300)] px-3 text-sm font-medium text-[var(--neutral-700)] hover:bg-[var(--neutral-100)] disabled:opacity-60"
      onClick={async () => {
        if (submitting) return;
        setSubmitting(true);
        await fetch("/api/auth/logout", { method: "POST" });
        router.replace(`/${locale}/login`);
        router.refresh();
      }}
    >
      {submitting ? (isZh ? "正在退出..." : "Signing out...") : isZh ? "退出登录" : "Sign out"}
    </button>
  );
}
