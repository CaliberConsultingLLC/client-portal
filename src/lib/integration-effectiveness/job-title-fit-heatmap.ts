import { getFirebaseAdminStorage } from "@/lib/firebase/admin";

const DATABASE_STORAGE_PATH = "clients/csg/data/Canopy Integration Database 2026.csv";

export const FIT_HEATMAP_ITEMS = [
  { id: 1, label: "Leadership explained why" },
  { id: 2, label: "Canopy updates" },
  { id: 3, label: "Legacy respected" },
  { id: 4, label: "Role clarity" },
  { id: 5, label: "Ideas welcome" },
  { id: 6, label: "Corporate support" },
  { id: 7, label: "Smooth process" },
  { id: 8, label: "Pace of change" },
  { id: 9, label: "Know who to contact" },
  { id: 10, label: "Long-term success" },
  { id: 11, label: "Glad we joined" },
] as const;

export interface FitHeatmapRow {
  title: string;
  n1: number;
  n2: number;
  overall1: number | null;
  overall2: number | null;
  items2: Array<number | null>;
  itemDeltas: Array<number | null>;
}

// Typo fix plus titles renamed between campaigns (Sales Representative became
// Sales Consultant for all four employees who answered both campaigns).
const TITLE_MAP: Record<string, string> = {
  "Sales Represntative": "Sales Consultant",
  "Sales Representative": "Sales Consultant",
  "Customer Engagement": "Customer Engagement Specialist",
};

function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    const n = text[i + 1];
    if (c === '"') {
      if (quoted && n === '"') {
        field += '"';
        i++;
      } else {
        quoted = !quoted;
      }
      continue;
    }
    if (c === "," && !quoted) {
      row.push(field);
      field = "";
      continue;
    }
    if ((c === "\n" || c === "\r") && !quoted) {
      if (c === "\r" && n === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      continue;
    }
    field += c;
  }
  if (field.length || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

const mean = (a: number[]) => a.reduce((x, y) => x + y, 0) / a.length;
const r2 = (x: number) => Math.round(x * 100) / 100;

export async function loadJobTitleFitHeatmap() {
  const [buffer] = await getFirebaseAdminStorage().bucket().file(DATABASE_STORAGE_PATH).download();
  const rows = parseCSV(buffer.toString("utf8").replace(/^﻿/, ""));
  const headers = rows[0].map((h) => h.trim());
  const idx = new Map(headers.map((h, i) => [h, i]));
  const get = (r: string[], k: string) => (r[idx.get(k) ?? -1] ?? "").trim();

  const people = rows
    .slice(1)
    .filter((r) => r.length > 5)
    .map((r) => {
      const raw = get(r, "Job Title");
      return {
        campaign: get(r, "Campaign") === "Second" ? 2 : 1,
        title: TITLE_MAP[raw] ?? raw,
        scores: FIT_HEATMAP_ITEMS.map((it) => Math.round(Number.parseFloat(get(r, String(it.id)))) / 10),
      };
    });

  const titles = [...new Set(people.map((p) => p.title))];
  const build = (title: string): FitHeatmapRow => {
    const a = people.filter((p) => p.title === title && p.campaign === 1);
    const c = people.filter((p) => p.title === title && p.campaign === 2);
    const itemMean = (set: typeof people, i: number) => (set.length ? mean(set.map((p) => p.scores[i])) : null);
    const overall = (set: typeof people) => (set.length ? mean(set.flatMap((p) => p.scores)) : null);
    return {
      title,
      n1: a.length,
      n2: c.length,
      overall1: overall(a),
      overall2: overall(c),
      items2: FIT_HEATMAP_ITEMS.map((_, i) => itemMean(c, i)),
      itemDeltas: FIT_HEATMAP_ITEMS.map((_, i) => {
        const x = itemMean(c, i);
        const y = itemMean(a, i);
        return x === null || y === null ? null : r2(x) - r2(y);
      }),
    };
  };
  const all = titles.map(build);
  const current = all.filter((r) => r.n2 > 0).sort((l, r) => (l.overall2 ?? 0) - (r.overall2 ?? 0));
  const priorOnly = all.filter((r) => r.n2 === 0).sort((l, r) => (l.overall1 ?? 0) - (r.overall1 ?? 0));
  return { current, priorOnly };
}
