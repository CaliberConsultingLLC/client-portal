import type {
  ReadoutColCount,
  ReadoutColKey,
  ReadoutCover,
  ReadoutDeck,
  ReadoutRow,
  ReadoutRowItem,
  ReadoutSlide,
  ReadoutSlideCols,
} from "@/types/readout";

export const READOUT_COL_KEYS: ReadoutColKey[] = ["a", "b", "c", "d"];

export function defaultReadoutCover(clientName = "Deep Well Services"): ReadoutCover {
  return {
    preparedForName: clientName,
    preparedByName: "Caliber Consulting",
    logoUrl: null,
    headline: "The Deep Well experience, in three short chapters.",
    body: "Everything here comes straight from your live dashboard. Three slides, one story: where you're heading, what your people are flagging, and what's worth celebrating.",
    agendaSubhead: "The chapters on screen — plus one we'll work through together.",
    closingTitle: "What happens next",
    closingBody: "Priorities we'll set together — covered live in your debrief.",
  };
}

export function emptySlideCols(): ReadoutSlideCols {
  return { a: [], b: [], c: [], d: [] };
}

export function defaultWidths(count: ReadoutColCount): number[] {
  const each = 1 / count;
  return Array.from({ length: count }, () => Math.round(each * 1000) / 1000);
}

/** Normalize legacy tuple cols `[[...],[...]]` or 2-key objects into full `{ a,b,c,d }`. */
export function normalizeSlideCols(
  cols: ReadoutSlideCols | { a?: string[]; b?: string[]; c?: string[]; d?: string[] } | [string[], string[]] | undefined
): ReadoutSlideCols {
  if (!cols) return emptySlideCols();
  if (Array.isArray(cols)) {
    return { a: [...(cols[0] ?? [])], b: [...(cols[1] ?? [])], c: [], d: [] };
  }
  return {
    a: [...(cols.a ?? [])],
    b: [...(cols.b ?? [])],
    c: [...(cols.c ?? [])],
    d: [...(cols.d ?? [])],
  };
}

export function normalizeColCount(value: unknown): ReadoutColCount {
  const n = Number(value);
  if (n === 3 || n === 4) return n;
  return 2;
}

export function normalizeWidths(count: ReadoutColCount, widths?: number[]): number[] {
  if (Array.isArray(widths) && widths.length === count) {
    const sum = widths.reduce((acc, w) => acc + w, 0) || 1;
    return widths.map((w) => Math.round((w / sum) * 1000) / 1000);
  }
  if (count === 2 && Array.isArray(widths) && widths.length === 2) {
    return normalizeWidths(2, widths);
  }
  return defaultWidths(count);
}

export function activeColKeys(count: ReadoutColCount): ReadoutColKey[] {
  return READOUT_COL_KEYS.slice(0, count);
}

let rowSeq = 0;

/** Stable-enough row id. Rows are addressed by id, never by index. */
export function newRowId(): string {
  rowSeq += 1;
  return `r${Date.now().toString(36)}${rowSeq.toString(36)}`;
}

/**
 * Migrate legacy column stacks to rows: row i takes the i-th block of each
 * column, left to right. Columns of uneven length simply yield shorter rows.
 */
export function colsToRows(cols: ReadoutSlideCols, colCount: ReadoutColCount): ReadoutRow[] {
  const keys = activeColKeys(colCount);
  const depth = Math.max(0, ...keys.map((key) => cols[key]?.length ?? 0));
  const rows: ReadoutRow[] = [];
  for (let i = 0; i < depth; i++) {
    const items: ReadoutRowItem[] = [];
    for (const key of keys) {
      const blockId = cols[key]?.[i];
      if (blockId) items.push({ blockId, span: 1 });
    }
    if (items.length > 0) rows.push({ id: newRowId(), items });
  }
  return rows;
}

/**
 * Drop unknown/duplicate blocks and clamp spans to 1..colCount. A row whose
 * spans overflow the grid reflows: the overflow moves into a fresh row
 * directly beneath, so widening one block pushes its neighbours down rather
 * than discarding them.
 */
export function normalizeRows(
  rows: ReadoutRow[] | undefined,
  colCount: ReadoutColCount,
  blocks: Record<string, unknown>
): ReadoutRow[] {
  if (!Array.isArray(rows)) return [];
  const seen = new Set<string>();
  const result: ReadoutRow[] = [];
  for (const row of rows) {
    if (!row || !Array.isArray(row.items)) continue;
    let items: ReadoutRowItem[] = [];
    let used = 0;
    let rowId: string | null = row.id || newRowId();
    const flush = () => {
      if (items.length === 0) return;
      result.push({ id: rowId ?? newRowId(), items });
      items = [];
      used = 0;
      rowId = null;
    };
    for (const item of row.items) {
      const blockId = item?.blockId;
      // Guard against a block appearing in two rows after a bad drag.
      if (!blockId || !blocks[blockId] || seen.has(blockId)) continue;
      const span = Math.max(1, Math.min(colCount, Math.round(Number(item.span) || 1)));
      if (used + span > colCount) flush();
      items.push({ blockId, span });
      seen.add(blockId);
      used += span;
    }
    flush();
  }
  return result;
}

/** Blocks present on the slide but missing from rows get appended as their own rows. */
export function appendOrphanBlocks(
  rows: ReadoutRow[],
  blocks: Record<string, unknown>
): ReadoutRow[] {
  const placed = new Set(rows.flatMap((row) => row.items.map((item) => item.blockId)));
  const orphans = Object.keys(blocks).filter((id) => !placed.has(id));
  if (orphans.length === 0) return rows;
  return [...rows, ...orphans.map((blockId) => ({ id: newRowId(), items: [{ blockId, span: 1 }] }))];
}

export function normalizeReadoutDeck(deck: ReadoutDeck): ReadoutDeck {
  const slides: ReadoutDeck["slides"] = {};
  for (const [key, slide] of Object.entries(deck.slides ?? {})) {
    const colCount = normalizeColCount(slide.colCount);
    const cols = normalizeSlideCols(slide.cols);
    const widths =
      colCount === 2 && (!slide.widths || slide.widths.length !== 2)
        ? [slide.r ?? 0.5, 1 - (slide.r ?? 0.5)].map((w) => Math.round(w * 1000) / 1000)
        : normalizeWidths(colCount, slide.widths);
    const blocks = slide.blocks ?? {};
    // Rows are authoritative once present; `cols` is only read on first migration.
    const rows = appendOrphanBlocks(
      slide.rows
        ? normalizeRows(slide.rows, colCount, blocks)
        : normalizeRows(colsToRows(cols, colCount), colCount, blocks),
      blocks
    );
    slides[key] = {
      ...slide,
      colCount,
      cols,
      rows,
      widths,
      r: slide.r ?? widths[0] ?? 0.5,
    };
  }
  return { ...deck, slides };
}

export function buildDefaultReadoutDeck(clientName = "Deep Well Services"): ReadoutDeck {
  return {
    waveLabel: "Wave 3 · June 2026",
    cover: defaultReadoutCover(clientName),
    order: ["s1", "s2", "s3"],
    slides: {
      s1: {
        label: "Trajectory",
        pill: "Steady climb",
        pillBg: "#E7F2EB",
        pillFg: "#2F9151",
        dot: "#2F9151",
        headline: "Favorability keeps climbing — three waves, three gains.",
        blurb: "Three waves of favorability, one direction.",
        r: 0.68,
        colCount: 2,
        widths: [0.68, 0.32],
        cols: { a: ["v1"], b: ["i1", "r1", "n1"], c: [], d: [] },
        blocks: {
          v1: {
            type: "visual",
            slot: "slide1-visual",
            sub: "Favorability over time",
            persp: "Employee Experience",
            caption: "Overall favorability, last three waves — captured from the live dashboard.",
            imageUrl: null,
          },
          i1: {
            type: "text",
            color: 6,
            subtitle: "",
            body: "Overall favorability rose from 66.2 to 67.7 across the last three waves. The gain is modest but consistent — and every department band moved in the same direction.",
          },
          r1: {
            type: "text",
            color: 0,
            subtitle: "The read",
            body: "Slow, broad-based gains are the healthiest kind. This is culture compounding — not a one-off bump from a single team or initiative.",
          },
          n1: {
            type: "text",
            color: 1,
            subtitle: "Do this next",
            body: "Keep the cadence. Run the next wave on the same questions so the line stays comparable — the trend is now your most valuable asset.",
          },
        },
      },
      s2: {
        label: "Common Concerns",
        pill: "Themes, not alarms",
        pillBg: "#E9F0F7",
        pillFg: "#5E7898",
        dot: "#5E7898",
        headline: "Five themes carry most of the commentary — and the loudest one is shrinking.",
        blurb: "The five themes behind most open comments.",
        r: 0.68,
        colCount: 2,
        widths: [0.68, 0.32],
        cols: { a: ["v2"], b: ["i2", "r2", "n2"], c: [], d: [] },
        blocks: {
          v2: {
            type: "visual",
            slot: "slide2-visual",
            sub: "Theme frequency",
            persp: "Open Text Insights",
            caption: "Share of open comments mentioning each theme — captured from the live dashboard.",
            imageUrl: null,
          },
          i2: {
            type: "text",
            color: 6,
            subtitle: "",
            body: "38% of open comments touch pay clarity — mostly shop-time rates. Mentions are down four points since the last wave. Equipment readiness is the only theme trending up.",
          },
          r2: {
            type: "text",
            color: 0,
            subtitle: "The read",
            body: "These are operational frictions, not culture problems. People flag them because they're invested — the tone of the comments stays constructive.",
          },
          n2: {
            type: "text",
            color: 2,
            subtitle: "Do this next",
            body: "Close the loop publicly on shop-time pay. One clear answer to the loudest theme is the highest-leverage response this quarter.",
          },
        },
      },
      s3: {
        label: "Spotlights",
        pill: "Working well",
        pillBg: "#E7F2EB",
        pillFg: "#2F9151",
        dot: "#2F9151",
        headline: "Where the culture is visibly working.",
        blurb: "Where the culture is visibly working.",
        r: 0.32,
        colCount: 2,
        widths: [0.32, 0.68],
        cols: { a: ["i3", "t3a", "t3b"], b: ["v3"], c: [], d: [] },
        blocks: {
          v3: {
            type: "visual",
            slot: "spotlight-hero",
            sub: "Spotlight",
            persp: "Employee Experience",
            caption: "A proof point worth showing — captured from the dashboard or the field.",
            imageUrl: null,
          },
          i3: {
            type: "text",
            color: 6,
            subtitle: "",
            body: 'Two spotlights worth repeating to the whole company — proof that the "One Team, One Family" standard shows up in daily work, not just on posters.',
          },
          t3a: {
            type: "text",
            color: 1,
            subtitle: "Training culture — field crews",
            body: "New hires consistently name their supervisors' teaching as the reason they stay. That's retention you don't have to buy.",
          },
          t3b: {
            type: "text",
            color: 1,
            subtitle: "Onboarding — business support",
            body: 'Described as "virtually seamless" in open comments — a repeatable playbook for hiring at growth speed.',
          },
        },
      },
    },
  };
}
