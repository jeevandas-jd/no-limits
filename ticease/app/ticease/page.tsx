"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  getGoals,
  getTodayCheckIn,
  practiceSessionsThisWeek,
  upsertTodayCheckIn,
} from "@/lib/ticease/storage";

const MOODS = [
  { value: 1, emoji: "\u{1F623}" },
  { value: 2, emoji: "\u{1F61F}" },
  { value: 3, emoji: "\u{1F610}" },
  { value: 4, emoji: "\u{1F642}" },
  { value: 5, emoji: "\u{1F60A}" },
];

export default function TicEaseHome() {
  const [mood, setMood] = useState<number | null>(null);
  const [stress, setStress] = useState<number | undefined>(undefined);
  const [sleepHours, setSleepHours] = useState<number | undefined>(undefined);
  const [ticImpact, setTicImpact] = useState<number | undefined>(undefined);
  const [weeklySessions, setWeeklySessions] = useState(0);
  const [target, setTarget] = useState(5);

  useEffect(() => {
    const today = getTodayCheckIn();
    if (today) {
      setMood(today.mood ?? null);
      setStress(today.stress);
      setSleepHours(today.sleepHours);
      setTicImpact(today.ticImpact);
    }
    setWeeklySessions(practiceSessionsThisWeek());
    setTarget(getGoals().weeklyPracticeTarget);
  }, []);

  function selectMood(value: number) {
    setMood(value);
    upsertTodayCheckIn({ mood: value });
  }

  const progressPct = Math.min(100, (weeklySessions / target) * 100);

  return (
    <>
      <h1 className="tic-page-title">Good day</h1>
      <p className="tic-page-sub">How are you feeling today?</p>

      <div className="tic-mood-row" style={{ marginBottom: 20 }}>
        {MOODS.map((m) => (
          <button
            key={m.value}
            className="tic-mood-btn"
            data-selected={mood === m.value}
            onClick={() => selectMood(m.value)}
            aria-label={`Mood ${m.value} of 5`}
          >
            {m.emoji}
          </button>
        ))}
      </div>

      <div className="tic-section-label">QUICK ACTIONS</div>
      <div className="tic-grid-2" style={{ marginBottom: 20 }}>
        <Link href="/ticease/track" className="tic-btn tic-btn-primary">
          + Track
        </Link>
        <Link href="/ticease/practice" className="tic-btn tic-btn-secondary">
          Practice
        </Link>
        <Link href="/ticease/reset" className="tic-btn tic-btn-secondary">
          Reset
        </Link>
        <Link href="/ticease/help" className="tic-btn tic-btn-quiet">
          Help Now
        </Link>
      </div>

      <div className="tic-card">
        <div className="tic-section-label">TODAY</div>
        <div className="tic-stat-row">
          <span>Stress</span>
          <span>{stress !== undefined ? `${stress}/10` : "Not logged"}</span>
        </div>
        <div className="tic-stat-row">
          <span>Sleep</span>
          <span>{sleepHours !== undefined ? `${sleepHours} hrs` : "Not logged"}</span>
        </div>
        <div className="tic-stat-row">
          <span>Tic impact</span>
          <span>{ticImpact !== undefined ? `${ticImpact}/10` : "Not logged"}</span>
        </div>
      </div>

      <div className="tic-card">
        <div className="tic-section-label">YOUR GOAL</div>
        <p style={{ fontSize: 14, marginBottom: 10 }}>Practice your strategy</p>
        <div className="tic-progress-track">
          <div className="tic-progress-fill" style={{ width: `${progressPct}%` }} />
        </div>
        <p className="tic-caption" style={{ marginTop: 8 }}>
          {weeklySessions} / {target} sessions this week
        </p>
      </div>

      <p className="tic-caption">You don&apos;t need to log every tic — just what feels useful to understand.</p>
    </>
  );
}
