import { readFileSync } from "fs";
import path from "path";
import { getFirebaseAdminStorage } from "@/lib/firebase/admin";
import {
  filterExcludedDefinitions,
  mergeHiddenDimensionIds,
  normalizeDimensionId,
} from "@/lib/employee-experience/excluded-dimensions";
import {
  BRAND_SEGMENT_COLUMN_ALIASES,
  UNKNOWN_BRAND_LABEL,
} from "@/lib/employee-experience/brand-segment";
import type {
  EmployeeExperienceCommentTheme,
  EmployeeExperienceDashboardData,
  EmployeeExperienceDimensionMetric,
  EmployeeExperienceGroupMetric,
  EmployeeExperienceHeatmap,
  EmployeeExperienceQuestionDefinition,
  EmployeeExperienceQuestionMetric,
  EmployeeExperienceRespondent,
  EmployeeExperienceSegmentReport,
  EmployeeExperienceTrendPoint,
  EmployeeExperienceVoiceEntry,
} from "@/types/employee-experience";

const DATABASE_FILE_NAME = "DWSDatabase.csv";
const STATEMENTS_FILE_NAME = "DWS 2024 Campaign Statements.csv";
const DEFAULT_SOURCE_CLIENT_ID = "dws";
const SOURCE_CLIENT_LABELS: Record<string, string> = {
  csg: "Canopy Services Group",
  dws: "Deep Well Services",
};
const SOURCE_CLIENT_FILES: Record<string, { database: string; statements: string }> = {
  csg: {
    database: "Canopy Services Database.csv",
    statements: "Canopy Services Campaign Statements.csv",
  },
};
const DEMO_DATABASE_PATH = path.join(process.cwd(), "src/lib/employee-experience/demo-data/DWSDatabase.csv");
const DEMO_STATEMENTS_PATH = path.join(process.cwd(), "src/lib/employee-experience/demo-data/DWS 2024 Campaign Statements.csv");
const DEMO_HIDDEN_DIMENSION_IDS = ["acquisition"];

const COMMENT_IDS = {
  strengths: 42,
  improvement: 43,
  supervisor: 62,
  acquisition: 80,
} as const;

const COMMENT_THEME_DEFINITIONS = [
  {
    id: "communication",
    label: "Communication & coordination",
    synopsis:
      "Comments repeatedly call for clearer communication, better handoffs, and less confusion across teams and supervisors.",
    keywords: ["commun", "clar", "coord", "meeting", "confus", "report to", "follow through"],
  },
  {
    id: "pay-benefits",
    label: "Pay, per diem & incentives",
    synopsis:
      "A large share of comments focus on pay fairness, field rates, per diem, bonus structure, and overall compensation.",
    keywords: ["pay", "paid", "salary", "wage", "bonus", "per diem", "benefit", "rate"],
  },
  {
    id: "leadership",
    label: "Leadership quality",
    synopsis:
      "Employees differentiate sharply between strong and weak leaders, with the quality of frontline supervision shaping the experience.",
    keywords: ["leader", "leadership", "supervisor", "manager", "boss", "micromanag", "respect"],
  },
  {
    id: "schedule-workload",
    label: "Schedule & workload",
    synopsis:
      "People want a more sustainable schedule, better workload planning, and fewer friction points tied to time away from home.",
    keywords: ["schedule", "hitch", "hours", "overtime", "workload", "home", "family", "time off"],
  },
  {
    id: "tools-resources",
    label: "Tools, resources & support",
    synopsis:
      "Teams are asking for the right tools, equipment, staffing, and operating support to do the work well.",
    keywords: ["tool", "equipment", "resource", "support", "suppl", "inventory", "truck", "room"],
  },
  {
    id: "culture-growth",
    label: "Culture & growth",
    synopsis:
      "The strongest positive comments center on culture, growth, pride, and the sense that DWS can keep building from here.",
    keywords: ["culture", "family", "grow", "growth", "future", "opportun", "pride", "teamwork"],
  },
] as const;

const IGNORED_COMMENT_VALUES = new Set([
  "",
  ".",
  "?",
  "n/a",
  "na",
  "n.a.",
  "dna",
  "none",
  "no",
  "nope",
  "nothing",
]);

type StatementDefinition = EmployeeExperienceQuestionDefinition;
type Respondent = EmployeeExperienceRespondent;

const MINIMUM_SEGMENT_SIZE = 3;

function filterHiddenDefinitions(
  definitions: StatementDefinition[],
  hiddenDimensionIds: string[] = []
) {
  return filterExcludedDefinitions(definitions, hiddenDimensionIds);
}

const SYNTHETIC_DEMO_QUESTIONS: StatementDefinition[] = [
  { itemId: 101, dimension: "Communication", statement: "Leadership keeps employees informed about major changes that affect daily work." },
  { itemId: 102, dimension: "Communication", statement: "Teams receive clear follow-through after important updates or decisions are shared." },
  { itemId: 103, dimension: "Resources", statement: "Employees have the tools and support they need to do quality work consistently." },
  { itemId: 104, dimension: "Resources", statement: "Workload and staffing levels are managed in a way that feels sustainable." },
  { itemId: 105, dimension: "Growth", statement: "Employees understand how they can grow, contribute, and build a future here." },
  { itemId: 106, dimension: "Growth", statement: "The organization is creating a culture people want to stay part of over time." },
  { itemId: 107, dimension: "Supervisor", statement: "My direct supervisor gives useful feedback and follows through when concerns are raised." },
  { itemId: 108, dimension: "Supervisor", statement: "My supervisor treats people fairly and supports day-to-day success." },
];

type SyntheticDemoProfile = {
  id: string;
  department: string;
  location: string;
  division: string;
  supervisor: string;
  jobTitle: string;
  fieldCategory: string;
  leadership: string;
  generation: string;
  rateType: string;
  tenure: string;
  rating: string;
  scoreOffset: number;
};

const SYNTHETIC_DEMO_PROFILES: SyntheticDemoProfile[] = [
  {
    id: "atlas-fo-01",
    department: "Field Operations",
    location: "Odessa",
    division: "Field",
    supervisor: "Maria Patel",
    jobTitle: "Field Lead",
    fieldCategory: "Operations",
    leadership: "Frontline",
    generation: "Millennial",
    rateType: "Salary",
    tenure: "2-5 Years",
    rating: "Strong",
    scoreOffset: 0.1,
  },
  {
    id: "atlas-fo-02",
    department: "Field Operations",
    location: "Odessa",
    division: "Field",
    supervisor: "Maria Patel",
    jobTitle: "Operator",
    fieldCategory: "Operations",
    leadership: "Frontline",
    generation: "Gen X",
    rateType: "Hourly",
    tenure: "1-2 Years",
    rating: "Steady",
    scoreOffset: -0.1,
  },
  {
    id: "atlas-fo-03",
    department: "Field Operations",
    location: "Odessa",
    division: "Field",
    supervisor: "Maria Patel",
    jobTitle: "Operator",
    fieldCategory: "Operations",
    leadership: "Frontline",
    generation: "Millennial",
    rateType: "Hourly",
    tenure: "5-10 Years",
    rating: "Strong",
    scoreOffset: 0.05,
  },
  {
    id: "atlas-fo-04",
    department: "Field Operations",
    location: "Odessa",
    division: "Field",
    supervisor: "Maria Patel",
    jobTitle: "Coordinator",
    fieldCategory: "Operations",
    leadership: "Frontline",
    generation: "Gen Z",
    rateType: "Salary",
    tenure: "0-1 Years",
    rating: "Developing",
    scoreOffset: -0.05,
  },
  {
    id: "atlas-mx-01",
    department: "Maintenance",
    location: "Midland",
    division: "Field",
    supervisor: "James Carter",
    jobTitle: "Maintenance Lead",
    fieldCategory: "Service",
    leadership: "Frontline",
    generation: "Gen X",
    rateType: "Salary",
    tenure: "5-10 Years",
    rating: "Strong",
    scoreOffset: 0.08,
  },
  {
    id: "atlas-mx-02",
    department: "Maintenance",
    location: "Midland",
    division: "Field",
    supervisor: "James Carter",
    jobTitle: "Technician",
    fieldCategory: "Service",
    leadership: "Frontline",
    generation: "Millennial",
    rateType: "Hourly",
    tenure: "2-5 Years",
    rating: "Steady",
    scoreOffset: -0.06,
  },
  {
    id: "atlas-mx-03",
    department: "Maintenance",
    location: "Midland",
    division: "Field",
    supervisor: "James Carter",
    jobTitle: "Technician",
    fieldCategory: "Service",
    leadership: "Frontline",
    generation: "Gen Z",
    rateType: "Hourly",
    tenure: "1-2 Years",
    rating: "Developing",
    scoreOffset: -0.12,
  },
  {
    id: "atlas-mx-04",
    department: "Maintenance",
    location: "Midland",
    division: "Field",
    supervisor: "James Carter",
    jobTitle: "Planner",
    fieldCategory: "Service",
    leadership: "Frontline",
    generation: "Millennial",
    rateType: "Salary",
    tenure: "2-5 Years",
    rating: "Strong",
    scoreOffset: 0.04,
  },
  {
    id: "atlas-cs-01",
    department: "Corporate Services",
    location: "Remote",
    division: "Corporate",
    supervisor: "Elena Brooks",
    jobTitle: "HR Business Partner",
    fieldCategory: "Support",
    leadership: "Corporate",
    generation: "Millennial",
    rateType: "Salary",
    tenure: "2-5 Years",
    rating: "Strong",
    scoreOffset: 0.12,
  },
  {
    id: "atlas-cs-02",
    department: "Corporate Services",
    location: "Remote",
    division: "Corporate",
    supervisor: "Elena Brooks",
    jobTitle: "People Operations Analyst",
    fieldCategory: "Support",
    leadership: "Corporate",
    generation: "Gen X",
    rateType: "Salary",
    tenure: "5-10 Years",
    rating: "Strong",
    scoreOffset: 0.02,
  },
  {
    id: "atlas-cs-03",
    department: "Corporate Services",
    location: "Remote",
    division: "Corporate",
    supervisor: "Elena Brooks",
    jobTitle: "Finance Associate",
    fieldCategory: "Support",
    leadership: "Corporate",
    generation: "Millennial",
    rateType: "Salary",
    tenure: "1-2 Years",
    rating: "Steady",
    scoreOffset: -0.04,
  },
  {
    id: "atlas-cs-04",
    department: "Corporate Services",
    location: "Remote",
    division: "Corporate",
    supervisor: "Elena Brooks",
    jobTitle: "Recruiter",
    fieldCategory: "Support",
    leadership: "Corporate",
    generation: "Gen Z",
    rateType: "Salary",
    tenure: "0-1 Years",
    rating: "Developing",
    scoreOffset: -0.08,
  },
];

const SYNTHETIC_DEMO_BASE_SCORES: Record<string, number[]> = {
  "Field Operations": [6.7, 6.6, 6.9, 6.6, 6.8, 6.9, 6.7, 6.8],
  Maintenance: [6.5, 6.4, 6.6, 6.3, 6.5, 6.6, 6.4, 6.5],
  "Corporate Services": [7.0, 6.9, 7.1, 6.8, 7.0, 7.1, 7.2, 7.1],
};

async function readCsvFromStorage(storagePath: string) {
  const bucket = getFirebaseAdminStorage().bucket();
  const [buffer] = await bucket.file(storagePath).download();
  return buffer.toString("utf8").replace(/^\uFEFF/, "");
}

function readCsvFromDemoFile(filePath: string) {
  return readFileSync(filePath, "utf8").replace(/^\uFEFF/, "");
}

function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index++) {
    const char = text[index];
    const nextChar = text[index + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentField += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      currentRow.push(currentField.trim());
      currentField = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && nextChar === "\n") {
        index += 1;
      }
      currentRow.push(currentField.trim());
      rows.push(currentRow);
      currentRow = [];
      currentField = "";
      continue;
    }

    currentField += char;
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    rows.push(currentRow);
  }

  return rows;
}

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

function average(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function pct(count: number, total: number) {
  if (total === 0) return 0;
  return round2((count / total) * 100);
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeLabel(value: string | undefined, fallback: string) {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : fallback;
}

function normalizeScore(rawValue: string | undefined): number | null {
  if (!rawValue) return null;
  const parsed = Number.parseFloat(rawValue);
  return Number.isFinite(parsed) ? Math.round(parsed) / 10 : null;
}

const MONTH_INDEX: Record<string, number> = {
  jan: 0,
  feb: 1,
  mar: 2,
  apr: 3,
  may: 4,
  jun: 5,
  jul: 6,
  aug: 7,
  sep: 8,
  oct: 9,
  nov: 10,
  dec: 11,
};

function parseCampaignDate(rawValue: string) {
  const trimmed = rawValue.trim();
  if (!trimmed) {
    return { time: 0, label: "Unknown Campaign" };
  }

  if (trimmed.includes("/")) {
    const [monthText, dayText, yearText] = trimmed.split("/");
    const month = Number.parseInt(monthText ?? "", 10) - 1;
    const day = Number.parseInt(dayText ?? "", 10);
    const year = Number.parseInt(yearText ?? "", 10);

    if (Number.isFinite(month) && Number.isFinite(day) && Number.isFinite(year)) {
      const date = new Date(year, month, day);
      return {
        time: date.getTime(),
        label: trimmed,
      };
    }
  }

  const monYear = trimmed.match(/^([A-Za-z]+)-(\d{2})$/);
  if (monYear) {
    const month = MONTH_INDEX[monYear[1].slice(0, 3).toLowerCase()];
    const year = 2000 + Number.parseInt(monYear[2], 10);
    if (month !== undefined) {
      return { time: new Date(year, month, 1).getTime(), label: trimmed };
    }
  }

  const yearMonth = trimmed.match(/^(\d{2})-([A-Za-z]{3})$/);
  if (yearMonth) {
    const year = 2000 + Number.parseInt(yearMonth[1], 10);
    const month = MONTH_INDEX[yearMonth[2].toLowerCase()];
    if (month !== undefined) {
      return { time: new Date(year, month, 1).getTime(), label: trimmed };
    }
  }

  return { time: 0, label: trimmed };
}

function getRespondentScore(row: string[], itemId: number, getValue: (row: string[], field: string) => string) {
  const prefixed = getValue(row, `item:${itemId}`);
  if (prefixed) {
    return normalizeScore(prefixed);
  }

  return normalizeScore(getValue(row, String(itemId)));
}

function isUsableComment(value: string) {
  const normalized = value.trim().toLowerCase();
  return normalized.length > 0 && !IGNORED_COMMENT_VALUES.has(normalized);
}

function questionAverage(respondents: Respondent[], itemId: number) {
  const values = respondents
    .map((respondent) => respondent.scores[itemId])
    .filter((value): value is number => value !== null);

  return values.length > 0 ? round2(average(values)) : 0;
}

function favorablePctForQuestion(respondents: Respondent[], itemId: number) {
  const values = respondents
    .map((respondent) => respondent.scores[itemId])
    .filter((value): value is number => value !== null);

  return pct(
    values.filter((value) => value >= 67).length,
    values.length
  );
}

function overallScore(respondents: Respondent[], itemIds: number[]) {
  const respondentScores = respondents
    .map((respondent) => {
      const values = itemIds
        .map((itemId) => respondent.scores[itemId])
        .filter((value): value is number => value !== null);
      return values.length > 0 ? average(values) : null;
    })
    .filter((value): value is number => value !== null);

  return respondentScores.length > 0 ? round2(average(respondentScores)) : 0;
}

function favorablePctOverall(respondents: Respondent[], itemIds: number[]) {
  const values = respondents.flatMap((respondent) =>
    itemIds
      .map((itemId) => respondent.scores[itemId])
      .filter((value): value is number => value !== null)
  );
  return pct(
    values.filter((value) => value >= 67).length,
    values.length
  );
}

function concernPctOverall(respondents: Respondent[], itemIds: number[]) {
  const values = respondents.flatMap((respondent) =>
    itemIds
      .map((itemId) => respondent.scores[itemId])
      .filter((value): value is number => value !== null)
  );
  return pct(
    values.filter((value) => value <= 34).length,
    values.length
  );
}

function buildDimensionMetrics(
  definitions: StatementDefinition[],
  currentRespondents: Respondent[],
  priorRespondents: Respondent[]
): EmployeeExperienceDimensionMetric[] {
  const grouped = new Map<string, StatementDefinition[]>();

  definitions.forEach((definition) => {
    const existing = grouped.get(definition.dimension) ?? [];
    existing.push(definition);
    grouped.set(definition.dimension, existing);
  });

  return Array.from(grouped.entries())
    .map(([dimension, items]) => {
      const itemIds = items.map((item) => item.itemId);
      const score = overallScore(currentRespondents, itemIds);
      const previousScore = priorRespondents.length > 0 ? overallScore(priorRespondents, itemIds) : null;

      return {
        id: slugify(dimension),
        label: dimension,
        score,
        previousScore,
        delta: previousScore === null ? null : round2(score - previousScore),
        questionIds: items.map((item) => `item-${item.itemId}`),
      };
    })
    .sort((left, right) => right.score - left.score || left.label.localeCompare(right.label));
}

function buildQuestionMetrics(
  definitions: StatementDefinition[],
  currentRespondents: Respondent[],
  priorRespondents: Respondent[]
): EmployeeExperienceQuestionMetric[] {
  return definitions
    .map((definition) => {
      const score = questionAverage(currentRespondents, definition.itemId);
      const previousScore =
        priorRespondents.length > 0 ? questionAverage(priorRespondents, definition.itemId) : null;
      const responseCount = currentRespondents.filter(
        (respondent) => respondent.scores[definition.itemId] !== null
      ).length;

      return {
        id: `item-${definition.itemId}`,
        itemId: definition.itemId,
        dimension: definition.dimension,
        statement: definition.statement,
        score,
        previousScore,
        delta: previousScore === null ? null : round2(score - previousScore),
        responseCount,
        favorablePct: favorablePctForQuestion(currentRespondents, definition.itemId),
      };
    })
    .sort((left, right) => left.score - right.score || left.itemId - right.itemId);
}

function buildGroupMetrics(
  respondents: Respondent[],
  priorRespondents: Respondent[],
  itemIds: number[],
  accessor: (respondent: Respondent) => string,
  minRespondents = 1
): EmployeeExperienceGroupMetric[] {
  const currentGroups = new Map<string, Respondent[]>();
  const priorGroups = new Map<string, Respondent[]>();

  respondents.forEach((respondent) => {
    const label = accessor(respondent);
    const existing = currentGroups.get(label) ?? [];
    existing.push(respondent);
    currentGroups.set(label, existing);
  });

  priorRespondents.forEach((respondent) => {
    const label = accessor(respondent);
    const existing = priorGroups.get(label) ?? [];
    existing.push(respondent);
    priorGroups.set(label, existing);
  });

  return Array.from(currentGroups.entries())
    .filter(([, groupRespondents]) => groupRespondents.length >= minRespondents)
    .map(([label, groupRespondents]) => {
      const previousGroup = priorGroups.get(label) ?? [];
      const score = overallScore(groupRespondents, itemIds);
      const previousScore = previousGroup.length > 0 ? overallScore(previousGroup, itemIds) : null;

      return {
        id: slugify(label),
        label,
        score,
        previousScore,
        delta: previousScore === null ? null : round2(score - previousScore),
        respondentCount: groupRespondents.length,
      };
    })
    .sort((left, right) => right.score - left.score || right.respondentCount - left.respondentCount);
}

function buildDimensionHeatmap(
  dimensions: string[],
  columns: string[],
  values: Record<string, Record<string, number>>
): EmployeeExperienceHeatmap {
  const data = dimensions.map((dimension) => ({
    department: dimension,
    scores: Object.fromEntries(columns.map((column) => [column, values[dimension]?.[column] ?? null])),
  }));

  const rowTotals = Object.fromEntries(
    dimensions.map((dimension) => {
      const scores = columns
        .map((column) => values[dimension]?.[column])
        .filter((value): value is number => typeof value === "number");
      return [dimension, scores.length > 0 ? round2(average(scores)) : 0];
    })
  );

  const columnTotals = Object.fromEntries(
    columns.map((column) => {
      const scores = dimensions
        .map((dimension) => values[dimension]?.[column])
        .filter((value): value is number => typeof value === "number");
      return [column, scores.length > 0 ? round2(average(scores)) : 0];
    })
  );

  return {
    rows: dimensions,
    columns,
    data,
    rowTotals,
    columnTotals,
  };
}

function buildHeatmapForGroups(
  dimensions: EmployeeExperienceDimensionMetric[],
  definitions: StatementDefinition[],
  respondents: Respondent[],
  accessor: (respondent: Respondent) => string,
  minRespondents = 1
) {
  const groupedRespondents = new Map<string, Respondent[]>();

  respondents.forEach((respondent) => {
    const label = accessor(respondent);
    const existing = groupedRespondents.get(label) ?? [];
    existing.push(respondent);
    groupedRespondents.set(label, existing);
  });

  const columns = Array.from(groupedRespondents.entries())
    .filter(([, groupRespondents]) => groupRespondents.length >= minRespondents)
    .sort((left, right) => right[1].length - left[1].length || left[0].localeCompare(right[0]))
    .map(([label]) => label);

  const values = Object.fromEntries(
    dimensions.map((dimension) => {
      const itemIds = definitions
        .filter((definition) => definition.dimension === dimension.label)
        .map((definition) => definition.itemId);

      return [
        dimension.label,
        Object.fromEntries(
          columns.map((column) => {
            const groupRespondents = groupedRespondents.get(column) ?? [];
            return [column, overallScore(groupRespondents, itemIds)];
          })
        ),
      ];
    })
  ) as Record<string, Record<string, number>>;

  return buildDimensionHeatmap(
    dimensions.map((dimension) => dimension.label),
    columns,
    values
  );
}

function buildCampaignHeatmap(
  dimensions: EmployeeExperienceDimensionMetric[],
  definitions: StatementDefinition[],
  respondents: Respondent[],
  campaigns: string[]
) {
  const groupedCampaigns = new Map<string, Respondent[]>();

  respondents.forEach((respondent) => {
    const existing = groupedCampaigns.get(respondent.campaignLabel) ?? [];
    existing.push(respondent);
    groupedCampaigns.set(respondent.campaignLabel, existing);
  });

  const values = Object.fromEntries(
    dimensions.map((dimension) => {
      const itemIds = definitions
        .filter((definition) => definition.dimension === dimension.label)
        .map((definition) => definition.itemId);

      return [
        dimension.label,
        Object.fromEntries(
          campaigns.map((campaign) => {
            const campaignRespondents = groupedCampaigns.get(campaign) ?? [];
            return [campaign, overallScore(campaignRespondents, itemIds)];
          })
        ),
      ];
    })
  ) as Record<string, Record<string, number>>;

  return buildDimensionHeatmap(
    dimensions.map((dimension) => dimension.label),
    campaigns,
    values
  );
}

function buildSegmentReports(
  definitions: StatementDefinition[],
  currentRespondents: Respondent[],
  priorRespondents: Respondent[],
  accessor: (respondent: Respondent) => string,
  minRespondents = 3
): EmployeeExperienceSegmentReport[] {
  const itemIds = definitions.map((definition) => definition.itemId);
  const currentGroups = new Map<string, Respondent[]>();
  const priorGroups = new Map<string, Respondent[]>();

  currentRespondents.forEach((respondent) => {
    const label = accessor(respondent);
    const existing = currentGroups.get(label) ?? [];
    existing.push(respondent);
    currentGroups.set(label, existing);
  });

  priorRespondents.forEach((respondent) => {
    const label = accessor(respondent);
    const existing = priorGroups.get(label) ?? [];
    existing.push(respondent);
    priorGroups.set(label, existing);
  });

  return Array.from(currentGroups.entries())
    .filter(([, groupRespondents]) => groupRespondents.length >= minRespondents)
    .map(([label, groupRespondents]) => {
      const priorGroup = priorGroups.get(label) ?? [];
      const score = overallScore(groupRespondents, itemIds);
      const previousScore = priorGroup.length > 0 ? overallScore(priorGroup, itemIds) : null;

      return {
        label,
        respondentCount: groupRespondents.length,
        score,
        previousScore,
        delta: previousScore === null ? null : round2(score - previousScore),
        dimensionMetrics: buildDimensionMetrics(definitions, groupRespondents, priorGroup),
        questionMetrics: buildQuestionMetrics(definitions, groupRespondents, priorGroup),
      };
    })
    .sort((left, right) => right.score - left.score || right.respondentCount - left.respondentCount);
}

function buildVoiceEntries(
  respondents: Respondent[],
  key: keyof typeof COMMENT_IDS
): EmployeeExperienceVoiceEntry[] {
  return respondents
    .map((respondent) => {
      const text = respondent.comments[key];
      return {
        id: `${respondent.id}-${key}`,
        respondentId: respondent.id,
        campaign: respondent.campaignLabel,
        department: respondent.department,
        location: respondent.location,
        supervisor: respondent.supervisor,
        text,
      };
    })
    .filter((entry) => isUsableComment(entry.text));
}

function buildCommentThemes(entries: EmployeeExperienceVoiceEntry[]): EmployeeExperienceCommentTheme[] {
  return COMMENT_THEME_DEFINITIONS.map((theme) => {
    const matched = entries.filter((entry) => {
      const text = entry.text.toLowerCase();
      return theme.keywords.some((keyword) => text.includes(keyword));
    });

    return {
      id: theme.id,
      label: theme.label,
      mentionCount: matched.length,
      synopsis: theme.synopsis,
      sample: matched.slice(0, 3).map((entry) => entry.text),
    };
  })
    .filter((theme) => theme.mentionCount > 0)
    .sort((left, right) => right.mentionCount - left.mentionCount)
    .slice(0, 6);
}

function parseStatements(statementsCsvText: string) {
  const rows = parseCSV(statementsCsvText);
  const headers = rows[0] ?? [];
  const headerIndex = new Map(headers.map((header, index) => [header.trim().toLowerCase(), index]));
  const getValue = (row: string[], names: string[], fallbackIndex: number) => {
    const index = names
      .map((name) => headerIndex.get(name.toLowerCase()))
      .find((candidate): candidate is number => typeof candidate === "number");

    return row[index ?? fallbackIndex] ?? "";
  };

  return rows
    .slice(1)
    .map((row) => ({
      itemId: Number.parseInt(getValue(row, ["item", "item id", "itemId", "id"], 0), 10),
      dimension: normalizeLabel(getValue(row, ["index", "dimension"], 1), "Uncategorized"),
      statement: normalizeLabel(getValue(row, ["statement", "question", "item text"], 2), "Untitled statement"),
    }))
    .filter(
      (row) =>
        Number.isFinite(row.itemId) &&
        row.dimension !== "Comment" &&
        row.dimension !== "Ownership" &&
        row.statement.length > 0
    );
}

function parseRespondents(definitions: StatementDefinition[], databaseCsvText: string) {
  const rows = parseCSV(databaseCsvText);
  const headers = rows[0] ?? [];
  const records = rows.slice(1);
  const headerIndex = new Map(headers.map((header, index) => [header, index]));
  const questionIds = definitions.map((definition) => definition.itemId);

  const getValue = (row: string[], field: string) => {
    const index = headerIndex.get(field);
    return typeof index === "number" ? row[index] ?? "" : "";
  };

  const resolveHeaderIndex = (names: string[]) => {
    for (const name of names) {
      const direct = headerIndex.get(name);
      if (typeof direct === "number") return direct;
      const lower = name.toLowerCase();
      for (const [header, index] of headerIndex.entries()) {
        if (header.toLowerCase() === lower) return index;
      }
    }
    return undefined;
  };

  const getAliasedValue = (row: string[], names: string[]) => {
    const index = resolveHeaderIndex(names);
    return typeof index === "number" ? row[index] ?? "" : "";
  };

  return records
    .filter((row) => {
      const status = getAliasedValue(row, ["Status"]).trim().toLowerCase();
      if (!status) return true;
      return status === "complete";
    })
    .map((row) => {
      const campaignRaw = normalizeLabel(getAliasedValue(row, ["Campaign"]), "Unknown Campaign");
      const campaign = parseCampaignDate(campaignRaw);
      const scores = Object.fromEntries(
        questionIds.map((itemId) => [itemId, getRespondentScore(row, itemId, getValue)])
      ) as Record<number, number | null>;

      return {
        id: normalizeLabel(getAliasedValue(row, ["ID"]), `row-${Math.random().toString(36).slice(2, 8)}`),
        campaignRaw,
        campaignLabel: campaign.label,
        campaignTime: campaign.time,
        location: normalizeLabel(getAliasedValue(row, [...BRAND_SEGMENT_COLUMN_ALIASES]), UNKNOWN_BRAND_LABEL),
        department: normalizeLabel(getValue(row, "Department"), "Unknown Department"),
        division: normalizeLabel(getValue(row, "Division"), "Unknown Division"),
        supervisor: normalizeLabel(getValue(row, "Supervisor"), "Unknown Supervisor"),
        jobTitle: normalizeLabel(getValue(row, "Job Title"), "Unknown Job Title"),
        fieldCategory: normalizeLabel(getValue(row, "Field Category"), "Unspecified"),
        leadership: normalizeLabel(getValue(row, "Leadership"), "Unspecified"),
        generation: normalizeLabel(getValue(row, "Generation"), "Unspecified"),
        rateType: normalizeLabel(getValue(row, "Rate Type"), "Unspecified"),
        tenure: normalizeLabel(getValue(row, "Tenure"), "Unspecified"),
        rating: normalizeLabel(getValue(row, "Rating"), "Unspecified"),
        scores,
        comments: {
          strengths: normalizeLabel(getValue(row, `item:${COMMENT_IDS.strengths}`), ""),
          improvement: normalizeLabel(getValue(row, `item:${COMMENT_IDS.improvement}`), ""),
          supervisor: normalizeLabel(getValue(row, `item:${COMMENT_IDS.supervisor}`), ""),
          acquisition: normalizeLabel(getValue(row, `item:${COMMENT_IDS.acquisition}`), ""),
        },
      };
    })
    .filter((respondent) => questionIds.some((itemId) => respondent.scores[itemId] !== null))
    .sort((left, right) => left.campaignTime - right.campaignTime || left.id.localeCompare(right.id));
}

function clampSyntheticScore(value: number) {
  return round2(Math.max(6.1, Math.min(8.4, value)));
}

function buildSyntheticComment(
  profile: SyntheticDemoProfile,
  campaignIndex: number,
  kind: keyof Respondent["comments"]
) {
  const improvementPhrase =
    campaignIndex === 0
      ? "We need clearer communication and more consistent leadership visibility during the transition."
      : "Communication is improving, but clearer updates and faster follow through would still help.";
  const supportPhrase =
    campaignIndex === 0
      ? "The team needs more tools, staffing support, and better workload planning."
      : "Support is stronger now, though schedule planning and resources can keep improving.";

  switch (kind) {
    case "strengths":
      if (profile.department === "Corporate Services") {
        return "The culture feels more supportive, leadership is visible, and the team is working together well.";
      }
      return "People appreciate the teamwork, stronger support, and the clearer direction from leadership.";
    case "improvement":
      return `${improvementPhrase} ${supportPhrase}`;
    case "supervisor":
      return campaignIndex === 0
        ? `${profile.supervisor} is respected, but employees want more coaching, clearer expectations, and better follow through.`
        : `${profile.supervisor} is showing stronger communication and support, and the team wants that consistency to continue.`;
    case "acquisition":
      return campaignIndex === 0
        ? "The integration process created confusion at first, but employees see opportunity if communication and trust keep improving."
        : "The change process feels more organized now, and employees are more confident about the future and growth opportunities.";
    default:
      return "";
  }
}

function buildSyntheticDemoRespondents(): Respondent[] {
  const campaigns = [
    { raw: "3/15/2025", departmentShift: 0, scoreShift: 0 },
    { raw: "9/15/2025", departmentShift: 0.18, scoreShift: 0.22 },
  ];

  return campaigns.flatMap((campaign, campaignIndex) => {
    const campaignInfo = parseCampaignDate(campaign.raw);

    return SYNTHETIC_DEMO_PROFILES.map((profile, profileIndex) => {
      const departmentScores = SYNTHETIC_DEMO_BASE_SCORES[profile.department] ?? SYNTHETIC_DEMO_BASE_SCORES["Field Operations"];
      const questionScores = Object.fromEntries(
        SYNTHETIC_DEMO_QUESTIONS.map((question, questionIndex) => {
          const questionBias =
            question.dimension === "Supervisor"
              ? 0.1
              : question.dimension === "Resources"
                ? -0.05
                : 0;
          const score =
            departmentScores[questionIndex] +
            campaign.scoreShift +
            (question.dimension === "Communication" ? campaign.departmentShift / 2 : campaign.departmentShift) +
            profile.scoreOffset +
            ((profileIndex % 3) - 1) * 0.03 +
            questionBias;

          return [question.itemId, clampSyntheticScore(score)];
        })
      ) as Record<number, number | null>;

      return {
        id: `${profile.id}-${campaignIndex + 1}`,
        campaignRaw: campaign.raw,
        campaignLabel: campaignInfo.label,
        campaignTime: campaignInfo.time,
        location: profile.location,
        department: profile.department,
        division: profile.division,
        supervisor: profile.supervisor,
        jobTitle: profile.jobTitle,
        fieldCategory: profile.fieldCategory,
        leadership: profile.leadership,
        generation: profile.generation,
        rateType: profile.rateType,
        tenure: profile.tenure,
        rating: profile.rating,
        scores: questionScores,
        comments: {
          strengths: buildSyntheticComment(profile, campaignIndex, "strengths"),
          improvement: buildSyntheticComment(profile, campaignIndex, "improvement"),
          supervisor: buildSyntheticComment(profile, campaignIndex, "supervisor"),
          acquisition: buildSyntheticComment(profile, campaignIndex, "acquisition"),
        },
      } satisfies Respondent;
    });
  });
}

function buildEmployeeExperienceDashboardData({
  organizationName,
  dataSourceLabel,
  definitions,
  respondents,
  hiddenDimensionIds = [],
}: {
  organizationName: string;
  dataSourceLabel: string;
  definitions: StatementDefinition[];
  respondents: Respondent[];
  hiddenDimensionIds?: string[];
}): EmployeeExperienceDashboardData {
  const effectiveHiddenDimensionIds = mergeHiddenDimensionIds(hiddenDimensionIds);
  const visibleDefinitions = filterHiddenDefinitions(definitions, hiddenDimensionIds);
  const itemIds = visibleDefinitions.map((definition) => definition.itemId);
  const campaigns = Array.from(
    new Map(
      respondents.map((respondent) => [respondent.campaignLabel, respondent.campaignTime])
    ).entries()
  )
    .sort((left, right) => left[1] - right[1])
    .map(([label]) => label);

  const currentCampaignLabel = campaigns[campaigns.length - 1] ?? "Current";
  const priorCampaignLabel = campaigns[campaigns.length - 2] ?? null;

  const currentRespondents = respondents.filter(
    (respondent) => respondent.campaignLabel === currentCampaignLabel
  );
  const priorRespondents = priorCampaignLabel
    ? respondents.filter((respondent) => respondent.campaignLabel === priorCampaignLabel)
    : [];

  const overviewScore = overallScore(currentRespondents, itemIds);
  const previousScore = priorRespondents.length > 0 ? overallScore(priorRespondents, itemIds) : null;
  const questionMetrics = buildQuestionMetrics(visibleDefinitions, currentRespondents, priorRespondents);
  const dimensionMetrics = buildDimensionMetrics(visibleDefinitions, currentRespondents, priorRespondents);

  const campaignMetrics = campaigns.map((campaignLabel, index) => {
    const campaignRespondents = respondents.filter(
      (respondent) => respondent.campaignLabel === campaignLabel
    );

    return {
      id: slugify(campaignLabel),
      label: campaignLabel,
      score: overallScore(campaignRespondents, itemIds),
      respondentCount: campaignRespondents.length,
      order: index,
    };
  });

  const trend: EmployeeExperienceTrendPoint[] = campaigns.map((campaignLabel, index) => {
    const campaignRespondents = respondents.filter(
      (respondent) => respondent.campaignLabel === campaignLabel
    );

    const trendPoint: EmployeeExperienceTrendPoint = {
      label: campaignLabel,
      order: index,
      overall: overallScore(campaignRespondents, itemIds),
    };

    dimensionMetrics.forEach((dimension) => {
      const dimensionItemIds = visibleDefinitions
        .filter((definition) => definition.dimension === dimension.label)
        .map((definition) => definition.itemId);

      trendPoint[dimension.id] = overallScore(campaignRespondents, dimensionItemIds);
    });

    return trendPoint;
  });

  const departmentMetrics = buildGroupMetrics(
    currentRespondents,
    priorRespondents,
    itemIds,
    (respondent) => respondent.department,
    MINIMUM_SEGMENT_SIZE
  );
  const supervisorMetrics = buildGroupMetrics(
    currentRespondents,
    priorRespondents,
    itemIds,
    (respondent) => respondent.supervisor,
    MINIMUM_SEGMENT_SIZE
  );
  const locationMetrics = buildGroupMetrics(
    currentRespondents,
    priorRespondents,
    itemIds,
    (respondent) => respondent.location,
    3
  );
  const fieldUnitMetrics = buildGroupMetrics(
    currentRespondents.filter((respondent) => respondent.division === "Field"),
    priorRespondents.filter((respondent) => respondent.division === "Field"),
    itemIds,
    (respondent) => respondent.department,
    MINIMUM_SEGMENT_SIZE
  );
  const divisionMetrics = buildGroupMetrics(
    currentRespondents,
    priorRespondents,
    itemIds,
    (respondent) => respondent.division,
    3
  );
  const leadershipMetrics = buildGroupMetrics(
    currentRespondents,
    priorRespondents,
    itemIds,
    (respondent) => respondent.leadership,
    3
  );

  const departmentReports = buildSegmentReports(
    visibleDefinitions,
    currentRespondents,
    priorRespondents,
    (respondent) => respondent.department,
    MINIMUM_SEGMENT_SIZE
  );
  const supervisorReports = buildSegmentReports(
    visibleDefinitions,
    currentRespondents,
    priorRespondents,
    (respondent) => respondent.supervisor,
    MINIMUM_SEGMENT_SIZE
  );
  const fieldUnitReports = buildSegmentReports(
    visibleDefinitions,
    currentRespondents.filter((respondent) => respondent.division === "Field"),
    priorRespondents.filter((respondent) => respondent.division === "Field"),
    (respondent) => respondent.department,
    MINIMUM_SEGMENT_SIZE
  );
  const divisionReports = buildSegmentReports(
    visibleDefinitions,
    currentRespondents,
    priorRespondents,
    (respondent) => respondent.division,
    3
  );

  const strengths = buildVoiceEntries(currentRespondents, "strengths");
  const improvement = buildVoiceEntries(currentRespondents, "improvement");
  const supervisor = buildVoiceEntries(currentRespondents, "supervisor");
  const acquisition = buildVoiceEntries(currentRespondents, "acquisition");

  const strongestQuestion = questionMetrics
    .slice()
    .sort((left, right) => right.score - left.score)[0];
  const weakestQuestion = questionMetrics[0];

  return {
    meta: {
      organizationName,
      currentCampaignLabel,
      priorCampaignLabel,
      totalResponses: currentRespondents.length,
      totalCampaigns: campaigns.length,
      totalDepartments: new Set(currentRespondents.map((respondent) => respondent.department)).size,
      totalSupervisors: new Set(currentRespondents.map((respondent) => respondent.supervisor)).size,
      campaigns,
      dataSourceLabel,
    },
    settings: {
      minimumSegmentSize: MINIMUM_SEGMENT_SIZE,
      hiddenDimensionIds: effectiveHiddenDimensionIds,
    },
    questions: visibleDefinitions,
    respondents,
    overview: {
      experienceIndex: overviewScore,
      previousIndex: previousScore,
      delta: previousScore === null ? null : round2(overviewScore - previousScore),
      favorablePct: favorablePctOverall(currentRespondents, itemIds),
      concernPct: concernPctOverall(currentRespondents, itemIds),
      assessment: buildAssessment(overviewScore),
      summary: buildSummary(dimensionMetrics, strongestQuestion, weakestQuestion),
    },
    questionMetrics,
    dimensionMetrics,
    campaignMetrics,
    trend,
    departmentMetrics,
    supervisorMetrics,
    locationMetrics,
    fieldUnitMetrics,
    divisionMetrics,
    leadershipMetrics,
    heatmaps: {
      campaigns: buildCampaignHeatmap(dimensionMetrics, visibleDefinitions, respondents, campaigns),
      departments: buildHeatmapForGroups(
        dimensionMetrics,
        visibleDefinitions,
        currentRespondents,
        (respondent) => respondent.department,
        MINIMUM_SEGMENT_SIZE
      ),
      supervisors: buildHeatmapForGroups(
        dimensionMetrics,
        visibleDefinitions,
        currentRespondents,
        (respondent) => respondent.supervisor,
        MINIMUM_SEGMENT_SIZE
      ),
      locations: buildHeatmapForGroups(
        dimensionMetrics,
        visibleDefinitions,
        currentRespondents,
        (respondent) => respondent.location,
        3
      ),
      fieldUnits: buildHeatmapForGroups(
        dimensionMetrics,
        visibleDefinitions,
        currentRespondents.filter((respondent) => respondent.division === "Field"),
        (respondent) => respondent.department,
        MINIMUM_SEGMENT_SIZE
      ),
    },
    departmentReports,
    supervisorReports,
    fieldUnitReports,
    divisionReports,
    commentThemes: buildCommentThemes([
      ...strengths,
      ...improvement,
      ...supervisor,
      ...acquisition,
    ]),
    voice: {
      strengths,
      improvement,
      supervisor,
      acquisition,
    },
  };
}

function buildAssessment(score: number) {
  if (score < 55) return "Employee experience is under visible strain.";
  if (score < 67) return "Employee experience is workable, but fragile in key places.";
  if (score < 78) return "Employee experience is broadly positive with clear pressure pockets.";
  return "Employee experience is landing strongly overall.";
}

function buildSummary(
  dimensions: EmployeeExperienceDimensionMetric[],
  strongestQuestion: EmployeeExperienceQuestionMetric | undefined,
  weakestQuestion: EmployeeExperienceQuestionMetric | undefined
) {
  const topDimension = dimensions[0];
  const bottomDimension = dimensions[dimensions.length - 1];

  return `${topDimension?.label ?? "The strongest dimension"} is currently the warmest part of the story, while ${bottomDimension?.label ?? "the coldest dimension"} remains the main drag. At the statement level, ${strongestQuestion?.statement.toLowerCase() ?? "the strongest signal"} is holding up better than ${weakestQuestion?.statement.toLowerCase() ?? "the weakest signal"}, which gives leaders a clearer path for where to protect momentum versus where to intervene.`;
}

export async function loadDwsEmployeeExperienceDashboardData({
  demo = false,
  hiddenDimensionIds,
  sourceClientId = DEFAULT_SOURCE_CLIENT_ID,
}: { demo?: boolean; hiddenDimensionIds?: string[]; sourceClientId?: string } = {}): Promise<EmployeeExperienceDashboardData> {
  const safeSourceClientId = sourceClientId.trim() || DEFAULT_SOURCE_CLIENT_ID;
  const organizationName = SOURCE_CLIENT_LABELS[safeSourceClientId] ?? safeSourceClientId;
  const sourceFiles = SOURCE_CLIENT_FILES[safeSourceClientId] ?? {
    database: DATABASE_FILE_NAME,
    statements: STATEMENTS_FILE_NAME,
  };
  const databaseStoragePath = `clients/${safeSourceClientId}/data/${sourceFiles.database}`;
  const statementsStoragePath = `clients/${safeSourceClientId}/data/${sourceFiles.statements}`;
  const [databaseCsvText, statementsCsvText] = demo
    ? [readCsvFromDemoFile(DEMO_DATABASE_PATH), readCsvFromDemoFile(DEMO_STATEMENTS_PATH)]
    : await Promise.all([
      readCsvFromStorage(databaseStoragePath),
      readCsvFromStorage(statementsStoragePath),
    ]);

  const definitions = parseStatements(statementsCsvText);
  const respondents = parseRespondents(definitions, databaseCsvText);
  return buildEmployeeExperienceDashboardData({
    organizationName,
    dataSourceLabel: demo
      ? "DWS employee experience demo CSV template"
      : `${organizationName} employee experience Firebase CSV workspace`,
    definitions,
    respondents,
    hiddenDimensionIds: mergeHiddenDimensionIds(
      hiddenDimensionIds ?? (demo ? DEMO_HIDDEN_DIMENSION_IDS : [])
    ),
  });
}

export async function loadEmployeeExperienceSyntheticDemoData({
  hiddenDimensionIds = [],
}: { hiddenDimensionIds?: string[] } = {}): Promise<EmployeeExperienceDashboardData> {
  return buildEmployeeExperienceDashboardData({
    organizationName: "North Star Demo Group",
    dataSourceLabel: "Synthetic employee experience demo dataset",
    definitions: SYNTHETIC_DEMO_QUESTIONS,
    respondents: buildSyntheticDemoRespondents(),
    hiddenDimensionIds,
  });
}
