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
    <>
      {/* FAB button */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full bg-[var(--color-brand-500,#2D8C54)] px-4 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:bg-[var(--color-brand-600,#22764a)] hover:shadow-xl"
        aria-label="Open AI wellness advisor"
      >
        <span className="text-base">✦</span>
        <span className="hidden sm:inline">AI Advisor</span>
      </button>

      {/* Slide-in panel */}
      {open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px]"
            onClick={() => setOpen(false)}
          />
          {/* Panel */}
          <div className="fixed right-0 top-0 z-50 flex h-full w-full max-w-[420px] flex-col bg-white shadow-2xl">
            {/* Header */}
            <div className="flex items-center gap-3 border-b border-[var(--neutral-200)] bg-[var(--color-brand-500,#2D8C54)] px-4 py-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-sm text-white font-bold">
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
        </>
      )}
    </>
  );
}
