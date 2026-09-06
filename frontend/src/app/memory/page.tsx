"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import MemoryCard from "@/components/memory/MemoryCard";
import MemoryTimeline from "@/components/memory/MemoryTimeline";
import { getTimeline } from "@/lib/memory/api";
import type { Memory, MemoryEvent } from "@/lib/memory/types";

export default function MemoryPage() {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [events, setEvents] = useState<MemoryEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    try {
      setError("");
      const data = await getTimeline();
      setMemories(data);
      setEvents(data.flatMap((m) => m.events).sort((a, b) =>
        `${b.date || ""} ${b.time || ""}`.localeCompare(`${a.date || ""} ${a.time || ""}`)
      ));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load memories.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <main className="memory-container">
      <header className="memory-topbar">
        <div className="memory-brand">No Limits</div>
        <nav className="memory-nav">
          <Link href="/">Home</Link>
          <Link href="/memory">Memory</Link>
          <Link href="/ticease">TicEase</Link>
        </nav>
      </header>

      <section className="memory-hero">
        <div className="memory-hero-copy">
          <span className="eyebrow">Your personal memory</span>
          <h1>Keep today.<br />Find it later.</h1>
          <p>
            Record everyday moments in your own words. No Limits connects
            people, places, events and time so you can find a forgotten
            moment by simply asking.
          </p>
        </div>

        <div className="memory-actions">
          <Link className="memory-primary" href="/memory/add">
            + Add a memory
          </Link>
          <Link className="memory-secondary" href="/memory/ask">
            🧠 Help me remember
          </Link>
        </div>
      </section>

      {error && (
        <div className="memory-panel" style={{ marginBottom: 20 }}>
          <strong>Memory service unavailable.</strong>
          <p>{error}</p>
          <p>Start the Python backend and refresh this page.</p>
        </div>
      )}

      <div className="memory-grid">
        <section className="memory-panel">
          <div className="memory-panel-header">
            <h2>Recent memories</h2>
            <Link className="memory-link-button" href="/memory/timeline">Timeline →</Link>
          </div>

          {loading ? (
            <p>Loading your memories…</p>
          ) : memories.length ? (
            <div className="memory-card-list">
              {memories.slice(0, 5).map((memory) => (
                <MemoryCard key={memory.id} memory={memory} />
              ))}
            </div>
          ) : (
            <div className="memory-empty">
              <div className="memory-empty-icon">🌱</div>
              <h3>Your memory space is ready</h3>
              <p>Start by recording something that happened today.</p>
            </div>
          )}
        </section>

        <section className="memory-panel">
          <div className="memory-panel-header">
            <h2>What happened?</h2>
            <Link className="memory-link-button" href="/memory/ask">Ask →</Link>
          </div>
          <MemoryTimeline events={events.slice(0, 8)} />
        </section>
      </div>
    </main>
  );
}
