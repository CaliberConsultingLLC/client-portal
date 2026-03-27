import { readFileSync } from "fs";
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

const DATABASE_PATH = "C:\\Users\\dusti\\OneDrive\\Client Data\\DWS\\Power BI\\DWSDatabase.csv";
const STATEMENTS_PATH =
  "C:\\Users\\dusti\\OneDrive\\Client Data\\DWS\\Power BI\\DWS 2024 Campaign Statements.csv";

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

function parseCampaignDate(rawValue: string) {
  const [monthText, dayText, yearText] = rawValue.split("/");
  const month = Number.parseInt(monthText ?? "", 10) - 1;
  const day = Number.parseInt(dayText ?? "", 10);
  const year = Number.parseInt(yearText ?? "", 10);

  if (!Number.isFinite(month) || !Number.isFinite(day) || !Number.isFinite(year)) {
    return { time: 0, label: rawValue || "Unknown Campaign" };
  }

  const date = new Date(year, month, day);
  return {
    time: date.getTime(),
    label: date.toLocaleString("en-US", { month: "short", year: "numeric" }),
  };
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

function parseStatements() {
  const rows = parseCSV(readFileSync(STATEMENTS_PATH, "utf8").replace(/^\uFEFF/, ""));

  return rows
    .slice(1)
    .map((row) => ({
      itemId: Number.parseInt(row[0] ?? "", 10),
      dimension: normalizeLabel(row[1], "Uncategorized"),
      statement: normalizeLabel(row[2], "Untitled statement"),
    }))
    .filter(
      (row) =>
        Number.isFinite(row.itemId) &&
        row.dimension !== "Comment" &&
        row.dimension !== "Ownership" &&
        row.statement.length > 0
    );
}

function parseRespondents(definitions: StatementDefinition[]) {
  const rows = parseCSV(readFileSync(DATABASE_PATH, "utf8").replace(/^\uFEFF/, ""));
  const headers = rows[0] ?? [];
  const records = rows.slice(1);
  const headerIndex = new Map(headers.map((header, index) => [header, index]));
  const questionIds = definitions.map((definition) => definition.itemId);

  const getValue = (row: string[], field: string) => {
    const index = headerIndex.get(field);
    return typeof index === "number" ? row[index] ?? "" : "";
  };

  return records
    .filter((row) => getValue(row, "Status").trim().toLowerCase() === "complete")
    .map((row) => {
      const campaignRaw = normalizeLabel(getValue(row, "Campaign"), "Unknown Campaign");
      const campaign = parseCampaignDate(campaignRaw);
      const scores = Object.fromEntries(
        questionIds.map((itemId) => [itemId, normalizeScore(getValue(row, `item:${itemId}`))])
      ) as Record<number, number | null>;

      return {
        id: normalizeLabel(getValue(row, "ID"), `row-${Math.random().toString(36).slice(2, 8)}`),
        campaignRaw,
        campaignLabel: campaign.label,
        campaignTime: campaign.time,
        location: normalizeLabel(getValue(row, "Location"), "Unknown Location"),
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

export function loadDwsEmployeeExperienceDashboardData(): EmployeeExperienceDashboardData {
  const definitions = parseStatements();
  const respondents = parseRespondents(definitions);
  const itemIds = definitions.map((definition) => definition.itemId);

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
  const questionMetrics = buildQuestionMetrics(definitions, currentRespondents, priorRespondents);
  const dimensionMetrics = buildDimensionMetrics(definitions, currentRespondents, priorRespondents);

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
      const dimensionItemIds = definitions
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
    definitions,
    currentRespondents,
    priorRespondents,
    (respondent) => respondent.department,
    MINIMUM_SEGMENT_SIZE
  );
  const supervisorReports = buildSegmentReports(
    definitions,
    currentRespondents,
    priorRespondents,
    (respondent) => respondent.supervisor,
    MINIMUM_SEGMENT_SIZE
  );
  const fieldUnitReports = buildSegmentReports(
    definitions,
    currentRespondents.filter((respondent) => respondent.division === "Field"),
    priorRespondents.filter((respondent) => respondent.division === "Field"),
    (respondent) => respondent.department,
    MINIMUM_SEGMENT_SIZE
  );
  const divisionReports = buildSegmentReports(
    definitions,
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
      organizationName: "Deep Well Services",
      currentCampaignLabel,
      priorCampaignLabel,
      totalResponses: currentRespondents.length,
      totalCampaigns: campaigns.length,
      totalDepartments: new Set(currentRespondents.map((respondent) => respondent.department)).size,
      totalSupervisors: new Set(currentRespondents.map((respondent) => respondent.supervisor)).size,
      campaigns,
      dataSourceLabel: "DWS employee experience CSV workspace",
    },
    settings: {
      minimumSegmentSize: MINIMUM_SEGMENT_SIZE,
    },
    questions: definitions,
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
      campaigns: buildCampaignHeatmap(dimensionMetrics, definitions, respondents, campaigns),
      departments: buildHeatmapForGroups(
        dimensionMetrics,
        definitions,
        currentRespondents,
        (respondent) => respondent.department,
        MINIMUM_SEGMENT_SIZE
      ),
      supervisors: buildHeatmapForGroups(
        dimensionMetrics,
        definitions,
        currentRespondents,
        (respondent) => respondent.supervisor,
        MINIMUM_SEGMENT_SIZE
      ),
      locations: buildHeatmapForGroups(
        dimensionMetrics,
        definitions,
        currentRespondents,
        (respondent) => respondent.location,
        3
      ),
      fieldUnits: buildHeatmapForGroups(
        dimensionMetrics,
        definitions,
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
