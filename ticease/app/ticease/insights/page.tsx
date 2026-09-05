"use client";

import { useEffect, useState } from "react";
import { computeInsights, type Insight } from "@/lib/ticease/insights";
import { getCheckIns, getEntries } from "@/lib/ticease/storage";

export default function InsightsPage() {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [hasEnoughData, setHasEnoughData] = useState(true);

  useEffect(() => {
    const entries = getEntries();
    const checkIns = getCheckIns();
    const computed = computeInsights(entries, checkIns);
    setInsights(computed);
    setHasEnoughData(entries.length > 0 || checkIns.length > 0);
  }, []);

  return (
    <>
      <h1 className="tic-page-title">Insights</h1>
      <p className="tic-page-sub">Observations from your own entries — not a medical conclusion.</p>

      {!hasEnoughData && (
        <div className="tic-card">
          <p style={{ fontSize: 14 }}>
            Log a few entries on the Track page and check in for a few days, and patterns will start
            showing up here.
          </p>
        </div>
      )}

      {hasEnoughData && insights.length === 0 && (
        <div className="tic-card">
          <p style={{ fontSize: 14 }}>
            Not enough entries yet to surface a pattern. Keep checking in — this updates as you go.
          </p>
        </div>
      )}

      {insights.map((insight) => (
        <div key={insight.id} className="tic-quote">
          {insight.text}
        </div>
      ))}

      {insights.length > 0 && (
        <p className="tic-caption">
          These are observations from your entries, not a medical conclusion. TicEase never claims one
          thing causes another — only that they showed up on the same days.
        </p>
      )}
    </>
  );
}
