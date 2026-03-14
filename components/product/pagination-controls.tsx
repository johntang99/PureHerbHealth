"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

export function PaginationControls({ page, totalPages }: { page: number; totalPages: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const go = (nextPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(nextPage));
    router.replace(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="flex items-center justify-center gap-3 py-6">
      <button disabled={page <= 1} onClick={() => go(page - 1)} className="rounded-md border border-[var(--neutral-300)] px-4 py-2 text-sm disabled:opacity-40">
        Prev
      </button>
      <span className="text-sm text-[var(--neutral-600)]">
        Page {page} / {Math.max(1, totalPages)}
      </span>
      <button disabled={page >= totalPages} onClick={() => go(page + 1)} className="rounded-md border border-[var(--neutral-300)] px-4 py-2 text-sm disabled:opacity-40">
        Next
      </button>
    </div>
  );
}
