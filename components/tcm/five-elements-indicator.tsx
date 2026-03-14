export function FiveElementsIndicator({ elements }: { elements: string[] }) {
  const all = ["wood", "fire", "earth", "metal", "water"];
  return (
    <div className="grid grid-cols-5 gap-2">
      {all.map((item) => (
        <div key={item} className={`rounded border px-2 py-1 text-center text-xs ${elements.includes(item) ? "bg-brand/10 border-brand text-brand" : "text-neutral-500"}`}>
          {item}
        </div>
      ))}
    </div>
  );
}
