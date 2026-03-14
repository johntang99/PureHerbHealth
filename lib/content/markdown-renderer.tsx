import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Locale } from "@/lib/i18n/config";
import { CTABlock } from "@/components/content/cta-block";
import { EmbeddedProductCard } from "@/components/content/embedded-product-card";
import { RelatedProductsBlock } from "@/components/content/related-products-block";
import { InlineHerbLink } from "@/components/content/inline-herb-link";

type Segment =
  | { kind: "markdown"; value: string }
  | { kind: "embed"; tokenType: string; tokenValue: string };

const TOKEN_REGEX = /\{\{(\w+):([^}]+)\}\}/g;

function splitSegments(body: string): Segment[] {
  const segments: Segment[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = TOKEN_REGEX.exec(body)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ kind: "markdown", value: body.slice(lastIndex, match.index) });
    }
    segments.push({ kind: "embed", tokenType: match[1].trim(), tokenValue: match[2].trim() });
    lastIndex = TOKEN_REGEX.lastIndex;
  }
  if (lastIndex < body.length) {
    segments.push({ kind: "markdown", value: body.slice(lastIndex) });
  }
  return segments;
}

export function extractProductSlugsFromEmbeds(body: string) {
  const products: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = TOKEN_REGEX.exec(body)) !== null) {
    if (match[1] === "product") products.push(match[2].trim());
  }
  TOKEN_REGEX.lastIndex = 0;
  return products;
}

export async function renderContentMarkdown({
  body,
  locale,
  basePath,
}: {
  body: string;
  locale: Locale;
  basePath: string;
}) {
  const segments = splitSegments(body);
  const rendered = await Promise.all(
    segments.map(async (segment, index) => {
      if (segment.kind === "markdown") {
        return (
          <div key={`md-${index}`} className="prose max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{segment.value}</ReactMarkdown>
          </div>
        );
      }
      if (segment.tokenType === "product") {
        return <EmbeddedProductCard key={`embed-${index}`} productSlug={segment.tokenValue} locale={locale} />;
      }
      if (segment.tokenType === "products") {
        return <RelatedProductsBlock key={`embed-${index}`} categorySlug={segment.tokenValue} locale={locale} />;
      }
      if (segment.tokenType === "cta") {
        const kind = segment.tokenValue === "quiz" ? "quiz" : "chat";
        return <CTABlock key={`embed-${index}`} kind={kind} basePath={basePath} />;
      }
      if (segment.tokenType === "herb") {
        return (
          <p key={`embed-${index}`} className="my-2 text-sm">
            <InlineHerbLink herbSlug={segment.tokenValue} locale={locale} />
          </p>
        );
      }
      return (
        <p key={`embed-${index}`} className="my-2 text-xs text-slate-500">
          Unsupported token: {segment.tokenType}:{segment.tokenValue}
        </p>
      );
    }),
  );
  return <>{rendered}</>;
}
