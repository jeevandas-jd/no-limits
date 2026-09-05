"use client";

import { useEffect, useRef, useState } from "react";
import { getActiveStrategy, logHelpNowSession } from "@/lib/ticease/storage";

type Step = 0 | 1 | 2 | 3 | 4 | 5;

export default function HelpNowPage() {
  const [step, setStep] = useState<Step>(0);
  const [seconds, setSeconds] = useState(30);
  const [running, setRunning] = useState(false);
  const strategy = getActiveStrategy();
  const logged = useRef(false);

  useEffect(() => {
    if (!logged.current) {
      logHelpNowSession();
      logged.current = true;
    }
  }, []);

  useEffect(() => {
    if (!running || seconds <= 0) return;
    const id = setInterval(() => setSeconds((s) => s - 1), 1000);
    return () => clearInterval(id);
  }, [running, seconds]);

  return (
    <>
      {step === 0 && (
        <div className="tic-card" style={{ textAlign: "center" }}>
          <p style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Need help right now?</p>
          <p style={{ fontSize: 15, marginBottom: 20 }}>You&apos;re okay. Let&apos;s take this slowly.</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <button className="tic-btn tic-btn-primary" onClick={() => setStep(1)}>
              Start 30-sec reset
            </button>
            <button className="tic-btn tic-btn-secondary" onClick={() => setStep(3)}>
              My strategy
            </button>
            <button className="tic-btn tic-btn-quiet" onClick={() => setStep(2)}>
              Find a quiet space
            </button>
            <button className="tic-btn tic-btn-quiet" onClick={() => setStep(5)}>
              Contact someone
            </button>
            <a href="tel:911" className="tic-btn tic-btn-emergency">
              Emergency help
            </a>
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="tic-card" style={{ textAlign: "center" }}>
          <div className="tic-section-label">BREATHE</div>
          <p style={{ marginBottom: 16 }}>Let&apos;s take 30 seconds.</p>
          <div
            className="tic-breathing-circle"
            style={{ transform: running ? "scale(1.2)" : "scale(1)", marginBottom: 16, transition: "transform 4s ease-in-out" }}
          />
          <p style={{ fontSize: 28, fontWeight: 700, marginBottom: 16 }}>{seconds}s</p>
          {!running && seconds > 0 && (
            <button className="tic-btn tic-btn-primary" onClick={() => setRunning(true)}>
              Start
            </button>
          )}
          {seconds === 0 && (
            <button className="tic-btn tic-btn-primary" onClick={() => setStep(2)}>
              Continue
            </button>
          )}
        </div>
      )}

      {step === 2 && (
        <div className="tic-card" style={{ textAlign: "center" }}>
          <div className="tic-section-label">FIND A COMFORTABLE ENVIRONMENT</div>
          <p style={{ fontSize: 15, marginBottom: 20 }}>
            If possible, move somewhere you feel safe and don&apos;t have to worry about other people&apos;s reactions.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <button className="tic-btn tic-btn-primary" onClick={() => setStep(3)}>
              I&apos;m somewhere safe
            </button>
            <button className="tic-btn tic-btn-secondary" onClick={() => setStep(5)}>
              I need help finding support
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="tic-card">
          <div className="tic-section-label">YOUR STRATEGY</div>
          <p style={{ fontWeight: 700, marginBottom: 6 }}>{strategy.name}</p>
          <p style={{ fontSize: 14, lineHeight: 1.55, marginBottom: 18 }}>{strategy.instructions}</p>
          <button className="tic-btn tic-btn-primary" onClick={() => setStep(4)}>
            Continue
          </button>
        </div>
      )}

      {step === 4 && (
        <div className="tic-card" style={{ textAlign: "center" }}>
          <div className="tic-section-label">REDUCE PRESSURE</div>
          <p style={{ fontSize: 17, lineHeight: 1.6, margin: "12px 0" }}>
            You don&apos;t have to fight the tic.
            <br />
            Give yourself permission to take a moment.
          </p>
          <button className="tic-btn tic-btn-primary" onClick={() => setStep(5)}>
            Continue
          </button>
        </div>
      )}

      {step === 5 && (
        <div className="tic-card">
          <div className="tic-section-label">GET SUPPORT</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <button className="tic-btn tic-btn-secondary">Call trusted person</button>
            <button className="tic-btn tic-btn-secondary">Message trusted person</button>
            <button className="tic-btn tic-btn-secondary">Contact therapist</button>
            <a href="tel:911" className="tic-btn tic-btn-emergency">
              Emergency help
            </a>
          </div>
          <p className="tic-caption" style={{ marginTop: 14 }}>
            Emergency options should be localized to your country before this ships.
          </p>
        </div>
      )}
    </>
  );
}
