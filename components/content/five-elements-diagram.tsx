"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

export type ElementNode = {
  id: "wood" | "fire" | "earth" | "metal" | "water";
  label: string;
  emoji: string;
  color: string;
  season: string;
  organs: string;
  summary: string;
  generates: ElementNode["id"];
  controls: ElementNode["id"];
};

const POSITIONS: Record<ElementNode["id"], { x: number; y: number }> = {
  fire: { x: 200, y: 38 },
  wood: { x: 66, y: 126 },
  earth: { x: 118, y: 272 },
  metal: { x: 282, y: 272 },
  water: { x: 334, y: 126 },
};

function lineBetween(from: { x: number; y: number }, to: { x: number; y: number }, inset = 24) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.sqrt(dx * dx + dy * dy) || 1;
  const ux = dx / length;
  const uy = dy / length;
  return {
    x1: from.x + ux * inset,
    y1: from.y + uy * inset,
    x2: to.x - ux * inset,
    y2: to.y - uy * inset,
  };
}

type ElementContentData = {
  herbs: Array<{ slug: string; label: string }>;
  conditions: Array<{ slug: string; label: string }>;
  products: Array<{ slug: string; label: string; categorySlug: string }>;
};

export function FiveElementsDiagram({
  locale,
  elements,
  dataByElement,
  storeSlug,
}: {
  locale: string;
  elements: ElementNode[];
  dataByElement: Record<ElementNode["id"], ElementContentData>;
  storeSlug?: string;
}) {
  const [active, setActive] = useState<ElementNode["id"]>(elements[0]?.id || "wood");
  const [expanded, setExpanded] = useState<Record<ElementNode["id"], boolean>>({
    wood: true,
    fire: false,
    earth: false,
    metal: false,
    water: false,
  });
  const activeNode = elements.find((node) => node.id === active) || elements[0];
  const map = useMemo(() => Object.fromEntries(elements.map((node) => [node.id, node])), [elements]);
  const activeData = dataByElement[active] || { herbs: [], conditions: [], products: [] };
  if (!activeNode) return null;
  const query = storeSlug ? `?store_slug=${encodeURIComponent(storeSlug)}` : "";

  return (
    <div className="space-y-4">
      <div className="rounded border bg-white p-4">
        <svg viewBox="0 0 400 320" className="mx-auto w-full max-w-[420px]">
          <defs>
            <marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="3.5" orient="auto">
              <polygon points="0 0, 8 3.5, 0 7" fill="#64748b" />
            </marker>
          </defs>

          {elements.map((element) => {
            const next = map[element.generates];
            if (!next) return null;
            const line = lineBetween(POSITIONS[element.id], POSITIONS[next.id], 28);
            return <line key={`g-${element.id}`} x1={line.x1} y1={line.y1} x2={line.x2} y2={line.y2} stroke="#64748b" strokeWidth="2" markerEnd="url(#arrow)" />;
          })}

          {elements.map((element) => {
            const target = map[element.controls];
            if (!target) return null;
            const line = lineBetween(POSITIONS[element.id], POSITIONS[target.id], 35);
            return (
              <line
                key={`c-${element.id}`}
                x1={line.x1}
                y1={line.y1}
                x2={line.x2}
                y2={line.y2}
                stroke="#94a3b8"
                strokeWidth="1.8"
                strokeDasharray="5 5"
                markerEnd="url(#arrow)"
                opacity={0.9}
              />
            );
          })}

          {elements.map((element) => {
            const pos = POSITIONS[element.id];
            const isActive = element.id === active;
            return (
              <g key={element.id} onClick={() => setActive(element.id)} className="cursor-pointer">
                <circle cx={pos.x} cy={pos.y} r={isActive ? 28 : 22} fill={element.color} opacity={isActive ? 0.95 : 0.82} />
                <text x={pos.x} y={pos.y - 2} textAnchor="middle" fill="#fff" fontSize="14" fontWeight="700">
                  {element.emoji}
                </text>
                <text x={pos.x} y={pos.y + 12} textAnchor="middle" fill="#fff" fontSize="10" fontWeight="600">
                  {element.label}
                </text>
              </g>
            );
          })}
        </svg>

        <p className="mt-2 text-center text-xs text-slate-500">Solid arrows: generation cycle (Sheng). Dashed arrows: control cycle (Ke). Click any node.</p>
      </div>

      <div className="rounded border bg-slate-50 p-4">
        <p className="text-sm font-semibold">
          {activeNode.emoji} {activeNode.label}
        </p>
        <p className="mt-1 text-sm text-slate-700">
          Season: {activeNode.season} · Organs: {activeNode.organs}
        </p>
        <p className="mt-1 text-sm text-slate-600">{activeNode.summary}</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <div>
            <p className="text-xs font-medium uppercase text-slate-500">Related herbs</p>
            <div className="mt-1 space-y-1">
              {activeData.herbs.map((herb) => (
                <Link key={herb.slug} href={`/${locale}/learn/herbs/${herb.slug}${query}`} className="block text-sm text-brand underline">
                  {herb.label}
                </Link>
              ))}
              {activeData.herbs.length === 0 ? <p className="text-xs text-slate-500">No herb data yet.</p> : null}
            </div>
          </div>
          <div>
            <p className="text-xs font-medium uppercase text-slate-500">Related conditions</p>
            <div className="mt-1 space-y-1">
              {activeData.conditions.map((condition) => (
                <Link key={condition.slug} href={`/${locale}/learn/conditions/${condition.slug}${query}`} className="block text-sm text-brand underline">
                  {condition.label}
                </Link>
              ))}
              {activeData.conditions.length === 0 ? <p className="text-xs text-slate-500">No condition data yet.</p> : null}
            </div>
          </div>
          <div>
            <p className="text-xs font-medium uppercase text-slate-500">Related products</p>
            <div className="mt-1 space-y-1">
              {activeData.products.map((product) => (
                <Link key={product.slug} href={`/${locale}/shop/${product.categorySlug}/${product.slug}${query}`} className="block text-sm text-brand underline">
                  {product.label}
                </Link>
              ))}
              {activeData.products.length === 0 ? <p className="text-xs text-slate-500">No product links yet.</p> : null}
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        {elements.map((element) => {
          const elementData = dataByElement[element.id] || { herbs: [], conditions: [], products: [] };
          const isOpen = expanded[element.id];
          return (
            <section key={element.id} className="rounded border bg-white">
              <button
                type="button"
                onClick={() => {
                  setActive(element.id);
                  setExpanded((prev) => ({ ...prev, [element.id]: !prev[element.id] }));
                }}
                className="flex w-full items-center justify-between px-4 py-3 text-left"
              >
                <span className="text-sm font-semibold">
                  {element.emoji} {element.label}
                </span>
                <span className="text-xs text-slate-500">{isOpen ? "Collapse" : "Expand"}</span>
              </button>
              {isOpen ? (
                <div className="grid gap-3 border-t bg-slate-50 p-4 sm:grid-cols-3">
                  <div>
                    <p className="text-xs font-medium uppercase text-slate-500">Herbs ({elementData.herbs.length})</p>
                    <div className="mt-1 space-y-1">
                      {elementData.herbs.map((herb) => (
                        <Link key={herb.slug} href={`/${locale}/learn/herbs/${herb.slug}${query}`} className="block text-sm text-brand underline">
                          {herb.label}
                        </Link>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase text-slate-500">Conditions ({elementData.conditions.length})</p>
                    <div className="mt-1 space-y-1">
                      {elementData.conditions.map((condition) => (
                        <Link key={condition.slug} href={`/${locale}/learn/conditions/${condition.slug}${query}`} className="block text-sm text-brand underline">
                          {condition.label}
                        </Link>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase text-slate-500">Products ({elementData.products.length})</p>
                    <div className="mt-1 space-y-1">
                      {elementData.products.map((product) => (
                        <Link key={product.slug} href={`/${locale}/shop/${product.categorySlug}/${product.slug}${query}`} className="block text-sm text-brand underline">
                          {product.label}
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              ) : null}
            </section>
          );
        })}
      </div>
    </div>
  );
}
