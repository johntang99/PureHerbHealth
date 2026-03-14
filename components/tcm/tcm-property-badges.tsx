const colorMap: Record<string, string> = {
  hot: "bg-red-100 text-red-700",
  warm: "bg-orange-100 text-orange-700",
  neutral: "bg-slate-100 text-slate-700",
  cool: "bg-blue-100 text-blue-700",
  cold: "bg-indigo-100 text-indigo-700",
};

export function TCMPropertyBadges({
  nature,
  meridians,
  flavors,
}: {
  nature?: string | null;
  meridians?: string[];
  flavors?: string[];
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {nature ? <span className={`rounded px-2 py-1 text-xs ${colorMap[nature] ?? "bg-slate-100 text-slate-700"}`}>Nature: {nature}</span> : null}
      {(flavors ?? []).map((item) => (
        <span key={item} className="rounded bg-emerald-100 px-2 py-1 text-xs text-emerald-700">
          {item}
        </span>
      ))}
      {(meridians ?? []).map((item) => (
        <span key={item} className="rounded bg-violet-100 px-2 py-1 text-xs text-violet-700">
          {item}
        </span>
      ))}
    </div>
  );
}
