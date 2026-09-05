"use client";

import { useEffect, useRef, useState } from "react";
import Slider from "@/components/ticease/Slider";
import { addPracticeSession, getActiveStrategy, practiceSessionsThisWeek } from "@/lib/ticease/storage";

type Step = "intro" | "awareness" | "identify" | "strategy" | "timer" | "reflect" | "result";

const BODY_AREAS = ["Head/neck", "Face/eyes", "Shoulders", "Arms/hands", "Torso", "Legs/feet", "Vocal"];

export default function PracticePage() {
  const [step, setStep] = useState<Step>("intro");
  const [awareness, setAwareness] = useState<"yes" | "sometimes" | "no" | null>(null);
  const [bodyArea, setBodyArea] = useState<string | null>(null);
  const [urgeBefore, setUrgeBefore] = useState(5);
  const [urgeAfter, setUrgeAfter] = useState(3);
  const [helpful, setHelpful] = useState(4);
  const [seconds, setSeconds] = useState(60);
  const [running, setRunning] = useState(false);
  const [weeklyCount, setWeeklyCount] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const strategy = getActiveStrategy();

  useEffect(() => {
    setWeeklyCount(practiceSessionsThisWeek());
  }, []);

  useEffect(() => {
    if (running && seconds > 0) {
      intervalRef.current = setInterval(() => setSeconds((s) => s - 1), 1000);
    } else if (seconds === 0 && intervalRef.current) {
      clearInterval(intervalRef.current);
      setRunning(false);
      setStep("reflect");
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, seconds]);

  function finish() {
    addPracticeSession({
      strategyId: strategy.id,
      durationSeconds: 60,
      urgeBefore,
      urgeAfter,
      helpfulRating: helpful,
    });
    setStep("result");
  }

  function restart() {
    setStep("intro");
    setAwareness(null);
    setBodyArea(null);
    setSeconds(60);
    setUrgeBefore(5);
    setUrgeAfter(3);
    setHelpful(4);
    setWeeklyCount(practiceSessionsThisWeek());
  }

  return (
    <>
      <h1 className="tic-page-title">Practice</h1>
      <p className="tic-page-sub">A short, guided CBIT-style session — at your own pace.</p>

      {step === "intro" && (
        <div className="tic-card">
          <div className="tic-section-label">TODAY&apos;S PRACTICE</div>
          <p style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>{strategy.name}</p>
          <p className="tic-caption" style={{ marginBottom: 14 }}>Duration: about 2 minutes</p>
          <p className="tic-caption" style={{ marginBottom: 14 }}>You&apos;ve practiced {weeklyCount} time(s) this week.</p>
          <button className="tic-btn tic-btn-primary" onClick={() => setStep("awareness")}>
            Start session
          </button>
        </div>
      )}

      {step === "awareness" && (
        <div className="tic-card">
          <div className="tic-section-label">STEP 1 — AWARENESS</div>
          <p style={{ fontSize: 15, marginBottom: 14 }}>Do you feel an urge before the tic?</p>
          <div className="tic-grid-2">
            {(["yes", "sometimes", "no"] as const).map((v) => (
              <button
                key={v}
                className="tic-btn tic-btn-secondary"
                data-selected={awareness === v}
                onClick={() => {
                  setAwareness(v);
                  setStep("identify");
                }}
              >
                {v[0].toUpperCase() + v.slice(1)}
              </button>
            ))}
          </div>
        </div>
      )}

      {step === "identify" && (
        <div className="tic-card">
          <div className="tic-section-label">STEP 2 — IDENTIFY</div>
          <p style={{ fontSize: 15, marginBottom: 14 }}>Where do you notice the urge?</p>
          <div className="tic-chip-row" style={{ marginBottom: 16 }}>
            {BODY_AREAS.map((area) => (
              <button
                key={area}
                className="tic-chip"
                data-selected={bodyArea === area}
                onClick={() => setBodyArea(area)}
              >
                {area}
              </button>
            ))}
          </div>
          <button className="tic-btn tic-btn-primary" disabled={!bodyArea} onClick={() => setStep("strategy")}>
            Continue
          </button>
        </div>
      )}

      {step === "strategy" && (
        <div className="tic-card">
          <div className="tic-section-label">STEP 3 — YOUR STRATEGY</div>
          <p className="tic-caption" style={{ marginBottom: 8 }}>Your recommended strategy:</p>
          <p style={{ fontWeight: 700, marginBottom: 6 }}>{strategy.name}</p>
          <p style={{ fontSize: 14, lineHeight: 1.55, marginBottom: 14 }}>{strategy.instructions}</p>
          <Slider label="How strong is the urge right now?" value={urgeBefore} onChange={setUrgeBefore} />
          <button className="tic-btn tic-btn-primary" onClick={() => setStep("timer")}>
            Practice
          </button>
        </div>
      )}

      {step === "timer" && (
        <div className="tic-card" style={{ textAlign: "center" }}>
          <div className="tic-section-label">STEP 4 — PRACTICE</div>
          <div
            className="tic-breathing-circle"
            style={{ transform: running ? "scale(1.12)" : "scale(1)", marginBottom: 18 }}
          />
          <p style={{ fontSize: 32, fontWeight: 700, margin: "10px 0" }}>
            {String(Math.floor(seconds / 60)).padStart(2, "0")}:{String(seconds % 60).padStart(2, "0")}
          </p>
          <p className="tic-caption" style={{ marginBottom: 16 }}>
            Practice gently. Don&apos;t force yourself to suppress the tic — focus on the strategy you&apos;ve learned.
          </p>
          <div className="tic-grid-2">
            <button className="tic-btn tic-btn-secondary" onClick={() => setRunning((r) => !r)}>
              {running ? "Pause" : seconds === 60 ? "Start" : "Resume"}
            </button>
            <button className="tic-btn tic-btn-quiet" onClick={() => setStep("reflect")}>
              Skip to reflection
            </button>
          </div>
        </div>
      )}

      {step === "reflect" && (
        <div className="tic-card">
          <div className="tic-section-label">STEP 5 — REFLECTION</div>
          <Slider label="How strong is the urge now?" value={urgeAfter} onChange={setUrgeAfter} />
          <div style={{ marginBottom: 16 }}>
            <p style={{ fontSize: 13.5, fontWeight: 600, marginBottom: 8 }}>How helpful did this practice feel?</p>
            <div style={{ display: "flex", gap: 6 }}>
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  onClick={() => setHelpful(n)}
                  aria-label={`${n} star`}
                  style={{
                    fontSize: 22,
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    opacity: n <= helpful ? 1 : 0.3,
                  }}
                >
                  ★
                </button>
              ))}
            </div>
          </div>
          <button className="tic-btn tic-btn-primary" onClick={finish}>
            Finish
          </button>
        </div>
      )}

      {step === "result" && (
        <div className="tic-card" style={{ textAlign: "center" }}>
          <p style={{ fontSize: 17, fontWeight: 700, marginBottom: 14 }}>Practice complete</p>
          <div className="tic-grid-2" style={{ marginBottom: 14 }}>
            <div>
              <p className="tic-caption">Before</p>
              <p style={{ fontSize: 24, fontWeight: 700 }}>{urgeBefore}/10</p>
            </div>
            <div>
              <p className="tic-caption">After</p>
              <p style={{ fontSize: 24, fontWeight: 700 }}>{urgeAfter}/10</p>
            </div>
          </div>
          <p className="tic-caption" style={{ marginBottom: 16 }}>
            Your reported urge changed from {urgeBefore}/10 to {urgeAfter}/10.
          </p>
          <button className="tic-btn tic-btn-primary" onClick={restart}>
            Done
          </button>
        </div>
      )}
    </>
  );
}
