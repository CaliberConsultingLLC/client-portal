import { readFileSync } from "fs";
import { getFirebaseAdminStorage } from "@/lib/firebase/admin";
import type {
  IntegrationCommentTheme,
  IntegrationBrandReport,
  IntegrationDashboardData,
  IntegrationDimensionMetric,
  IntegrationGroupMetric,
  IntegrationHeatmap,
  IntegrationLongitudinalScope,
  IntegrationLongitudinalSeries,
  IntegrationPriority,
  IntegrationQuestionMetric,
  IntegrationVoiceEntry,
} from "@/types/integration-effectiveness";

const DATABASE_PATH =
  "C:\\Users\\dusti\\OneDrive\\Client Data\\Canopy\\Canopy Integration Database 2026.csv";
const CAMPAIGN_PATH =
  "C:\\Users\\dusti\\OneDrive\\Client Data\\Canopy\\Canopy Integration Campaign 2026.csv";
const DATABASE_STORAGE_PATH = "clients/csg/data/Canopy Integration Database 2026.csv";
const CAMPAIGN_STORAGE_PATH = "clients/csg/data/Canopy Integration Campaign 2026.csv";

const SYNTHETIC_BRANDS = [
  "Atlas Roofing",
  "Beacon Home Services",
  "Cedar Creek Exteriors",
  "Keystone Remodelers",
  "Summit Field Services",
] as const;
const SYNTHETIC_DEPARTMENTS = ["Sales", "Operations", "Customer Success", "Field Service"] as const;
const SYNTHETIC_JOB_TITLES = [
  "Branch Manager",
  "Project Coordinator",
  "Sales Consultant",
  "Field Supervisor",
  "Customer Care Lead",
  "Installer",
] as const;
const SYNTHETIC_CAMPAIGNS = [
  { label: "Campaign 1", date: "January 2026", baseScore: 65 },
  { label: "Campaign 2", date: "March 2026", baseScore: 65 },
  { label: "Campaign 3", date: "May 2026", baseScore: 65 },
] as const;
const SYNTHETIC_BRAND_OFFSETS = [4, -2, 1, -5, 6] as const;
const SYNTHETIC_BRAND_CAMPAIGN_OFFSETS = [
  [0, 7, 12],
  [5, -2, 4],
  [8, 6, 5],
  [-3, 5, 1],
  [4, 9, 8],
] as const;
const SYNTHETIC_DEPARTMENT_OFFSETS: Record<(typeof SYNTHETIC_DEPARTMENTS)[number], number> = {
  Sales: 3,
  Operations: -4,
  "Customer Success": 1,
  "Field Service": -2,
};
const SYNTHETIC_ITEM_OFFSETS: Record<number, number> = {
  1: -3,
  2: -6,
  3: 4,
  4: -4,
  5: -1,
  6: -5,
  7: -7,
  8: -2,
  9: -3,
  10: 5,
  11: 2,
};
const SYNTHETIC_ITEM_CAMPAIGN_OFFSETS: Record<number, readonly [number, number, number]> = {
  1: [-2, 4, 8],
  2: [-7, -1, 6],
  3: [5, 3, 2],
  4: [-4, 2, 1],
  5: [0, 3, 2],
  6: [-5, 1, 5],
  7: [-8, -3, 4],
  8: [-1, 1, -2],
  9: [-3, 4, 3],
  10: [6, 7, 9],
  11: [2, 5, 4],
};

const SYNTHETIC_QUESTION_STATEMENTS: Record<number, string> = {
  1: "I understand the benefits this integration is expected to create for our customers and employees.",
  2: "Leadership communicates integration updates clearly and consistently.",
  3: "The strengths of our original brand are being respected during the integration.",
  4: "I understand how my role and responsibilities may change as integration work continues.",
  5: "Employee feedback is being heard and acted on during the integration.",
  6: "Corporate support teams are responsive when we need help solving integration issues.",
  7: "The integration process feels organized, sequenced, and well managed.",
  8: "The pace of change feels manageable for my team.",
  9: "I know where to go when I have questions or concerns about the integration.",
  10: "I am confident the integration will improve our long-term growth opportunities.",
  11: "Overall, I feel positive about joining the Canopy Services Group platform.",
};

const DIMENSION_DEFINITIONS = [
  {
    id: "change-clarity",
    label: "Change Clarity",
    itemIds: [1, 2, 4, 8, 9],
  },
  {
    id: "respect-and-inclusion",
    label: "Respect & Inclusion",
    itemIds: [3, 5],
  },
  {
    id: "support-and-execution",
    label: "Support & Execution",
    itemIds: [6, 7],
  },
  {
    id: "future-confidence",
    label: "Future Confidence",
    itemIds: [10, 11],
  },
] as const;

const IMPROVEMENT_THEMES = [
  {
    id: "communication",
    label: "Communication & clarity",
    synopsis:
      "Employees want clearer updates, better context on decisions, and more two-way communication during integration.",
    keywords: ["commun", "guidance", "direction", "clear", "clarity", "open"],
  },
  {
    id: "resources",
    label: "Resources, staffing & tools",
    synopsis:
      "Comments point to staffing gaps, training needs, and not having enough tools or support to execute well.",
    keywords: ["resource", "staff", "employee", "tools", "help", "worker", "training"],
  },
  {
    id: "growth",
    label: "Lead flow & growth support",
    synopsis:
      "People are looking for stronger lead flow, better marketing support, and more visible growth backing from Canopy.",
    keywords: ["lead", "marketing", "community", "grow", "growth", "roof replacement"],
  },
  {
    id: "process",
    label: "Process & structure",
    synopsis:
      "Employees describe uneven processes and want a more organized, consistent operating model.",
    keywords: ["process", "schedule", "structure", "calendar", "consistent", "system"],
  },
  {
    id: "recognition",
    label: "Recognition, autonomy & trust",
    synopsis:
      "Comments ask for more trust, stronger recognition, and greater local autonomy in how work gets done.",
    keywords: ["recogn", "autonomy", "trust", "hover", "decision", "empower"],
  },
] as const;

interface ParsedQuestion {
  itemId: number;
  statement: string;
}

interface ParsedRespondent {
  id: string;
  brand: string;
  department: string;
  jobTitle: string;
  campaignDate: string;
  campaign: string;
  scores: Record<number, number | null>;
  comments: {
    improvement: string;
    strengths: string;
    preserve: string;
    additional: string;
  };
}

async function readCsvFromStorageOrLocal(storagePath: string, localPath: string) {
  try {
    const bucket = getFirebaseAdminStorage().bucket();
    const [buffer] = await bucket.file(storagePath).download();
    return buffer.toString("utf8").replace(/^\uFEFF/, "");
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.warn(`Falling back to local file for ${storagePath}.`, error);
      return readFileSync(localPath, "utf8").replace(/^\uFEFF/, "");
    }

    throw new Error(`Unable to load required CSV from Firebase Storage: ${storagePath}`);
  }
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

function normalizeScore(rawValue: string | undefined): number | null {
  if (!rawValue) return null;
  const parsed = Number.parseFloat(rawValue);
  if (Number.isNaN(parsed)) return null;
  return Math.round(parsed) / 10;
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

function cleanLabel(value: string | undefined, fallback: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : fallback;
}

function clampRawScore(value: number) {
  return Math.max(38, Math.min(94, Math.round(value)));
}

function csvCell(value: string | number) {
  const text = String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function buildSyntheticCampaignCsv() {
  const rows = [
    ["Item ID", "Index", "Statement"],
    ...Object.entries(SYNTHETIC_QUESTION_STATEMENTS).map(([itemId, statement]) => {
      const numericItemId = Number.parseInt(itemId, 10);
      const dimension =
        DIMENSION_DEFINITIONS.find((definition) =>
          (definition.itemIds as readonly number[]).includes(numericItemId)
        )?.label ?? "Integration";
      return [itemId, dimension, statement];
    }),
  ];

  return rows.map((row) => row.map(csvCell).join(",")).join("\n");
}

function buildSyntheticComment(
  brand: string,
  department: string,
  campaign: string,
  field: keyof ParsedRespondent["comments"]
) {
  const snippets: Record<keyof ParsedRespondent["comments"], string[]> = {
    improvement: [
      `${brand} needs clearer communication and more transparent updates for ${department}.`,
      `More training, resources, and guidance would help ${department} move faster.`,
      `The integration process is better, but local teams still need stronger support.`,
    ],
    strengths: [
      `${department} appreciates the stronger leadership visibility in ${campaign}.`,
      `Cross-brand collaboration is improving and feels more aligned than before.`,
      `The growth support from Canopy is becoming more concrete and helpful.`,
    ],
    preserve: [
      `Keep the local customer relationships and brand trust that made ${brand} successful.`,
      `Preserve local decision speed while adding Canopy's support structure.`,
      `Do not lose the team culture that keeps morale positive.`,
    ],
    additional: [
      `The team is more confident, but wants continued clarity on rollout timing.`,
      `Managers need consistent talking points so employees hear the same direction.`,
      `Support is improving, but unresolved process questions still create stress.`,
    ],
  };

  const index = Math.abs(brand.length + department.length + campaign.length) % snippets[field].length;
  return snippets[field][index];
}

function buildSyntheticDatabaseCsv() {
  const headers = [
    "ID",
    "Brand",
    "Department",
    "Job Title",
    "Campaign Date",
    "Campaign",
    ...Array.from({ length: 15 }, (_, index) => String(index + 1)),
  ];
  const rows: Array<Array<string | number>> = [headers];

  SYNTHETIC_BRANDS.forEach((brand, brandIndex) => {
    SYNTHETIC_CAMPAIGNS.forEach((campaign, campaignIndex) => {
      Array.from({ length: 6 }).forEach((_, respondentIndex) => {
        const department =
          SYNTHETIC_DEPARTMENTS[(brandIndex + respondentIndex + campaignIndex) % SYNTHETIC_DEPARTMENTS.length];
        const jobTitle =
          SYNTHETIC_JOB_TITLES[(brandIndex * 2 + respondentIndex + campaignIndex) % SYNTHETIC_JOB_TITLES.length];
        const brandWaveOffset =
          SYNTHETIC_BRAND_CAMPAIGN_OFFSETS[brandIndex]?.[campaignIndex] ?? 0;
        const respondentNoise = ((respondentIndex % 3) - 1) * 2;
        const scores = Array.from({ length: 11 }, (_, index) => {
          const itemId = index + 1;
          const itemWaveOffset =
            SYNTHETIC_ITEM_CAMPAIGN_OFFSETS[itemId]?.[campaignIndex] ?? 0;
          const changeFriction =
            campaignIndex === 0 && [2, 4, 6, 7, 9].includes(itemId) ? -2 : 0;
          const stabilizationLift =
            campaignIndex === 2 && [2, 6, 7, 9].includes(itemId) ? 2 : 0;
          return clampRawScore(
            campaign.baseScore +
              SYNTHETIC_BRAND_OFFSETS[brandIndex] +
              SYNTHETIC_DEPARTMENT_OFFSETS[department] +
              (SYNTHETIC_ITEM_OFFSETS[itemId] ?? 0) +
              brandWaveOffset +
              itemWaveOffset +
              respondentNoise +
              changeFriction +
              stabilizationLift
          );
        });

        rows.push([
          `INT-${brandIndex + 1}-${campaignIndex + 1}-${respondentIndex + 1}`,
          brand,
          department,
          jobTitle,
          campaign.date,
          campaign.label,
          ...scores,
          buildSyntheticComment(brand, department, campaign.label, "improvement"),
          buildSyntheticComment(brand, department, campaign.label, "strengths"),
          buildSyntheticComment(brand, department, campaign.label, "preserve"),
          buildSyntheticComment(brand, department, campaign.label, "additional"),
        ]);
      });
    });
  });

  return rows.map((row) => row.map(csvCell).join(",")).join("\n");
}

function shortLabelForItem(itemId: number) {
  const labels: Record<number, string> = {
    1: "Benefit narrative",
    2: "Leadership updates",
    3: "Respect for brand",
    4: "Role clarity",
    5: "Voice is valued",
    6: "Corporate support",
    7: "Process organization",
    8: "Pace of change",
    9: "Issue routing",
    10: "Long-term upside",
    11: "Joined Canopy",
  };
  return labels[itemId] ?? `Item ${itemId}`;
}

function actionForItem(itemId: number) {
  const actions: Record<number, string> = {
    1: "Sharpen the acquisition story and tie it to what employees and customers will tangibly gain.",
    2: "Tighten the communication cadence so people know what is changing, what is not, and what comes next.",
    3: "Protect local brand strengths explicitly so the integration does not feel like cultural replacement.",
    4: "Clarify reporting lines, role expectations, and decision rights under the new structure.",
    5: "Create a visible listening loop and close feedback with real follow-through.",
    6: "Improve response times and accountability from corporate support teams.",
    7: "Clean up integration planning, ownership, and sequencing so the process feels managed rather than improvised.",
    8: "Slow the pace where needed and stage major changes more deliberately.",
    9: "Publish clear contact paths for issues, questions, and escalation.",
    10: "Make the long-term value case concrete with visible examples of growth support.",
    11: "Address trust directly instead of assuming employees are emotionally bought in.",
  };
  return actions[itemId] ?? "Translate the weak signal into a more specific operating response.";
}

function buildAssessment(score: number) {
  if (score < 6.2) return "Integration friction is visible and needs leadership attention now.";
  if (score < 7) return "Integration sentiment is workable, but there are several uneven seams leaders should address.";
  return "Integration is landing positively overall, but the weaker pockets still deserve direct intervention.";
}

function parseQuestions(campaignCsvText: string): ParsedQuestion[] {
  const rows = parseCSV(campaignCsvText);
  return rows
    .slice(1)
    .map((row) => ({
      itemId: Number.parseInt(row[0] ?? "", 10),
      statement: row[2] ?? "",
    }))
    .filter((row) => Number.isFinite(row.itemId) && row.itemId >= 1 && row.itemId <= 11);
}

function parseRespondents(questionIds: number[], databaseCsvText: string): ParsedRespondent[] {
  const rows = parseCSV(databaseCsvText);
  const headers = rows[0] ?? [];
  const records = rows.slice(1);

  const headerIndex = new Map(headers.map((header, index) => [header, index]));

  const getValue = (row: string[], field: string) => {
    const index = headerIndex.get(field);
    return typeof index === "number" ? row[index] ?? "" : "";
  };

  return records
    .map((row) => {
      const scores = Object.fromEntries(
        questionIds.map((itemId) => [itemId, normalizeScore(getValue(row, String(itemId)))])
      ) as Record<number, number | null>;

      return {
        id: cleanLabel(getValue(row, "ID"), `row-${Math.random().toString(36).slice(2, 8)}`),
        brand: cleanLabel(getValue(row, "Brand"), "Unknown Brand"),
        department: cleanLabel(getValue(row, "Department"), "Unspecified"),
        jobTitle: cleanLabel(getValue(row, "Job Title"), "Unspecified"),
        campaignDate: cleanLabel(getValue(row, "Campaign Date"), "Unspecified"),
        campaign: cleanLabel(getValue(row, "Campaign"), "Unspecified Wave"),
        scores,
        comments: {
          improvement: getValue(row, "12").trim(),
          strengths: getValue(row, "13").trim(),
          preserve: getValue(row, "14").trim(),
          additional: getValue(row, "15").trim(),
        },
      };
    })
    .filter((respondent) => questionIds.some((itemId) => respondent.scores[itemId] !== null));
}

function buildQuestionMetrics(
  respondents: ParsedRespondent[],
  questions: ParsedQuestion[]
): IntegrationQuestionMetric[] {
  return questions
    .map((question) => {
      const values = respondents
        .map((respondent) => respondent.scores[question.itemId])
        .filter((value): value is number => value !== null);

      return {
        id: `question-${question.itemId}`,
        itemId: question.itemId,
        shortLabel: shortLabelForItem(question.itemId),
        statement: question.statement,
        score: round2(average(values)),
        favorablePct: pct(
          values.filter((value) => value >= 6.7).length,
          values.length
        ),
        concernPct: pct(
          values.filter((value) => value <= 3.4).length,
          values.length
        ),
        responseCount: values.length,
      };
    })
    .sort((left, right) => left.score - right.score);
}

function buildDimensionMetrics(
  respondents: ParsedRespondent[],
  questionMetrics: IntegrationQuestionMetric[]
): IntegrationDimensionMetric[] {
  return DIMENSION_DEFINITIONS.map((definition) => {
    const values = respondents.flatMap((respondent) =>
      definition.itemIds
        .map((itemId) => respondent.scores[itemId])
        .filter((value): value is number => value !== null)
    );
    return {
      id: definition.id,
      label: definition.label,
      score: round2(average(values)),
      favorablePct: pct(
        values.filter((value) => value >= 6.7).length,
        values.length
      ),
      questionIds: questionMetrics
        .filter((question) => (definition.itemIds as readonly number[]).includes(question.itemId))
        .map((question) => question.id),
    };
  }).sort((left, right) => left.score - right.score);
}

function buildGroupMetrics(
  respondents: ParsedRespondent[],
  accessor: (respondent: ParsedRespondent) => string,
  minimumCount = 1
): IntegrationGroupMetric[] {
  const groups = new Map<string, number[]>();

  for (const respondent of respondents) {
    const label = accessor(respondent);
    const values = Object.values(respondent.scores).filter(
      (value): value is number => value !== null
    );
    if (values.length === 0) continue;
    if (!groups.has(label)) groups.set(label, []);
    groups.get(label)?.push(average(values));
  }

  return Array.from(groups.entries())
    .map(([label, values]) => ({
      id: label.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      label,
      respondentCount: values.length,
      score: round2(average(values)),
      favorablePct: pct(
        values.filter((value) => value >= 6.7).length,
        values.length
      ),
    }))
    .filter((group) => group.respondentCount >= minimumCount)
    .sort((left, right) => left.score - right.score || right.respondentCount - left.respondentCount);
}

type CampaignSlot = "campaign1" | "campaign2" | "campaign3";
type LongitudinalScoreAccessor = (respondent: ParsedRespondent) => Array<number | null>;

function campaignSlotForLabel(label: string): CampaignSlot | null {
  const normalized = label.trim().toLowerCase();
  if (
    normalized === "initial" ||
    normalized === "campaign 1" ||
    normalized === "wave 1" ||
    normalized.includes("campaign 1") ||
    normalized.includes("wave 1")
  ) {
    return "campaign1";
  }
  if (
    normalized === "midpoint" ||
    normalized === "campaign 2" ||
    normalized === "wave 2" ||
    normalized.includes("campaign 2") ||
    normalized.includes("wave 2")
  ) {
    return "campaign2";
  }
  if (
    normalized === "final" ||
    normalized === "campaign 3" ||
    normalized === "wave 3" ||
    normalized.includes("campaign 3") ||
    normalized.includes("wave 3")
  ) {
    return "campaign3";
  }
  return null;
}

function buildLongitudinalSeries(
  id: string,
  label: string,
  respondents: ParsedRespondent[],
  scoreAccessor: LongitudinalScoreAccessor
): IntegrationLongitudinalSeries {
  const series: IntegrationLongitudinalSeries = {
    id,
    label,
    campaign1: null,
    campaign2: null,
    campaign3: null,
  };

  for (const campaign of Array.from(new Set(respondents.map((respondent) => respondent.campaign)))) {
    const slot = campaignSlotForLabel(campaign);
    if (!slot) continue;
    const values = respondents
      .filter((respondent) => respondent.campaign === campaign)
      .flatMap(scoreAccessor)
      .filter((value): value is number => value !== null);

    series[slot] = values.length > 0 ? round2(average(values)) : null;
  }

  return series;
}

function buildLongitudinalScope(
  respondents: ParsedRespondent[],
  brands: string[],
  scoreAccessor: LongitudinalScoreAccessor
): IntegrationLongitudinalScope {
  return {
    organization: buildLongitudinalSeries("organization", "Organization", respondents, scoreAccessor),
    brands: brands.map((brand) =>
      buildLongitudinalSeries(
        brand.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        brand,
        respondents.filter((respondent) => respondent.brand === brand),
        scoreAccessor
      )
    ),
  };
}

function buildLongitudinalData(
  respondents: ParsedRespondent[],
  questions: ParsedQuestion[]
): IntegrationDashboardData["longitudinal"] {
  const brands = Array.from(new Set(respondents.map((respondent) => respondent.brand)));
  const departments = Array.from(new Set(respondents.map((respondent) => respondent.department)));

  return {
    overall: buildLongitudinalScope(
      respondents,
      brands,
      (respondent) => Object.values(respondent.scores)
    ),
    statements: Object.fromEntries(
      questions.map((question) => [
        `question-${question.itemId}`,
        buildLongitudinalScope(respondents, brands, (respondent) => [
          respondent.scores[question.itemId] ?? null,
        ]),
      ])
    ),
    departments: Object.fromEntries(
      departments.map((department) => [
        department,
        buildLongitudinalScope(
          respondents.filter((respondent) => respondent.department === department),
          brands,
          (respondent) => Object.values(respondent.scores)
        ),
      ])
    ),
  };
}

function buildHeatmapForGrouping(
  respondents: ParsedRespondent[],
  questions: ParsedQuestion[],
  accessor: (respondent: ParsedRespondent) => string,
  minimumCount = 2
): IntegrationHeatmap {
  const groups = buildGroupMetrics(respondents, accessor, minimumCount);
  const rows = questions.map((question) => question.statement);
  const columns = groups.map((group) => group.label);

  const data = rows.map((questionLabel) => {
    const question = questions.find((entry) => entry.statement === questionLabel);
    return {
      department: questionLabel,
      scores: Object.fromEntries(
        columns.map((column) => {
          const scopedRespondents = respondents.filter(
            (respondent) => accessor(respondent) === column
          );
          const values = scopedRespondents
            .map((respondent) => (question ? respondent.scores[question.itemId] : null))
            .filter((value): value is number => value !== null);
          return [column, values.length >= minimumCount ? round2(average(values)) : null];
        })
      ),
    };
  });

  const rowTotals = Object.fromEntries(rows.map((questionLabel) => {
    const question = questions.find((entry) => entry.statement === questionLabel);
    const values = respondents
      .map((respondent) => (question ? respondent.scores[question.itemId] : null))
      .filter((value): value is number => value !== null);
    return [questionLabel, round2(average(values))];
  }));
  const columnTotals = Object.fromEntries(
    groups.map((group) => [group.label, group.score])
  );

  return {
    rows,
    columns,
    data,
    rowTotals,
    columnTotals,
  };
}

function buildBrandReport(
  brand: string,
  respondents: ParsedRespondent[],
  questions: ParsedQuestion[]
): IntegrationBrandReport {
  const scopedRespondents = respondents.filter((respondent) => respondent.brand === brand);
  const questionMetrics = buildQuestionMetrics(scopedRespondents, questions);
  const allQuestionValues = scopedRespondents.flatMap((respondent) =>
    Object.values(respondent.scores).filter((value): value is number => value !== null)
  );
  const departmentMetrics = buildGroupMetrics(
    scopedRespondents,
    (respondent) => respondent.department,
    2
  );
  const jobTitleMetrics = buildGroupMetrics(
    scopedRespondents,
    (respondent) => respondent.jobTitle,
    2
  );
  const improvementVoice = buildVoiceEntries(scopedRespondents, "improvement");

  return {
    selectedBrand: brand,
    respondentCount: scopedRespondents.length,
    integrationIndex: round2(average(allQuestionValues)),
    favorablePct: pct(
      allQuestionValues.filter((value) => value >= 6.7).length,
      allQuestionValues.length
    ),
    concernPct: pct(
      allQuestionValues.filter((value) => value <= 3.4).length,
      allQuestionValues.length
    ),
    questionMetrics,
    departmentMetrics,
    jobTitleMetrics,
    departmentHeatmap: buildHeatmapForGrouping(
      scopedRespondents,
      questions,
      (respondent) => respondent.department,
      2
    ),
    jobTitleHeatmap: buildHeatmapForGrouping(
      scopedRespondents,
      questions,
      (respondent) => respondent.jobTitle,
      2
    ),
    priorities: buildPriorityList(questionMetrics, departmentMetrics),
    strengths: buildStrengthList(questionMetrics, departmentMetrics),
    voice: {
      improvement: improvementVoice,
      strengths: buildVoiceEntries(scopedRespondents, "strengths"),
      preserve: buildVoiceEntries(scopedRespondents, "preserve"),
      additional: buildVoiceEntries(scopedRespondents, "additional"),
    },
  };
}

function buildPriorityList(
  questionMetrics: IntegrationQuestionMetric[],
  departmentMetrics: IntegrationGroupMetric[]
): IntegrationPriority[] {
  const departmentWatch = departmentMetrics.filter((department) => department.respondentCount >= 2);
  return [
    ...questionMetrics.slice(0, 3).map((question) => ({
      id: question.id,
      title: question.shortLabel,
      detail: `${question.responseCount} scored responses produced an average of ${question.score * 10}, making this a clear pressure point in the current file.`,
      action: actionForItem(question.itemId),
      score: question.score,
    })),
    ...departmentWatch.slice(0, 2).map((department) => ({
      id: `department-${department.id}`,
      title: `${department.label} is running cold`,
      detail: `${department.respondentCount} respondents in this department averaged ${department.score * 10} on the integration index, below the broader brand picture.`,
      action:
        "Use this team as an immediate listening post and work directly with local leadership on the operational friction they are carrying.",
      score: department.score,
    })),
  ].slice(0, 5);
}

function buildStrengthList(
  questionMetrics: IntegrationQuestionMetric[],
  departmentMetrics: IntegrationGroupMetric[]
): IntegrationPriority[] {
  const strongestQuestions = questionMetrics
    .slice()
    .sort((left, right) => right.score - left.score)
    .slice(0, 3);
  const strongestDepartments = departmentMetrics
    .filter((department) => department.respondentCount >= 2)
    .slice()
    .sort((left, right) => right.score - left.score)
    .slice(0, 2);

  return [
    ...strongestQuestions.map((question) => ({
      id: `strength-${question.id}`,
      title: question.shortLabel,
      detail: `This statement averaged ${question.score * 10}, making it one of the clearest proof points in the current wave.`,
      action: "Protect this strength so it does not erode while the weaker parts of the integration get fixed.",
      score: question.score,
    })),
    ...strongestDepartments.map((department) => ({
      id: `strength-dept-${department.id}`,
      title: `${department.label} is a usable proof point`,
      detail: `${department.respondentCount} respondents in this team averaged ${department.score * 10}, making it one of the stronger functional groups in the file.`,
      action: "Learn what this group is experiencing differently and replicate those practices where possible.",
      score: department.score,
    })),
  ].slice(0, 5);
}

function buildVoiceEntries(
  respondents: ParsedRespondent[],
  field: keyof ParsedRespondent["comments"]
): IntegrationVoiceEntry[] {
  const hiddenValues = new Set(["n/a", "no", "none", "nope", ".", "?", "na"]);

  return respondents
    .map((respondent) => ({
      id: `${field}-${respondent.id}`,
      respondentId: respondent.id,
      brand: respondent.brand,
      department: respondent.department,
      campaign: respondent.campaign,
      text: respondent.comments[field].trim(),
    }))
    .filter((entry) => {
      if (!entry.text) return false;
      const normalized = entry.text.trim().toLowerCase();
      return !hiddenValues.has(normalized);
    })
    .slice(0, 24);
}

function buildCommentThemes(entries: IntegrationVoiceEntry[]): IntegrationCommentTheme[] {
  const lowered = entries.map((entry) => ({
    ...entry,
    normalized: entry.text.toLowerCase(),
  }));

  return IMPROVEMENT_THEMES.map((theme) => {
    const matches = lowered.filter((entry) =>
      theme.keywords.some((keyword) => entry.normalized.includes(keyword))
    );
    return {
      id: theme.id,
      label: theme.label,
      mentionCount: matches.length,
      synopsis: theme.synopsis,
      sample: matches.slice(0, 2).map((entry) => entry.text),
    };
  })
    .filter((theme) => theme.mentionCount > 0)
    .sort((left, right) => right.mentionCount - left.mentionCount);
}

export async function loadCanopyIntegrationDashboardData(
  options: { demo?: boolean } = {}
): Promise<IntegrationDashboardData> {
  const [databaseCsvText, campaignCsvText] = options.demo
    ? [buildSyntheticDatabaseCsv(), buildSyntheticCampaignCsv()]
    : await Promise.all([
        readCsvFromStorageOrLocal(DATABASE_STORAGE_PATH, DATABASE_PATH),
        readCsvFromStorageOrLocal(CAMPAIGN_STORAGE_PATH, CAMPAIGN_PATH),
      ]);
  const questions = parseQuestions(campaignCsvText);
  const respondents = parseRespondents(questions.map((question) => question.itemId), databaseCsvText);
  const questionMetrics = buildQuestionMetrics(respondents, questions);
  const dimensionMetrics = buildDimensionMetrics(respondents, questionMetrics);
  const departmentMetrics = buildGroupMetrics(
    respondents,
    (respondent) => respondent.department,
    1
  );
  const jobTitleMetrics = buildGroupMetrics(
    respondents,
    (respondent) => respondent.jobTitle,
    2
  );
  const campaignDateMetrics = buildGroupMetrics(
    respondents,
    (respondent) => respondent.campaignDate,
    2
  );
  const brandMetrics = buildGroupMetrics(respondents, (respondent) => respondent.brand, 1);
  const campaignMetrics = buildGroupMetrics(respondents, (respondent) => respondent.campaign, 1);
  const brandReports = Array.from(new Set(respondents.map((respondent) => respondent.brand))).map(
    (brand) => buildBrandReport(brand, respondents, questions)
  );

  const allQuestionValues = respondents.flatMap((respondent) =>
    Object.values(respondent.scores).filter((value): value is number => value !== null)
  );
  const integrationIndex = round2(average(allQuestionValues));
  const favorablePct = pct(
    allQuestionValues.filter((value) => value >= 6.7).length,
    allQuestionValues.length
  );
  const concernPct = pct(
    allQuestionValues.filter((value) => value <= 3.4).length,
    allQuestionValues.length
  );
  const improvementVoice = buildVoiceEntries(respondents, "improvement");

  return {
    meta: {
      organizationName: "Canopy Services Group",
      totalRespondents: respondents.length,
      totalBrands: new Set(respondents.map((respondent) => respondent.brand)).size,
      totalCampaigns: new Set(respondents.map((respondent) => respondent.campaign)).size,
      totalDepartments: new Set(respondents.map((respondent) => respondent.department)).size,
      brands: Array.from(new Set(respondents.map((respondent) => respondent.brand))),
      campaigns: Array.from(new Set(respondents.map((respondent) => respondent.campaign))),
      dataSourceLabel: options.demo
        ? "Static integration demo dataset: 5 brands x 3 campaigns"
        : "Canopy Integration Database 2026.csv + Canopy Integration Campaign 2026.csv",
    },
    overview: {
      integrationIndex,
      favorablePct,
      concernPct,
      assessment: buildAssessment(integrationIndex),
      summary:
        "This first pass is designed for acquisition leadership: where the integration experience is breaking down, where the brand is leaning in, and where Canopy should intervene directly rather than assume the process is landing cleanly.",
    },
    questionMetrics,
    dimensionMetrics,
    departmentMetrics,
    jobTitleMetrics,
    campaignDateMetrics,
    brandMetrics,
    campaignMetrics,
    heatmaps: {
      campaigns: buildHeatmapForGrouping(
        respondents,
        questions,
        (respondent) => respondent.campaign,
        2
      ),
      brands: buildHeatmapForGrouping(respondents, questions, (respondent) => respondent.brand, 2),
      departments: buildHeatmapForGrouping(
        respondents,
        questions,
        (respondent) => respondent.department,
        2
      ),
      jobTitles: buildHeatmapForGrouping(
        respondents,
        questions,
        (respondent) => respondent.jobTitle,
        2
      ),
      campaignDates: buildHeatmapForGrouping(
        respondents,
        questions,
        (respondent) => respondent.campaignDate,
        2
      ),
    },
    brandReports,
    longitudinal: buildLongitudinalData(respondents, questions),
    priorities: buildPriorityList(questionMetrics, departmentMetrics),
    strengths: buildStrengthList(questionMetrics, departmentMetrics),
    commentThemes: buildCommentThemes(improvementVoice),
    voice: {
      improvement: improvementVoice,
      strengths: buildVoiceEntries(respondents, "strengths"),
      preserve: buildVoiceEntries(respondents, "preserve"),
      additional: buildVoiceEntries(respondents, "additional"),
    },
  };
}
