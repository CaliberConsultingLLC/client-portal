/**
 * Mock data for the Employee Experience dashboard.
 *
 * Mirrors the shape of EmployeeExperienceDashboardData exactly so stories
 * receive type-safe, realistic input without a live backend.
 *
 * Data story:
 *   Org: "Meridian Field Services"  (fictional stand-in for DWS)
 *   Campaigns: "June 2025" (current) vs "December 2024" (prior)
 *   3 departments: Operations, Engineering, Corporate
 *   2 locations:   Denver, Houston
 *   2 work types:  Field, Office
 *   3 supervisors: Sarah Mitchell, James Torres, Linda Park
 *
 *   Overall trajectory: modest improvement (+0.3) driven by Daily Work & Engage.
 *   Balance remains the low-scoring dimension. Corporate scores highest.
 */

import type {
  EmployeeExperienceDashboardData,
  EmployeeExperienceRespondent,
  EmployeeExperienceQuestionDefinition,
  EmployeeExperienceVoiceEntry,
} from "@/types/employee-experience";
import { scoreFor, pick, seededRandom, range, MOCK_GENERATIONS, MOCK_TENURES, MOCK_RATE_TYPES, MOCK_LEADERSHIP } from "@/dashboards/_shared/mockHelpers";

// ─── Questions (28 items, 4 per dimension) ────────────────────────────────────

export const MOCK_QUESTIONS: EmployeeExperienceQuestionDefinition[] = [
  // Acquisition — items 1–4
  { itemId: 1, dimension: "Acquisition", statement: "The transition from my previous employer was handled professionally." },
  { itemId: 2, dimension: "Acquisition", statement: "I received adequate information about changes to my role and benefits." },
  { itemId: 3, dimension: "Acquisition", statement: "Leadership communicated a clear vision for the combined organization." },
  { itemId: 4, dimension: "Acquisition", statement: "I feel my skills and experience were valued throughout the acquisition." },
  // Culture — items 5–8
  { itemId: 5, dimension: "Culture", statement: "I feel a strong sense of belonging at this organization." },
  { itemId: 6, dimension: "Culture", statement: "Our values are consistently reflected in how decisions are made." },
  { itemId: 7, dimension: "Culture", statement: "Diversity and inclusion are genuine priorities here, not just words." },
  { itemId: 8, dimension: "Culture", statement: "I am proud to work for this organization." },
  // Daily Work — items 9–12
  { itemId: 9,  dimension: "Daily Work", statement: "I have the tools and resources needed to do my job effectively." },
  { itemId: 10, dimension: "Daily Work", statement: "My workload is reasonable and sustainable." },
  { itemId: 11, dimension: "Daily Work", statement: "I understand how my work connects to the organization's goals." },
  { itemId: 12, dimension: "Daily Work", statement: "Processes and workflows help rather than hinder my productivity." },
  // Intent — items 13–16
  { itemId: 13, dimension: "Intent", statement: "I plan to still be working here in two years." },
  { itemId: 14, dimension: "Intent", statement: "I would recommend this organization as a great place to work." },
  { itemId: 15, dimension: "Intent", statement: "I see a clear path for career growth here." },
  { itemId: 16, dimension: "Intent", statement: "I am motivated to go above and beyond what is expected of me." },
  // Supervisor — items 17–20
  { itemId: 17, dimension: "Supervisor", statement: "My supervisor provides helpful, actionable feedback." },
  { itemId: 18, dimension: "Supervisor", statement: "My supervisor genuinely cares about my professional development." },
  { itemId: 19, dimension: "Supervisor", statement: "My supervisor communicates expectations clearly." },
  { itemId: 20, dimension: "Supervisor", statement: "I trust my supervisor to advocate for me when needed." },
  // Engage — items 21–24
  { itemId: 21, dimension: "Engage", statement: "I feel energized and motivated by my work on most days." },
  { itemId: 22, dimension: "Engage", statement: "I have opportunities to do what I do best every day." },
  { itemId: 23, dimension: "Engage", statement: "My contributions are recognized in meaningful ways." },
  { itemId: 24, dimension: "Engage", statement: "I feel connected to my team and colleagues." },
  // Balance — items 25–28
  { itemId: 25, dimension: "Balance", statement: "I am able to maintain a healthy balance between work and personal life." },
  { itemId: 26, dimension: "Balance", statement: "I rarely feel burned out or overwhelmed by work demands." },
  { itemId: 27, dimension: "Balance", statement: "My schedule allows me to fulfill personal and family responsibilities." },
  { itemId: 28, dimension: "Balance", statement: "Leadership respects boundaries around my personal time." },
];

// ─── Dimension base scores (0–10 scale) per campaign ──────────────────────────

// Maps dimension label → [currentBase, priorBase]
const DIM_BASES: Record<string, [number, number]> = {
  Acquisition: [7.2, 7.0],
  Culture:     [7.1, 7.0],
  "Daily Work":[7.6, 7.3],
  Intent:      [7.1, 7.2],
  Supervisor:  [8.1, 8.0],
  Engage:      [7.6, 7.3],
  Balance:     [6.7, 6.7],
};

function dimBase(dimension: string, campaign: "current" | "prior"): number {
  return DIM_BASES[dimension]?.[campaign === "current" ? 0 : 1] ?? 7.5;
}

// Department modifiers (additive on top of dim base)
const DEPT_MOD: Record<string, number> = {
  Operations: -0.1,
  Engineering: 0.0,
  Corporate: +0.4,
};

// ─── Respondent builder ───────────────────────────────────────────────────────

interface RespondentSpec {
  id: string;
  campaign: "current" | "prior";
  department: string;
  location: string;
  supervisor: string;
  fieldCategory: string;
}

const CAMPAIGN_LABELS = { current: "June 2025", prior: "December 2024" };
const CAMPAIGN_TIME   = { current: 1_750_000_000, prior: 1_735_000_000 };

function buildRespondent(spec: RespondentSpec): EmployeeExperienceRespondent {
  const { id, campaign, department, location, supervisor, fieldCategory } = spec;
  const campaignLabel = CAMPAIGN_LABELS[campaign];
  const deptMod = DEPT_MOD[department] ?? 0;

  const scores: Record<number, number | null> = {};
  for (const q of MOCK_QUESTIONS) {
    const base = dimBase(q.dimension, campaign) + deptMod;
    scores[q.itemId] = scoreFor(`${id}-${q.itemId}`, base);
  }

  return {
    id,
    campaignRaw: campaignLabel,
    campaignLabel,
    campaignTime: CAMPAIGN_TIME[campaign],
    location,
    department,
    division: department === "Operations" ? "Field Ops" : department,
    supervisor,
    jobTitle: pick(["Technician", "Analyst", "Specialist", "Coordinator", "Lead"] as const, id),
    fieldCategory,
    leadership: pick(MOCK_LEADERSHIP, id + "lead"),
    generation: pick(MOCK_GENERATIONS, id + "gen"),
    rateType: pick(MOCK_RATE_TYPES, id + "rate"),
    tenure: pick(MOCK_TENURES, id + "tenure"),
    rating: String(Math.floor(seededRandom(id + "rating") * 3) + 3), // 3–5
    scores,
    comments: {
      strengths: "",
      improvement: "",
      supervisor: "",
      acquisition: "",
    },
  };
}

// ─── Generate respondents ─────────────────────────────────────────────────────

const SEGMENTS: Array<Omit<RespondentSpec, "id" | "campaign"> & { count: [number, number] }> = [
  // [dept, location, supervisor, fieldCategory, [currentCount, priorCount]]
  { department: "Operations", location: "Houston",  supervisor: "James Torres",   fieldCategory: "Field",  count: [14, 12] },
  { department: "Operations", location: "Denver",   supervisor: "James Torres",   fieldCategory: "Field",  count: [10, 9]  },
  { department: "Engineering",location: "Denver",   supervisor: "Sarah Mitchell", fieldCategory: "Office", count: [9, 8]   },
  { department: "Engineering",location: "Houston",  supervisor: "Sarah Mitchell", fieldCategory: "Office", count: [7, 6]   },
  { department: "Corporate",  location: "Denver",   supervisor: "Linda Park",     fieldCategory: "Office", count: [8, 7]   },
];

function generateRespondents(): EmployeeExperienceRespondent[] {
  const out: EmployeeExperienceRespondent[] = [];
  let idx = 0;

  for (const seg of SEGMENTS) {
    const { department, location, supervisor, fieldCategory, count } = seg;

    for (const campaign of ["current", "prior"] as const) {
      const n = count[campaign === "current" ? 0 : 1];
      for (let i = 0; i < n; i++) {
        idx++;
        out.push(buildRespondent({
          id: `r-${idx}`,
          campaign,
          department,
          location,
          supervisor,
          fieldCategory,
        }));
      }
    }
  }

  return out;
}

// ─── Voice entries ────────────────────────────────────────────────────────────

const MOCK_VOICE: EmployeeExperienceDashboardData["voice"] = {
  strengths: [
    { id: "s1", respondentId: "r-1", campaign: "June 2025", department: "Operations", location: "Houston", supervisor: "James Torres", text: "The team culture is genuinely collaborative. People show up for each other, especially in the field." },
    { id: "s2", respondentId: "r-5", campaign: "June 2025", department: "Operations", location: "Denver",  supervisor: "James Torres", text: "My supervisor is one of the best I've had. Clear expectations, fair feedback, and he actually listens." },
    { id: "s3", respondentId: "r-20", campaign: "June 2025", department: "Engineering", location: "Denver", supervisor: "Sarah Mitchell", text: "We have real autonomy in how we solve problems. That kind of trust makes a big difference." },
    { id: "s4", respondentId: "r-28", campaign: "June 2025", department: "Corporate", location: "Denver", supervisor: "Linda Park", text: "The organization communicates better than any place I've worked. I always know where things stand." },
    { id: "s5", respondentId: "r-35", campaign: "June 2025", department: "Engineering", location: "Houston", supervisor: "Sarah Mitchell", text: "Work-life balance has improved noticeably. The new scheduling flexibility has made a real difference for my family." },
  ],
  improvement: [
    { id: "i1", respondentId: "r-2",  campaign: "June 2025", department: "Operations", location: "Houston", supervisor: "James Torres", text: "We need better tools in the field. Having to work around outdated software costs us time every single day." },
    { id: "i2", respondentId: "r-12", campaign: "June 2025", department: "Operations", location: "Denver",  supervisor: "James Torres", text: "Workload distribution is uneven. Some teams carry much more than others and there's no mechanism to address it." },
    { id: "i3", respondentId: "r-22", campaign: "June 2025", department: "Engineering", location: "Denver", supervisor: "Sarah Mitchell", text: "Career pathing is opaque. I don't know what it looks like to grow here beyond my current role." },
    { id: "i4", respondentId: "r-30", campaign: "June 2025", department: "Corporate", location: "Denver",   supervisor: "Linda Park", text: "Cross-department communication is still siloed. Big decisions get made without input from the people doing the work." },
    { id: "i5", respondentId: "r-40", campaign: "June 2025", department: "Operations", location: "Houston", supervisor: "James Torres", text: "The on-call requirements have gotten heavier. Balance is the thing I struggle with most right now." },
  ],
  supervisor: [
    { id: "sv1", respondentId: "r-3",  campaign: "June 2025", department: "Operations", location: "Houston", supervisor: "James Torres", text: "James is accessible and honest. He doesn't sugarcoat problems, but he also doesn't leave you without support." },
    { id: "sv2", respondentId: "r-21", campaign: "June 2025", department: "Engineering", location: "Denver", supervisor: "Sarah Mitchell", text: "Sarah advocates loudly for her team. I've seen it firsthand — she pushed back on a decision that would have buried us." },
    { id: "sv3", respondentId: "r-29", campaign: "June 2025", department: "Corporate", location: "Denver",   supervisor: "Linda Park", text: "Linda gives me stretch assignments and then actually invests in helping me succeed. That's rare." },
  ],
  acquisition: [
    { id: "a1", respondentId: "r-4",  campaign: "June 2025", department: "Operations", location: "Houston", supervisor: "James Torres", text: "The acquisition was messy at first, but leadership has done a better job lately of acknowledging what was rough and course-correcting." },
    { id: "a2", respondentId: "r-13", campaign: "June 2025", department: "Operations", location: "Denver",  supervisor: "James Torres", text: "I still feel like a legacy employee in a new world. It would help to have more intentional integration between the two cultures." },
    { id: "a3", respondentId: "r-38", campaign: "June 2025", department: "Engineering", location: "Houston", supervisor: "Sarah Mitchell", text: "Benefits clarity was the hardest part. It took months to get straight answers. I hope that process improves for future hires." },
  ],
};

// ─── Assemble full dataset ────────────────────────────────────────────────────

const respondents = generateRespondents();
const currentR = respondents.filter((r) => r.campaignLabel === "June 2025");
const priorR   = respondents.filter((r) => r.campaignLabel === "December 2024");

function avg(vals: number[]): number {
  if (!vals.length) return 0;
  return vals.reduce((s, v) => s + v, 0) / vals.length;
}

function overallScore(rs: EmployeeExperienceRespondent[]): number {
  const allScores = rs.flatMap((r) =>
    Object.values(r.scores).filter((v): v is number => v !== null)
  );
  return Math.round(avg(allScores) * 100) / 100;
}

const curScore  = overallScore(currentR);
const priorScore = overallScore(priorR);

export const MOCK_DASHBOARD_DATA: EmployeeExperienceDashboardData = {
  meta: {
    organizationName: "Meridian Field Services",
    currentCampaignLabel: "June 2025",
    priorCampaignLabel: "December 2024",
    totalResponses: currentR.length,
    totalCampaigns: 2,
    totalDepartments: 3,
    totalSupervisors: 3,
    campaigns: ["June 2025", "December 2024"],
    dataSourceLabel: "Mock Data · Storybook",
  },

  settings: {
    minimumSegmentSize: 3,
  },

  questions: MOCK_QUESTIONS,
  respondents,

  overview: {
    experienceIndex: curScore,
    previousIndex: priorScore,
    delta: Math.round((curScore - priorScore) * 100) / 100,
    favorablePct: 0.74,
    concernPct: 0.12,
    assessment: "Positive",
    summary: "Scores show incremental improvement led by Daily Work and Engagement dimensions.",
  },

  // The dashboard client computes everything from respondents + questions,
  // so these precomputed fields are provided as stubs only.
  questionMetrics: [],
  dimensionMetrics: [],
  campaignMetrics: [],
  trend: [],
  departmentMetrics: [],
  supervisorMetrics: [],
  locationMetrics: [],
  fieldUnitMetrics: [],
  divisionMetrics: [],
  leadershipMetrics: [],
  heatmaps: {
    campaigns:   { rows: [], columns: [], data: [], rowTotals: {}, columnTotals: {} },
    departments: { rows: [], columns: [], data: [], rowTotals: {}, columnTotals: {} },
    supervisors: { rows: [], columns: [], data: [], rowTotals: {}, columnTotals: {} },
    locations:   { rows: [], columns: [], data: [], rowTotals: {}, columnTotals: {} },
    fieldUnits:  { rows: [], columns: [], data: [], rowTotals: {}, columnTotals: {} },
  },
  departmentReports: [],
  supervisorReports: [],
  fieldUnitReports: [],
  divisionReports: [],
  commentThemes: [],
  voice: MOCK_VOICE,
};

// ─── Variant: minimal dataset (edge-case testing) ─────────────────────────────

/** Only 6 respondents in one campaign — useful for testing minimum-segment guards. */
export const MOCK_MINIMAL_DATA: EmployeeExperienceDashboardData = {
  ...MOCK_DASHBOARD_DATA,
  meta: {
    ...MOCK_DASHBOARD_DATA.meta,
    organizationName: "Minimal Corp",
    priorCampaignLabel: null,
    campaigns: ["June 2025"],
    totalResponses: 6,
    dataSourceLabel: "Minimal Mock · Storybook",
  },
  respondents: respondents.filter((r) => r.campaignLabel === "June 2025").slice(0, 6),
};
