// @ts-nocheck
"use client";

/**
 * Example: the first Segment Breakdown section — Job Category — for East Texas.
 * Replace these demo numbers with the report's real segment × index × statement
 * model. Funnel bars and heatmap columns MUST stay in parity (same segments).
 */

import { SegmentComparison, type SegmentValue, type IndexRef, type StatementRow } from "./SegmentComparison";

const INDEXES: IndexRef[] = [
  { id: "culture", name: "Culture", score: 70.9 },
  { id: "engage", name: "Engagement", score: 75.5 },
  { id: "dailywork", name: "Daily Work", score: 73.1 },
  { id: "supervisor", name: "Supervisor", score: 80.6 },
  { id: "intent", name: "Intent to Stay", score: 71.5 },
];

// Job Category values — these are BOTH the funnel bars and the heatmap columns.
const SEGMENTS: SegmentValue[] = [
  { key: "green", label: "Greenhat", n: 5 },
  { key: "lead", label: "Leadhand", n: 6 },
  { key: "rough", label: "Roughneck", n: 26 },
  { key: "op", label: "Operator", n: 15 },
  { key: "sup", label: "Supervisor", n: 5 },
];

// Funnel score per segment, per index (demo).
const FUNNEL_BY_INDEX: Record<string, Record<string, number>> = {
  culture:    { green: 65.7, lead: 62.8, rough: 57.6, op: 55.0, sup: 51.5 },
  engage:     { green: 67.1, lead: 63.4, rough: 58.9, op: 56.2, sup: 52.8 },
  dailywork:  { green: 66.2, lead: 62.9, rough: 58.1, op: 55.6, sup: 52.0 },
  supervisor: { green: 68.0, lead: 64.6, rough: 59.4, op: 57.0, sup: 54.1 },
  intent:     { green: 63.9, lead: 60.7, rough: 56.2, op: 53.4, sup: 49.8 },
};

// Statement rows per index (demo). scores keyed by segment + overall.
const STATEMENTS_BY_INDEX: Record<string, StatementRow[]> = {
  culture: [
    { text: "People on my crew look out for each other's safety", overall: 76.4, scores: { green: 81.2, lead: 78.7, rough: 76.3, op: 73.1, sup: 72.9 } },
    { text: "People here are treated with respect", overall: 69.0, scores: { green: 73.8, lead: 71.3, rough: 68.9, op: 65.7, sup: 65.4 } },
    { text: "I can raise a safety concern without fear", overall: 67.3, scores: { green: 72.1, lead: 69.6, rough: 67.2, op: 64.0, sup: 63.7 } },
  ],
  engage:     [{ text: "I am proud to work at Deep Well", overall: 79.2, scores: { green: 84.0, lead: 81.5, rough: 79.1, op: 75.9, sup: 75.6 } }],
  dailywork:  [{ text: "I understand what is expected of me each day", overall: 78.3, scores: { green: 83.1, lead: 80.6, rough: 78.2, op: 75.0, sup: 74.7 } }],
  supervisor: [{ text: "My supervisor treats me with respect", overall: 83.1, scores: { green: 87.9, lead: 85.4, rough: 83.0, op: 79.8, sup: 79.5 } }],
  intent:     [{ text: "I expect to be working here two years from now", overall: 69.8, scores: { green: 74.6, lead: 72.1, rough: 69.7, op: 66.5, sup: 66.2 } }],
};

export function SegmentBreakdownDemo() {
  return (
    <div style={{ padding: 24, fontFamily: "'Montserrat', system-ui, sans-serif" }}>
      <SegmentComparison
        segmentLabel="Job Category"
        unitLabel="East Texas"
        respondents={58}
        indexes={INDEXES}
        segments={SEGMENTS}
        funnelByIndex={FUNNEL_BY_INDEX}
        statementsByIndex={STATEMENTS_BY_INDEX}
      />
    </div>
  );
}

export default SegmentBreakdownDemo;
