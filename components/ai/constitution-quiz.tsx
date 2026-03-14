"use client";

import { useMemo, useState } from "react";

const QUESTIONS = [
  "How is your energy throughout the day?",
  "How do you respond to cold weather?",
  "How is your digestion after meals?",
  "How is your sleep quality?",
  "How do you handle stress?",
];

export function ConstitutionQuiz() {
  const [answers, setAnswers] = useState<Record<string, "a" | "b" | "c" | "d">>({});
  const [result, setResult] = useState<null | {
    constitution: { english_name: string; description: string };
    explanation: string;
    lifestyle_tips: string[];
  }>(null);
  const [loading, setLoading] = useState(false);
  const sessionId = useMemo(() => {
    if (typeof window === "undefined") return "web-session-default";
    const key = "phh_ai_session_id";
    const existing = window.localStorage.getItem(key);
    if (existing) return existing;
    const created = `sess_${crypto.randomUUID()}`;
    window.localStorage.setItem(key, created);
    return created;
  }, []);
  const answeredCount = Object.keys(answers).length;
  const progress = Math.round((answeredCount / QUESTIONS.length) * 100);

  async function submit() {
    setLoading(true);
    const response = await fetch("/api/ai/constitution-quiz", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        store_slug: process.env.NEXT_PUBLIC_STORE_SLUG || "pureherbhealth",
        session_id: sessionId,
        answers,
      }),
    });
    const json = await response.json();
    setResult(json);
    setLoading(false);
  }

  return (
    <div className="space-y-4 rounded border bg-white p-4">
      <h3 className="text-lg font-semibold">Constitution Quiz</h3>
      <p className="text-xs text-slate-600">Quick version (Phase 3 wiring): answer with A/B/C/D.</p>
      <div className="h-2 overflow-hidden rounded bg-slate-200">
        <div className="h-full bg-brand transition-all" style={{ width: `${progress}%` }} />
      </div>
      <p className="text-xs text-slate-500">{answeredCount}/{QUESTIONS.length} answered</p>
      {QUESTIONS.map((question, index) => {
        const id = `q${index + 1}`;
        return (
          <div key={id} className="space-y-1">
            <p className="text-sm">{question}</p>
            <div className="grid grid-cols-4 gap-2 sm:flex">
              {(["a", "b", "c", "d"] as const).map((value) => (
                <button
                  key={value}
                  className={`rounded border px-2 py-1 text-xs ${answers[id] === value ? "border-brand bg-brand/10" : ""}`}
                  onClick={() => setAnswers((prev) => ({ ...prev, [id]: value }))}
                >
                  {value.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        );
      })}
      <button
        className="rounded bg-brand px-4 py-2 text-sm text-white disabled:opacity-60"
        onClick={() => void submit()}
        disabled={loading || answeredCount < QUESTIONS.length}
      >
        {loading ? "Scoring..." : "Get my assessment"}
      </button>
      {result ? (
        <div className="space-y-2 rounded bg-slate-50 p-3 text-sm">
          <p className="font-semibold">{result.constitution.english_name}</p>
          <p>{result.constitution.description}</p>
          <p>{result.explanation}</p>
          <ul className="list-disc pl-5">
            {(result.lifestyle_tips || []).map((tip, idx) => (
              <li key={idx}>{tip}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
