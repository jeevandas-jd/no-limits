"use client";

import type { Memory } from "@/lib/memory/types";

export default function MemoryCard({
  memory,
  onClick,
}: {
  memory: Memory;
  onClick?: () => void;
}) {
  const date = memory.eventDate
    ? new Date(`${memory.eventDate}T12:00:00`).toLocaleDateString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
      })
    : "Recently recorded";

  return (
    <button className="memory-card" onClick={onClick} type="button">
      <div className="memory-card-date">{date}</div>
      <p>{memory.text}</p>
      <div className="memory-card-meta">
        {memory.entities.slice(0, 4).map((entity) => (
          <span key={entity.id} className="memory-chip">
            {entity.name}
          </span>
        ))}
      </div>
    </button>
  );
}
