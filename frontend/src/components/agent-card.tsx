"use client";

import { REGIONS } from "./brain-atlas";

type Marker = { name: string; value: number; unit?: string };

export type AgentCardProps = {
  agentName: string;
  primerSet: string;
  brainRegion: string;
  markers: Marker[];
  topScore?: number;
  isActive?: boolean;
  isLoading?: boolean;
};

const AGENT_DETAILS: Record<string, { primerSet: string; markers: Marker[]; topScore: number }> = {
  Syntax:   { primerSet: "MLU · Depth · Passive",        markers: [{ name: "MLU", value: 83 }, { name: "Clause depth", value: 79 }, { name: "Passive voice", value: 22 }], topScore: 83 },
  Lexical:  { primerSet: "TTR · Density · Filler",       markers: [{ name: "TTR", value: 68 }, { name: "Lexical density", value: 74 }, { name: "Filler rate", value: 42 }], topScore: 72 },
  Semantic: { primerSet: "Coherence · Density · Tang",   markers: [{ name: "Coherence", value: 58 }, { name: "Idea density", value: 61 }, { name: "Tangentiality", value: 33 }], topScore: 58 },
  Prosody:  { primerSet: "Rate · Pause · Hesitation",    markers: [{ name: "Speech rate", value: 44, unit: "wpm" }, { name: "Pause freq", value: 51, unit: "/min" }, { name: "Hesitation", value: 38 }], topScore: 44 },
  Affective:{ primerSet: "Valence · Arousal · Intensity",markers: [{ name: "Valence", value: 55 }, { name: "Arousal", value: 62 }, { name: "Intensity", value: 48 }], topScore: 62 },
};

function scoreColor(score: number): string {
  if (score > 75) return "#D85A30";
  if (score > 50) return "#BA7517";
  if (score > 25) return "#1D9E75";
  return "#7e8fa6";
}

export const MOCK_AGENTS: AgentCardProps[] = REGIONS.map((region) => {
  const details = AGENT_DETAILS[region.agent];
  return { agentName: `${region.agent} Agent`, primerSet: details.primerSet, brainRegion: region.label, markers: details.markers, topScore: details.topScore };
});

export function AgentCard({ agentName, primerSet, brainRegion, markers, topScore = 0, isActive = false, isLoading = false }: AgentCardProps) {
  if (isLoading) {
    return (
      <div className="p-4 h-full flex flex-col gap-3">
        {[2/3, 1/2, 1].map((w, i) => (
          <div key={i} className="h-3 rounded-md animate-pulse" style={{ width: `${w * 100}%`, background: "var(--nt-track)" }} />
        ))}
      </div>
    );
  }

  const color = scoreColor(topScore);

  return (
    <div className="p-4 h-full flex flex-col gap-3">
      <div>
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold" style={{ color: "var(--nt-text-hi)" }}>{agentName}</p>
          <span className="text-xs font-bold tabular-nums" style={{ color }}>{topScore}</span>
        </div>
        <p className="text-xs mt-0.5" style={{ color: "var(--nt-text-xs)" }}>
          {brainRegion}
          <span className="mx-1.5" style={{ color: "var(--nt-text-ghost)" }}>·</span>
          <span style={{ fontFamily: "var(--font-jetbrains-mono), monospace", fontSize: "10px" }}>{primerSet}</span>
        </p>
      </div>

      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--nt-track)" }}>
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${topScore}%`, background: color }} />
      </div>

      <div className="flex flex-col gap-2">
        {markers.map((m) => (
          <div key={m.name} className="flex items-center justify-between gap-2">
            <span className="text-xs truncate" style={{ color: "var(--nt-text-lo)" }}>{m.name}</span>
            <div className="flex items-center gap-2 shrink-0">
              <div className="w-12 h-1 rounded-full overflow-hidden" style={{ background: "var(--nt-track)" }}>
                <div className="h-full rounded-full" style={{ width: `${m.value}%`, background: scoreColor(m.value) }} />
              </div>
              <span className="text-xs tabular-nums w-10 text-right" style={{ color: "var(--nt-text-xs)", fontFamily: "var(--font-jetbrains-mono), monospace" }}>
                {m.value}{m.unit ? <>&thinsp;{m.unit}</> : ""}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="flex-1" />

      <div className="flex items-center justify-between pt-2.5" style={{ borderTop: "1px solid var(--nt-divider)" }}>
        <span className="text-[10px] uppercase tracking-widest" style={{ color: "var(--nt-text-ghost)", fontFamily: "var(--font-jetbrains-mono), monospace" }}>
          {isActive ? "Processing" : "Standby"}
        </span>
        <div className="flex items-center gap-1.5">
          <div className={`w-2 h-2 rounded-full ${isActive ? "bg-amber-400 animate-pulse" : ""}`} style={!isActive ? { background: "var(--nt-track)" } : {}} />
          <div className={`w-2 h-2 rounded-full ${isActive ? "bg-emerald-500" : ""}`}           style={!isActive ? { background: "var(--nt-hover)" } : {}} />
        </div>
      </div>
    </div>
  );
}
