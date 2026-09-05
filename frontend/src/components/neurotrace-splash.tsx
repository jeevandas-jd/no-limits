"use client";

import { useState, useEffect } from "react";

const FACES = [
  "/images/MindHack_2026_LogoNOBACKGROUND.png",
  "/images/MindHack_2026_LogoASLEEP.png",
  "/images/MindHack_2026_LogoGlasses.png",
  "/images/MindHack_2026_LogoConfusedNBG.png",
  "/images/MindHack_2026_LogoNOBACKGROUND2.png",
];

const CYCLE_MS = 600;

export function NeuroTraceSplash({
  minDisplayMs = 4400,
  readyToFade,
  onFadeComplete,
}: {
  minDisplayMs?: number;
  readyToFade?: boolean;
  onFadeComplete?: () => void;
}) {
  const [faceIndex, setFaceIndex]           = useState(0);
  const [minTimeReached, setMinTimeReached] = useState(false);
  const [fadeStarted, setFadeStarted]       = useState(false);
  const [splashDone, setSplashDone]         = useState(false);

  /* Cycle faces while loading */
  useEffect(() => {
    const id = setInterval(() => {
      setFaceIndex((i) => (i + 1) % FACES.length);
    }, CYCLE_MS);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setMinTimeReached(true), minDisplayMs);
    return () => clearTimeout(t);
  }, [minDisplayMs]);

  useEffect(() => {
    if (!minTimeReached || fadeStarted) return;
    if (readyToFade === undefined || readyToFade) setFadeStarted(true);
  }, [minTimeReached, readyToFade, fadeStarted]);

  if (splashDone) return null;

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center gap-10 transition-opacity duration-700 ${
        fadeStarted ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
      style={{ background: "var(--background)" }}
      onTransitionEnd={() => {
        if (fadeStarted) { setSplashDone(true); onFadeComplete?.(); }
      }}
      aria-hidden
    >
      {/* ── Face + wordmark grouped tightly ── */}
      <div className="flex flex-col items-center gap-3">

        {/* Cycling face */}
        <div style={{ position: "relative", width: 210, height: 210 }}>
          {/* Idle float */}
          <div style={{ animation: "face-idle 2.8s ease-in-out infinite", width: "100%", height: "100%" }}>
            {/* face-pop replays on every key change */}
            <div
              key={faceIndex}
              style={{ animation: "face-pop 0.42s cubic-bezier(0.34, 1.56, 0.64, 1) both", width: "100%", height: "100%" }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={FACES[faceIndex]}
                alt=""
                draggable={false}
                style={{
                  width: 210,
                  height: 210,
                  objectFit: "contain",
                  filter: "drop-shadow(0 6px 20px rgba(0,0,0,0.18))",
                  userSelect: "none",
                }}
              />
            </div>
          </div>
        </div>

        {/* Wordmark */}
        <div className="flex flex-col items-center gap-2">
        <span
          className="text-5xl font-semibold tracking-tight"
          style={{
            color: "var(--nt-text-hi)",
            fontFamily: "var(--font-syne), sans-serif",
          }}
        >
          neurotrace
        </span>
        <span
          className="text-sm tracking-widest uppercase"
          style={{ color: "var(--nt-text-lo)", fontFamily: "var(--font-dm-sans)" }}
        >
          cognitive signature analysis
        </span>
      </div>

      </div>{/* end face+wordmark group */}

      {/* ── Loading dots ── */}
      <div className="flex items-center gap-1.5">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className={`w-1.5 h-1.5 rounded-full animate-splash-dot-${i}`}
            style={{ background: "var(--nt-text-xs)" }}
          />
        ))}
      </div>
    </div>
  );
}
