"use client";

import Image from "next/image";
import { useMemo, useState } from "react";

function canRenderLogo(url?: string | null) {
  if (!url) return false;
  return url.startsWith("http://") || url.startsWith("https://") || url.startsWith("/");
}

export function StoreLogo({ logoUrl, siteName }: { logoUrl?: string | null; siteName: string }) {
  const [broken, setBroken] = useState(false);
  const showImage = canRenderLogo(logoUrl) && !broken;
  const fallbackLabel = useMemo(() => (siteName || "Store").slice(0, 1).toUpperCase(), [siteName]);

  if (showImage) {
    return (
      <Image
        src={logoUrl as string}
        alt={`${siteName} logo`}
        width={144}
        height={40}
        className="h-9 w-auto object-contain"
        onError={() => setBroken(true)}
      />
    );
  }

  return (
    <div className="flex h-9 w-9 items-center justify-center rounded border border-[var(--color-brand-200)] bg-[var(--color-brand-100)] text-sm font-semibold text-[var(--color-brand-700)]">
      {fallbackLabel}
    </div>
  );
}
