"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import MemoryTimeline from "@/components/memory/MemoryTimeline";
import { getTimeline } from "@/lib/memory/api";
import type { Memory, MemoryEvent } from "@/lib/memory/types";

export default function TimelinePage() {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [events, setEvents] = useState<MemoryEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getTimeline()
      .then((data) => {
        setMemories(data);
        setEvents(
          data
            .flatMap((m) => m.events)
            .sort((a, b) =>
              `${b.date || ""} ${b.time || ""}`.localeCompare(`${a.date || ""} ${a.time || ""}`)
            )
        );
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="memory-container">
      <Link className="memory-back" href="/memory">← Back to Memory</Link>
      <section className="memory-panel full">
        <div className="memory-panel-header">
          <div>
            <span className="eyebrow">Your timeline</span>
            <h2>Moments connected through time</h2>
          </div>
          <Link className="memory-primary" href="/memory/add">+ Add</Link>
        </div>

        {loading ? <p>Loading your timeline…</p> : (
          <>
            <MemoryTimeline events={events} />
            <p className="memory-helper" style={{ marginTop: 10 }}>
              {memories.length} recorded memories · {events.length} extracted events
            </p>
          </>
        )}
      </section>
    </main>
  );
}
