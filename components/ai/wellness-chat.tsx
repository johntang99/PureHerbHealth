"use client";

import { useMemo, useRef, useEffect, useState, FormEvent } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";

type ChatMessage = { role: "user" | "assistant"; content: string; timestamp?: string };
type ProductRec = {
  product_id: string;
  slug: string;
  name: string;
  image_url: string;
  price: number;
  relevance_reason: string;
};

const STORE_SLUG = process.env.NEXT_PUBLIC_STORE_SLUG ?? "pureherbhealth";

export function WellnessChat({ compact = false }: { compact?: boolean }) {
  const pathname = usePathname();
  const locale = useMemo(() => pathname?.split("/")[1] || "en", [pathname]);
  const isZh = locale === "zh";

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content: isZh
        ? "您好，我是中医养生顾问。您可以问我体质调理、草本知识、饮食建议、睡眠健康等任何问题。"
        : "Hello, I'm your TCM wellness advisor. Ask me about constitution types, herbal formulas, dietary guidance, sleep, or any wellness question.",
    },
  ]);
  const [input, setInput] = useState("");
  const [products, setProducts] = useState<ProductRec[]>([]);
  const [isLoading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const sessionId = useMemo(() => {
    if (typeof window === "undefined") return "web-session-default";
    const key = "phh_ai_session_id";
    const existing = window.localStorage.getItem(key);
    if (existing) return existing;
    const created = `sess_${crypto.randomUUID()}`;
    window.localStorage.setItem(key, created);
    return created;
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Handle suggestion button clicks from sidebar
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const btn = (e.target as HTMLElement).closest<HTMLButtonElement>(".suggestion-btn");
      if (btn?.dataset.question) {
        setInput(btn.dataset.question);
        inputRef.current?.focus();
      }
    }
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  async function send() {
    const text = input.trim();
    if (!text || isLoading) return;
    setInput("");
    setProducts([]);

    const nextMessages: ChatMessage[] = [
      ...messages,
      { role: "user", content: text, timestamp: new Date().toISOString() },
    ];
    setMessages(nextMessages);
    setLoading(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          store_slug: STORE_SLUG,
          session_id: sessionId,
          locale: isZh ? "zh" : "en",
          messages: nextMessages,
        }),
      });

      if (!res.body) { setLoading(false); return; }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let assistant = "";
      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const frames = buffer.split("\n\n");
        buffer = frames.pop() ?? "";

        for (const frame of frames) {
          const eventMatch = frame.match(/^event:\s*(.+)$/m);
          const dataMatch = frame.match(/^data:\s*(.+)$/m);
          if (!eventMatch || !dataMatch) continue;
          const event = eventMatch[1].trim();
          try {
            const payload = JSON.parse(dataMatch[1]);
            if (event === "text") {
              assistant += payload.token;
              setMessages((prev) => {
                const clone = [...prev];
                clone[clone.length - 1] = { role: "assistant", content: assistant };
                return clone;
              });
            } else if (event === "products") {
              setProducts(payload.products ?? []);
            }
          } catch { /* ignore */ }
        }
      }
    } catch {
      setMessages((prev) => {
        const clone = [...prev];
        clone[clone.length - 1] = {
          role: "assistant",
          content: isZh
            ? "抱歉，暂时无法连接到 AI 服务，请稍后再试。"
            : "Sorry, I'm having trouble connecting right now. Please try again in a moment.",
        };
        return clone;
      });
    }
    setLoading(false);
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    void send();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send();
    }
  }

  const msgAreaClass = compact
    ? "max-h-[40vh] min-h-[200px] overflow-y-auto"
    : "max-h-[460px] min-h-[320px] overflow-y-auto";

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-[var(--neutral-200)] bg-white shadow-sm">
      {/* Messages */}
      <div className={`${msgAreaClass} space-y-4 p-5`}>
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            {msg.role === "assistant" && (
              <div className="mr-2.5 mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--color-brand-500,#2D8C54)] text-[11px] font-bold text-white">
                ✦
              </div>
            )}
            <div
              className={[
                "max-w-[82%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
                msg.role === "user"
                  ? "rounded-br-sm bg-[var(--color-brand-500,#2D8C54)] text-white"
                  : "rounded-bl-sm border border-[var(--neutral-200)] bg-[var(--neutral-50,#fafafa)] text-[var(--neutral-800)]",
              ].join(" ")}
            >
              <span className="whitespace-pre-wrap break-words">{msg.content}</span>
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {isLoading && messages[messages.length - 1]?.role === "user" && (
          <div className="flex justify-start">
            <div className="mr-2.5 mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--color-brand-500,#2D8C54)] text-[11px] font-bold text-white">
              ✦
            </div>
            <div className="rounded-2xl rounded-bl-sm border border-[var(--neutral-200)] bg-[var(--neutral-50)] px-4 py-3">
              <span className="flex gap-1">
                {[0, 150, 300].map((delay) => (
                  <span
                    key={delay}
                    className="h-2 w-2 animate-bounce rounded-full bg-[var(--neutral-400)]"
                    style={{ animationDelay: `${delay}ms` }}
                  />
                ))}
              </span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Product recommendations */}
      {products.length > 0 && (
        <div className="border-t border-[var(--neutral-100)] bg-[var(--color-brand-50,#f0fdf4)] px-5 py-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-brand-600,#16a34a)]">
            {isZh ? "✦ 推荐产品" : "✦ Recommended products"}
          </p>
          <div className="flex gap-3 overflow-x-auto pb-1">
            {products.map((product) => (
              <Link
                key={product.product_id}
                href={`/${locale}/shop/search?q=${encodeURIComponent(product.name)}`}
                className="flex w-[160px] shrink-0 flex-col gap-1 rounded-xl border border-[var(--color-brand-200,#bbf7d0)] bg-white p-3 text-left transition hover:shadow-md"
              >
                <p className="line-clamp-2 text-[13px] font-semibold text-[var(--neutral-800)]">
                  {product.name}
                </p>
                <p className="text-xs text-[var(--neutral-500)]">
                  ${(product.price / 100).toFixed(2)}
                </p>
                <p className="line-clamp-2 text-[11px] text-[var(--neutral-500)]">
                  {product.relevance_reason}
                </p>
                <span className="mt-auto rounded-md bg-[var(--color-brand-500,#2D8C54)] px-2 py-1 text-center text-[11px] font-semibold text-white">
                  {isZh ? "查看 →" : "View →"}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="border-t border-[var(--neutral-200)] px-4 py-3">
        <form onSubmit={handleSubmit} className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            data-wellness-input
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              isZh
                ? "输入您的问题…（Enter 发送，Shift+Enter 换行）"
                : "Ask your wellness question… (Enter to send)"
            }
            className="max-h-[120px] min-h-[42px] flex-1 resize-none rounded-xl border border-[var(--neutral-200)] bg-[var(--neutral-50)] px-4 py-2.5 text-sm text-[var(--neutral-900)] placeholder:text-[var(--neutral-400)] focus:border-[var(--color-brand-400)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-200,#bbf7d0)]"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className={[
              "shrink-0 rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition-colors",
              input.trim() && !isLoading
                ? "bg-[var(--color-brand-500,#2D8C54)] hover:bg-[var(--color-brand-600,#22764a)]"
                : "cursor-not-allowed bg-[var(--neutral-300)]",
            ].join(" ")}
          >
            {isZh ? "发送" : "Send"}
          </button>
        </form>
        <p className="mt-2 text-[11px] text-[var(--neutral-400)]">
          {isZh ? "教育内容，非医疗建议。" : "Educational only, not medical advice."}
        </p>
      </div>
    </div>
  );
}
