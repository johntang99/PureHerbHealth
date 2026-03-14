"use client";

import { useRouter, useSearchParams } from "next/navigation";

export type StoreOption = {
  id: string;
  name: string;
  slug: string;
};

export function StoreSelector({
  stores,
  allowAll = true,
  className = "",
}: {
  stores: StoreOption[];
  allowAll?: boolean;
  className?: string;
}) {
  const router = useRouter();
  const search = useSearchParams();
  const current = search.get("store_id") || "all";

  function onChange(next: string) {
    const params = new URLSearchParams(search.toString());
    if (next === "all") {
      params.delete("store_id");
    } else {
      params.set("store_id", next);
    }
    const query = params.toString();
    router.push(query ? `?${query}` : "?");
  }

  return (
    <label className={`inline-flex items-center gap-2 text-sm ${className}`}>
      <span className="text-slate-600">Store</span>
      <select
        value={current}
        onChange={(event) => onChange(event.target.value)}
        className="rounded border bg-white px-2 py-1 text-sm"
      >
        {allowAll ? <option value="all">All Stores</option> : null}
        {stores.map((store) => (
          <option key={store.id} value={store.id}>
            {store.name}
          </option>
        ))}
      </select>
    </label>
  );
}
