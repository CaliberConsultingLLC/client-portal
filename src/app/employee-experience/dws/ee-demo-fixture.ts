// @ts-nocheck
/* ============================================================
   EE DEMO DATA — one canonical fake dataset for the whole lab
   ------------------------------------------------------------
   Every report in the Demo Lab reads from THIS dataset. It is
   deliberately the same fake data every time — its only job is to
   give us rich, consistent segmentation to design against (multiple
   departments + locations, multiple indexes/statements, multiple
   campaigns). The numbers don't mean anything; the SHAPE does.

   Canonical grain:  index → statement → byDept[deptId] → { current, comparisons }
   Everything a report needs is PROJECTED from this grain:
     • toCampaignResultsData()      → org-wide (response-weighted) per statement
     • toDepartmentComparisonData() → per-department, passed through

   A real portal adapter (Firestore → contract) would output the same
   projected shapes; the lab just fakes the source. Add a NEW dimension
   here only if a new report needs a cut we don't have — never reshape.
   ============================================================ */

/* ── Segmentation anchors ─────────────────────────────────── */
/* Departments carry location + responses so future reports can cut by
   location or weight org-wide rollups by headcount. */
const EE_DEPARTMENTS = [
  { id: "ship",  name: "Shipping & Receiving",         location: "Memphis, TN",     responses: 142, base: 67.0, yoy:  2.1 },
  { id: "sales", name: "Sales",                         location: "Chicago, IL",     responses: 188, base: 67.0, yoy:  8.3 },
  { id: "pcs",   name: "Production Control & Sourcing", location: "Memphis, TN",     responses:  96, base: 39.5, yoy: -7.7 },
  { id: "prod",  name: "Production",                    location: "Memphis, TN",     responses: 311, base: 73.0, yoy:  4.0 },
  { id: "it",    name: "IT",                            location: "Chicago, IL",     responses:  64, base: 89.0, yoy:  6.0 },
  { id: "cs",    name: "Customer Service",              location: "Remote",          responses: 174, base: 67.0, yoy:  1.5 },
  { id: "acct",  name: "Accounting",                    location: "Chicago, IL",     responses:  88, base: 56.0, yoy:  5.5 },
];

/* Indexes + statement wording (the EE survey library). */
const EE_INDEX_DEFS = [
  {
    id: "culture", name: "Culture", off: 0, yoyScale: 1,
    statements: [
      "Top Flight delivers on its promises to its customers",
      "Leaders at Top Flight demonstrate professional integrity",
      "My department receives good cooperation and support from other departments",
      "Top Flight delivers on its promises to its employees",
      "Top Flight employees work well together",
      "Top Flight encourages open and honest communication",
      "People at Top Flight are allowed to challenge processes and share ideas",
      "People at Top Flight treat each other with respect",
      "People at Top Flight take responsibility for their actions and results",
    ],
  },
  {
    id: "engagement", name: "Engagement", off: 3, yoyScale: 1.1,
    statements: [
      "I am willing to put in extra effort to help Top Flight succeed",
      "I am proud to work at Top Flight",
      "I would recommend Top Flight as a great place to work",
      "My work gives me a sense of personal accomplishment",
      "I feel motivated to do more than what is required of me",
      "I feel energized by the work I do each day",
      "Top Flight inspires me to do my best work",
      "I rarely think about looking for a job at another company",
    ],
  },
  {
    id: "intent", name: "Intent to Stay", off: -2, yoyScale: 0.8,
    statements: [
      "I expect to be working at Top Flight two years from now",
      "My future at Top Flight looks bright",
      "Top Flight gives me good reasons to stay",
      "I see a clear path to grow my career here",
      "I rarely think about leaving Top Flight",
      "I would turn down a similar job offered elsewhere",
    ],
  },
  {
    id: "manager", name: "Manager", off: 5, yoyScale: 0.9,
    statements: [
      "My manager treats me with respect",
      "I trust my manager",
      "My manager cares about me as a person",
      "My manager communicates clearly",
      "My manager removes obstacles so I can do my work",
      "My manager recognizes my contributions",
      "My manager gives me useful feedback",
      "My manager helps me grow and develop",
    ],
  },
];

/* ── Deterministic synthesis (stable across reloads) ──────── */
function eeHash(str) {
  let x = 0;
  for (let i = 0; i < str.length; i++) x = (x * 31 + str.charCodeAt(i)) >>> 0;
  return x;
}
const eeClamp = (v, a, b) => Math.max(a, Math.min(b, v));
const eeRound1 = (n) => Math.round(n * 10) / 10;

/* Builds the canonical dataset: every statement carries a byDept map with a
   current value and one prior value per comparison campaign. */
function buildEEDataset() {
  const indexes = EE_INDEX_DEFS.map((def) => {
    const statements = def.statements.map((text, sIdx) => {
      const stId = `${def.id}-${sIdx + 1}`;
      const byDept = {};
      EE_DEPARTMENTS.forEach((d) => {
        const bias = def.id === "culture" ? 0 : ((eeHash(d.id + def.id) % 70) / 10) - 3.5;
        const target = eeClamp(d.base + def.off + bias, 26, 97);
        const jit = ((eeHash(d.id + stId) % 90) / 10) - 4.5;
        const cur = eeRound1(eeClamp(target + jit, 22, 98));
        const yoy = d.yoy * def.yoyScale;
        const yj = ((eeHash(stId + d.id + "y") % 40) / 10) - 2.0;
        const jul = eeRound1(eeClamp(cur - (yoy + yj), 18, 99));
        const feb = eeRound1(eeClamp(cur - (yoy * 0.55 + yj * 0.5), 18, 99));
        byDept[d.id] = { current: cur, comparisons: { jul, feb } };
      });
      return { id: stId, text, byDept };
    });
    return { id: def.id, name: def.name, statements };
  });

  return {
    client: { name: "Top Flight", tagline: "100TH ANNIVERSARY" },
    current: { id: "oct25", label: "Oct 2025", labelLong: "October 2025", responseRate: 0.71 },
    comparisons: [
      { id: "jul", label: "Jul-24", labelLong: "JUL 2024" },
      { id: "feb", label: "Feb-25", labelLong: "FEB 2025" },
    ],
    scale: { min: 60, mid: 72.5, max: 85 },
    departments: EE_DEPARTMENTS.map((d) => ({ id: d.id, name: d.name, location: d.location, responses: d.responses })),
    indexes,
  };
}

const EE_DATA = buildEEDataset();

/* response totals per department, for weighted org-wide rollups */
const EE_DEPT_WEIGHTS = Object.fromEntries(EE_DEPARTMENTS.map((d) => [d.id, d.responses]));
function eeWeightedMean(valueByDept) {
  let num = 0, den = 0;
  for (const id in valueByDept) {
    const w = EE_DEPT_WEIGHTS[id] ?? 1;
    num += valueByDept[id] * w;
    den += w;
  }
  return den === 0 ? 0 : eeRound1(num / den);
}

/* ── Projector: Campaign Results (org-wide per statement) ──── */
/* Collapses byDept → a single org-wide current/comparison per statement,
   response-weighted. Matches the Campaign Results data contract. */
function toCampaignResultsData(ds = EE_DATA) {
  const totalResponses = EE_DEPARTMENTS.reduce((s, d) => s + d.responses, 0);
  return {
    client: ds.client,
    current: ds.current,
    comparisons: ds.comparisons,
    scale: ds.scale,
    indexes: ds.indexes.map((ix) => ({
      id: ix.id,
      name: ix.name,
      responses: totalResponses,
      statements: ix.statements.map((s) => {
        const cur = {}, jul = {}, feb = {};
        for (const id in s.byDept) {
          cur[id] = s.byDept[id].current;
          jul[id] = s.byDept[id].comparisons.jul;
          feb[id] = s.byDept[id].comparisons.feb;
        }
        return {
          text: s.text,
          current: eeWeightedMean(cur),
          comparisons: { jul: eeWeightedMean(jul), feb: eeWeightedMean(feb) },
        };
      }),
    })),
  };
}

/* ── Projector: Department Comparison (per-department) ────── */
/* Passes the canonical byDept grain straight through and adds the wider
   axis overrides the department spread needs. Matches the Department
   Comparison data contract. */
function toDepartmentComparisonData(ds = EE_DATA) {
  return {
    client: ds.client,
    current: ds.current,
    comparisons: ds.comparisons,
    scale: ds.scale,
    display: {
      barAxis: { min: 30, max: 90, ticks: [40, 60, 80] },
      deltaAxis: { min: -10, max: 10, ticks: [-10, 0, 10] },
    },
    departments: ds.departments.map((d) => ({ id: d.id, name: d.name })),
    indexes: ds.indexes,
  };
}

/* ── Sub-department segment dimensions ────────────────────── */
/* Generic, department-independent cuts used by the Department Report.
   Add a dimension here and it flows into the report automatically — the
   "possibly other functions/splits eventually" hook. Group scores are
   synthesized deterministically around each department's anchor score so
   the breakouts are stable and diverse. Groups with too few responses are
   masked (hidden) per the platform's small-n rule. */
const EE_SEGMENT_DIMENSIONS = [
  { id: "role",       label: "Role",         groups: ["Individual Contributor", "Specialist", "Team Lead", "Manager", "Senior Leader"] },
  { id: "leader",     label: "Leader Level", groups: ["Tier 1", "Tier 2", "Tier 3", "Tier 4", "Tier 5"] },
  { id: "tenure",     label: "Tenure",       groups: ["<1 Year", "1-3 Years", "4-9 Years", "10-20 Years", "20+ Years"] },
  { id: "generation", label: "Generation",   groups: ["Gen Z", "Millennial", "Gen X", "Boomer"] },
];
const EE_SEGMENT_MIN_N = 5; // mask groups below this many responses

function buildSegments() {
  return EE_SEGMENT_DIMENSIONS.map((dim) => ({
    id: dim.id,
    label: dim.label,
    groups: dim.groups.map((name) => {
      const gid = `${dim.id}-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}`;
      const byDept = {};
      EE_DEPARTMENTS.forEach((d) => {
        // deterministic share of the dept's responses for this group
        const share = (eeHash(d.id + gid + "n") % 100) / 100;        // 0..1
        const n = Math.round(d.responses * (0.06 + share * 0.34));   // ~6%–40% of dept
        const bias = ((eeHash(d.id + gid) % 220) / 10) - 11;          // -11..+11
        const cur = eeRound1(eeClamp(d.base + bias, 22, 98));
        const gy = d.yoy + (((eeHash(gid + d.id + "y") % 80) / 10) - 4); // dept yoy ± 4
        const jul = eeRound1(eeClamp(cur - gy, 18, 99));
        const feb = eeRound1(eeClamp(cur - gy * 0.55, 18, 99));
        byDept[d.id] = { responses: n, current: cur, comparisons: { jul, feb } };
      });
      return { id: gid, name, byDept };
    }),
  }));
}

const EE_SEGMENTS = buildSegments();

/* ── Projector: Department Report (single-department deep dive) ──
   Returns the per-department statement grain (shared with Department
   Comparison) PLUS the segment breakouts and per-department response
   counts. The component selects a department and derives index summary,
   statement deltas, and segment scores for the chosen comparison. */
function toDepartmentReportData(ds = EE_DATA) {
  return {
    client: ds.client,
    current: ds.current,
    comparisons: ds.comparisons,
    scale: ds.scale,
    departments: ds.departments.map((d) => ({ id: d.id, name: d.name, location: d.location, responses: d.responses })),
    indexes: ds.indexes,        // index → statement → byDept {current, comparisons}
    segments: EE_SEGMENTS,      // dimension → group → byDept {responses, current, comparisons}
    segmentMinResponses: EE_SEGMENT_MIN_N,
  };
}

/* ── Supervisor roster (Manager-index deep dive) ──────────────
   A new grain: individual people-leaders, each scored ONLY on the
   Manager index. The Supervisor Report filters to one supervisor and
   benchmarks every manager statement against the org (all-supervisor)
   average — a peer motivator. Scores are synthesized deterministically
   around each supervisor's anchor so the report is stable + diverse. */
const EE_SUPERVISORS = [
  { id: "cboyd",    name: "Chad Boyd",     dept: "Production",                    responses:  8, base: 82, yoy:  7.1 },
  { id: "malvarez", name: "Maria Alvarez", dept: "Sales",                         responses: 14, base: 88, yoy:  5.4 },
  { id: "dpratt",   name: "Devon Pratt",   dept: "Shipping & Receiving",          responses: 11, base: 79, yoy:  3.2 },
  { id: "kliu",     name: "Karen Liu",     dept: "IT",                            responses:  9, base: 90, yoy:  4.6 },
  { id: "tbecker",  name: "Tom Becker",    dept: "Customer Service",              responses: 13, base: 74, yoy: -1.8 },
  { id: "pnair",    name: "Priya Nair",    dept: "Accounting",                    responses:  7, base: 76, yoy:  6.0 },
  { id: "mwebb",    name: "Marcus Webb",   dept: "Production Control & Sourcing", responses: 10, base: 71, yoy: -4.2 },
  { id: "jcole",    name: "Janet Cole",    dept: "Production",                    responses: 12, base: 85, yoy:  2.4 },
  { id: "spark",    name: "Steve Park",    dept: "Sales",                         responses:  9, base: 80, yoy:  3.6 },
];

/* Per-statement difficulty offsets for the Manager index — stable shape across
   every supervisor (respect/trust ride high; recognition/growth ride low). */
const EE_MANAGER_STMT_OFFSETS = [6, 3.5, 1, -0.5, -4, -7.5, -5.5, -8.5];

function buildSupervisorStatements() {
  const mgr = EE_INDEX_DEFS.find((d) => d.id === "manager");
  return mgr.statements.map((text, i) => {
    const stId = `mgr-s${i + 1}`;
    const off = EE_MANAGER_STMT_OFFSETS[i] ?? 0;
    const bySup = {};
    EE_SUPERVISORS.forEach((s) => {
      // supervisor-specific per-statement signature (their personal strengths /
      // blind spots) so each leader's shape diverges from the org average — the
      // gap to peers varies statement by statement instead of being flat.
      const sig = ((eeHash(s.id + stId + "sig") % 130) / 10) - 6.5;  // -6.5..+6.5
      const jit = ((eeHash(s.id + stId) % 40) / 10) - 2;             // -2..+2
      const cur = eeRound1(eeClamp(s.base + off + sig + jit, 40, 99));
      const yj  = ((eeHash(stId + s.id + "y") % 40) / 10) - 2;
      const jul = eeRound1(eeClamp(cur - (s.yoy + yj), 30, 99));
      const feb = eeRound1(eeClamp(cur - (s.yoy * 0.55 + yj * 0.5), 30, 99));
      bySup[s.id] = { current: cur, comparisons: { jul, feb } };
    });
    return { id: stId, text, bySup };
  });
}
const EE_SUPERVISOR_STATEMENTS = buildSupervisorStatements();

/* Response-weighted org average per statement, per campaign (the peer benchmark). */
function supOrgAvg(bySup, campKey) {
  let num = 0, den = 0;
  EE_SUPERVISORS.forEach((s) => {
    const cell = bySup[s.id];
    const v = campKey === "current" ? cell.current : cell.comparisons[campKey];
    num += v * s.responses; den += s.responses;
  });
  return den === 0 ? 0 : eeRound1(num / den);
}

/* ── Projector: Supervisor Report (single-supervisor Manager-index dive) ── */
function toSupervisorReportData(ds = EE_DATA) {
  const mgr = EE_INDEX_DEFS.find((d) => d.id === "manager");
  return {
    client: ds.client,
    current: ds.current,
    comparisons: ds.comparisons,
    scale: ds.scale,
    display: { barAxis: { min: 55, max: 100, ticks: [60, 70, 80, 90, 100] } },
    supervisors: EE_SUPERVISORS.map((s) => ({ id: s.id, name: s.name, dept: s.dept, responses: s.responses })),
    index: {
      id: "manager",
      name: mgr.name,
      statements: EE_SUPERVISOR_STATEMENTS.map((st) => ({
        id: st.id,
        text: st.text,
        bySup: st.bySup,
        org: {
          current: supOrgAvg(st.bySup, "current"),
          comparisons: { jul: supOrgAvg(st.bySup, "jul"), feb: supOrgAvg(st.bySup, "feb") },
        },
      })),
    },
  };
}

/* ── Detailed Historical series (multi-campaign trend) ────────
   A LONGER timeline (6 surveys) than the canonical 3-campaign cut,
   used only by the Detailed History report's trend chart. Each
   statement carries a per-department value at every survey date so
   the area/line chart and the historical table can plot the full
   trajectory + first→last change. Synthesized deterministically:
   a department/index/statement anchor, a gentle wave, and the
   department's drift across the window. */
const EE_HISTORY_CAMPAIGNS = [
  { id: "feb24", label: "Feb 2024", short: "Feb-24", month: 0 },
  { id: "jul24", label: "Jul 2024", short: "Jul-24", month: 5 },
  { id: "dec24", label: "Dec 2024", short: "Dec-24", month: 10 },
  { id: "mar25", label: "Mar 2025", short: "Mar-25", month: 13 },
  { id: "jun25", label: "Jun 2025", short: "Jun-25", month: 16 },
  { id: "oct25", label: "Oct 2025", short: "Oct-25", month: 20 },
];

function buildHistory() {
  return EE_INDEX_DEFS.map((def) => ({
    id: def.id,
    name: def.name,
    statements: def.statements.map((text, sIdx) => {
      const stId = `${def.id}-${sIdx + 1}`;
      const byDept = {};
      EE_DEPARTMENTS.forEach((d) => {
        const bias = def.id === "culture" ? 0 : ((eeHash(d.id + def.id) % 70) / 10) - 3.5;
        const base = eeClamp(d.base + def.off + bias, 26, 97);
        const sOff = ((eeHash(stId + "o") % 80) / 10) - 4;            // statement difficulty -4..+4
        const phase = ((eeHash(stId + d.id + "p") % 100) / 100) * Math.PI * 2;
        const series = {};
        EE_HISTORY_CAMPAIGNS.forEach((c, ci) => {
          const lin = (ci - 2.5) * (d.yoy * def.yoyScale / 5);          // drift across the window
          const wave = Math.sin(phase + ci * 0.95) * 2.4;              // organic wiggle
          const noise = ((eeHash(stId + d.id + c.id) % 30) / 10) - 1.5;
          series[c.id] = eeRound1(eeClamp(base + sOff + lin + wave + noise, 20, 98));
        });
        byDept[d.id] = series;
      });
      return { id: stId, text, byDept };
    }),
  }));
}
const EE_HISTORY = buildHistory();

/* ── Projector: Detailed History (single-department trend over time) ── */
function toHistoricalData(ds = EE_DATA) {
  return {
    client: ds.client,
    scale: ds.scale,
    departments: ds.departments.map((d) => ({ id: d.id, name: d.name, location: d.location, responses: d.responses })),
    campaigns: EE_HISTORY_CAMPAIGNS,
    indexes: EE_HISTORY,   // index → statement → byDept → { [campId]: value }
  };
}


export { toDepartmentReportData, toSupervisorReportData, toHistoricalData };
