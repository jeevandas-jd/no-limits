"use client";

import { useState } from "react";
import { IconClockHour4, IconTrash, IconChevronRight, IconMicrophone, IconTextSize, IconBrain, IconX } from "@tabler/icons-react";
import type { HistoryEntry } from "@/hooks/useAnalysisHistory";
import type { CognitiveReport } from "@/components/report-panel";
import type { RegionActivation } from "@/components/brain-viewer";

type HistoryPanelProps = { entries: HistoryEntry[]; onRestore: (entry: HistoryEntry) => void; onRemove: (id: string) => void; onClearAll: () => void };

const RISK_CONFIG = {
  low:      { label: "Low",      color: "#1D9E75", bg: "rgba(29,158,117,0.12)"  },
  moderate: { label: "Moderate", color: "#BA7517", bg: "rgba(186,117,23,0.12)"  },
  high:     { label: "High",     color: "#D85A30", bg: "rgba(216,90,48,0.12)"   },
};

const DOMAINS      = ["lexical", "semantic", "prosody", "syntax", "affective"] as const;
const DOMAIN_LABELS: Record<string, string> = { lexical: "Lex", semantic: "Sem", prosody: "Pro", syntax: "Syn", affective: "Aff" };

const GLASS: React.CSSProperties = { background: "var(--nt-glass)", backdropFilter: "blur(18px)", WebkitBackdropFilter: "blur(18px)", border: "1px solid var(--nt-glass-border)", boxShadow: "var(--nt-glass-shadow)" };
const MODAL: React.CSSProperties = { background: "var(--nt-glass-hi)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)", border: "1px solid var(--nt-glass-border)", boxShadow: "0 24px 64px rgba(0,0,0,0.35)" };

function relativeTime(ts: number): string {
  const diff = Date.now() - ts, m = Math.floor(diff / 60000);
  if (m < 1)  return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d === 1) return "yesterday";
  if (d < 7)  return `${d}d ago`;
  return new Date(ts).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
function absTime(ts: number): string {
  return new Date(ts).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function scoreColor(pct: number) {
  return pct > 75 ? "#D85A30" : pct > 50 ? "#BA7517" : pct > 25 ? "#1D9E75" : "#7e8fa6";
}

// ─── Detail drawer ─────────────────────────────────────────────────────────────

function EntryDetail({ entry, onRestore, onClose, onRemove }: { entry: HistoryEntry; onRestore: () => void; onClose: () => void; onRemove: () => void }) {
  const risk    = RISK_CONFIG[entry.report.risk_level] ?? RISK_CONFIG.moderate;
  const loadPct = Math.round((entry.report.overall_cognitive_load ?? 0) * 100);

  const Section = ({ children, last }: { children: React.ReactNode; last?: boolean }) => (
    <div className="px-5 py-4" style={last ? {} : { borderBottom: "1px solid var(--nt-divider)" }}>
      {children}
    </div>
  );

  const Label = ({ children }: { children: React.ReactNode }) => (
    <span className="text-[9px] uppercase tracking-widest font-medium block mb-1.5" style={{ color: "var(--nt-text-ghost)", fontFamily: "var(--font-jetbrains-mono)" }}>
      {children}
    </span>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.35)", backdropFilter: "blur(4px)" }} onClick={onClose}>
      <div className="relative w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl flex flex-col" style={MODAL} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-3.5" style={{ borderBottom: "1px solid var(--nt-divider)", background: "var(--nt-glass-hi)", backdropFilter: "blur(12px)" }}>
          <div className="flex items-center gap-2.5">
            <IconClockHour4 size={14} style={{ color: "var(--nt-icon)" }} />
            <span className="text-[11px] font-medium" style={{ color: "var(--nt-text-xs)" }}>{absTime(entry.timestamp)}</span>
            <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full" style={{ color: risk.color, background: risk.bg }}>{risk.label}</span>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={onRemove} className="nt-nav-btn w-7 h-7 rounded-lg flex items-center justify-center hover:text-red-500"><IconTrash size={13} /></button>
            <button onClick={onClose}  className="nt-nav-btn w-7 h-7 rounded-lg flex items-center justify-center"><IconX size={14} /></button>
          </div>
        </div>

        <div className="flex flex-col">
          {/* Input snippet */}
          <Section>
            <div className="flex items-center gap-1.5 mb-2">
              {entry.inputType === "transcript" ? <IconMicrophone size={11} style={{ color: "var(--nt-icon)" }} /> : <IconTextSize size={11} style={{ color: "var(--nt-icon)" }} />}
              <span className="text-[9px] uppercase tracking-widest font-medium" style={{ color: "var(--nt-text-ghost)" }}>
                {entry.inputType === "transcript" ? "Voice recording" : "Text input"}
              </span>
            </div>
            <p className="text-[12px] leading-relaxed" style={{ color: "var(--nt-text-lo)" }}>{entry.inputSnippet}</p>
          </Section>

          {/* Scores */}
          <Section>
            <Label>Biomarker Scores</Label>
            <div className="flex items-end gap-3">
              {DOMAINS.map((d) => {
                const pct = Math.round((entry.scores[d] ?? 0) * 100);
                const col = scoreColor(pct);
                return (
                  <div key={d} className="flex flex-col items-center gap-1.5 flex-1">
                    <span className="text-[9px] tabular-nums font-semibold" style={{ color: col }}>{pct}</span>
                    <div className="w-full h-14 rounded-md overflow-hidden flex flex-col justify-end" style={{ background: "var(--nt-track)" }}>
                      <div className="w-full rounded-t-md transition-all duration-700" style={{ height: `${pct}%`, background: col, opacity: 0.85 }} />
                    </div>
                    <span className="text-[9px] uppercase tracking-wider" style={{ color: "var(--nt-text-ghost)", fontFamily: "var(--font-jetbrains-mono)" }}>{DOMAIN_LABELS[d]}</span>
                  </div>
                );
              })}
            </div>
            <div className="mt-3 flex items-center gap-2">
              <span className="text-[9px]" style={{ color: "var(--nt-text-ghost)", fontFamily: "var(--font-jetbrains-mono)" }}>cognitive load</span>
              <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: "var(--nt-track)" }}>
                <div className="h-full rounded-full" style={{ width: `${loadPct}%`, background: risk.color }} />
              </div>
              <span className="text-[9px] tabular-nums" style={{ color: "var(--nt-text-xs)", fontFamily: "var(--font-jetbrains-mono)" }}>{loadPct}%</span>
            </div>
          </Section>

          {/* Summary */}
          <Section>
            <Label>Summary</Label>
            <p className="text-[12px] leading-relaxed" style={{ color: "var(--nt-text-lo)" }}>{entry.report.summary}</p>
          </Section>

          {/* Indicators */}
          {entry.report.risk_indicators && entry.report.risk_indicators.length > 0 && (
            <Section>
              <Label>Indicators</Label>
              <div className="flex flex-col gap-2.5">
                {entry.report.risk_indicators.map((ind, i) => {
                  const sev = ind.severity === "high" ? "#D85A30" : ind.severity === "moderate" ? "#BA7517" : "#1D9E75";
                  return (
                    <div key={i} className="flex items-start gap-2">
                      <div className="w-1 h-1 rounded-full mt-1.5 shrink-0" style={{ background: sev }} />
                      <div>
                        <p className="text-[11px] font-semibold leading-snug" style={{ color: "var(--nt-text-hi)" }}>{ind.indicator}</p>
                        <p className="text-[10px] leading-relaxed mt-0.5" style={{ color: "var(--nt-text-lo)" }}>{ind.explanation}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Section>
          )}

          {entry.report.recommendation && (
            <Section>
              <Label>Recommendation</Label>
              <p className="text-[11px] leading-relaxed" style={{ color: "var(--nt-text-lo)" }}>{entry.report.recommendation}</p>
            </Section>
          )}

          {entry.report.citations && entry.report.citations.length > 0 && (
            <Section>
              <Label>Citations</Label>
              <div className="flex flex-col gap-1.5">
                {entry.report.citations.map((c, i) => (
                  <div key={i} className="flex items-start gap-1.5">
                    <span className="text-[9px] shrink-0 mt-0.5" style={{ color: "var(--nt-text-ghost)", fontFamily: "var(--font-jetbrains-mono)" }}>[{i + 1}]</span>
                    <p className="text-[9px] leading-relaxed" style={{ color: "var(--nt-text-xs)" }}>{c.apa}</p>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {entry.report.disclaimer && (
            <Section last>
              <p className="text-[9px] italic leading-relaxed" style={{ color: "var(--nt-text-ghost)", fontFamily: "var(--font-jetbrains-mono)" }}>{entry.report.disclaimer}</p>
            </Section>
          )}
        </div>

        {/* Restore CTA */}
        <div className="sticky bottom-0 px-5 py-3" style={{ borderTop: "1px solid var(--nt-divider)", background: "var(--nt-glass-hi)", backdropFilter: "blur(12px)" }}>
          <button
            onClick={onRestore}
            className="w-full h-9 rounded-xl text-[12px] font-medium transition-opacity flex items-center justify-center gap-2 hover:opacity-90"
            style={{ background: "var(--nt-btn-bg)", color: "var(--nt-btn-fg)" }}
          >
            <IconBrain size={13} />
            Restore this analysis
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── History card ──────────────────────────────────────────────────────────────

function HistoryCard({ entry, onSelect, onRemove }: { entry: HistoryEntry; onSelect: () => void; onRemove: (e: React.MouseEvent) => void }) {
  const risk = RISK_CONFIG[entry.report.risk_level] ?? RISK_CONFIG.moderate;

  return (
    <div
      onClick={onSelect}
      className="group relative rounded-xl overflow-hidden cursor-pointer transition-all duration-200 hover:scale-[1.01]"
      style={{ ...GLASS, boxShadow: "0 2px 8px rgba(0,0,0,0.10)" }}
    >
      <div className="absolute left-0 top-0 bottom-0 w-0.5 rounded-l-xl" style={{ background: risk.color, opacity: 0.75 }} />

      <div className="pl-4 pr-3 py-3 flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            {entry.inputType === "transcript"
              ? <IconMicrophone size={10} style={{ color: "var(--nt-icon)" }} className="shrink-0" />
              : <IconTextSize    size={10} style={{ color: "var(--nt-icon)" }} className="shrink-0" />
            }
            <span className="text-[10px]" style={{ color: "var(--nt-text-ghost)", fontFamily: "var(--font-jetbrains-mono)" }}>{relativeTime(entry.timestamp)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full" style={{ color: risk.color, background: risk.bg }}>{risk.label}</span>
            <button onClick={onRemove} className="nt-nav-btn opacity-0 group-hover:opacity-100 w-5 h-5 rounded-md flex items-center justify-center hover:text-red-500">
              <IconTrash size={11} />
            </button>
            <IconChevronRight size={12} style={{ color: "var(--nt-text-ghost)" }} />
          </div>
        </div>

        <p className="text-[11px] leading-snug line-clamp-2" style={{ color: "var(--nt-text-lo)" }}>{entry.inputSnippet}</p>

        <div className="flex items-end gap-1.5 pt-0.5">
          {DOMAINS.map((d) => {
            const pct = Math.round((entry.scores[d] ?? 0) * 100);
            const col = scoreColor(pct);
            return (
              <div key={d} className="flex flex-col items-center gap-0.5 flex-1">
                <div className="w-full h-5 rounded-sm overflow-hidden flex flex-col justify-end" style={{ background: "var(--nt-track)" }}>
                  <div className="w-full rounded-t-sm" style={{ height: `${pct}%`, background: col, opacity: 0.85 }} />
                </div>
                <span className="text-[8px] uppercase" style={{ color: "var(--nt-text-ghost)", fontFamily: "var(--font-jetbrains-mono)" }}>{DOMAIN_LABELS[d]}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Main panel ───────────────────────────────────────────────────────────────

export function HistoryPanel({ entries, onRestore, onRemove, onClearAll }: HistoryPanelProps) {
  const [selected, setSelected] = useState<HistoryEntry | null>(null);

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-8">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: "var(--nt-hover)", border: "1px solid var(--nt-divider)" }}>
          <IconClockHour4 size={20} style={{ color: "var(--nt-text-xs)" }} />
        </div>
        <div>
          <p className="text-[13px] font-medium" style={{ color: "var(--nt-text-md)" }}>No analyses yet</p>
          <p className="text-[11px] mt-1 leading-relaxed" style={{ color: "var(--nt-text-xs)" }}>Run your first analysis and it will appear here</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between px-5 py-3 shrink-0" style={{ borderBottom: "1px solid var(--nt-divider)" }}>
          <div className="flex items-center gap-2">
            <IconClockHour4 size={13} style={{ color: "var(--nt-icon)" }} />
            <span className="text-[11px] font-medium" style={{ color: "var(--nt-text-lo)" }}>{entries.length} {entries.length === 1 ? "analysis" : "analyses"}</span>
          </div>
          <button onClick={onClearAll} className="nt-nav-btn text-[10px] flex items-center gap-1 rounded hover:text-red-500">
            <IconTrash size={11} />Clear all
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-2.5">
          {entries.map((entry) => (
            <HistoryCard key={entry.id} entry={entry} onSelect={() => setSelected(entry)} onRemove={(e) => { e.stopPropagation(); onRemove(entry.id); }} />
          ))}
        </div>
      </div>
      {selected && (
        <EntryDetail entry={selected} onRestore={() => { onRestore(selected); setSelected(null); }} onClose={() => setSelected(null)} onRemove={() => { onRemove(selected.id); setSelected(null); }} />
      )}
    </>
  );
}
