"use client";

import { useState, useEffect, useCallback } from "react";
import type { CognitiveReport } from "@/components/report-panel";
import type { WordTimestamp } from "@/components/analysis-panel";

export type HistoryEntry = {
  id: string;
  timestamp: number;
  inputType: "text" | "transcript";
  inputSnippet: string;
  scores: Record<string, number>;
  report: CognitiveReport;
  sessionId: string;
  wordTimestamps?: WordTimestamp[];
  audioDuration?: number;
};

const STORAGE_KEY = "neurotrace_history";
const MAX_ENTRIES = 50;

function load(): HistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function save(entries: HistoryEntry[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, MAX_ENTRIES)));
  } catch { /* quota exceeded — silently drop */ }
}

export function useAnalysisHistory() {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);

  useEffect(() => {
    setEntries(load());
  }, []);

  const addEntry = useCallback((entry: Omit<HistoryEntry, "id" | "timestamp">) => {
    const full: HistoryEntry = {
      ...entry,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
    };
    setEntries((prev) => {
      const next = [full, ...prev].slice(0, MAX_ENTRIES);
      save(next);
      return next;
    });
  }, []);

  const removeEntry = useCallback((id: string) => {
    setEntries((prev) => {
      const next = prev.filter((e) => e.id !== id);
      save(next);
      return next;
    });
  }, []);

  const clearAll = useCallback(() => {
    setEntries([]);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return { entries, addEntry, removeEntry, clearAll };
}
