"use client";

import { useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type ProductDetailTabsProps = {
  sections: {
    description: string;
    tcmGuide: string;
    ingredients: string;
    usage: string;
  };
  reviewsCount?: number;
};

type TabKey = "description" | "tcmGuide" | "ingredients" | "usage" | "reviews";

const TAB_LABELS: Record<TabKey, string> = {
  description: "Description",
  tcmGuide: "TCM Guide",
  ingredients: "Ingredients",
  usage: "Usage",
  reviews: "Reviews",
};

export function ProductDetailTabs({ sections, reviewsCount = 0 }: ProductDetailTabsProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("description");

  const content = useMemo(() => {
    if (activeTab === "reviews") {
      return `### Reviews\n\nCustomer reviews are coming soon. Current sample count: **${reviewsCount}**.`;
    }
    if (activeTab === "description") return sections.description;
    if (activeTab === "tcmGuide") return sections.tcmGuide;
    if (activeTab === "ingredients") return sections.ingredients;
    return sections.usage;
  }, [activeTab, reviewsCount, sections]);

  return (
    <section className="mb-12">
      <div className="mb-7 flex border-b-2 border-[var(--neutral-200)]">
        {(["description", "tcmGuide", "ingredients", "usage", "reviews"] as TabKey[]).map((tab) => {
          const isActive = activeTab === tab;
          const label = tab === "reviews" ? `${TAB_LABELS[tab]} (${reviewsCount})` : TAB_LABELS[tab];
          return (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`-mb-0.5 border-b-2 px-5 py-3 text-[14px] font-semibold ${
                isActive ? "border-[var(--color-brand-500)] text-[var(--color-brand-600)]" : "border-transparent text-[var(--neutral-500)] hover:text-[var(--neutral-900)]"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => <h3 className="mb-3 mt-6 text-[30px] leading-[1.2] text-[var(--neutral-900)] first:mt-0">{children}</h3>,
          h2: ({ children }) => <h3 className="mb-3 mt-6 text-[32px] leading-[1.2] text-[var(--neutral-900)] first:mt-0">{children}</h3>,
          h3: ({ children }) => <h4 className="mb-2 mt-5 text-[24px] leading-[1.2] text-[var(--neutral-900)] first:mt-0">{children}</h4>,
          p: ({ children }) => <p className="mb-3 text-[15px] leading-[1.8] text-[var(--neutral-700)]">{children}</p>,
          ul: ({ children }) => <ul className="mb-5 space-y-2 text-[14px] text-[var(--neutral-700)]">{children}</ul>,
          ol: ({ children }) => <ol className="mb-5 list-decimal space-y-2 pl-5 text-[14px] text-[var(--neutral-700)]">{children}</ol>,
          li: ({ children }) => <li>{children}</li>,
          blockquote: ({ children }) => (
            <blockquote className="mb-5 rounded-[8px] border-l-4 border-[var(--color-brand-300)] bg-[var(--color-brand-50)] px-4 py-3 text-[14px] italic text-[var(--neutral-700)]">
              {children}
            </blockquote>
          ),
          strong: ({ children }) => <strong className="font-semibold text-[var(--neutral-900)]">{children}</strong>,
          a: ({ children, href }) => (
            <a className="text-[var(--color-brand-600)] underline underline-offset-2" href={href || "#"}>
              {children}
            </a>
          ),
          hr: () => <hr className="my-5 border-[var(--neutral-200)]" />,
          code: ({ children }) => <code className="rounded bg-[var(--neutral-100)] px-1 py-0.5 text-[13px]">{children}</code>,
        }}
      >
        {content}
      </ReactMarkdown>
    </section>
  );
}
