"use client";

import { useState } from "react";
import Image from "next/image";

type GalleryImage = { url?: string; alt?: string };

export function ProductGallery({ images }: { images: GalleryImage[] }) {
  const normalized = images.length
    ? images
    : [{ url: "https://images.unsplash.com/photo-1611071536590-1450f0ea49c9?auto=format&fit=crop&w=900&q=80", alt: "placeholder" }];
  const [active, setActive] = useState(0);

  return (
    <div className="space-y-[12px]">
      <div className="relative aspect-square overflow-hidden rounded-[16px] border border-[var(--neutral-200)] bg-gradient-to-br from-[var(--color-brand-50)] to-[var(--color-brand-100)]">
        <Image
          src={normalized[active]?.url ?? ""}
          alt={normalized[active]?.alt ?? "Product image"}
          width={900}
          height={900}
          className="h-full w-full object-cover"
        />
        <div className="absolute left-4 top-4 flex flex-col gap-1.5">
          <span className="rounded-full bg-[var(--color-accent-500)] px-3 py-[5px] text-[13px] font-bold text-white">★ Best Seller</span>
          <span className="rounded-full bg-[var(--color-brand-500)] px-3 py-[5px] text-[13px] font-bold text-white">✓ Dr. Huang Pick</span>
        </div>
        <span className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full border border-[var(--neutral-200)] bg-white text-lg text-[var(--neutral-400)] shadow-sm">
          ♡
        </span>
      </div>
      <div className="flex gap-2">
        {normalized.slice(0, 5).map((item, idx) => (
          <button
            key={`${item.url}-${idx}`}
            onClick={() => setActive(idx)}
            className={`h-[72px] w-[72px] overflow-hidden rounded-[8px] border-2 ${
              active === idx ? "border-[var(--color-brand-500)] bg-[var(--color-brand-50)]" : "border-[var(--neutral-200)] bg-[var(--neutral-100)]"
            }`}
          >
            <Image src={item.url ?? ""} alt={item.alt ?? "thumb"} width={160} height={160} className="h-full w-full object-cover" />
          </button>
        ))}
      </div>
    </div>
  );
}
