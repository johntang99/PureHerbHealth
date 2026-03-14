"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { WellnessChat } from "@/components/ai/wellness-chat";

export function ChatFabPanel() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Don't show on the dedicated ai-wellness page
  const isAiPage = pathname?.includes("/ai-wellness");

  if (isAiPage) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-2">
      {/* Floating chat panel — no backdrop, no page blocking */}
      {open && (
        <div className="flex h-[520px] w-[380px] flex-col overflow-hidden rounded-2xl border border-[var(--neutral-200)] bg-white shadow-2xl">
          {/* Header */}
          <div className="flex items-center gap-3 bg-[var(--color-brand-500,#2D8C54)] px-4 py-3">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20 text-sm font-bold text-white">
              ✦
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-white">TCM Wellness Advisor</p>
              <p className="text-[11px] text-white/70">AI-powered · Educational only</p>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="flex h-7 w-7 items-center justify-center rounded-full text-white/80 transition hover:bg-white/20 hover:text-white"
              aria-label="Close"
            >
              ✕
            </button>
          </div>
          {/* Chat */}
          <div className="flex-1 overflow-hidden">
            <WellnessChat compact />
          </div>
        </div>
      )}

      {/* FAB button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-full bg-[var(--color-brand-500,#2D8C54)] px-4 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:bg-[var(--color-brand-600,#22764a)] hover:shadow-xl"
        aria-label="Toggle AI wellness advisor"
      >
        <span className="text-base">{open ? "✕" : "✦"}</span>
        <span className="hidden sm:inline">{open ? "Close" : "AI Advisor"}</span>
      </button>
    </div>
  );
}
