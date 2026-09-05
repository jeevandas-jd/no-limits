"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

export type ReportHighlight  = { region: string; activation: number; finding: string; clinical_context: string };
export type RiskIndicator    = { indicator: string; severity: "low" | "moderate" | "high"; explanation: string; citation?: string };
export type CognitiveCitation= { apa: string; pmid?: string; relevance?: string };

export type CognitiveReport = {
  summary: string;
  risk_level: "low" | "moderate" | "high";
  overall_cognitive_load: number;
  highlights?: ReportHighlight[];
  risk_indicators?: RiskIndicator[];
  recommendation?: string;
  citations?: CognitiveCitation[];
  disclaimer?: string;
};

const RISK_CONFIG = {
  low:      { label: "Low Risk",      color: "#1D9E75", bg: "rgba(29,158,117,0.10)",  border: "rgba(29,158,117,0.22)"  },
  moderate: { label: "Moderate Risk", color: "#BA7517", bg: "rgba(186,117,23,0.10)",  border: "rgba(186,117,23,0.22)"  },
  high:     { label: "High Risk",     color: "#D85A30", bg: "rgba(216,90,48,0.10)",   border: "rgba(216,90,48,0.22)"   },
};

const SEVERITY_COLOR: Record<string, string> = { low: "#1D9E75", moderate: "#BA7517", high: "#D85A30" };

const GLASS: React.CSSProperties = {
  background: "var(--nt-glass)",
  backdropFilter: "blur(16px)",
  WebkitBackdropFilter: "blur(16px)",
  border: "1px solid var(--nt-glass-border)",
  boxShadow: "var(--nt-glass-shadow)",
};

export function ReportPanel({ report }: { report: CognitiveReport }) {
  const [showCitations, setShowCitations] = useState(false);
  const risk    = RISK_CONFIG[report.risk_level] ?? RISK_CONFIG.moderate;
  const loadPct = Math.round((report.overall_cognitive_load ?? 0) * 100);

  return (
    <div className="rounded-xl overflow-hidden flex flex-col gap-0" style={GLASS}>
      {/* Header */}
      <div className="px-4 pt-3.5 pb-3" style={{ borderBottom: "1px solid var(--nt-divider)" }}>
        <div className="flex items-center justify-between gap-3 mb-2">
          <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--nt-text-xs)", fontFamily: "var(--font-jetbrains-mono)" }}>
            Cognitive Report
          </span>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
            style={{ color: risk.color, background: risk.bg, border: `1px solid ${risk.border}`, fontFamily: "var(--font-jetbrains-mono)" }}>
            {risk.label}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: "var(--nt-track)" }}>
            <div className="h-full rounded-full transition-all duration-700" style={{ width: `${loadPct}%`, background: risk.color }} />
          </div>
          <span className="text-[10px] tabular-nums shrink-0" style={{ color: "var(--nt-text-xs)", fontFamily: "var(--font-jetbrains-mono)" }}>
            {loadPct}% load
          </span>
        </div>
      </div>

      {/* Summary */}
      <div className="px-4 py-3" style={{ borderBottom: "1px solid var(--nt-divider)" }}>
        <p className="text-[12px] leading-relaxed" style={{ color: "var(--nt-text-md)" }}>{report.summary}</p>
      </div>

      {/* Risk indicators */}
      {report.risk_indicators && report.risk_indicators.length > 0 && (
        <div className="px-4 py-3 flex flex-col gap-2" style={{ borderBottom: "1px solid var(--nt-divider)" }}>
          <span className="text-[9px] font-semibold uppercase tracking-widest" style={{ color: "var(--nt-text-ghost)", fontFamily: "var(--font-jetbrains-mono)" }}>
            Indicators
          </span>
          {report.risk_indicators.map((ind, i) => (
            <div key={i} className="flex items-start gap-2">
              <div className="w-1 h-1 rounded-full mt-1.5 shrink-0" style={{ background: SEVERITY_COLOR[ind.severity] ?? "#7e8fa6" }} />
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-semibold leading-snug" style={{ color: "var(--nt-text-hi)" }}>{ind.indicator}</p>
                <p className="text-[10px] leading-relaxed mt-0.5" style={{ color: "var(--nt-text-lo)" }}>{ind.explanation}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Recommendation */}
      {report.recommendation && (
        <div className="px-4 py-3" style={{ borderBottom: "1px solid var(--nt-divider)" }}>
          <span className="text-[9px] font-semibold uppercase tracking-widest block mb-1.5" style={{ color: "var(--nt-text-ghost)", fontFamily: "var(--font-jetbrains-mono)" }}>
            Recommendation
          </span>
          <p className="text-[11px] leading-relaxed" style={{ color: "var(--nt-text-lo)" }}>{report.recommendation}</p>
        </div>
      )}

      {/* Citations */}
      {report.citations && report.citations.length > 0 && (
        <div className="px-4 py-2.5">
          <button
            onClick={() => setShowCitations((v) => !v)}
            className="nt-nav-btn flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-widest rounded"
            style={{ fontFamily: "var(--font-jetbrains-mono)" }}
          >
            {showCitations ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
            Citations ({report.citations.length})
          </button>
          {showCitations && (
            <div className="mt-2 flex flex-col gap-2">
              {report.citations.map((c, i) => (
                <div key={i} className="flex items-start gap-1.5">
                  <span className="text-[9px] shrink-0 mt-0.5" style={{ color: "var(--nt-text-ghost)", fontFamily: "var(--font-jetbrains-mono)" }}>[{i + 1}]</span>
                  <p className="text-[9px] leading-relaxed" style={{ color: "var(--nt-text-xs)" }}>{c.apa}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Disclaimer */}
      {report.disclaimer && (
        <div className="px-4 pb-3 pt-0">
          <p className="text-[9px] italic leading-relaxed" style={{ color: "var(--nt-text-ghost)", fontFamily: "var(--font-jetbrains-mono)" }}>
            {report.disclaimer}
          </p>
        </div>
      )}
    </div>
  );
}
