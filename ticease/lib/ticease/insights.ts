import type { DailyCheckIn, TicEntry } from "./storage";

export interface Insight {
  id: string;
  text: string;
}

function average(nums: number[]): number | null {
  if (nums.length === 0) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

/**
 * Generates careful, non-diagnostic observations from the user's own logged
 * data. These are phrased as correlations across entries, never as causal
 * medical claims (e.g. never "stress causes your tics").
 */
export function computeInsights(entries: TicEntry[], checkIns: DailyCheckIn[]): Insight[] {
  const insights: Insight[] = [];

  const daysWithData = checkIns.filter(
    (c) => typeof c.sleepHours === "number" && typeof c.ticImpact === "number"
  );

  if (daysWithData.length >= 3) {
    const sorted = [...daysWithData].sort((a, b) => (a.sleepHours ?? 0) - (b.sleepHours ?? 0));
    const half = Math.floor(sorted.length / 2);
    const lowerSleep = sorted.slice(0, half);
    const higherSleep = sorted.slice(sorted.length - half);
    const lowerImpact = average(lowerSleep.map((c) => c.ticImpact ?? 0));
    const higherImpact = average(higherSleep.map((c) => c.ticImpact ?? 0));
    if (lowerImpact !== null && higherImpact !== null && lowerImpact - higherImpact >= 1) {
      insights.push({
        id: "sleep-impact",
        text: "On the days you reported less sleep, you also reported higher tic impact.",
      });
    }
  }

  const daysWithStress = checkIns.filter(
    (c) => typeof c.stress === "number" && typeof c.ticImpact === "number"
  );
  if (daysWithStress.length >= 3) {
    const sorted = [...daysWithStress].sort((a, b) => (a.stress ?? 0) - (b.stress ?? 0));
    const half = Math.floor(sorted.length / 2);
    const lower = sorted.slice(0, half);
    const higher = sorted.slice(sorted.length - half);
    const lowerImpact = average(lower.map((c) => c.ticImpact ?? 0));
    const higherImpact = average(higher.map((c) => c.ticImpact ?? 0));
    if (lowerImpact !== null && higherImpact !== null && higherImpact - lowerImpact >= 1) {
      insights.push({
        id: "stress-impact",
        text: "Your reported stress was higher on days when tic impact was higher.",
      });
    }
  }

  // Practice vs. impact — needs entries with strategy_used markers; approximate
  // using whether a practice happened at all that day, kept simple for MVP.
  if (entries.length >= 5) {
    const byDay = new Map<string, TicEntry[]>();
    for (const e of entries) {
      const day = e.timestamp.slice(0, 10);
      byDay.set(day, [...(byDay.get(day) ?? []), e]);
    }
    const impacts = Array.from(byDay.values()).map((es) => average(es.map((e) => e.impact)) ?? 0);
    if (impacts.length >= 3) {
      const trendDown = impacts[impacts.length - 1] < impacts[0];
      if (trendDown) {
        insights.push({
          id: "impact-trend",
          text: "Your reported tic impact has trended down across your recent entries.",
        });
      }
    }
  }

  return insights;
}
