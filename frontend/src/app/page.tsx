"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { NoLimitsSplash } from "@/components/neurotrace-splash";
import { NeuroSidebar } from "@/components/neuro-sidebar";
import { SiteHeader } from "@/components/site-header";
import { type AgentCardProps } from "@/components/agent-card";
import { AnalysisPanel, type AnalysisInput, type WordTimestamp } from "@/components/analysis-panel";
import { WaveformPanel } from "@/components/waveform-panel";
import { ReportPanel, type CognitiveReport } from "@/components/report-panel";
import { HistoryPanel } from "@/components/history-panel";
import { DashboardView } from "@/components/dashboard-view";
import GlassSurface from "@/components/GlassSurface";
import type { RegionActivation } from "@/components/brain-viewer";
import { useAnalysisHistory } from "@/hooks/useAnalysisHistory";
import { useTheme } from "@/hooks/useTheme";
import { NeuroRadarChart } from "@/components/radar-chart";

// ─── Brain region definitions ─────────────────────────────────────────────────

const BRAIN_REGIONS: RegionActivation[] = [
  { region: "Broca's area",    mni: [-44, 20, 8],    activation: 0.72, agent: "Lexical"   },
  { region: "Wernicke's area", mni: [-54, -40, 14],  activation: 0.58, agent: "Semantic"  },
  { region: "DLPFC",           mni: [-46, 20, 32],   activation: 0.83, agent: "Syntax"    },
  { region: "SMA",             mni: [0, -4, 60],     activation: 0.44, agent: "Prosody"   },
  { region: "Amygdala",        mni: [-24, -4, -22],  activation: 0.31, agent: "Affective" },
];

const AGENT_KEY: Record<string, string> = {
  Lexical: "lexical", Semantic: "semantic",
  Prosody: "prosody", Syntax: "syntax", Affective: "affective",
};

const AGENT_DETAILS: Record<string, { primerSet: string; markers: { name: string; value: number; unit?: string }[] }> = {
  Lexical: {
    primerSet: "TTR · Density · Filler",
    markers: [
      { name: "TTR", value: 68 },
      { name: "Lexical density", value: 74 },
      { name: "Filler rate", value: 42 },
    ],
  },
  Semantic: {
    primerSet: "Coherence · Density · Tang",
    markers: [
      { name: "Coherence", value: 58 },
      { name: "Idea density", value: 61 },
      { name: "Tangentiality", value: 33 },
    ],
  },
  Prosody: {
    primerSet: "Rate · Pause · Hesitation",
    markers: [
      { name: "Speech rate", value: 44, unit: "wpm" },
      { name: "Pause freq", value: 51, unit: "/min" },
      { name: "Hesitation", value: 38 },
    ],
  },
  Syntax: {
    primerSet: "MLU · Depth · Passive",
    markers: [
      { name: "MLU", value: 83 },
      { name: "Clause depth", value: 79 },
      { name: "Passive voice", value: 22 },
    ],
  },
  Affective: {
    primerSet: "Valence · Arousal · Intensity",
    markers: [
      { name: "Valence", value: 55 },
      { name: "Arousal", value: 62 },
      { name: "Intensity", value: 48 },
    ],
  },
};

function scoreColor(v: number) {
  if (v > 75) return "#D85A30";
  if (v > 50) return "#BA7517";
  if (v > 25) return "#1D9E75";
  return "#888780";
}

// ─── Dynamic imports ──────────────────────────────────────────────────────────

//const Dither = dynamic(() => import("@/components/Dither"), { ssr: false });
const BrainViewer = dynamic(() => import("@/components/brain-viewer"), { ssr: false });

// ─── Types ────────────────────────────────────────────────────────────────────

type AgentStep = {
  name: string;
  status: "pending" | "running" | "done" | "error";
  detail?: string;
};

// ─── Biomarkers Information Panel ────────────────────────────────────────────

function BiomarkersPanel() {
  const biomarkers = [
    {
      id: "lexical",
      name: "Lexical Diversity",
      abbr: "LEX",
      agent: "Lexical",
      region: "Broca's Area",
      mni: "[-44, 20, 8]",
      description: "Vocabulary richness and word-choice variability across an utterance.",
      metrics: [
        { label: "TTR", desc: "Type-Token Ratio" },
        { label: "Density", desc: "Lexical Density" },
        { label: "Filler Rate", desc: "Filler Words / 100W" },
      ],
      clinical: "↓ diversity → aphasia, early dementia",
      color: "#ff6b6b",
    },
    {
      id: "semantic",
      name: "Semantic Coherence",
      abbr: "SEM",
      agent: "Semantic",
      region: "Wernicke's Area",
      mni: "[-54, -40, 14]",
      description: "Meaning connectivity and conceptual continuity across sentences.",
      metrics: [
        { label: "Coherence", desc: "Sentence-to-sentence similarity" },
        { label: "Idea Density", desc: "Propositions per word" },
        { label: "Tangentiality", desc: "Topic drift index" },
      ],
      clinical: "↓ coherence → schizophrenia, dementia",
      color: "#f59e0b",
    },
    {
      id: "syntax",
      name: "Syntactic Complexity",
      abbr: "SYN",
      agent: "Syntax",
      region: "DLPFC",
      mni: "[-46, 20, 32]",
      description: "Grammatical structure depth and sentence organisation patterns.",
      metrics: [
        { label: "MLU", desc: "Mean Length of Utterance" },
        { label: "Clause Depth", desc: "Embedding depth" },
        { label: "Passive Ratio", desc: "Passive voice usage" },
      ],
      clinical: "↓ complexity → cognitive impairment",
      color: "#00e5ff",
    },
    {
      id: "prosody",
      name: "Prosodic Features",
      abbr: "PRO",
      agent: "Prosody",
      region: "SMA",
      mni: "[0, -4, 60]",
      description: "Speech rhythm, timing, and intonation dynamics.",
      metrics: [
        { label: "WPM", desc: "Words per minute" },
        { label: "Pause Freq", desc: "Pauses per minute" },
        { label: "Hesitation", desc: "Filled pause ratio" },
      ],
      clinical: "↑ pauses + ↓ WPM → Parkinson's, depression",
      color: "#1d9e75",
    },
    {
      id: "affective",
      name: "Affective Markers",
      abbr: "AFF",
      agent: "Affective",
      region: "Amygdala",
      mni: "[-24, -4, -22]",
      description: "Emotional tone, arousal intensity, and affective expression.",
      metrics: [
        { label: "Valence", desc: "Positive–negative polarity" },
        { label: "Arousal", desc: "Activation level" },
        { label: "Certainty", desc: "Confidence markers" },
      ],
      clinical: "↓ valence + ↑ arousal → mood disorders",
      color: "#a855f7",
    },
  ];

  const GLASS: React.CSSProperties = {
    background: "var(--nt-glass)",
    backdropFilter: "blur(16px)",
    WebkitBackdropFilter: "blur(16px)",
    border: "1px solid var(--nt-glass-border)",
    boxShadow: "var(--nt-glass-shadow)",
  };

  return (
    <div className="h-full overflow-y-auto" style={{ padding: "16px 18px 24px" }}>
      {/* Header */}
      <div className="mb-5">
        <div className="flex items-baseline gap-3 mb-1">
          <h1
            style={{
              color: "var(--nt-text-hi)",
              fontSize: 17,
              fontFamily: "var(--font-syne)",
              fontWeight: 700,
              letterSpacing: "-0.02em",
            }}
          >
            Cognitive Biomarkers
          </h1>
          <span
            style={{
              color: "var(--nt-text-ghost)",
              fontSize: 9,
              fontFamily: "var(--font-jetbrains-mono)",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
            }}
          >
            5 domains · 15 metrics
          </span>
        </div>
        <p style={{ color: "var(--nt-text-xs)", fontSize: 11, fontFamily: "var(--font-dm-sans)", lineHeight: 1.5 }}>
          Quantitative speech & language markers mapped to specific neural circuits.
        </p>
      </div>

      {/* Biomarker cards — 2 col grid */}
      <div className="grid gap-2.5" style={{ gridTemplateColumns: "1fr 1fr" }}>
        {biomarkers.map((bm) => (
          <div
            key={bm.id}
            className="rounded-xl overflow-hidden flex flex-col"
            style={{ ...GLASS }}
          >
            {/* Colour accent strip + header */}
            <div
              className="flex items-center gap-3 px-4 py-3"
              style={{ borderBottom: "1px solid var(--nt-divider)" }}
            >
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                style={{
                  background: `${bm.color}18`,
                  border: `1px solid ${bm.color}35`,
                  display: "None",
                }}
              >
                <span
                  style={{
                    color: bm.color,
                    fontSize: 9,
                    fontFamily: "var(--font-jetbrains-mono)",
                    fontWeight: 700,
                    letterSpacing: "0.05em",
                  }}
                >
                  {bm.abbr}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div
                  style={{
                    color: "var(--nt-text-hi)",
                    fontSize: 12,
                    fontFamily: "var(--font-syne)",
                    fontWeight: 600,
                    lineHeight: 1.2,
                  }}
                >
                  {bm.name}
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span
                    className="px-1.5 py-px rounded text-[8px] font-semibold uppercase tracking-wide"
                    style={{ background: `${bm.color}15`, color: bm.color, fontFamily: "var(--font-jetbrains-mono)" }}
                  >
                    {bm.agent}
                  </span>
                  <span style={{ color: "var(--nt-text-ghost)", fontSize: 8, fontFamily: "var(--font-jetbrains-mono)" }}>
                    {bm.region}
                  </span>
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="px-4 py-3 flex flex-col gap-2.5 flex-1">
              {/* Description */}
              <p style={{ color: "var(--nt-text-lo)", fontSize: 10.5, fontFamily: "var(--font-dm-sans)", lineHeight: 1.55 }}>
                {bm.description}
              </p>

              {/* Metric chips */}
              <div className="flex flex-wrap gap-1">
                {bm.metrics.map((m) => (
                  <div
                    key={m.label}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg"
                    style={{
                      background: "var(--nt-hover)",
                      border: "1px solid var(--nt-divider)",
                    }}
                    title={m.desc}
                  >
                    <div className="w-1 h-1 rounded-full shrink-0" style={{ background: bm.color, opacity: 0.7 }} />
                    <span style={{ color: "var(--nt-text-lo)", fontSize: 9, fontFamily: "var(--font-jetbrains-mono)" }}>
                      {m.label}
                    </span>
                  </div>
                ))}
              </div>

              {/* Clinical note */}
              <div
                className="flex items-start gap-2 px-2.5 py-2 rounded-lg mt-auto"
                style={{ background: `${bm.color}0a`, border: `1px solid ${bm.color}18` }}
              >
                <div className="w-1 h-1 rounded-full mt-1.5 shrink-0" style={{ background: bm.color }} />
                <span style={{ color: "var(--nt-text-xs)", fontSize: 9.5, fontFamily: "var(--font-dm-sans)", fontStyle: "italic", lineHeight: 1.5 }}>
                  {bm.clinical}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer note */}
      <div
        className="mt-3 px-4 py-3 rounded-xl flex items-center gap-3"
        style={{ ...GLASS }}
      >
        <div className="w-1 self-stretch rounded-full shrink-0" style={{ background: "linear-gradient(to bottom, #3b82f6, #a855f7)" }} />
        <p style={{ color: "var(--nt-text-xs)", fontSize: 10, fontFamily: "var(--font-dm-sans)", lineHeight: 1.6 }}>
          All scores normalised 0–1 against healthy-population baselines. Higher scores indicate greater deviation.
          Biomarkers are extracted via a 7-agent Langflow pipeline using spaCy, sentence-transformers, and Claude claude-sonnet-4-6.
        </p>
      </div>
    </div>
  );
}

const REGION_MESH_CONFIG_COLORS: Record<string, string> = {
  "Broca's area":    "#ff6b6b",
  "Wernicke's area": "#f59e0b",
  "DLPFC":           "#00e5ff",
  "SMA":             "#1d9e75",
  "Amygdala":        "#a855f7",
};

const DEFAULT_REGIONS: RegionActivation[] = [
  { region: "Broca's area",    mni: [-44, 20, 8],    activation: 0.72, agent: "Lexical" },
  { region: "Wernicke's area", mni: [-54, -40, 14],  activation: 0.58, agent: "Semantic" },
  { region: "DLPFC",           mni: [-46, 20, 32],   activation: 0.83, agent: "Syntax" },
  { region: "SMA",             mni: [0, -4, 60],     activation: 0.44, agent: "Prosody" },
  { region: "Amygdala",        mni: [-24, -4, -22],  activation: 0.31, agent: "Affective" },
];

function BrainRegionsPanel() {
  const regions = [
    {
      id: "broca",
      name: "Broca's Area",
      ba: "BA 44/45",
      location: "Inferior Frontal Gyrus",
      lobe: "Frontal",
      mni: "−44, 20, 8",
      agent: "Lexical",
      agentColor: "#ff6b6b",
      function: "Speech production, phonological processing, lexical retrieval.",
      signal: "↓ activation → expressive aphasia, word-finding difficulty",
      tracts: ["Arcuate fasciculus", "IFOF"],
    },
    {
      id: "wernicke",
      name: "Wernicke's Area",
      ba: "BA 22",
      location: "Superior Temporal Gyrus",
      lobe: "Temporal",
      mni: "−54, −40, 14",
      agent: "Semantic",
      agentColor: "#f59e0b",
      function: "Language comprehension, semantic decoding, auditory word recognition.",
      signal: "↓ coherence → fluent but meaningless speech, receptive aphasia",
      tracts: ["Arcuate fasciculus", "SLF"],
    },
    {
      id: "dlpfc",
      name: "DLPFC",
      ba: "BA 9/46",
      location: "Dorsolateral Prefrontal Cortex",
      lobe: "Frontal",
      mni: "−46, 20, 32",
      agent: "Syntax",
      agentColor: "#00e5ff",
      function: "Working memory, cognitive control, syntactic rule application.",
      signal: "↑ syntactic load → DLPFC hyperdrive; ↓ activity → agrammatism",
      tracts: ["SLF II", "Cingulum"],
    },
    {
      id: "sma",
      name: "SMA",
      ba: "BA 6",
      location: "Supplementary Motor Area",
      lobe: "Frontal",
      mni: "0, −4, 60",
      agent: "Prosody",
      agentColor: "#1d9e75",
      function: "Speech motor planning, prosodic timing, pause & rhythm control.",
      signal: "↓ speech rate + ↑ hesitation → SMA hypofunction, Parkinson's",
      tracts: ["Corticospinal", "SMA–Broca loop"],
    },
    {
      id: "amygdala",
      name: "Amygdala",
      ba: "—",
      location: "Medial Temporal Lobe",
      lobe: "Limbic",
      mni: "−24, −4, −22",
      agent: "Affective",
      agentColor: "#a855f7",
      function: "Emotional salience, fear conditioning, affective language valence.",
      signal: "↑ arousal + ↓ valence → mood disorder, anxiety fingerprint",
      tracts: ["Uncinate fasciculus", "Amygdalofugal"],
    },
  ];

  const GLASS: React.CSSProperties = {
    background: "var(--nt-glass)",
    backdropFilter: "blur(16px)",
    WebkitBackdropFilter: "blur(16px)",
    border: "1px solid var(--nt-glass-border)",
    boxShadow: "var(--nt-glass-shadow)",
  };

  const [hoveredAtlasRegion, setHoveredAtlasRegion] = useState<RegionActivation | null>(null);

  return (
    <div className="h-full overflow-y-auto" style={{ padding: "16px 18px 24px" }}>
      {/* Header */}
      <div className="mb-4">
        <div className="flex items-baseline gap-3 mb-1">
          <h1
            style={{
              color: "var(--nt-text-hi)",
              fontSize: 17,
              fontFamily: "var(--font-syne)",
              fontWeight: 700,
              letterSpacing: "-0.02em",
            }}
          >
            Brain Regions
          </h1>
          <span
            style={{
              color: "var(--nt-text-ghost)",
              fontSize: 9,
              fontFamily: "var(--font-jetbrains-mono)",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
            }}
          >
            MNI152 · 5 regions
          </span>
        </div>
        <p style={{ color: "var(--nt-text-xs)", fontSize: 11, fontFamily: "var(--font-dm-sans)", lineHeight: 1.5 }}>
          Neural circuits that drive language and cognition, each mapped to a No-Limits analysis agent.
        </p>
      </div>

      {/* 3D brain — same viewer as the analysis page */}
      <div
        className="rounded-xl mb-3 overflow-hidden relative"
        style={{ ...GLASS, height: 280 }}
      >
        <BrainViewer
          activations={DEFAULT_REGIONS}
          onRegionClick={(r) => setHoveredAtlasRegion(r)}
          showLabels
        />
        {/* Hint overlay */}
        <div
          className="absolute bottom-2 left-0 right-0 flex justify-center pointer-events-none"
        >
          <span
            className="px-2 py-1 rounded-lg"
            style={{
              background: "rgba(0,0,0,0.45)",
              color: "rgba(255,255,255,0.45)",
              fontSize: 9,
              fontFamily: "var(--font-jetbrains-mono)",
              letterSpacing: "0.06em",
            }}
          >
            hover to explore · drag to rotate
          </span>
        </div>
      </div>

      {/* Hovered region callout */}
      {hoveredAtlasRegion && (
        <div
          className="rounded-xl px-4 py-3 mb-3 flex items-center gap-3"
          style={{ ...GLASS, borderColor: "rgba(216,90,48,0.3)" }}
        >
          <div
            className="w-2 h-2 rounded-full shrink-0"
            style={{ background: REGION_MESH_CONFIG_COLORS[hoveredAtlasRegion.region] ?? "#888" }}
          />
          <div className="flex-1 min-w-0">
            <span style={{ color: "var(--nt-text-hi)", fontSize: 12, fontFamily: "var(--font-syne)", fontWeight: 600 }}>
              {hoveredAtlasRegion.region}
            </span>
            <span style={{ color: "var(--nt-text-ghost)", fontSize: 9, fontFamily: "var(--font-jetbrains-mono)", marginLeft: 8 }}>
              MNI [{hoveredAtlasRegion.mni.join(", ")}]
            </span>
          </div>
          <span style={{ color: "var(--nt-text-xs)", fontSize: 10, fontFamily: "var(--font-dm-sans)" }}>
            {hoveredAtlasRegion.agent} agent
          </span>
        </div>
      )}

      {/* Region rows */}
      <div className="flex flex-col gap-2">
        {regions.map((r) => (
          <div
            key={r.id}
            className="rounded-xl overflow-hidden flex"
            style={{ ...GLASS }}
          >
            {/* Left accent bar */}
            <div
              className="w-1 shrink-0"
              style={{ background: r.agentColor }}
            />

            {/* Content */}
            <div className="flex-1 min-w-0 px-4 py-3 grid gap-x-6" style={{ gridTemplateColumns: "1fr 1.4fr" }}>
              {/* Left col: identity */}
              <div className="flex flex-col gap-1.5 justify-center">
                <div className="flex items-center gap-2">
                  <span
                    style={{
                      color: "var(--nt-text-hi)",
                      fontSize: 13,
                      fontFamily: "var(--font-syne)",
                      fontWeight: 700,
                    }}
                  >
                    {r.name}
                  </span>
                  <span
                    className="px-1.5 py-px rounded text-[8px] font-mono"
                    style={{ background: "var(--nt-hover)", color: "var(--nt-text-ghost)", border: "1px solid var(--nt-divider)" }}
                  >
                    {r.ba}
                  </span>
                </div>

                <div style={{ color: "var(--nt-text-xs)", fontSize: 10, fontFamily: "var(--font-dm-sans)" }}>
                  {r.location} · {r.lobe} Lobe
                </div>

                <div className="flex items-center gap-1.5 mt-0.5">
                  <span
                    className="px-2 py-0.5 rounded text-[8px] font-semibold uppercase tracking-wide"
                    style={{
                      background: `${r.agentColor}15`,
                      color: r.agentColor,
                      border: `1px solid ${r.agentColor}30`,
                      fontFamily: "var(--font-jetbrains-mono)",
                    }}
                  >
                    {r.agent} agent
                  </span>
                  <span
                    style={{
                      color: "var(--nt-text-ghost)",
                      fontSize: 8,
                      fontFamily: "var(--font-jetbrains-mono)",
                    }}
                  >
                    MNI [{r.mni}]
                  </span>
                </div>

                {/* Tracts */}
                <div className="flex flex-wrap gap-1 mt-0.5">
                  {r.tracts.map((t) => (
                    <span
                      key={t}
                      className="px-1.5 py-px rounded text-[7.5px]"
                      style={{
                        background: "var(--nt-hover)",
                        color: "var(--nt-text-ghost)",
                        border: "1px solid var(--nt-divider)",
                        fontFamily: "var(--font-jetbrains-mono)",
                      }}
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>

              {/* Right col: function + signal */}
              <div className="flex flex-col gap-2 justify-center" style={{ borderLeft: "1px solid var(--nt-divider)", paddingLeft: 16 }}>
                <p style={{ color: "var(--nt-text-lo)", fontSize: 11, fontFamily: "var(--font-dm-sans)", lineHeight: 1.55 }}>
                  {r.function}
                </p>
                <div
                  className="flex items-start gap-2 px-2.5 py-2 rounded-lg"
                  style={{ background: `${r.agentColor}0a`, border: `1px solid ${r.agentColor}18` }}
                >
                  <div className="w-1 h-1 rounded-full mt-1.5 shrink-0" style={{ background: r.agentColor }} />
                  <span
                    style={{
                      color: "var(--nt-text-xs)",
                      fontSize: 9.5,
                      fontFamily: "var(--font-dm-sans)",
                      fontStyle: "italic",
                      lineHeight: 1.5,
                    }}
                  >
                    {r.signal}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pipeline note */}
      <div
        className="mt-3 rounded-xl px-4 py-3 grid gap-4"
        style={{ ...GLASS, gridTemplateColumns: "1fr 1fr" }}
      >
        <div>
          <div
            style={{
              color: "var(--nt-text-xs)",
              fontSize: 8.5,
              fontFamily: "var(--font-jetbrains-mono)",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              marginBottom: 6,
            }}
          >
            Analysis Pipeline
          </div>
          <div className="flex flex-col gap-1">
            {["Speech/text → Whisper STT", "spaCy + sentence-transformers", "7-agent Langflow pipeline", "MNI152 activation overlay"].map((step, i) => (
              <div key={i} className="flex items-center gap-2">
                <div
                  className="w-4 h-4 rounded flex items-center justify-center shrink-0"
                  style={{ background: "var(--nt-hover)", border: "1px solid var(--nt-divider)" }}
                >
                  <span style={{ color: "var(--nt-text-ghost)", fontSize: 7, fontFamily: "var(--font-jetbrains-mono)" }}>{i + 1}</span>
                </div>
                <span style={{ color: "var(--nt-text-lo)", fontSize: 10, fontFamily: "var(--font-dm-sans)" }}>{step}</span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <div
            style={{
              color: "var(--nt-text-xs)",
              fontSize: 8.5,
              fontFamily: "var(--font-jetbrains-mono)",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              marginBottom: 6,
            }}
          >
            Clinical Applications
          </div>
          <div className="flex flex-col gap-1">
            {["Early dementia & MCI detection", "ADHD & language disorder screening", "Depression vocal biomarkers", "Treatment response monitoring"].map((app, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="w-1 h-1 rounded-full shrink-0" style={{ background: "var(--nt-text-ghost)" }} />
                <span style={{ color: "var(--nt-text-lo)", fontSize: 10, fontFamily: "var(--font-dm-sans)" }}>{app}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function MiniAgentCard({ agent, isActive }: { agent: AgentCardProps; isActive: boolean }) {
  const score = agent.topScore ?? 0;
  const color = scoreColor(score);

  return (
    <div
      className="rounded-xl p-3 h-full flex flex-col"
      style={{
        background: "var(--nt-glass)",
        backdropFilter: "blur(16px)",
        border: isActive ? `1px solid rgba(216,90,48,0.35)` : "1px solid var(--nt-glass-border)",
        boxShadow: isActive
          ? "0 0 0 2px rgba(216,90,48,0.08), var(--nt-glass-shadow)"
          : "var(--nt-glass-shadow)",
        transition: "border-color 0.3s, box-shadow 0.3s",
      }}
    >
      {/* Name + score */}
      <div className="flex items-start justify-between gap-1 mb-1.5">
        <div>
          <p className="text-[11px] font-semibold leading-tight" style={{ color: "var(--nt-text-hi)" }}>{agent.agentName}</p>
          <p className="text-[9px] mt-0.5" style={{ color: "var(--nt-text-xs)", fontFamily: "var(--font-jetbrains-mono)" }}>
            {agent.brainRegion}
          </p>
        </div>
        <span className="text-sm font-bold tabular-nums leading-none pt-0.5" style={{ color }}>
          {score}
        </span>
      </div>

      {/* Overall score bar */}
      <div className="h-1 rounded-full overflow-hidden mb-2" style={{ background: "var(--nt-track)" }}>
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${score}%`, background: color }}
        />
      </div>

      {/* Compact metrics */}
      <div className="flex flex-col gap-1 flex-1">
        {agent.markers.slice(0, 2).map((m) => (
          <div key={m.name} className="flex items-center justify-between gap-1">
            <span className="text-[10px] truncate" style={{ color: "var(--nt-text-lo)" }}>{m.name}</span>
            <span
              className="text-[10px] tabular-nums shrink-0"
              style={{ color: scoreColor(m.value), fontFamily: "var(--font-jetbrains-mono)" }}
            >
              {m.value}{m.unit ? ` ${m.unit}` : ""}
            </span>
          </div>
        ))}
      </div>

      {/* Active indicator */}
      <div className="flex items-center gap-1.5 pt-2 mt-auto" style={{ borderTop: "1px solid var(--nt-divider)" }}>
        <div
          className={`w-1.5 h-1.5 rounded-full ${isActive ? "bg-amber-400 animate-pulse" : ""}`}
          style={!isActive ? { background: "var(--nt-track)" } : {}}
        />
        <span
          className="text-[9px] uppercase tracking-widest"
          style={{ color: "var(--nt-text-ghost)", fontFamily: "var(--font-jetbrains-mono)" }}
        >
          {isActive ? "Processing" : "Standby"}
        </span>
      </div>
    </div>
  );
}

// ─── Processing steps overlay ────────────────────────────────────────────────

const STEP_REGIONS: Record<string, string> = {
  "STT preprocessor": "Whisper · Pause map",
  "Lexical agent":     "Broca's area",
  "Semantic agent":    "Wernicke's area",
  "Prosody agent":     "SMA",
  "Syntax agent":      "DLPFC",
  "Biomarker mapper":  "MNI normalisation",
  "Report composer":   "Claude claude-sonnet-4-6",
};

function ProcessingSteps({ steps, glass }: { steps: AgentStep[]; glass: React.CSSProperties }) {
  const doneCount  = steps.filter((s) => s.status === "done").length;
  const totalCount = steps.length;
  const pct        = totalCount ? Math.round((doneCount / totalCount) * 100) : 0;

  return (
    <div className="w-full flex flex-col gap-3 animate-fade-up" style={{ animationFillMode: "both" }}>

      {/* Progress bar + label */}
      <div className="flex items-center justify-between mb-0.5">
        <span
          style={{
            color: "var(--nt-text-xs)",
            fontSize: 9,
            fontFamily: "var(--font-jetbrains-mono)",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
          }}
        >
          Pipeline · {doneCount}/{totalCount} complete
        </span>
        <span style={{ color: "var(--nt-text-xs)", fontSize: 9, fontFamily: "var(--font-jetbrains-mono)" }}>
          {pct}%
        </span>
      </div>
      <div className="h-px w-full rounded-full overflow-hidden mb-1" style={{ background: "var(--nt-track)" }}>
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: "linear-gradient(90deg, #3b82f6, #8b5cf6)" }}
        />
      </div>

      {/* Step rows */}
      <div className="rounded-2xl overflow-hidden" style={glass}>
        {steps.map((step, i) => {
          const isRunning = step.status === "running";
          const isDone    = step.status === "done";
          const isError   = step.status === "error";
          const region    = STEP_REGIONS[step.name] ?? "";

          return (
            <div
              key={step.name}
              className="flex items-center gap-3 px-4 py-2.5 transition-colors duration-300 animate-fade-up"
              style={{
                animationDelay: `${i * 55}ms`,
                animationFillMode: "both",
                borderBottom: i < steps.length - 1 ? "1px solid var(--nt-divider)" : "none",
                background: isRunning ? "var(--nt-hover)" : "transparent",
              }}
            >
              {/* Status dot */}
              <div className="w-4 h-4 flex items-center justify-center shrink-0">
                {isRunning && (
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse-amber" />
                )}
                {isDone && (
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6l3 3 5-5" stroke="#1D9E75" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
                {isError && (
                  <span style={{ color: "#D85A30", fontSize: 11, fontWeight: 700, lineHeight: 1 }}>✕</span>
                )}
                {step.status === "pending" && (
                  <span className="w-1.5 h-1.5 rounded-full block" style={{ background: "var(--nt-track)" }} />
                )}
              </div>

              {/* Name + region */}
              <div className="flex-1 min-w-0">
                <div
                  style={{
                    fontSize: 11,
                    fontFamily: "var(--font-dm-sans)",
                    fontWeight: isRunning ? 600 : 400,
                    color: isRunning ? "var(--nt-text-hi)" : isDone ? "var(--nt-text-lo)" : "var(--nt-text-ghost)",
                    transition: "color 0.3s",
                  }}
                >
                  {step.name}
                </div>
                {region && (
                  <div style={{ fontSize: 9, fontFamily: "var(--font-jetbrains-mono)", color: "var(--nt-text-ghost)", marginTop: 1 }}>
                    {region}
                  </div>
                )}
              </div>

              {/* Status tag */}
              <span
                className="shrink-0 text-[8px] font-semibold tracking-widest uppercase px-1.5 py-0.5 rounded-md"
                style={{
                  fontFamily: "var(--font-jetbrains-mono)",
                  color: isRunning ? "#f59e0b" : isDone ? "#1D9E75" : isError ? "#D85A30" : "var(--nt-text-ghost)",
                  background: isRunning ? "rgba(245,158,11,0.10)" : isDone ? "rgba(29,158,117,0.08)" : "transparent",
                  border: isRunning ? "1px solid rgba(245,158,11,0.22)" : isDone ? "1px solid rgba(29,158,117,0.18)" : "1px solid transparent",
                  minWidth: 36,
                  textAlign: "center",
                }}
              >
                {isRunning ? "live" : isDone ? "done" : isError ? "err" : "·"}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { isDark, toggle: toggleTheme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<"no-limits" | "ticease" | "memory">("no-limits");
  const [showProductPicker, setShowProductPicker] = useState(false);
  const { entries: historyEntries, addEntry, removeEntry, clearAll } = useAnalysisHistory();
  const [hasStarted, setHasStarted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [agentSteps, setAgentSteps] = useState<AgentStep[]>([]);
  const [activations, setActivations] = useState<RegionActivation[]>(BRAIN_REGIONS);
  const [biomarkerScores, setBiomarkerScores] = useState<Record<string, number> | undefined>();
  const [wordTimestamps, setWordTimestamps] = useState<WordTimestamp[] | undefined>();
  const [audioDuration, setAudioDuration] = useState<number | undefined>();
  const [activePage, setActivePage] = useState("analysis");
  const [cognitiveReport, setCognitiveReport] = useState<CognitiveReport | undefined>();
  const [currentAgentIndex, setCurrentAgentIndex] = useState(0);

  const agentCards = useMemo(() => {
    return activations.map((r) => {
      const details = AGENT_DETAILS[r.agent] ?? AGENT_DETAILS.Lexical;
      const topScore = Math.round((r.activation || 0) * 100);
      return {
        agentName: `${r.agent} Agent`,
        primerSet: details.primerSet,
        brainRegion: r.region,
        markers: details.markers,
        topScore,
      };
    });
  }, [activations]);

  const nextAgent = useCallback(() => {
    setCurrentAgentIndex((prev) => (prev + 1) % agentCards.length);
  }, [agentCards.length]);

  const prevAgent = useCallback(() => {
    setCurrentAgentIndex((prev) => (prev - 1 + agentCards.length) % agentCards.length);
  }, [agentCards.length]);

  const activeAgentName = useMemo(() => {
    const running = agentSteps.find((s) => s.status === "running");
    if (!running) return undefined;
    return { "Lexical agent": "Lexical", "Semantic agent": "Semantic", "Prosody agent": "Prosody", "Syntax agent": "Syntax" }[running.name];
  }, [agentSteps]);

  // Shift+P toggles side panels (kept for power users)
  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.shiftKey && e.key === "P") e.preventDefault(); };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, []);

  const handleSubmit = useCallback(async (input: AnalysisInput) => {
    setHasStarted(true);
    setIsLoading(true);
    setBiomarkerScores(undefined);
    setCognitiveReport(undefined);
    setActivations(BRAIN_REGIONS);

    // Capture word timestamps from voice recording
    if (input.type === "transcript") {
      setWordTimestamps(input.wordTimestamps);
      setAudioDuration(input.duration);
    } else {
      setWordTimestamps(undefined);
      setAudioDuration(undefined);
    }

    setAgentSteps([
      { name: "STT preprocessor", status: "running" },
      { name: "Lexical agent",     status: "pending" },
      { name: "Semantic agent",    status: "pending" },
      { name: "Prosody agent",     status: "pending" },
      { name: "Syntax agent",      status: "pending" },
      { name: "Biomarker mapper",  status: "pending" },
      { name: "Report composer",   status: "pending" },
    ]);

    try {
      const body =
        input.type === "text"
          ? { input_value: input.content, ...(sessionId ? { session_id: sessionId } : {}) }
          : input.type === "transcript"
            ? { transcript: input.content, pause_map: input.pauseMap, ...(sessionId ? { session_id: sessionId } : {}) }
            : null;

      if (!body) { setIsLoading(false); return; }

      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.body) { setIsLoading(false); return; }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      const processLine = (line: string) => {
        const t = line.trim();
        if (!t) return;
        try {
          const ev = JSON.parse(t);
          if (ev.type === "step" && ev.step) {
            setAgentSteps((prev) => prev.map((s) => s.name === ev.step.name ? { ...s, status: ev.step.status, detail: ev.step.detail } : s));
          } else if (ev.type === "end") {
            if (ev.session_id) setSessionId(ev.session_id);
            if (ev.report) setCognitiveReport(ev.report as CognitiveReport);
            if (ev.scores) {
              console.log("RAW SCORES:", ev.scores);
              // Handle both flat ({ lexical: 0.72 }) and nested ({ lexical: { overall: 0.72 } }) shapes
              const raw = ev.scores as Record<string, number | { overall: number }>;
              const scores: Record<string, number> = {};
              for (const [key, val] of Object.entries(raw)) {
                scores[key] = typeof val === "number" ? val : val.overall;
              }
              setBiomarkerScores(scores);
              setActivations(BRAIN_REGIONS.map((r) => ({ ...r, activation: scores[AGENT_KEY[r.agent]] ?? r.activation })));
              // Save to history when we have both scores and report
              if (ev.report) {
                addEntry({
                  inputType: input.type === "transcript" ? "transcript" : "text",
                  inputSnippet: ("content" in input ? input.content : "").slice(0, 300),
                  scores,
                  report: ev.report as CognitiveReport,
                  sessionId: ev.session_id ?? "",
                  wordTimestamps: input.type === "transcript" ? input.wordTimestamps : undefined,
                  audioDuration: input.type === "transcript" ? input.duration : undefined,
                });
              }
            }
            setAgentSteps((prev) => prev.map((s) => ({ ...s, status: "done" as const })));
          } else if (ev.type === "error") {
            setAgentSteps((prev) => prev.map((s) => s.status === "running" ? { ...s, status: "error" as const } : s));
          }
        } catch { /* skip */ }
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) processLine(line);
      }
      if (buffer.trim()) processLine(buffer);
    } catch (err) {
      console.error("Analysis error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [sessionId, addEntry]);

  // ── Restore a history entry ──────────────────────────────────────────────────
  const handleRestore = useCallback((entry: import("@/hooks/useAnalysisHistory").HistoryEntry) => {
    setHasStarted(true);
    setBiomarkerScores(entry.scores);
    setCognitiveReport(entry.report);
    setWordTimestamps(entry.wordTimestamps);
    setAudioDuration(entry.audioDuration);
    setActivations(BRAIN_REGIONS.map((r) => ({ ...r, activation: entry.scores[AGENT_KEY[r.agent]] ?? r.activation })));
    setAgentSteps([]);
    setActivePage("analysis");
  }, []);

  // ── Shared glass style ──────────────────────────────────────────────────────
  const glassStyle: React.CSSProperties = {
    background: "var(--nt-glass)",
    backdropFilter: "blur(18px)",
    border: "1px solid var(--nt-glass-border)",
    boxShadow: "var(--nt-glass-shadow)",
  };

  const productOptions = [
    { id: "no-limits" as const, label: "No-Limits", description: "Cognitive signature analysis", href: "/" },
    { id: "ticease" as const, label: "TicEase", description: "Mood and tic tracking", href: "/ticease" },
    { id: "memory" as const, label: "Memory", description: "Capture and recall moments", href: "/memory" },
  ];

  return (
    <div className="relative h-screen w-full overflow-hidden">
      <NoLimitsSplash />

      <div className="absolute right-4 top-4 z-40">
        <button
          type="button"
          onClick={() => setShowProductPicker(true)}
          className="rounded-full border px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] transition hover:opacity-90"
          style={{
            background: "rgba(10,10,10,0.35)",
            borderColor: "var(--nt-glass-border)",
            color: "var(--nt-text-hi)",
            backdropFilter: "blur(8px)",
          }}
        >
          Choose product
        </button>
      </div>

      {showProductPicker && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm">
          <div className="w-full max-w-3xl rounded-3xl border p-6 shadow-2xl" style={{ background: "var(--nt-glass)", borderColor: "var(--nt-glass-border)" }}>
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.24em]" style={{ color: "var(--nt-text-ghost)" }}>
                  Product switcher
                </div>
                <h2 className="mt-2 text-2xl font-semibold" style={{ color: "var(--nt-text-hi)" }}>
                  Choose your workspace
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowProductPicker(false)}
                className="rounded-full border px-2.5 py-1 text-xs"
                style={{ borderColor: "var(--nt-glass-border)", color: "var(--nt-text-md)" }}
              >
                Close
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {productOptions.map((product) => {
                const active = selectedProduct === product.id;
                return (
                  <Link
                    key={product.id}
                    href={product.href}
                    onClick={() => {
                      setSelectedProduct(product.id);
                      setShowProductPicker(false);
                    }}
                    className="rounded-2xl border p-4 transition hover:-translate-y-0.5 hover:border-white/30"
                    style={{
                      borderColor: active ? "rgba(255,255,255,0.55)" : "var(--nt-glass-border)",
                      background: active ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.03)",
                    }}
                  >
                    <div className="mb-3 text-[10px] font-semibold uppercase tracking-[0.2em]" style={{ color: "var(--nt-text-ghost)" }}>
                      {active ? "Default" : "Open"}
                    </div>
                    <div className="text-xl font-semibold" style={{ color: "var(--nt-text-hi)" }}>
                      {product.label}
                    </div>
                    <p className="mt-2 text-sm" style={{ color: "var(--nt-text-md)" }}>
                      {product.description}
                    </p>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Dither background */}
      <div className="fixed inset-0 z-0 h-screen w-screen">
      </div>

      {/* App shell */}
      <div className="relative z-10 flex h-screen w-full">
        {/* Sidebar — animated width wrapper clips the panel in/out */}
        <div
          className="shrink-0 overflow-hidden"
          style={{
            width: sidebarOpen ? 240 : 0,
            transition: "width 280ms cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        >
          <GlassSurface
            width={240}
            height={"100%" as unknown as number}
            borderRadius={0}
            brightness={isDark ? 6 : 50}
            opacity={isDark ? 0.85 : 0.7}
            blur={14}
            className="border-r"
            style={{ borderRight: "1px solid var(--nt-divider)" } as React.CSSProperties}
            contentClassName="!p-0 !items-start !justify-start"
          >
            <NeuroSidebar
              activePage={activePage}
              onNavItemClick={(item) => setActivePage(item.title.toLowerCase())}
              onNewAnalysis={() => {
                setActivePage("analysis");
                setHasStarted(false);
                setAgentSteps([]);
                setBiomarkerScores(undefined);
                setCognitiveReport(undefined);
                setActivations(BRAIN_REGIONS);
                setWordTimestamps(undefined);
                setAudioDuration(undefined);
              }}
            />
          </GlassSurface>
        </div>

        {/* Main content — flex-1 fills whatever space the sidebar leaves */}
        <div className="flex flex-col flex-1 min-w-0">
          <SiteHeader
            title="Cognitive Analysis"
            sidebarOpen={sidebarOpen}
            onToggleSidebar={() => setSidebarOpen((o) => !o)}
            isDark={isDark}
            onToggleTheme={toggleTheme}
          />

          <div className="relative flex-1 min-h-0 overflow-hidden">

            {/* ══════ DASHBOARD VIEW ══════ */}
            <div
              className="absolute inset-0 transition-all duration-[350ms] ease-out"
              style={{
                opacity: activePage === "dashboard" ? 1 : 0,
                transform: activePage === "dashboard" ? "none" : "translateY(12px)",
                pointerEvents: activePage === "dashboard" ? "auto" : "none",
              }}
              aria-hidden={activePage !== "dashboard"}
            >
              <DashboardView
                entries={historyEntries}
                onStartAnalysis={() => {
                  setActivePage("analysis");
                  setHasStarted(false);
                }}
              />
            </div>

            {/* ══════ HISTORY VIEW ══════ */}
            <div
              className="absolute inset-0 transition-all duration-[350ms] ease-out"
              style={{
                opacity: activePage === "history" ? 1 : 0,
                transform: activePage === "history" ? "none" : "translateY(12px)",
                pointerEvents: activePage === "history" ? "auto" : "none",
              }}
              aria-hidden={activePage !== "history"}
            >
              <HistoryPanel
                entries={historyEntries}
                onRestore={handleRestore}
                onRemove={removeEntry}
                onClearAll={clearAll}
              />
            </div>

            {/* ══════ BRAIN REGIONS VIEW ══════ */}
            <div
              className="absolute inset-0 transition-all duration-[350ms] ease-out"
              style={{
                opacity: activePage === "brain regions" ? 1 : 0,
                transform: activePage === "brain regions" ? "none" : "translateY(12px)",
                pointerEvents: activePage === "brain regions" ? "auto" : "none",
              }}
              aria-hidden={activePage !== "brain regions"}
            >
              <BrainRegionsPanel />
            </div>

            {/* ══════ BIOMARKERS VIEW ══════ */}
            <div
              className="absolute inset-0 transition-all duration-[350ms] ease-out"
              style={{
                opacity: activePage === "biomarkers" ? 1 : 0,
                transform: activePage === "biomarkers" ? "none" : "translateY(12px)",
                pointerEvents: activePage === "biomarkers" ? "auto" : "none",
              }}
              aria-hidden={activePage !== "biomarkers"}
            >
              <BiomarkersPanel />
            </div>

            {/* ══════ PHASE 1 — Pre-submission + Processing ══════ */}
            <div
              className="absolute inset-0 flex flex-col items-center justify-center px-8 transition-all duration-[400ms] ease-out overflow-y-auto"
              style={{
                opacity: (hasStarted && !isLoading) || activePage === "history" || activePage === "brain regions" || activePage === "biomarkers" || activePage === "dashboard" ? 0 : 1,
                transform: hasStarted && !isLoading ? "translateY(-24px)" : "translateY(0)",
                pointerEvents: (hasStarted && !isLoading) || activePage === "history" || activePage === "brain regions" || activePage === "biomarkers" || activePage === "dashboard" ? "none" : "auto",
              }}
              aria-hidden={(hasStarted && !isLoading) || activePage === "history" || activePage === "brain regions" || activePage === "biomarkers" || activePage === "dashboard"}
            >
              <div className="w-full max-w-[42rem] flex flex-col items-center gap-5 py-8">

                {/* Title */}
                <div className="flex flex-col items-center gap-2">
                  <span
                    className="text-[30px] font-light tracking-[0.14em]"
                    style={{
                      fontFamily: "var(--font-syne), sans-serif",
                      color: "var(--nt-text-hi)",
                      textShadow: "0 0 32px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.14)",
                    }}
                  >
                    No-Limits
                  </span>
                  <span
                    className="text-[11px] tracking-[0.32em] uppercase font-medium"
                    style={{
                      color: "var(--nt-text-md)",
                      textShadow: "0 1px 4px rgba(0,0,0,0.12)",
                    }}
                  >
                    cognitive signature analysis
                  </span>
                </div>

                {/* Agent pipeline — appears above input while processing */}
                {agentSteps.length > 0 && (
                  <div className="w-full">
                    <ProcessingSteps steps={agentSteps} glass={glassStyle} />
                  </div>
                )}

                {/* Input panel — dimmed while agents are running */}
                <div
                  className="w-full transition-opacity duration-300"
                  style={{ opacity: isLoading ? 0.45 : 1, pointerEvents: isLoading ? "none" : "auto" }}
                >
                  <AnalysisPanel
                    onSubmit={handleSubmit}
                    isLoading={isLoading}
                    agentSteps={[]}
                    placeholder="Paste text or record speech to begin analysis…"
                  />
                </div>

              </div>
            </div>

            {/* ══════ PHASE 2 — Brain left · Report right · Input bottom ══════ */}
            <div
              className="absolute inset-0 flex flex-col gap-2.5 transition-all duration-[400ms] ease-out"
              style={{
                opacity: hasStarted && !isLoading && activePage !== "history" && activePage !== "brain regions" && activePage !== "biomarkers" && activePage !== "dashboard" ? 1 : 0,
                transform: hasStarted && !isLoading ? "none" : "translateY(24px)",
                pointerEvents: hasStarted && !isLoading && activePage !== "history" && activePage !== "brain regions" && activePage !== "biomarkers" && activePage !== "dashboard" ? "auto" : "none",
                padding: "10px",
              }}
              aria-hidden={!hasStarted || isLoading || activePage === "history" || activePage === "brain regions" || activePage === "biomarkers" || activePage === "dashboard"}
            >
              {/* ── Top row: Brain + Report ── */}
              <div className="flex gap-2.5 flex-1 min-h-0">

              {/* ── LEFT: Brain viewer (60%) ── */}
              <div className="rounded-2xl overflow-hidden relative" style={{ flex: "3 0 0%", ...glassStyle }}>
                {/* MNI badge */}
                <div className="absolute top-3 left-3 z-10 px-2 py-0.5 rounded-md text-[9px] font-semibold tracking-widest uppercase pointer-events-none"
                  style={{ background: "var(--nt-glass)", backdropFilter: "blur(8px)", color: "var(--nt-text-lo)", border: "1px solid var(--nt-glass-border)", fontFamily: "var(--font-jetbrains-mono)" }}>
                  MNI152 · 3D Atlas
                </div>

                {/* Activation legend */}
                {biomarkerScores && (
                  <div className="absolute bottom-3 left-3 z-10 flex flex-col gap-1 p-2 rounded-xl pointer-events-none"
                    style={{ background: "var(--nt-glass)", backdropFilter: "blur(8px)", border: "1px solid var(--nt-glass-border)" }}>
                    {BRAIN_REGIONS.map((r) => {
                      const score = biomarkerScores[AGENT_KEY[r.agent]] ?? 0;
                      const color = scoreColor(score * 100);
                      return (
                        <div key={r.region} className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full shrink-0" style={{ background: color, opacity: 0.4 + score * 0.6 }} />
                          <span className="text-[9px] uppercase tracking-wider" style={{ color: "var(--nt-text-lo)", fontFamily: "var(--font-jetbrains-mono)", minWidth: 70 }}>{r.region}</span>
                          <div className="w-12 h-0.5 rounded-full overflow-hidden" style={{ background: "var(--nt-track)" }}>
                            <div className="h-full rounded-full transition-all duration-700" style={{ width: `${score * 100}%`, background: color }} />
                          </div>
                          <span className="text-[9px] tabular-nums w-6 text-right" style={{ color, fontFamily: "var(--font-jetbrains-mono)" }}>{Math.round(score * 100)}</span>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="absolute bottom-3 right-3 z-10 text-[9px] pointer-events-none"
                  style={{ color: "var(--nt-text-ghost)", fontFamily: "var(--font-jetbrains-mono)" }}>
                  Drag · Scroll to zoom
                </div>

                <BrainViewer activations={activations} onRegionClick={(r) => console.log("Region clicked:", r)} activeAgentName={activeAgentName} />
              </div>

              {/* ── RIGHT: Report (40%) — always visible ── */}
              <div className="rounded-2xl overflow-hidden flex flex-col" style={{ flex: "2 0 0%", ...glassStyle }}>
                <div className="flex-1 min-h-0 overflow-y-auto">
                  {cognitiveReport ? (
                    <>
                      <ReportPanel report={cognitiveReport} />
                      {wordTimestamps && wordTimestamps.length > 0 && (
                        <div className="px-1 pb-2">
                          <WaveformPanel wordTimestamps={wordTimestamps} duration={audioDuration} />
                        </div>
                      )}
                    </>
                  ) : null}
                </div>
              </div>

              </div>{/* end top row */}

              {/* ── BOTTOM CENTER: Chat input ── */}
              <div className="shrink-0 flex justify-center">
                <div style={{ width: "100%", maxWidth: 660 }}>
                  <AnalysisPanel
                    onSubmit={handleSubmit}
                    isLoading={isLoading}
                    agentSteps={[]}
                    placeholder="Analyze again or ask a follow-up…"
                  />
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
