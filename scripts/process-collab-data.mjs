/**
 * Process DWS Collaboration Campaign CSV data into pre-computed dashboard metrics.
 *
 * Data structure:
 * - Columns 1-26: Dept Score (1-10 rating per department) = DRS
 * - Columns 27-417: Per-department blocks of 15 items each:
 *   - 9 quantitative questions (Collaboration Index)
 *   - 6 qualitative questions (CommentFilter=X)
 *
 * Output: Static JSON with all pre-computed metrics for the dashboard.
 */

import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ─── Parse CSV ──────────────────────────────────────────────
function parseCSV(text) {
  const lines = [];
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
    const fields = [];
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

// ─── Load files ─────────────────────────────────────────────
const dataDir = "C:\\Users\\dusti\\OneDrive\\Client Data\\DWS\\Power BI";
const rawData = readFileSync(join(dataDir, "DWSCollaborationClean.csv"), "utf8").replace(/^\uFEFF/, "");
const rawStatements = readFileSync(join(dataDir, "DWS Collaboration Statements.csv"), "utf8").replace(/^\uFEFF/, "");

const dataRows = parseCSV(rawData);
const stmtRows = parseCSV(rawStatements);

const dataHeader = dataRows[0];
const respondents = dataRows.slice(1).filter((r) => r.length > 11 && r[6]);

console.log(`Loaded ${respondents.length} respondents`);

// ─── Parse Statements ───────────────────────────────────────
// Build a map: itemId -> { index, commentFilter, itemText, department }
const statements = [];
for (let i = 1; i < stmtRows.length; i++) {
  const [itemId, index, commentFilter, itemText] = stmtRows[i];
  statements.push({
    itemId: parseInt(itemId),
    index: index?.trim(),
    isComment: commentFilter?.trim() === "X",
    text: itemText?.trim() || "",
  });
}

// Items 1-26 are "Dept Score" — the rated department name is in the text field
const deptScoreItems = statements.filter((s) => s.index === "Dept Score");
const deptNames = deptScoreItems.map((s) => s.text);
console.log(`${deptNames.length} departments in Dept Score section:`, deptNames);

// Build department -> quantitative question item IDs map (for Collaboration Index)
// Each department has 15 items: 9 quant + 6 qualitative
const deptQuantItems = {}; // deptName -> [itemId, ...]
const deptQuantQuestions = {}; // deptName -> [questionText, ...]
for (const s of statements) {
  if (s.index === "Dept Score" || s.index === "Culture Champion") continue;
  const dept = s.index;
  if (!dept) continue;
  if (!s.isComment) {
    if (!deptQuantItems[dept]) {
      deptQuantItems[dept] = [];
      deptQuantQuestions[dept] = [];
    }
    deptQuantItems[dept].push(s.itemId);
    deptQuantQuestions[dept].push(s.text);
  }
}

// The 9 collaboration index question texts (same for every department)
const ciQuestions = deptQuantQuestions[deptNames[0]] || [];
console.log(`CI questions per dept: ${ciQuestions.length}`);

// ─── Helper: get numeric value from a respondent row ────────
function getVal(row, itemId) {
  // itemId is 1-based, dataHeader has columns 1-417 starting at index 11
  const colIdx = 10 + itemId; // header[11] = "1", so header[10+itemId] = itemId
  const raw = row[colIdx];
  if (!raw || raw.trim() === "") return null;
  const n = parseFloat(raw);
  return isNaN(n) ? null : n;
}

// ─── Compute DRS (Dept Relational Strength) ─────────────────
// For each respondent, columns 1-26 are their 1-10 score for each department.
// Incoming CDRS for dept X = avg of scores given TO dept X by employees NOT in dept X
// Outgoing CDRS for dept X = avg of all dept scores given BY employees IN dept X (excluding self)

// Map dept name in statements to indices
const deptScoreMap = {}; // deptName -> itemId (1-26)
for (const s of deptScoreItems) {
  deptScoreMap[s.text] = s.itemId;
}

// Normalize department names between respondent data and statements
// Respondents use: "Field Supervisors", "Executive Team", "Ops Excellence"
// Statements use: "Onsite Field Supervisors", "C-Suite", "Operational Excellence", "Salesforce"
const deptNormalize = {
  "Field Supervisors": "Onsite Field Supervisors",
  "Executive Team": "C-Suite",
  "Ops Excellence": "Ops Excellence", // Keep as-is, statements use "Operational Excellence"
};

function normalizeDept(d) {
  return deptNormalize[d] || d;
}

// Compute incoming and outgoing CDRS
const incomingScores = {}; // targetDept -> [scores]
const outgoingScores = {}; // sourceDept -> [scores]
const heatmapScores = {}; // sourceDept -> targetDept -> [scores]

for (const dept of deptNames) {
  incomingScores[dept] = [];
  outgoingScores[dept] = [];
  heatmapScores[dept] = {};
  for (const d2 of deptNames) {
    heatmapScores[dept][d2] = [];
  }
}

for (const row of respondents) {
  const respDept = normalizeDept(row[6]);

  for (const targetDept of deptNames) {
    const itemId = deptScoreMap[targetDept];
    const score = getVal(row, itemId);
    if (score === null) continue;

    // Determine if respondent's dept matches a dept in our list
    // For outgoing: this score is FROM respDept TO targetDept
    // For incoming: this score is TO targetDept FROM respDept
    // Skip self-ratings
    const matchesSelf =
      respDept === targetDept ||
      (respDept === "Ops Excellence" && targetDept === "Operational Excellence") ||
      (respDept === "Executive Team" && targetDept === "C-Suite") ||
      (respDept === "Field Supervisors" && targetDept === "Onsite Field Supervisors");

    if (!matchesSelf) {
      incomingScores[targetDept].push(score);

      // Find source dept name in our deptNames list
      let sourceDeptName = respDept;
      // Map respondent dept names to statement dept names
      if (respDept === "Field Supervisors") sourceDeptName = "Onsite Field Supervisors";
      if (respDept === "Executive Team") sourceDeptName = "C-Suite";
      if (respDept === "Ops Excellence") sourceDeptName = "Operational Excellence";

      if (heatmapScores[sourceDeptName]) {
        heatmapScores[sourceDeptName][targetDept].push(score);
      }
    }

    // Outgoing: scores given BY this dept's employees
    let outDeptName = respDept;
    if (respDept === "Field Supervisors") outDeptName = "Onsite Field Supervisors";
    if (respDept === "Executive Team") outDeptName = "C-Suite";
    if (respDept === "Ops Excellence") outDeptName = "Operational Excellence";

    if (!matchesSelf && outgoingScores[outDeptName]) {
      outgoingScores[outDeptName].push(score);
    }
  }
}

function avg(arr) {
  if (!arr || arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

// ─── Compute Collaboration Index ────────────────────────────
// CI for dept X = avg of the 9 quantitative questions answered about dept X by people who selected them
const ciScores = {}; // targetDept -> [scores]
const ciByQuestion = {}; // targetDept -> questionIdx -> [scores]

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

    // Check if this respondent answered any of the CI questions for this dept
    const scores = [];
    for (let qi = 0; qi < qItems.length; qi++) {
      const val = getVal(row, qItems[qi]);
      if (val !== null) {
        scores.push(val);
        ciByQuestion[dept][qi].push(val);
      }
    }

    if (scores.length > 0) {
      ciScores[dept].push(...scores);
    }
  }
}

// ─── Build output ───────────────────────────────────────────
const allIncomingAvgs = [];
const allOutgoingAvgs = [];

const departmentMetrics = deptNames.map((dept) => {
  const inAvg = round2(avg(incomingScores[dept]));
  const outAvg = round2(avg(outgoingScores[dept]));
  const ciAvg = round2(avg(ciScores[dept]));
  allIncomingAvgs.push(inAvg);
  allOutgoingAvgs.push(outAvg);

  // Per-question CI scores
  const questionScores = ciQuestions.map((q, qi) => ({
    question: q,
    score: round2(avg(ciByQuestion[dept]?.[qi] || [])),
    responseCount: (ciByQuestion[dept]?.[qi] || []).length,
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

// Heatmap matrix
const heatmapMatrix = deptNames.map((source) => {
  const row = {};
  for (const target of deptNames) {
    const scores = heatmapScores[source]?.[target] || [];
    row[target] = scores.length > 0 ? round2(avg(scores)) : null;
  }
  return { department: source, scores: row };
});

// Per-department detail (for the Department CDRS Report tab)
const departmentDetails = deptNames.map((dept) => {
  // Incoming breakdown: which depts gave what score to this dept
  const incomingByDept = deptNames
    .filter((d) => d !== dept)
    .map((source) => ({
      department: source,
      score: round2(avg(heatmapScores[source]?.[dept] || [])),
      count: (heatmapScores[source]?.[dept] || []).length,
    }))
    .filter((d) => d.count > 0)
    .sort((a, b) => b.score - a.score);

  // Outgoing breakdown: what this dept's employees rated each other dept
  const outgoingByDept = deptNames
    .filter((d) => d !== dept)
    .map((target) => ({
      department: target,
      score: round2(avg(heatmapScores[dept]?.[target] || [])),
      count: (heatmapScores[dept]?.[target] || []).length,
    }))
    .filter((d) => d.count > 0)
    .sort((a, b) => b.score - a.score);

  const metrics = departmentMetrics.find((m) => m.department === dept);

  return {
    department: dept,
    incomingCDRS: metrics?.incomingCDRS || 0,
    outgoingCDRS: metrics?.outgoingCDRS || 0,
    collaborationIndex: metrics?.collaborationIndex || 0,
    responseCount: metrics?.incomingCount || 0,
    incomingByDept,
    outgoingByDept,
    questionScores: metrics?.questionScores || [],
  };
});

const dwsAvgIncoming = round2(avg(allIncomingAvgs.filter((v) => v > 0)));
const dwsAvgOutgoing = round2(avg(allOutgoingAvgs.filter((v) => v > 0)));

const output = {
  meta: {
    totalRespondents: respondents.length,
    totalDepartments: deptNames.length,
    dwsAverageIncoming: dwsAvgIncoming,
    dwsAverageOutgoing: dwsAvgOutgoing,
    dwsAverageOverall: round2((dwsAvgIncoming + dwsAvgOutgoing) / 2),
    departments: deptNames,
    ciQuestions,
  },
  departmentMetrics: departmentMetrics.sort((a, b) => b.incomingCDRS - a.incomingCDRS),
  heatmapMatrix,
  departmentDetails,
};

// Write output
const outPath = join(__dirname, "..", "src", "data", "collaboration-data.json");
writeFileSync(outPath, JSON.stringify(output, null, 2));
console.log(`\nWritten to ${outPath}`);
console.log(`DWS Average Incoming: ${dwsAvgIncoming}`);
console.log(`DWS Average Outgoing: ${dwsAvgOutgoing}`);
console.log(`Top 5 Incoming CDRS:`);
departmentMetrics
  .sort((a, b) => b.incomingCDRS - a.incomingCDRS)
  .slice(0, 5)
  .forEach((d) => console.log(`  ${d.department}: ${d.incomingCDRS}`));
