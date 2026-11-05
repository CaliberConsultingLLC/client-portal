import type {
  ReadoutColCount,
  ReadoutColKey,
  ReadoutCover,
  ReadoutDeck,
  ReadoutGridRect,
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

export function normalizeReadoutDeck(deck: ReadoutDeck): ReadoutDeck {
  const slides: ReadoutDeck["slides"] = {};
  for (const [key, slide] of Object.entries(deck.slides ?? {})) {
    const colCount = normalizeColCount(slide.colCount);
    const cols = normalizeSlideCols(slide.cols);
    const widths =
      colCount === 2 && (!slide.widths || slide.widths.length !== 2)
        ? [slide.r ?? 0.5, 1 - (slide.r ?? 0.5)].map((w) => Math.round(w * 1000) / 1000)
        : normalizeWidths(colCount, slide.widths);
    let grid = slide.grid;
    let gridRes = slide.gridRes;
    if (grid && gridRes !== READOUT_GRID_RES) {
      // Older slides were laid out on a 12 x 8 grid; the grid is now 36 x 16.
      grid = Object.fromEntries(
        Object.entries(grid).map(([id, r]) => [id, { x: r.x * 3, y: r.y * 2, w: r.w * 3, h: r.h * 2 }])
      );
      gridRes = READOUT_GRID_RES;
    }
    slides[key] = {
      ...slide,
      colCount,
      cols,
      widths,
      r: slide.r ?? widths[0] ?? 0.5,
      ...(grid ? { grid, gridRes } : {}),
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

/** Free-form grid resolution: coarse on purpose so boxes line up without fiddling. */
export const READOUT_GRID_COLS = 36;
export const READOUT_GRID_ROWS = 16;
/** Current grid resolution marker stored on slides (`gridRes`). */
export const READOUT_GRID_RES = 2;

function overlaps(a: ReadoutGridRect, b: ReadoutGridRect) {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
}

/** First open spot of the requested size, scanning top-left to bottom-right. */
export function findFreeGridRect(
  grid: Record<string, ReadoutGridRect>,
  w = 12,
  h = 6
): ReadoutGridRect {
  const taken = Object.values(grid);
  for (let y = 0; y + h <= READOUT_GRID_ROWS; y++) {
    for (let x = 0; x + w <= READOUT_GRID_COLS; x++) {
      const rect = { x, y, w, h };
      if (!taken.some((t) => overlaps(rect, t))) return rect;
    }
  }
  return { x: 0, y: 0, w, h };
}

/**
 * Approximate a slide's column layout on the grid: each column keeps its
 * share of the width, blocks stack top to bottom (visuals tallest), and
 * consecutive data points share a row.
 */
export function columnsToGrid(slide: ReadoutSlide): Record<string, ReadoutGridRect> {
  const count = normalizeColCount(slide.colCount);
  const widths = normalizeWidths(
    count,
    slide.widths ?? (count === 2 ? [slide.r ?? 0.5, 1 - (slide.r ?? 0.5)] : undefined)
  );
  const cols = normalizeSlideCols(slide.cols);
  const keys = activeColKeys(count);
  const grid: Record<string, ReadoutGridRect> = {};

  // Column x-ranges in whole cells, at least 2 wide.
  const xs: Array<[number, number]> = [];
  let cursor = 0;
  widths.forEach((w, i) => {
    const span = i === widths.length - 1 ? READOUT_GRID_COLS - cursor : Math.max(6, Math.round(w * READOUT_GRID_COLS));
    xs.push([cursor, span]);
    cursor += span;
  });

  keys.forEach((key, ci) => {
    const [x0, span] = xs[ci];
    type Row = { ids: string[]; weight: number };
    const rows: Row[] = [];
    let dp: string[] = [];
    const flush = () => {
      if (dp.length) rows.push({ ids: dp, weight: 2 });
      dp = [];
    };
    for (const id of cols[key]) {
      const block = slide.blocks[id];
      if (!block) continue;
      if (block.type === "datapoint") {
        dp.push(id);
      } else {
        flush();
        rows.push({ ids: [id], weight: block.type === "visual" ? 4 : 2 });
      }
    }
    flush();
    if (!rows.length) return;
    const total = rows.reduce((s, r) => s + r.weight, 0);
    const heights = rows.map((r) => Math.max(2, Math.round((r.weight / total) * READOUT_GRID_ROWS)));
    // Make the column fill the area exactly.
    let sum = heights.reduce((a, b) => a + b, 0);
    for (let guard = 0; sum !== READOUT_GRID_ROWS && guard < 64; guard++) {
      const idx = sum > READOUT_GRID_ROWS ? heights.indexOf(Math.max(...heights)) : heights.indexOf(Math.min(...heights));
      if (sum > READOUT_GRID_ROWS && heights[idx] <= 2) break;
      heights[idx] += sum > READOUT_GRID_ROWS ? -1 : 1;
      sum = heights.reduce((a, b) => a + b, 0);
    }
    let y = 0;
    rows.forEach((row, ri) => {
      const h = heights[ri];
      const each = Math.max(1, Math.floor(span / row.ids.length));
      row.ids.forEach((id, k) => {
        const w = k === row.ids.length - 1 ? span - each * k : each;
        grid[id] = { x: x0 + each * k, y, w, h };
      });
      y += h;
    });
  });
  return grid;
}
