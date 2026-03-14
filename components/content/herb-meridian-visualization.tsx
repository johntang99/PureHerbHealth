const MERIDIAN_REGIONS: Array<{ key: string; region: string }> = [
  { key: "lung", region: "Upper Burner" },
  { key: "heart", region: "Upper Burner" },
  { key: "pericardium", region: "Upper Burner" },
  { key: "spleen", region: "Middle Burner" },
  { key: "stomach", region: "Middle Burner" },
  { key: "liver", region: "Middle Burner" },
  { key: "gallbladder", region: "Middle Burner" },
  { key: "kidney", region: "Lower Burner" },
  { key: "bladder", region: "Lower Burner" },
  { key: "large_intestine", region: "Lower Burner" },
  { key: "small_intestine", region: "Lower Burner" },
];

export function HerbMeridianVisualization({ meridians }: { meridians: string[] }) {
  const selected = new Set(meridians.map((m) => m.toLowerCase()));
  const grouped = new Map<string, string[]>();

  for (const entry of MERIDIAN_REGIONS) {
    const list = grouped.get(entry.region) || [];
    if (selected.has(entry.key)) list.push(entry.key.replace(/_/g, " "));
    grouped.set(entry.region, list);
  }

  return (
    <section className="rounded border bg-white p-3">
      <p className="text-sm font-medium">Meridian Channel Visualization</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        {Array.from(grouped.entries()).map(([region, channels]) => (
          <div key={region} className={`rounded border p-2 text-xs ${channels.length ? "bg-emerald-50 border-emerald-200" : "bg-slate-50 border-slate-200"}`}>
            <p className="font-semibold text-slate-700">{region}</p>
            {channels.length ? (
              <div className="mt-1 flex flex-wrap gap-1">
                {channels.map((channel) => (
                  <span key={channel} className="rounded bg-emerald-100 px-1.5 py-0.5 text-emerald-800">
                    {channel}
                  </span>
                ))}
              </div>
            ) : (
              <p className="mt-1 text-slate-500">No channel emphasis.</p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
