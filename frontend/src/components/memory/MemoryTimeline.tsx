"use client";

import type { MemoryEvent } from "@/lib/memory/types";

export default function MemoryTimeline({
  events,
  onSelect,
}: {
  events: MemoryEvent[];
  onSelect?: (event: MemoryEvent) => void;
}) {
  if (!events.length) {
    return (
      <div className="memory-empty">
        <div className="memory-empty-icon">🕰️</div>
        <h3>No memories here yet</h3>
        <p>Add a memory and your timeline will grow automatically.</p>
      </div>
    );
  }

  return (
    <div className="memory-timeline">
      {events.map((event) => (
        <button
          key={event.id}
          type="button"
          className="timeline-event"
          onClick={() => onSelect?.(event)}
        >
          <span className="timeline-dot" />
          <div className="timeline-content">
            <div className="timeline-time">
              {event.time || "Time not recorded"}
            </div>
            <h3>{event.title}</h3>
            <p>{event.description}</p>
            <div className="timeline-tags">
              {event.location && <span>📍 {event.location}</span>}
              {event.people.length > 0 && <span>👥 {event.people.join(", ")}</span>}
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}
