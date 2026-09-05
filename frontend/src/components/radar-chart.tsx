"use client";

import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer } from "recharts";

type NeuroRadarChartProps = {
  scores?: Record<string, number>;
  isLoading?: boolean;
};

const AXES = ["Lexical", "Semantic", "Prosody", "Syntax", "Affective"];

export function NeuroRadarChart({ scores, isLoading }: NeuroRadarChartProps) {
  const data = AXES.map((axis) => ({ axis, value: scores?.[axis.toLowerCase()] ?? 0 }));

  if (isLoading) {
    return (
      <div className="h-48 flex items-center justify-center">
        <div className="w-32 h-32 rounded-full animate-pulse" style={{ border: "1px solid var(--nt-divider)" }} />
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <RadarChart data={data} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
        <PolarGrid stroke="var(--nt-divider)" />
        <PolarAngleAxis
          dataKey="axis"
          tick={{ fontSize: 10, fill: "var(--nt-text-xs)", fontFamily: "var(--font-dm-sans)" }}
        />
        <Radar
          dataKey="value"
          stroke="var(--nt-text-md)"
          fill="var(--nt-track)"
          strokeWidth={1.5}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
}
