"use client";

import { useEffect, useRef, useState } from "react";

const EXERCISES = [
  { category: "Breathing", name: "Slow breathing" },
  { category: "Relaxation", name: "Progressive muscle relaxation" },
  { category: "Grounding", name: "5-4-3-2-1 grounding" },
  { category: "Mindfulness", name: "One-minute awareness" },
  { category: "Guided relaxation", name: "Calm your body" },
];

const DURATIONS = [1, 3, 5, 10];

const MOODS = ["\u{1F623}", "\u{1F61F}", "\u{1F610}", "\u{1F642}", "\u{1F60A}"];

type Phase = "inhale" | "hold" | "exhale";

export default function ResetPage() {
  const [durationMin, setDurationMin] = useState<number | null>(null);
  const [activeExercise, setActiveExercise] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [running, setRunning] = useState(false);
  const [phase, setPhase] = useState<Phase>("inhale");
  const [phaseSeconds, setPhaseSeconds] = useState(4);
  const [afterMood, setAfterMood] = useState<number | null>(null);
  const mainInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const phaseInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!running) return;
    mainInterval.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          setRunning(false);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => {
      if (mainInterval.current) clearInterval(mainInterval.current);
    };
  }, [running]);

  useEffect(() => {
    if (!running) return;
    const cycle: { phase: Phase; dur: number }[] = [
      { phase: "inhale", dur: 4 },
      { phase: "hold", dur: 2 },
      { phase: "exhale", dur: 6 },
    ];
    let idx = 0;
    setPhase(cycle[0].phase);
    setPhaseSeconds(cycle[0].dur);
    phaseInterval.current = setInterval(() => {
      idx = (idx + 1) % cycle.length;
      setPhase(cycle[idx].phase);
      setPhaseSeconds(cycle[idx].dur);
    }, cycle[idx % cycle.length].dur * 1000);
    return () => {
      if (phaseInterval.current) clearInterval(phaseInterval.current);
    };
  }, [running]);

  function start(minutes: number, exerciseName: string) {
    setDurationMin(minutes);
    setActiveExercise(exerciseName);
    setSecondsLeft(minutes * 60);
    setRunning(true);
    setAfterMood(null);
  }

  function reset() {
    setDurationMin(null);
    setActiveExercise(null);
    setRunning(false);
    setAfterMood(null);
  }

  const phaseLabel = phase === "inhale" ? "Breathe in..." : phase === "hold" ? "Hold..." : "Breathe out...";
  const circleScale = phase === "inhale" ? 1.25 : phase === "exhale" ? 0.85 : 1.1;

  if (activeExercise) {
    return (
      <>
        <h1 className="tic-page-title">Reset</h1>
        <div className="tic-card" style={{ textAlign: "center" }}>
          <p className="tic-caption" style={{ marginBottom: 10 }}>{activeExercise}</p>
          <div
            className="tic-breathing-circle"
            style={{ transform: `scale(${circleScale})`, marginBottom: 18 }}
          />
          <p style={{ fontSize: 17, fontWeight: 600, marginBottom: 4 }}>{running ? phaseLabel : "Paused"}</p>
          <p className="tic-caption" style={{ marginBottom: 14 }}>{phaseSeconds} sec</p>
          <p style={{ fontSize: 26, fontWeight: 700, marginBottom: 18 }}>
            {String(Math.floor(secondsLeft / 60)).padStart(2, "0")}:{String(secondsLeft % 60).padStart(2, "0")}
          </p>

          {secondsLeft > 0 ? (
            <div className="tic-grid-2">
              <button className="tic-btn tic-btn-secondary" onClick={() => setRunning((r) => !r)}>
                {running ? "Pause" : "Resume"}
              </button>
              <button className="tic-btn tic-btn-quiet" onClick={reset}>
                Exit
              </button>
            </div>
          ) : (
            <>
              <p style={{ fontSize: 14, marginBottom: 10 }}>How do you feel now?</p>
              <div className="tic-mood-row" style={{ marginBottom: 16 }}>
                {MOODS.map((emoji, i) => (
                  <button
                    key={i}
                    className="tic-mood-btn"
                    data-selected={afterMood === i}
                    onClick={() => setAfterMood(i)}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
              <button className="tic-btn tic-btn-primary" onClick={reset}>
                Done
              </button>
            </>
          )}
        </div>
      </>
    );
  }

  return (
    <>
      <h1 className="tic-page-title">Reset</h1>
      <p className="tic-page-sub">How much time do you have?</p>

      <div className="tic-chip-row" style={{ marginBottom: 20 }}>
        {DURATIONS.map((d) => (
          <button
            key={d}
            className="tic-chip"
            data-selected={durationMin === d}
            onClick={() => setDurationMin(d)}
          >
            {d} min
          </button>
        ))}
      </div>

      <div className="tic-section-label">EXERCISE LIBRARY</div>
      {EXERCISES.map((ex) => (
        <button
          key={ex.name}
          className="tic-card"
          style={{ width: "100%", textAlign: "left", cursor: "pointer", border: "1px solid var(--tic-border)" }}
          onClick={() => start(durationMin ?? 3, ex.name)}
        >
          <p className="tic-caption" style={{ marginBottom: 2 }}>{ex.category}</p>
          <p style={{ fontSize: 14.5, fontWeight: 600 }}>{ex.name}</p>
        </button>
      ))}
    </>
  );
}
