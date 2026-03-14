"use client";

import { useState, useRef, useEffect } from "react";
import { usePathname } from "next/navigation";
import { WellnessChat } from "@/components/ai/wellness-chat";

const DEFAULT_W = 380;
const DEFAULT_H = 520;
const MIN_W = 280;
const MIN_H = 320;

export function ChatFabPanel() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Position stored in refs so event listeners don't need to be re-registered
  const posRef = useRef({ x: 0, y: 0 });
  const sizeRef = useRef({ w: DEFAULT_W, h: DEFAULT_H });
  const [pos, _setPos] = useState(posRef.current);
  const [size, _setSize] = useState(sizeRef.current);
  const initialized = useRef(false);

  const dragging = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const resizing = useRef(false);
  const resizeStart = useRef({ mouseX: 0, mouseY: 0, w: DEFAULT_W, h: DEFAULT_H });

  // Initialize position to bottom-right on first open
  useEffect(() => {
    if (open && !initialized.current) {
      initialized.current = true;
      const x = window.innerWidth - DEFAULT_W - 20;
      const y = window.innerHeight - DEFAULT_H - 80;
      posRef.current = { x, y };
      _setPos({ x, y });
    }
  }, [open]);

  // Single event listener registration — uses refs, no re-registration on state changes
  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      if (dragging.current) {
        const newX = Math.max(0, Math.min(window.innerWidth - sizeRef.current.w, e.clientX - dragOffset.current.x));
        const newY = Math.max(0, Math.min(window.innerHeight - sizeRef.current.h, e.clientY - dragOffset.current.y));
        posRef.current = { x: newX, y: newY };
        _setPos({ x: newX, y: newY });
      }
      if (resizing.current) {
        const dx = e.clientX - resizeStart.current.mouseX;
        const dy = e.clientY - resizeStart.current.mouseY;
        const newW = Math.max(MIN_W, resizeStart.current.w + dx);
        const newH = Math.max(MIN_H, resizeStart.current.h + dy);
        sizeRef.current = { w: newW, h: newH };
        _setSize({ w: newW, h: newH });
      }
    }
    function onMouseUp() {
      dragging.current = false;
      resizing.current = false;
    }
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, []);

  const isAiPage = pathname?.includes("/ai-wellness");
  if (isAiPage) return null;

  return (
    <>
      {/* Draggable + resizable floating chat panel */}
      {open && (
        <div
          style={{ left: pos.x, top: pos.y, width: size.w, height: size.h }}
          className="fixed z-50 flex flex-col overflow-hidden rounded-2xl border border-[var(--neutral-200)] bg-white shadow-2xl"
        >
          {/* Header — drag handle */}
          <div
            onMouseDown={(e) => {
              e.preventDefault();
              dragging.current = true;
              dragOffset.current = { x: e.clientX - posRef.current.x, y: e.clientY - posRef.current.y };
            }}
            className="flex cursor-move select-none items-center gap-3 bg-[var(--color-brand-500,#2D8C54)] px-4 py-3"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20 text-sm font-bold text-white">
              ✦
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-white">TCM Wellness Advisor</p>
              <p className="text-[11px] text-white/70">AI-powered · Educational only</p>
            </div>
            <button
              onMouseDown={(e) => e.stopPropagation()}
              onClick={() => setOpen(false)}
              className="flex h-7 w-7 items-center justify-center rounded-full text-white/80 transition hover:bg-white/20 hover:text-white"
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          {/* Chat content */}
          <div className="flex-1 overflow-hidden">
            <WellnessChat compact />
          </div>

          {/* Resize handle — bottom-right corner */}
          <div
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              resizing.current = true;
              resizeStart.current = {
                mouseX: e.clientX,
                mouseY: e.clientY,
                w: sizeRef.current.w,
                h: sizeRef.current.h,
              };
            }}
            title="Drag to resize"
            className="absolute bottom-0 right-0 h-5 w-5 cursor-se-resize"
            style={{
              background: "linear-gradient(135deg, transparent 40%, rgba(0,0,0,0.15) 40%, rgba(0,0,0,0.15) 55%, transparent 55%, transparent 70%, rgba(0,0,0,0.15) 70%)",
              borderRadius: "0 0 16px 0",
            }}
          />
        </div>
      )}

      {/* FAB toggle button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-full bg-[var(--color-brand-500,#2D8C54)] px-4 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:bg-[var(--color-brand-600,#22764a)] hover:shadow-xl"
        aria-label="Toggle AI wellness advisor"
      >
        <span className="text-base">{open ? "✕" : "✦"}</span>
        <span className="hidden sm:inline">{open ? "Close" : "AI Advisor"}</span>
      </button>
    </>
  );
}
