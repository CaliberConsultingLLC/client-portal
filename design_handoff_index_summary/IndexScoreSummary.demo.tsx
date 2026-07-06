// @ts-nocheck
"use client";

/**
 * Example usage of <IndexScoreSummary /> with the demo "Permian Basin" numbers
 * used in the prototype. Replace `DEMO_*` with the report's real index model.
 *
 * In the real Basin Report this strip renders near the top of the center column
 * (chromeless field layout), above the Index & Statement results table.
 */

import { IndexScoreSummary, type IndexDatum } from "./IndexScoreSummary";

const DEMO_OVERALL: IndexDatum = { id: "overall", name: "Overall", score: 74.3, delta: -0.9, diff: 1.8 };

const DEMO_INDEXES: IndexDatum[] = [
  { id: "culture",    name: "Culture",        score: 70.9, delta:  0.1, diff: -0.6 },
  { id: "engage",     name: "Engagement",     score: 75.5, delta: -0.9, diff:  4.0 },
  { id: "dailywork",  name: "Daily Work",     score: 73.1, delta:  0.3, diff:  1.2 },
  { id: "supervisor", name: "Supervisor",     score: 80.6, delta: -0.5, diff:  5.8 },
  { id: "intent",     name: "Intent to Stay", score: 71.5, delta: -3.7, diff: -1.2 },
];

export function IndexScoreSummaryDemo() {
  return (
    <div style={{ padding: 24, fontFamily: "'Montserrat', system-ui, sans-serif" }}>
      <IndexScoreSummary overall={DEMO_OVERALL} indexes={DEMO_INDEXES} />
    </div>
  );
}

export default IndexScoreSummaryDemo;
