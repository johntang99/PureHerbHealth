export function MeridianDiagram({ meridians }: { meridians: string[] }) {
  return (
    <div className="rounded border p-3">
      <p className="mb-2 text-xs font-semibold">Meridians</p>
      <div className="flex flex-wrap gap-2">
        {meridians.length ? (
          meridians.map((item) => (
            <span key={item} className="rounded bg-sky-100 px-2 py-1 text-xs text-sky-700">
              {item}
            </span>
          ))
        ) : (
          <span className="text-xs text-neutral-500">No meridian data yet.</span>
        )}
      </div>
    </div>
  );
}
