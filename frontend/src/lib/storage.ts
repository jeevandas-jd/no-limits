"use client";

import { useEffect, useState } from "react";

/* -------------------------------------------------------------------------- */
/* Types                                                                       */
/* -------------------------------------------------------------------------- */

export type TicType = "movement" | "sound" | "head_neck" | "face_eyes" | "body" | "other";

export type Situation =
  | "home"
  | "school"
  | "work"
  | "social"
  | "public"
  | "exercising"
  | "screen"
  | "before_sleep"
  | "other";

export interface TicEntry {
  id: string;
  timestamp: string; // ISO
  ticType: TicType;
  customLabel?: string;
  urgeIntensity: number; // 0-10
  stress: number; // 0-10
  situation: Situation;
  impact: number; // 0-10, "how much did this interfere"
}

export interface DailyCheckIn {
  date: string; // YYYY-MM-DD
  mood: number; // 1-5
  stress?: number; // 0-10
  sleepHours?: number;
  ticImpact?: number; // 0-10
}

export interface PracticeSession {
  id: string;
  timestamp: string;
  strategyId: string;
  durationSeconds: number;
  urgeBefore: number;
  urgeAfter: number;
  helpfulRating: number; // 1-5
}

export interface Strategy {
  id: string;
  name: string;
  description: string;
  whenToUse: string;
  instructions: string;
  clinicianAssigned: boolean;
}

export interface HelpNowSession {
  id: string;
  timestamp: string;
}

const KEYS = {
  entries: "ticease:entries",
  checkIns: "ticease:checkins",
  sessions: "ticease:sessions",
  strategies: "ticease:strategies",
  helpNow: "ticease:helpnow",
  goals: "ticease:goals",
} as const;

/* -------------------------------------------------------------------------- */
/* Generic localStorage list helpers                                          */
/* -------------------------------------------------------------------------- */

function readList<T>(key: string): T[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch {
    return [];
  }
}

function writeList<T>(key: string, list: T[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(list));
}

function makeId() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

/* -------------------------------------------------------------------------- */
/* Tic entries                                                                 */
/* -------------------------------------------------------------------------- */

export function getEntries(): TicEntry[] {
  return readList<TicEntry>(KEYS.entries);
}

export function addEntry(entry: Omit<TicEntry, "id" | "timestamp">): TicEntry {
  const full: TicEntry = { ...entry, id: makeId(), timestamp: new Date().toISOString() };
  const list = getEntries();
  list.push(full);
  writeList(KEYS.entries, list);
  return full;
}

/* -------------------------------------------------------------------------- */
/* Daily check-ins (one per day)                                              */
/* -------------------------------------------------------------------------- */

export function getCheckIns(): DailyCheckIn[] {
  return readList<DailyCheckIn>(KEYS.checkIns);
}

export function getTodayCheckIn(): DailyCheckIn | undefined {
  return getCheckIns().find((c) => c.date === todayStr());
}

export function upsertTodayCheckIn(partial: Partial<Omit<DailyCheckIn, "date">>): DailyCheckIn {
  const list = getCheckIns();
  const date = todayStr();
  const idx = list.findIndex((c) => c.date === date);
  if (idx >= 0) {
    list[idx] = { ...list[idx], ...partial };
  } else {
    list.push({ date, mood: 3, ...partial });
  }
  writeList(KEYS.checkIns, list);
  return list.find((c) => c.date === date)!;
}

/* -------------------------------------------------------------------------- */
/* Practice sessions                                                          */
/* -------------------------------------------------------------------------- */

export function getPracticeSessions(): PracticeSession[] {
  return readList<PracticeSession>(KEYS.sessions);
}

export function addPracticeSession(session: Omit<PracticeSession, "id" | "timestamp">): PracticeSession {
  const full: PracticeSession = { ...session, id: makeId(), timestamp: new Date().toISOString() };
  const list = getPracticeSessions();
  list.push(full);
  writeList(KEYS.sessions, list);
  return full;
}

export function practiceSessionsThisWeek(): number {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  return getPracticeSessions().filter((s) => new Date(s.timestamp) >= weekAgo).length;
}

/* -------------------------------------------------------------------------- */
/* Strategies (defaults stand in for clinician-assigned plans)                */
/* -------------------------------------------------------------------------- */

const DEFAULT_STRATEGIES: Strategy[] = [
  {
    id: "default-competing-response",
    name: "Competing response practice",
    description: "A general awareness-and-response exercise you can use for any tic.",
    whenToUse: "When you notice the urge building, before or during a tic.",
    instructions:
      "Notice where you feel the urge. Gently engage a competing motion that's incompatible with the tic, and hold it comfortably until the urge eases. Don't force or fight the tic — just redirect your attention.",
    clinicianAssigned: false,
  },
];

export function getStrategies(): Strategy[] {
  const stored = readList<Strategy>(KEYS.strategies);
  return stored.length > 0 ? stored : DEFAULT_STRATEGIES;
}

export function getActiveStrategy(): Strategy {
  return getStrategies()[0];
}

/* -------------------------------------------------------------------------- */
/* Help Now usage                                                             */
/* -------------------------------------------------------------------------- */

export function getHelpNowSessions(): HelpNowSession[] {
  return readList<HelpNowSession>(KEYS.helpNow);
}

export function logHelpNowSession(): void {
  const list = getHelpNowSessions();
  list.push({ id: makeId(), timestamp: new Date().toISOString() });
  writeList(KEYS.helpNow, list);
}

/* -------------------------------------------------------------------------- */
/* Goals                                                                       */
/* -------------------------------------------------------------------------- */

export interface Goals {
  weeklyPracticeTarget: number;
}

export function getGoals(): Goals {
  if (typeof window === "undefined") return { weeklyPracticeTarget: 5 };
  try {
    const raw = window.localStorage.getItem(KEYS.goals);
    return raw ? (JSON.parse(raw) as Goals) : { weeklyPracticeTarget: 5 };
  } catch {
    return { weeklyPracticeTarget: 5 };
  }
}

/* -------------------------------------------------------------------------- */
/* React hook: re-render when TicEase storage changes                        */
/* -------------------------------------------------------------------------- */

/**
 * Forces a re-render whenever TicEase localStorage data changes in this tab.
 * Call this in pages that read the helpers above, then call bump() after
 * any write so the UI reflects the new data immediately.
 */
export function useTicEaseRefresh() {
  const [, setTick] = useState(0);
  useEffect(() => {}, []);
  return () => setTick((t) => t + 1);
}
