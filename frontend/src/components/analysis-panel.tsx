"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Mic, MicOff, Send, Upload, ChevronDown } from "lucide-react";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";

export type WordTimestamp = { word: string; start?: number; end?: number };

export type AnalysisInput =
  | { type: "text"; content: string }
  | { type: "transcript"; content: string; pauseMap?: number[]; wordTimestamps?: WordTimestamp[]; duration?: number }
  | { type: "file"; file: File };

type AgentStep = {
  name: string;
  status: "pending" | "running" | "done" | "error";
  detail?: string;
};

type AnalysisPanelProps = {
  onSubmit?: (input: AnalysisInput) => void;
  isLoading?: boolean;
  agentSteps?: AgentStep[];
  placeholder?: string;
};

const GLASS: React.CSSProperties = {
  background: "var(--nt-glass)",
  backdropFilter: "blur(18px)",
  WebkitBackdropFilter: "blur(18px)",
  border: "1px solid var(--nt-glass-border)",
  boxShadow: "var(--nt-glass-shadow)",
};

// Animated waveform bars shown while recording
function WaveBars({ level }: { level: number }) {
  const bars = 20;
  return (
    <div className="flex items-center gap-[2px] h-5">
      {Array.from({ length: bars }).map((_, i) => {
        const phase   = (i / bars) * Math.PI * 2;
        const natural = (Math.sin(phase) + 1) / 2;
        const height  = 8 + (natural * 0.4 + level * 0.6) * 28;
        return (
          <div
            key={i}
            className="rounded-full transition-all duration-75"
            style={{
              width: 2,
              height,
              background: level > 0.05
                ? `rgba(239,159,39,${0.5 + level * 0.5})`
                : "rgba(255,255,255,0.15)",
            }}
          />
        );
      })}
    </div>
  );
}

export function AnalysisPanel({
  onSubmit,
  isLoading = false,
  agentSteps = [],
  placeholder = "Ask about cognitive signature analysis…",
}: AnalysisPanelProps) {
  const [text, setText] = useState("");
  const [transcriptPreview, setTranscriptPreview] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const handleTranscriptReady = useCallback(
    ({ transcript, pauseMap, wordTimestamps, duration }: {
      transcript: string; pauseMap?: number[]; wordTimestamps?: WordTimestamp[]; duration?: number;
    }) => {
      const words = Array.isArray(wordTimestamps) ? wordTimestamps.map((w) => w.word).join(" ") : transcript;
      setTranscriptPreview(words || transcript);
      setText(transcript);
      onSubmit?.({ type: "transcript", content: transcript, pauseMap, wordTimestamps, duration });
    },
    [onSubmit],
  );

  const {
    isRecording, isTranscribing, recordSeconds, audioLevel,
    liveTranscript, silenceCountdown,
    toggle,
  } = useAudioRecorder(handleTranscriptReady);

  // When recording stops and Whisper transcript arrives, clear live transcript
  useEffect(() => {
    if (!isRecording && !isTranscribing) {
      // transcriptPreview takes over — live transcript already cleared by hook
    }
  }, [isRecording, isTranscribing]);

  const handleSend = () => {
    if (!text.trim() || isLoading) return;
    onSubmit?.({ type: "text", content: text.trim() });
    setText("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onSubmit?.({ type: "file", file });
  };

  const statusDot = (s: AgentStep["status"]) => {
    if (s === "running") return "bg-amber-400 animate-pulse";
    if (s === "done")    return "bg-emerald-500";
    if (s === "error")   return "bg-red-500";
    return "";
  };

  const statusLabel = (s: AgentStep["status"]) => {
    if (s === "running") return "text-amber-500 font-medium";
    if (s === "done")    return "text-emerald-600";
    if (s === "error")   return "text-red-500";
    return "";
  };

  const showLive      = isRecording; // always show as soon as mic is open
  const showTranscribing = isTranscribing;

  return (
    <div className="w-full max-w-[42rem] mx-auto flex flex-col gap-2">
      {/* Agent steps */}
      {agentSteps.length > 0 && (
        <div className="rounded-xl overflow-hidden" style={GLASS}>
          <div className="px-4 py-2.5 flex flex-col gap-1">
            {agentSteps.map((step, i) => (
              <div key={i} className="flex items-center gap-2.5">
                <span
                  className={`w-1.5 h-1.5 rounded-full shrink-0 ${statusDot(step.status)}`}
                  style={step.status === "pending" ? { background: "var(--nt-track)" } : {}}
                />
                <span
                  className={`text-xs ${statusLabel(step.status)}`}
                  style={step.status === "pending" ? { color: "var(--nt-text-xs)" } : {}}
                >
                  {step.name}
                </span>
                {step.detail && (
                  <span className="text-xs ml-auto" style={{ color: "var(--nt-text-ghost)" }}>{step.detail}</span>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="flex items-center gap-2.5 mt-0.5 pt-1.5" style={{ borderTop: "1px solid var(--nt-divider)" }}>
                <span className="w-1.5 h-1.5 rounded-full animate-pulse shrink-0" style={{ background: "var(--nt-track)" }} />
                <span className="text-xs" style={{ color: "var(--nt-text-xs)" }}>Processing…</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Live recording panel ── */}
      {showLive && (
        <div
          className="rounded-xl px-4 py-3 flex flex-col gap-2.5"
          style={{
            ...GLASS,
            border: "1px solid rgba(239,159,39,0.35)",
            boxShadow: "0 0 18px rgba(239,159,39,0.08)",
          }}
        >
          {/* Header row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span
                className="w-2 h-2 rounded-full animate-pulse"
                style={{ background: "#ef9f27" }}
              />
              <span
                className="text-[10px] font-semibold tracking-widest uppercase"
                style={{ color: "#ef9f27", fontFamily: "var(--font-jetbrains-mono)" }}
              >
                Live · {`${Math.floor(recordSeconds / 60).toString().padStart(2, "0")}:${(recordSeconds % 60).toString().padStart(2, "0")}`}
              </span>
            </div>

            <div className="flex items-center gap-3">
              {/* Silence countdown */}
              {silenceCountdown !== null && (
                <span
                  className="text-[10px] tabular-nums font-medium px-2 py-0.5 rounded-full"
                  style={{
                    background: "rgba(239,159,39,0.12)",
                    color: "#ef9f27",
                    fontFamily: "var(--font-jetbrains-mono)",
                    border: "1px solid rgba(239,159,39,0.25)",
                  }}
                >
                  auto-submit in {silenceCountdown}s
                </span>
              )}
              <WaveBars level={audioLevel} />
            </div>
          </div>

          {/* Live transcript text */}
          <div
            className="text-[15px] leading-relaxed break-words min-h-[1.4em]"
            style={{
              color: liveTranscript ? "var(--nt-text-hi)" : "rgba(255,255,255,0.22)",
              fontFamily: "var(--font-dm-sans)",
              letterSpacing: "0.01em",
            }}
          >
            {liveTranscript || (
              <span className="italic" style={{ color: "rgba(255,255,255,0.22)", fontSize: 13 }}>
                Listening…
              </span>
            )}
            {/* Blinking cursor */}
            <span
              className="inline-block w-[2px] h-[1em] ml-0.5 align-middle animate-pulse rounded-sm"
              style={{ background: "#ef9f27", verticalAlign: "text-bottom" }}
            />
          </div>
        </div>
      )}

      {/* Transcribing state */}
      {showTranscribing && (
        <div
          className="rounded-xl px-4 py-3 flex items-center gap-3"
          style={{ ...GLASS, border: "1px solid rgba(99,179,237,0.25)" }}
        >
          <div className="w-3.5 h-3.5 rounded-full border-2 border-blue-400/30 border-t-blue-400 animate-spin shrink-0" />
          <span
            className="text-[12px] font-medium"
            style={{ color: "rgba(99,179,237,0.85)", fontFamily: "var(--font-dm-sans)" }}
          >
            Transcribing with Whisper — analysing shortly…
          </span>
        </div>
      )}

      {/* Whisper transcript preview (after recording) */}
      {transcriptPreview && !isRecording && !isTranscribing && (
        <div className="rounded-xl px-4 py-3" style={{ ...GLASS, border: "1px solid rgba(29,158,117,0.25)" }}>
          <div
            className="text-[9px] font-semibold uppercase tracking-widest mb-2 flex items-center gap-1.5"
            style={{ color: "#1D9E75", fontFamily: "var(--font-jetbrains-mono)" }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
            Transcript
          </div>
          <div
            className="text-[14px] leading-relaxed break-words"
            style={{ color: "var(--nt-text-hi)", fontFamily: "var(--font-dm-sans)" }}
          >
            {transcriptPreview}
          </div>
        </div>
      )}

      {/* Input box */}
      <div className="rounded-xl overflow-hidden" style={GLASS}>
        <textarea
          value={isRecording ? liveTranscript : text}
          onChange={(e) => { if (!isRecording) setText(e.target.value); }}
          onKeyDown={handleKeyDown}
          placeholder={isRecording ? "" : placeholder}
          rows={2}
          disabled={isLoading || isRecording}
          readOnly={isRecording}
          className="w-full px-4 pt-3 pb-1 text-sm bg-transparent resize-none outline-none"
          style={{
            color: isRecording ? "#ef9f27" : "var(--nt-text-hi)",
            opacity: isRecording ? 0.85 : 1,
          }}
        />
        <style>{`
          textarea { caret-color: var(--nt-text-hi); }
          textarea::placeholder { color: var(--nt-text-ghost) !important; }
          textarea:read-only { cursor: default; }
        `}</style>

        <div className="flex items-center gap-2 px-3 pb-2.5 pt-1">
          {/* Model badge */}
          <div
            className="flex items-center gap-1.5 text-[11px] rounded-lg px-2 py-1"
            style={{ background: "var(--nt-hover)", border: "1px solid var(--nt-divider)", color: "var(--nt-text-xs)" }}
          >
            <div className="w-2 h-2 rounded-full bg-orange-400" />
            <span>Claude</span>
            <ChevronDown size={10} className="opacity-50" />
          </div>

          {/* Mic button */}
          <button
            onClick={toggle}
            disabled={isTranscribing}
            title={isRecording ? "Stop recording" : isTranscribing ? "Transcribing…" : "Record speech"}
            className="w-7 h-7 rounded-full flex items-center justify-center transition-all"
            style={{
              color: isTranscribing
                ? "rgba(99,179,237,0.85)"
                : isRecording
                ? "#ef9f27"
                : "var(--nt-icon)",
              background: isRecording
                ? "rgba(239,159,39,0.12)"
                : isTranscribing
                ? "rgba(99,179,237,0.08)"
                : undefined,
              border: isRecording
                ? "1px solid rgba(239,159,39,0.35)"
                : isTranscribing
                ? "1px solid rgba(99,179,237,0.25)"
                : "none",
              boxShadow: isRecording ? "0 0 10px rgba(239,159,39,0.2)" : undefined,
            }}
          >
            {isTranscribing
              ? <div className="w-3 h-3 rounded-full border border-blue-400/40 border-t-blue-400 animate-spin" />
              : isRecording
              ? <MicOff size={13} />
              : <Mic size={13} />
            }
          </button>

          {/* Status label */}
          {(isRecording || isTranscribing) && (
            <span
              className="text-[11px] font-medium tabular-nums"
              style={{
                color: isTranscribing ? "rgba(99,179,237,0.75)" : "#ef9f27",
                fontFamily: "var(--font-jetbrains-mono)",
              }}
            >
              {isRecording
                ? `${Math.floor(recordSeconds / 60).toString().padStart(2, "0")}:${(recordSeconds % 60).toString().padStart(2, "0")}`
                : "transcribing…"}
            </span>
          )}

          {/* File upload */}
          <button
            onClick={() => fileRef.current?.click()}
            title="Upload file"
            className="nt-nav-btn w-7 h-7 rounded-full flex items-center justify-center"
          >
            <Upload size={13} />
          </button>
          <input ref={fileRef} type="file" accept=".txt,.pdf,.wav,.mp3,.m4a" className="hidden" onChange={handleFile} />

          <div className="flex-1" />

          {/* Send */}
          <button
            onClick={handleSend}
            disabled={!text.trim() || isLoading || isRecording}
            className="h-7 px-3 rounded-full flex items-center gap-1.5 text-[11px] font-medium transition-colors disabled:opacity-25"
            style={{ background: "var(--nt-btn-bg)", color: "var(--nt-btn-fg)" }}
          >
            {isLoading
              ? <div className="w-3 h-3 rounded-full border-2 border-current/40 border-t-current animate-spin" />
              : <><Send size={11} /><span>Analyse</span></>
            }
          </button>
        </div>
      </div>
    </div>
  );
}
