"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import MemoryAnswer from "@/components/memory/MemoryAnswer";
import { askMemory } from "@/lib/memory/api";
import type { MemoryAnswer as Answer } from "@/lib/memory/types";

const suggestions = [
  "What did I do yesterday?",
  "Who did I meet at the hospital?",
  "What did I do after lunch?",
  "When was the last time I saw Anu?",
];

export default function AskMemoryPage() {
  const [question, setQuestion] = useState("");
  const [result, setResult] = useState<Answer | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(event?: FormEvent) {
    event?.preventDefault();
    if (!question.trim()) return;

    setLoading(true);
    setError("");
    setResult(null);

    try {
      setResult(await askMemory(question.trim()));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not search memories.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="memory-container">
      <div className="memory-input-page">
        <Link className="memory-back" href="/memory">← Back to Memory</Link>

        <section className="memory-input-card">
          <span className="eyebrow">Memory assistant</span>
          <h1>Help me remember.</h1>
          <p>
            Ask about a person, place, event or time. I&apos;ll look across
            your recorded experiences and connect the pieces.
          </p>

          <form className="ask-box" onSubmit={submit}>
            <input
              className="ask-input"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Who was with me yesterday?"
              aria-label="Ask about a memory"
            />
            <button className="memory-primary" type="submit" disabled={loading}>
              {loading ? "Thinking…" : "Remember"}
            </button>
          </form>

          <div className="memory-card-meta" style={{ marginTop: 16 }}>
            {suggestions.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                className="memory-chip"
                onClick={() => setQuestion(suggestion)}
                style={{ border: 0, cursor: "pointer" }}
              >
                {suggestion}
              </button>
            ))}
          </div>

          {error && <p className="memory-status">{error}</p>}
        </section>

        {result && <MemoryAnswer result={result} />}
      </div>
    </main>
  );
}
