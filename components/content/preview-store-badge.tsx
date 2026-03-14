type PreviewStoreBadgeProps = {
  storeSlug: string;
  storeName?: string | null;
  className?: string;
};

export function PreviewStoreBadge({ storeSlug, storeName, className }: PreviewStoreBadgeProps) {
  return (
    <p className={`text-xs text-slate-500 ${className || ""}`.trim()}>
      Preview store: <span className="font-medium">{storeSlug}</span>
      {storeName ? ` (${storeName})` : ""}
    </p>
  );
}
