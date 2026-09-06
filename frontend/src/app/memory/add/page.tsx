"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { createMemory } from "@/lib/memory/api";

export default function AddMemoryPage() {
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!text.trim()) return;

    setSaving(true);
    setStatus("");

    try {
      await createMemory(text.trim());
      setText("");
      setStatus("Memory saved. You can find it again later.");
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Could not save memory.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="memory-container">
      <div className="memory-input-page">
        <Link className="memory-back" href="/memory">← Back to Memory</Link>

        <form className="memory-input-card" onSubmit={submit}>
          <span className="eyebrow">Add a memory</span>
          <h1>What happened?</h1>
          <p>
            Tell me naturally. You do not need to remember the exact date,
            time or names. I&apos;ll organize what you tell me.
          </p>

          <textarea
            className="memory-textarea"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="For example: Yesterday I went to the hospital with Anu. We met Dr. Thomas around 10 AM. Afterwards we had lunch nearby."
            aria-label="Describe your memory"
          />

          <div className="memory-helper">
            Tip: mention people, places, activities or approximate times if you remember them.
          </div>

          <button className="memory-primary" type="submit" disabled={saving || !text.trim()}>
            {saving ? "Saving…" : "Save memory"}
          </button>

          {status && <p className="memory-status">{status}</p>}
        </form>
      </div>
    </main>
  );
}
