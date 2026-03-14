"use client";

import { useState } from "react";

type Variant = { id: string; name: string; price: number; is_default?: boolean };

export function ProductVariantSelector({ variants }: { variants: Variant[] }) {
  const [active, setActive] = useState(variants.find((v) => v.is_default)?.id ?? variants[0]?.id);

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold">Variants</p>
      <div className="space-y-2">
        {variants.map((variant) => (
          <button
            key={variant.id}
            onClick={() => setActive(variant.id)}
            className={`flex w-full items-center justify-between rounded border px-3 py-2 text-sm ${active === variant.id ? "border-brand bg-brand/5" : ""}`}
          >
            <span>{variant.name}</span>
            <span>${variant.price.toFixed(2)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
