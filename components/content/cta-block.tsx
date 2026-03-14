import Link from "next/link";

export function CTABlock({ kind, basePath }: { kind: "quiz" | "chat"; basePath: string }) {
  if (kind === "quiz") {
    return (
      <div className="my-4 rounded border border-amber-200 bg-amber-50 p-4">
        <p className="text-sm font-semibold">Discover your element</p>
        <p className="mt-1 text-sm text-slate-700">Take the constitution quiz for personalized wellness guidance.</p>
        <Link href={`${basePath}/quiz/constitution`} className="mt-2 inline-block text-sm text-brand underline">
          Take the quiz
        </Link>
      </div>
    );
  }
  return (
    <div className="my-4 rounded border border-blue-200 bg-blue-50 p-4">
      <p className="text-sm font-semibold">Need help choosing herbs?</p>
      <p className="mt-1 text-sm text-slate-700">Ask our AI herbal advisor for educational suggestions.</p>
      <Link href={`${basePath}/chat`} className="mt-2 inline-block text-sm text-brand underline">
        Open AI chat
      </Link>
    </div>
  );
}
