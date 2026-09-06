"use client";

import type { MemoryAnswer as Answer } from "@/lib/memory/types";

export default function MemoryAnswer({ result }: { result: Answer }) {
  return (
    <section className="answer-card">
      <div className="answer-heading">
        <span className="answer-icon">🧠</span>
        <div>
          <span className="eyebrow">Memory found</span>
          <h2>Here&apos;s what I found</h2>
        </div>
      </div>

      <p className="answer-text">{result.answer}</p>

      <div className={`confidence confidence-${result.confidence}`}>
        {result.confidence === "high"
          ? "Strong match"
          : result.confidence === "medium"
            ? "Possible match"
            : "Limited match"}
      </div>

      {result.events.length > 0 && (
        <div className="answer-evidence">
          <h3>Related events</h3>
          {result.events.slice(0, 5).map((event) => (
            <div key={event.id} className="evidence-row">
              <span>{event.time || "—"}</span>
              <strong>{event.title}</strong>
              <span>{event.location || ""}</span>
            </div>
          ))}
        </div>
      )}

      {result.memories.length > 0 && (
        <details className="source-memory">
          <summary>View the memory this answer came from</summary>
          <div className="source-memory-body">
            {result.memories.slice(0, 3).map((memory) => (
              <p key={memory.id}>“{memory.text}”</p>
            ))}
          </div>
        </details>
      )}
    </section>
  );
}
