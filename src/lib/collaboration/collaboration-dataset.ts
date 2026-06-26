/**
 * Collaboration Survey Dataset Builder
 *
 * Pure, side-effect-free transforms that turn a raw collaboration survey
 * (database CSV + statements CSV) into the respondent-level dataset the
 * collaboration dashboard renders.
 *
 * Layout assumptions (confirmed against real client exports):
 * - Database header row mixes identifier columns (ID, Generation, Tenure,
 *   Shift, Department, Role, Supervisor, Campaign, ...) with numeric headers
 *   ("1", "2", "3" ...). Each numeric header maps directly to the matching
 *   Item ID in the statements document. Columns are resolved by HEADER, never
 *   by a fixed offset, so any client's column layout works.
 * - Statements: Index "Dept Score" rows define the rated departments (one per
 *   department). Rows whose Index is a department name are that department's
 *   items; CommentFilter "X" marks open-text items, the rest are the 1-N
 *   quantitative collaboration questions.
 * - Answer values are already on a 0-100 scale. Internally we store them on a
 *   1-10 scale (÷10) to match the shared display/color system, which scales
 *   ×10 for display.
 *
 * CDRS definitions (client-defined):
 * - Incoming CDRS(dept)  = average of that department's Dept Score column
 *   across all respondents, EXCLUDING self-ratings (a department rating
 *   itself). Only how OTHER departments rate this one.
 * - Outgoing CDRS(dept)  = average of every Dept Score answer given by the
 *   employees whose Department maps to that department, to OTHER departments.
 *
 * Department merging:
 * - A department-normalize map can collapse several raw names into one
 *   canonical department (e.g. "Production Control" + "Sourcing" →
 *   "Production Control & Sourcing"). The map applies to BOTH the statement
 *   department names and the database Department column, so merged departments
 *   pool their Dept Score columns, CI question blocks, and comments everywhere.
 */

import type {
  CollaborationData,
  DepartmentDetail,
  DepartmentMetric,
  HeatmapRow,
} from "@/types/collaboration";
import type { DemoRespondent } from "@/lib/collaboration/demo-data";

const DISPLAY_SCALE = 10; // raw 0-100 → internal 1-10

export interface CollaborationComment {
  id: string;
  aboutDepartment: string;
  fromDepartment: string;
  role: string;
  generation: string;
  tenure: string;
  prompt: string;
  text: string;
}

export interface CollaborationDataset {
  departments: string[];
  ciQuestions: string[];
  respondents: DemoRespondent[];
  comments: CollaborationComment[];
  data: CollaborationData;
  roles: string[];
  generations: string[];
  tenures: string[];
}

export interface ParseCollaborationOptions {
  /**
   * Map a department name → its canonical name. Applied to BOTH the statement
   * "Dept Score" names and the database Department column. Use it to reconcile
   * HR labels with survey labels and to merge departments that should be
   * treated as one (e.g. "Production Control" and "Sourcing" → a combined
   * "Production Control & Sourcing").
   */
  departmentNormalize?: Record<string, string>;
}

// ── CSV parsing (quote-aware, handles embedded newlines) ────────
function parseCSV(text: string): string[][] {
  const clean = text.replace(/^\uFEFF/, "");
  const lines: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i];
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
  if (current.length) lines.push(current.replace(/\r$/, ""));

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

function avg(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Average only the non-null entries; returns null when nothing is present. */
function averageValues(values: Array<number | null>): number | null {
  const nums = values.filter((v): v is number => v !== null);
  if (nums.length === 0) return null;
  return nums.reduce((sum, v) => sum + v, 0) / nums.length;
}

function headerIndex(headers: string[], name: string): number {
  return headers.findIndex((h) => h.toLowerCase() === name.toLowerCase());
}

interface StatementItem {
  itemId: number;
  index: string;
  isComment: boolean;
  text: string;
}

// ── Parse the survey into a respondent-level dataset ────────────
export function parseCollaborationSurvey(
  databaseCsv: string,
  statementsCsv: string,
  options?: ParseCollaborationOptions
): CollaborationDataset {
  const normalize = options?.departmentNormalize ?? {};
  const norm = (value: string) => normalize[value] ?? value;

  const dbRows = parseCSV(databaseCsv);
  const stmtRows = parseCSV(statementsCsv);

  const headers = dbRows[0] ?? [];

  // Resolve answer columns by numeric header → item id.
  const columnForItem: Record<number, number> = {};
  headers.forEach((header, columnIndex) => {
    if (/^\d+$/.test(header)) {
      columnForItem[parseInt(header, 10)] = columnIndex;
    }
  });

  const idCol = headerIndex(headers, "ID");
  const deptCol = headerIndex(headers, "Department");
  const roleCol = headerIndex(headers, "Role");
  const generationCol = headerIndex(headers, "Generation");
  const tenureCol = headerIndex(headers, "Tenure");

  // Parse statements.
  const statements: StatementItem[] = [];
  for (let i = 1; i < stmtRows.length; i++) {
    const [itemId, index, commentFilter, text] = stmtRows[i];
    const parsedId = parseInt(itemId, 10);
    if (!Number.isFinite(parsedId)) continue;
    statements.push({
      itemId: parsedId,
      index: index?.trim() ?? "",
      isComment: commentFilter?.trim().toUpperCase() === "X",
      text: text?.trim() ?? "",
    });
  }

  // Dept Score rows define the rated departments. Several raw names can map to
  // one canonical department (merge), in which case their Dept Score columns
  // are pooled together everywhere.
  const deptScoreItems = statements.filter((s) => s.index === "Dept Score");
  const departments: string[] = [];
  const deptScoreItemIds: Record<string, number[]> = {};
  for (const item of deptScoreItems) {
    const canonical = norm(item.text);
    if (!departments.includes(canonical)) departments.push(canonical);
    (deptScoreItemIds[canonical] ??= []).push(item.itemId);
  }

  // Per-department CI items grouped BY QUESTION INDEX (so merged departments
  // pool the matching question across their source blocks) + comment items.
  const ciItemIdsByQuestion: Record<string, number[][]> = {};
  const ciQuestionByDept: Record<string, string[]> = {};
  const commentItems: Record<string, StatementItem[]> = {};
  const rawCiCounter: Record<string, number> = {};
  for (const item of statements) {
    if (item.index === "Dept Score") continue;
    const rawDept = item.index;
    const canonical = norm(rawDept);
    if (!rawDept || !departments.includes(canonical)) continue;
    if (item.isComment) {
      (commentItems[canonical] ??= []).push(item);
      continue;
    }
    const questionIndex = rawCiCounter[rawDept] ?? 0;
    rawCiCounter[rawDept] = questionIndex + 1;
    const byQuestion = (ciItemIdsByQuestion[canonical] ??= []);
    (byQuestion[questionIndex] ??= []).push(item.itemId);
    const labels = (ciQuestionByDept[canonical] ??= []);
    if (labels[questionIndex] === undefined) labels[questionIndex] = item.text;
  }

  // Canonical CI question labels (consistent across departments).
  const ciQuestions = ciQuestionByDept[departments[0]] ?? [];

  const value = (row: string[], itemId: number): number | null => {
    const col = columnForItem[itemId];
    if (col === undefined) return null;
    const raw = row[col];
    if (raw === undefined || raw.trim() === "") return null;
    const parsed = parseFloat(raw);
    // Treat 0 as no-answer: survey tools export unanswered cells as "0",
    // which is below the valid 1-100 rating scale.
    if (Number.isNaN(parsed) || parsed === 0) return null;
    return parsed / DISPLAY_SCALE;
  };

  const rawValue = (row: string[], itemId: number): string => {
    const col = columnForItem[itemId];
    if (col === undefined) return "";
    return (row[col] ?? "").trim();
  };

  const dataRows = dbRows
    .slice(1)
    .filter((row) => row.length > deptCol && row.some((cell) => cell.trim() !== ""));

  const respondents: DemoRespondent[] = [];
  const comments: CollaborationComment[] = [];
  const roleSet = new Set<string>();
  const generationSet = new Set<string>();
  const tenureSet = new Set<string>();

  dataRows.forEach((row, rowIndex) => {
    const id = (idCol >= 0 ? row[idCol] : "") || `R${rowIndex + 1}`;
    const rawDept = deptCol >= 0 ? row[deptCol]?.trim() ?? "" : "";
    const department = rawDept ? norm(rawDept) : "";
    const role = roleCol >= 0 ? row[roleCol]?.trim() ?? "" : "";
    const generation = generationCol >= 0 ? row[generationCol]?.trim() ?? "" : "";
    const tenure = tenureCol >= 0 ? row[tenureCol]?.trim() ?? "" : "";

    if (role) roleSet.add(role);
    if (generation) generationSet.add(generation);
    if (tenure) tenureSet.add(tenure);

    const cdrsRatings: Record<string, number | null> = {};
    const ciScores: Record<string, number[]> = {};

    for (const dept of departments) {
      // Pool the (possibly merged) Dept Score columns for this department.
      cdrsRatings[dept] = averageValues(
        (deptScoreItemIds[dept] ?? []).map((itemId) => value(row, itemId))
      );

      // Each question pools the matching item across merged source blocks.
      const perQuestion = (ciItemIdsByQuestion[dept] ?? []).map((itemIds) =>
        averageValues(itemIds.map((itemId) => value(row, itemId)))
      );
      // Keep index alignment: only include a block the respondent fully answered.
      if (perQuestion.length > 0 && perQuestion.every((v) => v !== null)) {
        ciScores[dept] = perQuestion as number[];
      }

      for (const commentItem of commentItems[dept] ?? []) {
        const text = rawValue(row, commentItem.itemId);
        if (!text) continue;
        comments.push({
          id: `${id}-${commentItem.itemId}`,
          aboutDepartment: dept,
          fromDepartment: rawDept || "Unassigned",
          role,
          generation,
          tenure,
          prompt: commentItem.text,
          text,
        });
      }
    }

    respondents.push({
      id: String(id),
      department,
      role: role as DemoRespondent["role"],
      generation: generation as DemoRespondent["generation"],
      tenure: tenure as DemoRespondent["tenure"],
      cdrsRatings,
      ciScores,
    });
  });

  const data = buildCollaborationDataFromRespondents(
    respondents,
    departments,
    ciQuestions
  );

  return {
    departments,
    ciQuestions,
    respondents,
    comments,
    data,
    roles: [...roleSet],
    generations: [...generationSet],
    tenures: [...tenureSet],
  };
}

/**
 * Aggregate respondent-level data into the dashboard `CollaborationData` shape.
 *
 * Headline CDRS follows the client definitions, EXCLUDING self-ratings:
 *   - Incoming = average of every rating a department received from OTHER
 *     departments (self/diagonal excluded).
 *   - Outgoing = average of all Dept Score answers a department's own
 *     employees gave to OTHER departments.
 * Cross-department views (heatmap, by-partner breakdowns, CI) are likewise
 * pair-based and exclude the self/diagonal, since a relationship is between
 * two distinct departments.
 */
export function buildCollaborationDataFromRespondents(
  respondents: DemoRespondent[],
  departments: string[],
  ciQuestions: string[]
): CollaborationData {
  const questionCount = ciQuestions.length;

  // Incoming: entire Dept Score column per department (includes self).
  const incomingScores: Record<string, number[]> = {};
  // Outgoing: every Dept Score answer given by the department's own employees.
  const outgoingScores: Record<string, number[]> = {};
  // Heatmap source→target (distinct departments only).
  const pairScores: Record<string, Record<string, number[]>> = {};
  // CI per rated department, excluding self, per question.
  const ciByQuestion: Record<string, number[][]> = {};
  // CI scores grouped by rater department → rated department.
  const ciPairScores: Record<string, Record<string, number[]>> = {};

  for (const dept of departments) {
    incomingScores[dept] = [];
    outgoingScores[dept] = [];
    pairScores[dept] = {};
    ciByQuestion[dept] = Array.from({ length: questionCount }, () => []);
    ciPairScores[dept] = {};
    for (const target of departments) {
      pairScores[dept][target] = [];
      if (target !== dept) ciPairScores[dept][target] = [];
    }
  }

  const departmentSet = new Set(departments);

  for (const respondent of respondents) {
    const source = respondent.department;
    const sourceIsRated = departmentSet.has(source);

    for (const target of departments) {
      const rating = respondent.cdrsRatings[target];

      // Exclude self-ratings everywhere: a department rating itself does not
      // count toward its incoming or its employees' outgoing scores.
      if (typeof rating === "number" && source !== target) {
        // Incoming = ratings received from OTHER departments.
        incomingScores[target].push(rating);

        if (sourceIsRated) {
          // Outgoing = answers this department's employees gave to others.
          outgoingScores[source].push(rating);
          // Heatmap/breakdowns across distinct departments.
          pairScores[source][target].push(rating);
        }
      }

      // CI: how OTHER departments experience `target` (exclude self).
      if (source !== target) {
        const ciScoresForTarget = respondent.ciScores[target];
        ciScoresForTarget?.forEach((score, questionIndex) => {
          if (questionIndex < questionCount) {
            ciByQuestion[target][questionIndex].push(score);
          }
        });
        if (sourceIsRated && ciScoresForTarget?.length) {
          ciPairScores[target][source].push(...ciScoresForTarget);
        }
      }
    }
  }

  const allIncoming: number[] = [];
  const allOutgoing: number[] = [];

  const departmentMetrics: DepartmentMetric[] = departments.map((dept) => {
    const incoming = incomingScores[dept];
    const outgoing = outgoingScores[dept];
    const questionScores = ciQuestions.map((question, questionIndex) => ({
      question,
      score: round2(avg(ciByQuestion[dept][questionIndex])),
      responseCount: ciByQuestion[dept][questionIndex].length,
    }));
    const ciValues = ciByQuestion[dept].flat();

    const incomingCDRS = incoming.length >= 2 ? round2(avg(incoming)) : 0;
    const outgoingCDRS = outgoing.length >= 2 ? round2(avg(outgoing)) : 0;
    if (incomingCDRS > 0) allIncoming.push(incomingCDRS);
    if (outgoingCDRS > 0) allOutgoing.push(outgoingCDRS);

    return {
      department: dept,
      incomingCDRS,
      outgoingCDRS,
      collaborationIndex: round2(avg(ciValues)),
      incomingCount: incoming.length,
      outgoingCount: outgoing.length,
      ciCount: ciValues.length,
      questionScores,
    };
  });

  const heatmapMatrix: HeatmapRow[] = departments.map((source) => ({
    department: source,
    scores: Object.fromEntries(
      departments.map((target) => [
        target,
        target === source || pairScores[source][target].length < 2
          ? null
          : round2(avg(pairScores[source][target])),
      ])
    ),
  }));

  const departmentDetails: DepartmentDetail[] = departments.map((dept) => {
    const metrics = departmentMetrics.find((m) => m.department === dept);
    const ciRaterIds = new Set<string>();
    for (const respondent of respondents) {
      if (respondent.department === dept) continue;
      if ((respondent.ciScores[dept]?.length ?? 0) > 0) {
        ciRaterIds.add(respondent.id);
      }
    }
    return {
      department: dept,
      incomingCDRS: metrics?.incomingCDRS ?? 0,
      outgoingCDRS: metrics?.outgoingCDRS ?? 0,
      collaborationIndex: metrics?.collaborationIndex ?? 0,
      responseCount: metrics?.incomingCount ?? 0,
      ciRaterCount: ciRaterIds.size,
      incomingByDept: departments
        .filter((source) => source !== dept)
        .map((source) => ({
          department: source,
          score: round2(avg(pairScores[source][dept])),
          count: pairScores[source][dept].length,
        }))
        .filter((entry) => entry.count >= 2)
        .sort((a, b) => b.score - a.score),
      outgoingByDept: departments
        .filter((target) => target !== dept)
        .map((target) => ({
          department: target,
          score: round2(avg(pairScores[dept][target])),
          count: pairScores[dept][target].length,
        }))
        .filter((entry) => entry.count >= 2)
        .sort((a, b) => b.score - a.score),
      ciByDept: departments
        .filter((source) => source !== dept)
        .map((source) => ({
          department: source,
          score: round2(avg(ciPairScores[dept][source])),
          count: ciPairScores[dept][source].length,
        }))
        .filter((entry) => entry.count >= 2)
        .sort((a, b) => b.score - a.score),
      questionScores: metrics?.questionScores ?? [],
    };
  });

  const dwsAverageIncoming = round2(avg(allIncoming));
  const dwsAverageOutgoing = round2(avg(allOutgoing));

  return {
    meta: {
      totalRespondents: respondents.length,
      totalDepartments: departments.length,
      dwsAverageIncoming,
      dwsAverageOutgoing,
      dwsAverageOverall: round2((dwsAverageIncoming + dwsAverageOutgoing) / 2),
      departments,
      ciQuestions,
    },
    departmentMetrics: departmentMetrics
      .slice()
      .sort((a, b) => b.incomingCDRS - a.incomingCDRS),
    heatmapMatrix,
    departmentDetails,
  };
}
