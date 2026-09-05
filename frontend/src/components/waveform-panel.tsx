"use client";

import { useState, useRef, useMemo, useCallback } from "react";
import type { WordTimestamp } from "@/components/analysis-panel";

type Pause = { idx: number; start: number; end: number; duration: number; afterWordIndex: number };

export type WaveformPanelProps = { wordTimestamps?: WordTimestamp[]; duration?: number };

function seededNoise(s: number): number {
  const x = Math.sin(s * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

const BAR_COUNT = 96;
const SVG_W     = 240;
const SVG_H     = 32;

export function WaveformPanel({ wordTimestamps = [], duration }: WaveformPanelProps) {
  const [activePauseIdx, setActivePauseIdx] = useState<number | null>(null);
  const [activeWordIdx, setActiveWordIdx]   = useState<number | null>(null);
  const wordEls = useRef<(HTMLSpanElement | null)[]>([]);

  const totalDuration = useMemo(
    () => duration ?? (wordTimestamps.length > 0 ? (wordTimestamps.at(-1)?.end ?? wordTimestamps.length * 0.4) + 0.4 : 10),
    [duration, wordTimestamps],
  );

  const pauses = useMemo<Pause[]>(() => {
    const out: Pause[] = [];
    for (let i = 0; i < wordTimestamps.length - 1; i++) {
      const curr = wordTimestamps[i], next = wordTimestamps[i + 1];
      if (curr.end == null || next.start == null) continue;
      const gap = next.start - curr.end;
      if (gap >= 0.18) out.push({ idx: out.length, start: curr.end, end: next.start, duration: gap, afterWordIndex: i });
    }
    return out;
  }, [wordTimestamps]);

  const bars = useMemo(() => Array.from({ length: BAR_COUNT }, (_, i) => {
    const t = (i / BAR_COUNT) * totalDuration, tEnd = ((i + 1) / BAR_COUNT) * totalDuration;
    const inWord  = wordTimestamps.some((w) => (w.start ?? 0) < tEnd && (w.end ?? 0) > t);
    const inPause = pauses.some((p) => p.start < tEnd && p.end > t);
    const n       = seededNoise(i * 3.71) * 0.65 + seededNoise(i * 13.37 + 50) * 0.35;
    return { height: inWord ? 0.28 + n * 0.68 : inPause ? 0.02 + n * 0.05 : 0.04 + n * 0.18, inWord, inPause };
  }), [wordTimestamps, pauses, totalDuration]);

  const handlePauseClick = useCallback((pause: Pause) => {
    const next = pause.afterWordIndex + 1;
    setActivePauseIdx((prev) => (prev === pause.idx ? null : pause.idx));
    setActiveWordIdx(next);
    wordEls.current[next]?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, []);

  if (wordTimestamps.length === 0) return null;

  const barW = SVG_W / BAR_COUNT, barGap = barW * 0.28;

  return (
    <div
      className="flex-1 min-h-0 rounded-xl overflow-hidden flex flex-col"
      style={{ background: "var(--nt-glass)", backdropFilter: "blur(16px)", border: "1px solid var(--nt-glass-border)", boxShadow: "var(--nt-glass-shadow)" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3.5 pt-2.5 pb-1.5 shrink-0">
        <span className="text-[10px] uppercase tracking-widest font-medium" style={{ color: "var(--nt-text-xs)", fontFamily: "var(--font-jetbrains-mono)" }}>
          Speech · Pause Map
        </span>
        {pauses.length > 0 && (
          <span className="text-[10px]" style={{ color: "var(--nt-text-ghost)", fontFamily: "var(--font-jetbrains-mono)" }}>
            {pauses.length} pause{pauses.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Waveform SVG */}
      <div className="px-3.5 shrink-0">
        <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} className="w-full" style={{ height: 48, display: "block" }} preserveAspectRatio="none">
          <defs>
            <linearGradient id="wf-speech" x1="0" y1="1" x2="0" y2="0">
              {/* CSS vars work in SVG stop-color */}
              <stop offset="0%"   stopColor="var(--nt-wf-lo)" />
              <stop offset="100%" stopColor="var(--nt-wf-hi)" />
            </linearGradient>
            <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="1.5" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>

          <line x1={0} y1={SVG_H / 2} x2={SVG_W} y2={SVG_H / 2} stroke="var(--nt-divider)" strokeWidth="0.4" />

          {bars.map((bar, i) => {
            const x = i * barW + barGap / 2, w = barW - barGap;
            const bh = bar.height * SVG_H * 0.9, y = (SVG_H - bh) / 2;
            return <rect key={i} x={x} y={y} width={w} height={bh} fill={bar.inWord ? "url(#wf-speech)" : "var(--nt-track)"} rx="0.5" />;
          })}

          {pauses.map((pause) => {
            const x = (pause.start / totalDuration) * SVG_W, active = activePauseIdx === pause.idx;
            return (
              <g key={pause.idx} onClick={() => handlePauseClick(pause)} style={{ cursor: "pointer" }}>
                <rect x={x - 4} y={0} width={8} height={SVG_H} fill="transparent" />
                <line x1={x} y1={2} x2={x} y2={SVG_H - 2}
                  stroke={active ? "var(--nt-text-md)" : "var(--nt-text-ghost)"}
                  strokeWidth={active ? 0.9 : 0.5} strokeDasharray="2 1.2"
                  filter={active ? "url(#glow)" : undefined}
                />
                <polygon
                  points={`${x},${SVG_H / 2 - 2.8} ${x + 2.4},${SVG_H / 2} ${x},${SVG_H / 2 + 2.8} ${x - 2.4},${SVG_H / 2}`}
                  fill={active ? "var(--nt-text-md)" : "var(--nt-text-ghost)"}
                />
              </g>
            );
          })}
        </svg>

        <div className="relative h-5">
          {pauses.map((pause) => {
            const left = (pause.start / totalDuration) * 100, active = activePauseIdx === pause.idx;
            const label = pause.duration >= 1 ? `${pause.duration.toFixed(1)}s` : `${Math.round(pause.duration * 1000)}ms`;
            return (
              <button key={pause.idx} onClick={() => handlePauseClick(pause)}
                className="absolute -translate-x-1/2 text-[9px] rounded px-1 py-0.5 leading-none transition-all"
                style={{
                  left: `${left}%`,
                  color: active ? "var(--nt-text-hi)" : "var(--nt-text-ghost)",
                  background: active ? "var(--nt-active)" : "transparent",
                  border: `1px solid ${active ? "var(--nt-glass-border)" : "transparent"}`,
                  fontFamily: "var(--font-jetbrains-mono)",
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mx-3.5 mt-1 mb-0 shrink-0" style={{ borderTop: "1px solid var(--nt-divider)" }} />

      {/* Transcript */}
      <div className="flex-1 min-h-0 overflow-y-auto px-3.5 py-2.5 text-[12px] leading-[1.75]" style={{ color: "var(--nt-text-lo)", fontFamily: "var(--font-dm-sans)" }}>
        {wordTimestamps.map((w, i) => {
          const pauseBefore = pauses.find((p) => p.afterWordIndex === i - 1);
          const isActive    = activeWordIdx === i;
          return (
            <span key={i}>
              {pauseBefore && (
                <button
                  onClick={() => handlePauseClick(pauseBefore)}
                  className="inline-block rounded-full mx-[3px] align-middle transition-colors"
                  style={{ width: 3, height: 11, background: activePauseIdx === pauseBefore.idx ? "var(--nt-text-md)" : "var(--nt-track)", verticalAlign: "middle" }}
                  title={`Pause: ${pauseBefore.duration >= 1 ? `${pauseBefore.duration.toFixed(1)}s` : `${Math.round(pauseBefore.duration * 1000)}ms`}`}
                />
              )}
              <span
                ref={(el) => { wordEls.current[i] = el; }}
                onClick={() => setActiveWordIdx(isActive ? null : i)}
                className="cursor-pointer transition-all rounded-sm"
                style={{ padding: "0 2px", background: isActive ? "var(--nt-active)" : "transparent", color: isActive ? "var(--nt-text-hi)" : undefined, fontWeight: isActive ? 500 : undefined }}
              >
                {w.word}
              </span>
              {" "}
            </span>
          );
        })}
      </div>
    </div>
  );
}
