/**
 * Collaboration Campaign CSV Processor
 *
 * Transforms raw survey CSV data into pre-computed dashboard metrics.
 * This is a pure function with no side effects — accepts CSV strings,
 * returns a typed CollaborationData object.
 *
 * Data structure:
 * - Statements CSV maps item IDs to departments and questions
 * - Items with index "Dept Score" are the 1-10 ratings (DRS)
 * - Per-department blocks have 9 quantitative + 6 qualitative items
 * - Respondent CSV columns 1-N map to those item IDs
 */

import type { CollaborationData } from "@/types/collaboration";

// ── Config ──────────────────────────────────────────────────
export interface ProcessConfig {
  /** Map survey department names → statement department names (e.g., "Field Supervisors" → "Onsite Field Supervisors") */
  deptNormalize?: Record<string, string>;
}

// ── CSV Parsing ─────────────────────────────────────────────
function parseCSV(text: string): string[][] {
  const lines: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
      current += ch;
    } else if (ch === "\n" && !inQuotes) {
      lines.push(current.replace(/\r$/, ""));
      current = "";
    } else {
      current += ch;
    }
  }
  if (current.trim()) lines.push(current.replace(/\r$/, ""));

  return lines.map((line) => {
    const fields: string[] = [];
    let field = "";
    let q = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        q = !q;
      } else if (c === "," && !q) {
        fields.push(field.trim());
        field = "";
      } else {
        field += c;
      }
    }
    fields.push(field.trim());
    return fields;
  });
}

// ── Helpers ─────────────────────────────────────────────────
function avg(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// ── Main Processing Function ────────────────────────────────
export function processCollaborationCSV(
  responsesCSV: string,
  statementsCSV: string,
  config?: ProcessConfig
): CollaborationData {
  const deptNormalize = config?.deptNormalize ?? {};

  // Strip BOM
  const cleanResponses = responsesCSV.replace(/^\uFEFF/, "");
  const cleanStatements = statementsCSV.replace(/^\uFEFF/, "");

  const dataRows = parseCSV(cleanResponses);
  const stmtRows = parseCSV(cleanStatements);

  const respondents = dataRows.slice(1).filter((r) => r.length > 11 && r[6]);

  // ── Parse Statements ────────────────────────────────────
  interface Statement {
    itemId: number;
    index: string;
    isComment: boolean;
    text: string;
  }

  const statements: Statement[] = [];
  for (let i = 1; i < stmtRows.length; i++) {
    const [itemId, index, commentFilter, itemText] = stmtRows[i];
    statements.push({
      itemId: parseInt(itemId),
      index: index?.trim() ?? "",
      isComment: commentFilter?.trim() === "X",
      text: itemText?.trim() ?? "",
    });
  }

  // Items with index "Dept Score" define the department list
  const deptScoreItems = statements.filter((s) => s.index === "Dept Score");
  const deptNames = deptScoreItems.map((s) => s.text);

  // Build department → quantitative question item IDs
  const deptQuantItems: Record<string, number[]> = {};
  const deptQuantQuestions: Record<string, string[]> = {};

  for (const s of statements) {
    if (s.index === "Dept Score" || s.index === "Culture Champion") continue;
    const dept = s.index;
    if (!dept || s.isComment) continue;
    if (!deptQuantItems[dept]) {
      deptQuantItems[dept] = [];
      deptQuantQuestions[dept] = [];
    }
    deptQuantItems[dept].push(s.itemId);
    deptQuantQuestions[dept].push(s.text);
  }

  const ciQuestions = deptQuantQuestions[deptNames[0]] ?? [];

  // Map dept name → item ID (1-26 range)
  const deptScoreMap: Record<string, number> = {};
  for (const s of deptScoreItems) {
    deptScoreMap[s.text] = s.itemId;
  }

  // ── Helper: get numeric value ───────────────────────────
  function getVal(row: string[], itemId: number): number | null {
    const colIdx = 10 + itemId;
    const raw = row[colIdx];
    if (!raw || raw.trim() === "") return null;
    const n = parseFloat(raw);
    return isNaN(n) ? null : n;
  }

  // ── Normalize respondent dept name to statement dept name ─
  function normDept(d: string): string {
    return deptNormalize[d] || d;
  }

  // ── Compute CDRS ────────────────────────────────────────
  const incomingScores: Record<string, number[]> = {};
  const outgoingScores: Record<string, number[]> = {};
  const heatmapScores: Record<string, Record<string, number[]>> = {};

  for (const dept of deptNames) {
    incomingScores[dept] = [];
    outgoingScores[dept] = [];
    heatmapScores[dept] = {};
    for (const d2 of deptNames) {
      heatmapScores[dept][d2] = [];
    }
  }

  for (const row of respondents) {
    const respDeptRaw = row[6];
    const respDept = normDept(respDeptRaw);

    for (const targetDept of deptNames) {
      const itemId = deptScoreMap[targetDept];
      const score = getVal(row, itemId);
      if (score === null) continue;

      // Check self-rating (skip)
      const isSelf = respDept === targetDept || respDeptRaw === targetDept;
      if (isSelf) continue;

      // Incoming: score given TO targetDept
      incomingScores[targetDept].push(score);

      // Heatmap: respDept → targetDept
      const sourceName = respDept;
      if (heatmapScores[sourceName]) {
        heatmapScores[sourceName][targetDept].push(score);
      }

      // Outgoing: scores given BY respDept
      if (outgoingScores[sourceName]) {
        outgoingScores[sourceName].push(score);
      }
    }
  }

  // ── Compute Collaboration Index ─────────────────────────
  const ciScores: Record<string, number[]> = {};
  const ciByQuestion: Record<string, Record<number, number[]>> = {};

  for (const dept of deptNames) {
    ciScores[dept] = [];
    ciByQuestion[dept] = {};
    const qItems = deptQuantItems[dept];
    if (!qItems) continue;
    for (let qi = 0; qi < qItems.length; qi++) {
      ciByQuestion[dept][qi] = [];
    }
  }

  for (const row of respondents) {
    for (const dept of deptNames) {
      const qItems = deptQuantItems[dept];
      if (!qItems) continue;

      for (let qi = 0; qi < qItems.length; qi++) {
        const val = getVal(row, qItems[qi]);
        if (val !== null) {
          ciScores[dept].push(val);
          ciByQuestion[dept][qi].push(val);
        }
      }
    }
  }

  // ── Build Output ────────────────────────────────────────
  const allIncomingAvgs: number[] = [];
  const allOutgoingAvgs: number[] = [];

  const departmentMetrics = deptNames.map((dept) => {
    const inAvg = round2(avg(incomingScores[dept]));
    const outAvg = round2(avg(outgoingScores[dept]));
    const ciAvg = round2(avg(ciScores[dept]));
    allIncomingAvgs.push(inAvg);
    allOutgoingAvgs.push(outAvg);

    const questionScores = ciQuestions.map((q, qi) => ({
      question: q,
      score: round2(avg(ciByQuestion[dept]?.[qi] ?? [])),
      responseCount: (ciByQuestion[dept]?.[qi] ?? []).length,
    }));

    return {
      department: dept,
      incomingCDRS: inAvg,
      outgoingCDRS: outAvg,
      collaborationIndex: ciAvg,
      incomingCount: incomingScores[dept].length,
      outgoingCount: outgoingScores[dept].length,
      ciCount: ciScores[dept].length,
      questionScores,
    };
  });

  const heatmapMatrix = deptNames.map((source) => {
    const scores: Record<string, number | null> = {};
    for (const target of deptNames) {
      const s = heatmapScores[source]?.[target] ?? [];
      scores[target] = s.length > 0 ? round2(avg(s)) : null;
    }
    return { department: source, scores };
  });

  const departmentDetails = deptNames.map((dept) => {
    const incomingByDept = deptNames
      .filter((d) => d !== dept)
      .map((source) => ({
        department: source,
        score: round2(avg(heatmapScores[source]?.[dept] ?? [])),
        count: (heatmapScores[source]?.[dept] ?? []).length,
      }))
      .filter((d) => d.count > 0)
      .sort((a, b) => b.score - a.score);

    const outgoingByDept = deptNames
      .filter((d) => d !== dept)
      .map((target) => ({
        department: target,
        score: round2(avg(heatmapScores[dept]?.[target] ?? [])),
        count: (heatmapScores[dept]?.[target] ?? []).length,
      }))
      .filter((d) => d.count > 0)
      .sort((a, b) => b.score - a.score);

    const metrics = departmentMetrics.find((m) => m.department === dept);

    return {
      department: dept,
      incomingCDRS: metrics?.incomingCDRS ?? 0,
      outgoingCDRS: metrics?.outgoingCDRS ?? 0,
      collaborationIndex: metrics?.collaborationIndex ?? 0,
      responseCount: metrics?.incomingCount ?? 0,
      incomingByDept,
      outgoingByDept,
      questionScores: metrics?.questionScores ?? [],
    };
  });

  const dwsAvgIncoming = round2(avg(allIncomingAvgs.filter((v) => v > 0)));
  const dwsAvgOutgoing = round2(avg(allOutgoingAvgs.filter((v) => v > 0)));

  return {
    meta: {
      totalRespondents: respondents.length,
      totalDepartments: deptNames.length,
      dwsAverageIncoming: dwsAvgIncoming,
      dwsAverageOutgoing: dwsAvgOutgoing,
      dwsAverageOverall: round2((dwsAvgIncoming + dwsAvgOutgoing) / 2),
      departments: deptNames,
      ciQuestions,
    },
    departmentMetrics: departmentMetrics.sort(
      (a, b) => b.incomingCDRS - a.incomingCDRS
    ),
    heatmapMatrix,
    departmentDetails,
  };
}
