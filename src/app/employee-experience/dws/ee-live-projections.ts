import type {
  EmployeeExperienceDashboardData,
  EmployeeExperienceQuestionDefinition,
  EmployeeExperienceRespondent,
} from "@/types/employee-experience";
import { isKnownBrandSegment } from "@/lib/employee-experience/brand-segment";

export const REPORT_SCORE_SCALE = { min: 60, mid: 72.5, max: 85 } as const;

type ScoreScale = { min: number; mid: number; max: number };

type ProjectionOptions = {
  logoUrl?: string;
  tagline?: string;
  campaignLabel?: string;
  // Optional per-dashboard score scale. When omitted, the default 60–85 scale is used.
  scale?: ScoreScale;
  // DWS office only: scope the Supervisor report to just the Supervisor index
  // (no rail, supervisor statements only). Field keeps all indexes.
  supervisorSingleIndex?: boolean;
};

const resolveScale = (options?: ProjectionOptions): ScoreScale => options?.scale ?? REPORT_SCORE_SCALE;

export type EnpsGroupRow = {
  id: string;
  label: string;
  responses: number;
  score: number;
  previousScore: number | null;
  delta: number | null;
};

export type EnpsReportProjection = {
  client: ReturnType<typeof buildClient>;
  current: { id: string; label: string; labelLong: string };
  previous: { id: string; label: string; labelLong: string } | null;
  hasEnpsData: boolean;
  statementLabel: string;
  summary: {
    responses: number;
    score: number;
    previousScore: number | null;
    delta: number | null;
  };
  brandRows: EnpsGroupRow[];
  departmentRows: EnpsGroupRow[];
  supervisorRows: EnpsGroupRow[];
};

function resolveCampaignLabel(data: EmployeeExperienceDashboardData, options?: ProjectionOptions) {
  return options?.campaignLabel ?? data.meta.currentCampaignLabel;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function round1(value: number) {
  return Math.round(value * 10) / 10;
}

function average(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function toDisplayScore(likertScore: number) {
  return round1(likertScore * 10);
}

function campaignId(label: string) {
  return slugify(label);
}

const MONTH_INDEX: Record<string, number> = {
  jan: 0, january: 0,
  feb: 1, february: 1,
  mar: 2, march: 2,
  apr: 3, april: 3,
  may: 4,
  jun: 5, june: 5,
  jul: 6, july: 6,
  aug: 7, august: 7,
  sep: 8, sept: 8, september: 8,
  oct: 9, october: 9,
  nov: 10, november: 10,
  dec: 11, december: 11,
};

function campaignSortKey(label: string) {
  const normalized = String(label).trim().toLowerCase();
  const yearMatch = normalized.match(/\b(20\d{2}|\d{2})\b/);
  const year = yearMatch ? (yearMatch[1].length === 2 ? Number(`20${yearMatch[1]}`) : Number(yearMatch[1])) : 0;
  const monthToken = normalized.match(/\b([a-z]+)\b/)?.[1] ?? "";
  const month = MONTH_INDEX[monthToken] ?? 0;
  return year * 100 + month;
}

function sortedCampaigns(labels: string[]) {
  return [...labels].sort((a, b) => campaignSortKey(a) - campaignSortKey(b) || a.localeCompare(b));
}

function respondentsForCampaign(respondents: EmployeeExperienceRespondent[], campaignLabel: string) {
  return respondents.filter((respondent) => respondent.campaignLabel === campaignLabel);
}

// Blank supervisor values are normalized to "Unknown Supervisor" upstream. Those rows still
// contribute to org-wide aggregates, but they must never be listed as a supervisor segment.
function isKnownSupervisor(value: string) {
  const normalized = value?.trim().toLowerCase();
  return Boolean(normalized) && normalized !== "unknown supervisor";
}

function itemDisplayScore(respondents: EmployeeExperienceRespondent[], itemId: number): number {
  const values = respondents
    .map((respondent) => respondent.scores[itemId])
    .filter((value): value is number => value !== null);
  return values.length > 0 ? toDisplayScore(average(values)) : 0;
}

function itemDisplayScoreNullable(respondents: EmployeeExperienceRespondent[], itemId: number): number | null {
  const values = respondents
    .map((respondent) => respondent.scores[itemId])
    .filter((value): value is number => value !== null);
  return values.length > 0 ? toDisplayScore(average(values)) : null;
}

/**
 * PORTAL SCORING RULE — every score shown anywhere is the direct average of the
 * people it describes.
 *
 * One person contributes exactly one value: the mean of their own answers to
 * the items in scope. Those person values are then averaged with equal weight.
 * A score is NEVER assembled from other scores — not from department cells, not
 * from statement scores, not from index scores, not from chart rows.
 *
 * `itemIds` defines the scope (one statement, one index's statements, or every
 * statement). `respondents` defines the population (org, a segment, or any
 * combination of active filters).
 */
export function personAverageScore(
  respondents: EmployeeExperienceRespondent[],
  itemIds: number[]
): number | null {
  const perPerson: number[] = [];
  for (const respondent of respondents) {
    let total = 0;
    let answered = 0;
    for (const itemId of itemIds) {
      const value = respondent.scores[itemId];
      if (value == null) continue;
      total += value;
      answered += 1;
    }
    if (answered > 0) perPerson.push(total / answered);
  }
  return perPerson.length > 0 ? toDisplayScore(average(perPerson)) : null;
}

export type PersonScoreCell = {
  current: number | null;
  comparisons: Record<string, number | null>;
  responses: number;
};

/** Person-average for one population across the current campaign and every comparison. */
function buildPersonScoreCell(
  respondents: EmployeeExperienceRespondent[],
  campaigns: string[],
  currentLabel: string,
  itemIds: number[],
  matches?: (respondent: EmployeeExperienceRespondent) => boolean
): PersonScoreCell {
  const comparisons = buildComparisons(campaigns, currentLabel);
  const scope = (campaignLabel: string) => {
    const inCampaign = respondentsForCampaign(respondents, campaignLabel);
    return matches ? inCampaign.filter(matches) : inCampaign;
  };
  const currentScope = scope(currentLabel);
  return {
    current: personAverageScore(currentScope, itemIds),
    comparisons: Object.fromEntries(
      comparisons.map((comparison) => {
        const priorLabel =
          campaigns.find((label) => campaignId(label) === comparison.id) ?? comparison.label;
        return [comparison.id, personAverageScore(scope(priorLabel), itemIds)];
      })
    ),
    responses: currentScope.length,
  };
}

export type GroupScoreBlock = {
  byGroup: Record<string, PersonScoreCell>;
  org: PersonScoreCell;
};

/** Person-average score per campaign, for each department, location, and the whole org. */
export type PersonScoreSeries = {
  byDept: Record<string, Record<string, number | null>>;
  byLocation: Record<string, Record<string, number | null>>;
  byOrg: Record<string, number | null>;
};

/**
 * Person-average scores for a scope, computed once per group and once for the
 * whole organization. The org cell is its own direct person average — it is not
 * derived from the group cells.
 */
function buildGroupScores(
  respondents: EmployeeExperienceRespondent[],
  campaigns: string[],
  currentLabel: string,
  itemIds: number[],
  groups: Array<{ id: string; name: string }>,
  matches: (respondent: EmployeeExperienceRespondent, groupName: string) => boolean
): GroupScoreBlock {
  return {
    byGroup: Object.fromEntries(
      groups.map((group) => [
        group.id,
        buildPersonScoreCell(respondents, campaigns, currentLabel, itemIds, (respondent) =>
          matches(respondent, group.name)
        ),
      ])
    ),
    org: buildPersonScoreCell(respondents, campaigns, currentLabel, itemIds),
  };
}

/**
 * Attaches person-average index scores + a person-average overall score to a set
 * of grouped statement projections, so no consumer ever has to roll statements
 * up itself.
 */
function attachPersonScores<T extends { id: string; name: string }>(
  indexes: T[],
  questions: EmployeeExperienceQuestionDefinition[],
  respondents: EmployeeExperienceRespondent[],
  campaigns: string[],
  currentLabel: string,
  groups: Array<{ id: string; name: string }>,
  matches: (respondent: EmployeeExperienceRespondent, groupName: string) => boolean
): { indexes: Array<T & { score: GroupScoreBlock }>; overall: GroupScoreBlock } {
  const byDimension = groupQuestionsByDimension(questions);
  const scored = indexes.map((index) => ({
    ...index,
    score: buildGroupScores(
      respondents,
      campaigns,
      currentLabel,
      (byDimension.get(index.name) ?? []).map((question) => question.itemId),
      groups,
      matches
    ),
  }));
  return {
    indexes: scored,
    overall: buildGroupScores(
      respondents,
      campaigns,
      currentLabel,
      questions.map((question) => question.itemId),
      groups,
      matches
    ),
  };
}

const matchBy =
  (field: keyof EmployeeExperienceRespondent) =>
  (respondent: EmployeeExperienceRespondent, groupName: string) =>
    String(respondent[field] ?? "") === groupName;

function enpsResponseScore(
  respondent: EmployeeExperienceRespondent,
  itemIds: number[]
) {
  const values = itemIds
    .map((itemId) => respondent.scores[itemId])
    .filter((value): value is number => value !== null);
  // Keep ENPS on the same 0-100 score scale used in statement boxes.
  return values.length > 0 ? toDisplayScore(average(values)) : null;
}

function buildEnpsRows(
  respondents: EmployeeExperienceRespondent[],
  previousRespondents: EmployeeExperienceRespondent[],
  itemIds: number[],
  minResponses: number,
  getGroup: (respondent: EmployeeExperienceRespondent) => string,
  allowGroup?: (group: string) => boolean
): EnpsGroupRow[] {
  const currentGroups = new Map<string, EmployeeExperienceRespondent[]>();
  respondents.forEach((respondent) => {
    const group = getGroup(respondent).trim();
    if (!group) return;
    if (allowGroup && !allowGroup(group)) return;
    const existing = currentGroups.get(group) ?? [];
    existing.push(respondent);
    currentGroups.set(group, existing);
  });

  const previousGroups = new Map<string, EmployeeExperienceRespondent[]>();
  previousRespondents.forEach((respondent) => {
    const group = getGroup(respondent).trim();
    if (!group) return;
    if (allowGroup && !allowGroup(group)) return;
    const existing = previousGroups.get(group) ?? [];
    existing.push(respondent);
    previousGroups.set(group, existing);
  });

  return Array.from(currentGroups.entries())
    .map(([label, groupRespondents]) => {
      const currentScores = groupRespondents
        .map((respondent) => enpsResponseScore(respondent, itemIds))
        .filter((value): value is number => value !== null);
      if (currentScores.length < minResponses) return null;
      const previousScores = (previousGroups.get(label) ?? [])
        .map((respondent) => enpsResponseScore(respondent, itemIds))
        .filter((value): value is number => value !== null);
      const currentScore = round1(average(currentScores));
      const previousScore = previousScores.length > 0 ? round1(average(previousScores)) : null;
      return {
        id: slugify(label),
        label,
        responses: currentScores.length,
        score: currentScore,
        previousScore,
        delta: previousScore == null ? null : round1(currentScore - previousScore),
      } satisfies EnpsGroupRow;
    })
    .filter((row): row is EnpsGroupRow => row !== null)
    .sort((left, right) => right.score - left.score || left.label.localeCompare(right.label));
}

function groupQuestionsByDimension(questions: EmployeeExperienceQuestionDefinition[]) {
  const grouped = new Map<string, EmployeeExperienceQuestionDefinition[]>();
  questions.forEach((question) => {
    const existing = grouped.get(question.dimension) ?? [];
    existing.push(question);
    grouped.set(question.dimension, existing);
  });
  return grouped;
}

function buildClient(data: EmployeeExperienceDashboardData, options?: ProjectionOptions) {
  return {
    name: data.meta.organizationName,
    tagline: options?.tagline,
    logoUrl: options?.logoUrl,
  };
}

function buildComparisons(campaigns: string[], currentLabel: string) {
  return campaigns
    .filter((label) => label !== currentLabel)
    .map((label) => ({
      id: campaignId(label),
      label,
      labelLong: label.toUpperCase(),
    }));
}

function buildStatementProjections(
  questions: EmployeeExperienceQuestionDefinition[],
  respondents: EmployeeExperienceRespondent[],
  campaigns: string[],
  currentLabel: string
) {
  const comparisons = buildComparisons(campaigns, currentLabel);
  const currentRespondents = respondentsForCampaign(respondents, currentLabel);

  return Array.from(groupQuestionsByDimension(questions).entries()).map(([dimension, items]) => ({
    id: slugify(dimension),
    name: dimension,
    responses: currentRespondents.length,
    statements: items.map((question, index) => ({
      id: `${slugify(dimension)}-${index + 1}`,
      text: question.statement,
      current: itemDisplayScore(currentRespondents, question.itemId),
      comparisons: Object.fromEntries(
        comparisons.map((comparison) => {
          const priorLabel = campaigns.find((label) => campaignId(label) === comparison.id) ?? comparison.label;
          return [
            comparison.id,
            itemDisplayScore(respondentsForCampaign(respondents, priorLabel), question.itemId),
          ];
        })
      ),
    })),
  }));
}

function buildDepartments(
  respondents: EmployeeExperienceRespondent[],
  currentLabel: string,
  minimumSegmentSize: number
) {
  const currentRespondents = respondentsForCampaign(respondents, currentLabel);
  const counts = new Map<string, number>();
  currentRespondents.forEach((respondent) => {
    counts.set(respondent.department, (counts.get(respondent.department) ?? 0) + 1);
  });

  return Array.from(counts.entries())
    .filter(([, count]) => count >= minimumSegmentSize)
    .sort((left, right) => left[0].localeCompare(right[0]))
    .map(([name, responses]) => {
      const sample = currentRespondents.find((respondent) => respondent.department === name);
      return {
        id: slugify(name),
        name,
        responses,
        location: sample?.location ?? "",
      };
    });
}

function buildJobCategories(
  respondents: EmployeeExperienceRespondent[],
  currentLabel: string,
  minimumSegmentSize: number,
  groupField: "leadership" | "fieldCategory" = "fieldCategory"
) {
  const currentRespondents = respondentsForCampaign(respondents, currentLabel);
  const counts = new Map<string, number>();
  currentRespondents.forEach((respondent) => {
    const category = respondent[groupField]?.trim();
    if (!category || category === "Unspecified" || category === "Unknown Job Title") return;
    counts.set(category, (counts.get(category) ?? 0) + 1);
  });

  return Array.from(counts.entries())
    .filter(([, count]) => count >= minimumSegmentSize)
    .sort((left, right) => left[0].localeCompare(right[0]))
    .map(([name, responses]) => ({
      id: slugify(name),
      name,
      responses,
      location: "",
    }));
}

function buildOrgScoreCell(
  respondents: EmployeeExperienceRespondent[],
  campaigns: string[],
  currentLabel: string,
  itemId: number
) {
  const comparisons = buildComparisons(campaigns, currentLabel);
  return {
    current: itemDisplayScore(respondentsForCampaign(respondents, currentLabel), itemId),
    comparisons: Object.fromEntries(
      comparisons.map((comparison) => {
        const priorLabel =
          campaigns.find((label) => campaignId(label) === comparison.id) ?? comparison.label;
        return [
          comparison.id,
          itemDisplayScore(respondentsForCampaign(respondents, priorLabel), itemId),
        ];
      })
    ) as Record<string, number>,
  };
}

function buildByDeptStatements(
  questions: EmployeeExperienceQuestionDefinition[],
  respondents: EmployeeExperienceRespondent[],
  campaigns: string[],
  currentLabel: string,
  departments: Array<{ id: string; name: string }>
) {
  const comparisons = buildComparisons(campaigns, currentLabel);

  return Array.from(groupQuestionsByDimension(questions).entries()).map(([dimension, items]) => ({
    id: slugify(dimension),
    name: dimension,
    statements: items.map((question, index) => {
      const byDept: Record<string, { current: number; comparisons: Record<string, number> }> = {};
      departments.forEach((department) => {
        const deptRespondents = (campaignLabel: string) =>
          respondentsForCampaign(respondents, campaignLabel).filter(
            (respondent) => respondent.department === department.name
          );

        byDept[department.id] = {
          current: itemDisplayScore(deptRespondents(currentLabel), question.itemId),
          comparisons: Object.fromEntries(
            comparisons.map((comparison) => {
              const priorLabel =
                campaigns.find((label) => campaignId(label) === comparison.id) ?? comparison.label;
              return [comparison.id, itemDisplayScore(deptRespondents(priorLabel), question.itemId)];
            })
          ),
        };
      });

      return {
        id: `${slugify(dimension)}-${index + 1}`,
        text: question.statement,
        byDept,
        org: buildOrgScoreCell(respondents, campaigns, currentLabel, question.itemId),
      };
    }),
  }));
}

function buildBySupervisorStatements(
  questions: EmployeeExperienceQuestionDefinition[],
  respondents: EmployeeExperienceRespondent[],
  campaigns: string[],
  currentLabel: string,
  supervisors: Array<{ id: string; name: string }>
) {
  const comparisons = buildComparisons(campaigns, currentLabel);

  return Array.from(groupQuestionsByDimension(questions).entries()).map(([dimension, items]) => ({
    id: slugify(dimension),
    name: dimension,
    statements: items.map((question, index) => {
      const byDept: Record<string, { current: number; comparisons: Record<string, number> }> = {};
      supervisors.forEach((supervisor) => {
        const supRespondents = (campaignLabel: string) =>
          respondentsForCampaign(respondents, campaignLabel).filter(
            (respondent) => respondent.supervisor === supervisor.name
          );

        byDept[supervisor.id] = {
          current: itemDisplayScore(supRespondents(currentLabel), question.itemId),
          comparisons: Object.fromEntries(
            comparisons.map((comparison) => {
              const priorLabel =
                campaigns.find((label) => campaignId(label) === comparison.id) ?? comparison.label;
              return [comparison.id, itemDisplayScore(supRespondents(priorLabel), question.itemId)];
            })
          ),
        };
      });

      return {
        id: `${slugify(dimension)}-${index + 1}`,
        text: question.statement,
        byDept,
        org: buildOrgScoreCell(respondents, campaigns, currentLabel, question.itemId),
      };
    }),
  }));
}

function buildByJobCategoryStatements(
  questions: EmployeeExperienceQuestionDefinition[],
  respondents: EmployeeExperienceRespondent[],
  campaigns: string[],
  currentLabel: string,
  jobCategories: Array<{ id: string; name: string }>,
  groupField: "leadership" | "fieldCategory" | "division" = "fieldCategory"
) {
  const comparisons = buildComparisons(campaigns, currentLabel);

  return Array.from(groupQuestionsByDimension(questions).entries()).map(([dimension, items]) => ({
    id: slugify(dimension),
    name: dimension,
    statements: items.map((question, index) => {
      const byDept: Record<string, { current: number; comparisons: Record<string, number> }> = {};
      jobCategories.forEach((category) => {
        const categoryRespondents = (campaignLabel: string) =>
          respondentsForCampaign(respondents, campaignLabel).filter(
            (respondent) => respondent[groupField] === category.name
          );

        byDept[category.id] = {
          current: itemDisplayScore(categoryRespondents(currentLabel), question.itemId),
          comparisons: Object.fromEntries(
            comparisons.map((comparison) => {
              const priorLabel =
                campaigns.find((label) => campaignId(label) === comparison.id) ?? comparison.label;
              return [comparison.id, itemDisplayScore(categoryRespondents(priorLabel), question.itemId)];
            })
          ),
        };
      });

      return {
        id: `${slugify(dimension)}-${index + 1}`,
        text: question.statement,
        byDept,
        org: buildOrgScoreCell(respondents, campaigns, currentLabel, question.itemId),
      };
    }),
  }));
}

function buildLocations(
  respondents: EmployeeExperienceRespondent[],
  currentLabel: string,
  minimumSegmentSize: number
) {
  const currentRespondents = respondentsForCampaign(respondents, currentLabel);
  const counts = new Map<string, number>();
  currentRespondents.forEach((respondent) => {
    if (!isKnownBrandSegment(respondent.location)) return;
    counts.set(respondent.location, (counts.get(respondent.location) ?? 0) + 1);
  });

  return Array.from(counts.entries())
    .filter(([, count]) => count >= minimumSegmentSize)
    .sort((left, right) => left[0].localeCompare(right[0]))
    .map(([name, responses]) => ({
      id: slugify(name),
      name,
      responses,
    }));
}

function buildDivisions(
  respondents: EmployeeExperienceRespondent[],
  currentLabel: string,
  minimumSegmentSize: number
) {
  const currentRespondents = respondentsForCampaign(respondents, currentLabel);
  const counts = new Map<string, number>();
  currentRespondents.forEach((respondent) => {
    const div = respondent.division?.trim();
    if (!div || div.toLowerCase().includes("unknown")) return;
    counts.set(div, (counts.get(div) ?? 0) + 1);
  });

  return Array.from(counts.entries())
    .filter(([, count]) => count >= minimumSegmentSize)
    .sort((left, right) => left[0].localeCompare(right[0]))
    .map(([name, responses]) => ({
      id: slugify(name),
      name,
      responses,
    }));
}

function buildByDivisionStatements(
  questions: EmployeeExperienceQuestionDefinition[],
  respondents: EmployeeExperienceRespondent[],
  campaigns: string[],
  currentLabel: string,
  divisions: Array<{ id: string; name: string }>
) {
  const comparisons = buildComparisons(campaigns, currentLabel);

  return Array.from(groupQuestionsByDimension(questions).entries()).map(([dimension, items]) => ({
    id: slugify(dimension),
    name: dimension,
    statements: items.map((question, index) => {
      const byLocation: Record<string, { current: number; comparisons: Record<string, number> }> = {};
      divisions.forEach((division) => {
        const divRespondents = (campaignLabel: string) =>
          respondentsForCampaign(respondents, campaignLabel).filter(
            (respondent) => respondent.division === division.name
          );

        byLocation[division.id] = {
          current: itemDisplayScore(divRespondents(currentLabel), question.itemId),
          comparisons: Object.fromEntries(
            comparisons.map((comparison) => {
              const priorLabel =
                campaigns.find((label) => campaignId(label) === comparison.id) ?? comparison.label;
              return [comparison.id, itemDisplayScore(divRespondents(priorLabel), question.itemId)];
            })
          ),
        };
      });

      return {
        id: `${slugify(dimension)}-${index + 1}`,
        text: question.statement,
        byLocation,
        org: buildOrgScoreCell(respondents, campaigns, currentLabel, question.itemId),
      };
    }),
  }));
}

function buildBrands(
  respondents: EmployeeExperienceRespondent[],
  currentLabel: string,
  minimumSegmentSize: number
) {
  return buildLocations(respondents, currentLabel, minimumSegmentSize).map((brand) => ({
    ...brand,
    location: brand.name,
  }));
}

function buildByLocationStatements(
  questions: EmployeeExperienceQuestionDefinition[],
  respondents: EmployeeExperienceRespondent[],
  campaigns: string[],
  currentLabel: string,
  locations: Array<{ id: string; name: string }>
) {
  const comparisons = buildComparisons(campaigns, currentLabel);

  return Array.from(groupQuestionsByDimension(questions).entries()).map(([dimension, items]) => ({
    id: slugify(dimension),
    name: dimension,
    statements: items.map((question, index) => {
      const byLocation: Record<string, { current: number; comparisons: Record<string, number> }> = {};
      locations.forEach((location) => {
        const locationRespondents = (campaignLabel: string) =>
          respondentsForCampaign(respondents, campaignLabel).filter(
            (respondent) => respondent.location === location.name
          );

        byLocation[location.id] = {
          current: itemDisplayScore(locationRespondents(currentLabel), question.itemId),
          comparisons: Object.fromEntries(
            comparisons.map((comparison) => {
              const priorLabel =
                campaigns.find((label) => campaignId(label) === comparison.id) ?? comparison.label;
              return [comparison.id, itemDisplayScore(locationRespondents(priorLabel), question.itemId)];
            })
          ),
        };
      });

      return {
        id: `${slugify(dimension)}-${index + 1}`,
        text: question.statement,
        byLocation,
        org: buildOrgScoreCell(respondents, campaigns, currentLabel, question.itemId),
      };
    }),
  }));
}

function buildByBrandStatements(
  questions: EmployeeExperienceQuestionDefinition[],
  respondents: EmployeeExperienceRespondent[],
  campaigns: string[],
  currentLabel: string,
  brands: Array<{ id: string; name: string }>
) {
  const comparisons = buildComparisons(campaigns, currentLabel);

  return Array.from(groupQuestionsByDimension(questions).entries()).map(([dimension, items]) => ({
    id: slugify(dimension),
    name: dimension,
    statements: items.map((question, index) => {
      const byDept: Record<string, { current: number; comparisons: Record<string, number> }> = {};
      brands.forEach((brand) => {
        const brandRespondents = (campaignLabel: string) =>
          respondentsForCampaign(respondents, campaignLabel).filter(
            (respondent) => respondent.location === brand.name
          );

        byDept[brand.id] = {
          current: itemDisplayScore(brandRespondents(currentLabel), question.itemId),
          comparisons: Object.fromEntries(
            comparisons.map((comparison) => {
              const priorLabel =
                campaigns.find((label) => campaignId(label) === comparison.id) ?? comparison.label;
              return [comparison.id, itemDisplayScore(brandRespondents(priorLabel), question.itemId)];
            })
          ),
        };
      });

      return {
        id: `${slugify(dimension)}-${index + 1}`,
        text: question.statement,
        byDept,
        org: buildOrgScoreCell(respondents, campaigns, currentLabel, question.itemId),
      };
    }),
  }));
}

type SegmentFieldDef = { id: string; label: string; field: keyof EmployeeExperienceRespondent };

const SEGMENT_FIELDS: SegmentFieldDef[] = [
  { id: "generation", label: "Generation", field: "generation" },
  { id: "tenure", label: "Tenure", field: "tenure" },
  { id: "role", label: "Role", field: "jobTitle" },
];

const segmentValue = (respondent: EmployeeExperienceRespondent, field: keyof EmployeeExperienceRespondent) =>
  String(respondent[field] ?? "");

function buildSegments(
  respondents: EmployeeExperienceRespondent[],
  questions: EmployeeExperienceQuestionDefinition[],
  campaigns: string[],
  currentLabel: string,
  groups: Array<{ id: string; name: string }>,
  minimumSegmentSize: number,
  groupField: "department" | "fieldCategory" | "leadership" | "division" | "supervisor" = "department",
  segmentFields: SegmentFieldDef[] = SEGMENT_FIELDS
) {
  const comparisons = buildComparisons(campaigns, currentLabel);
  const scoredItemIds = questions.map((question) => question.itemId);

  return segmentFields.map((dimension) => {
    const groupNames = Array.from(
      new Set(
        respondentsForCampaign(respondents, currentLabel)
          .map((respondent) => segmentValue(respondent, dimension.field))
          .filter((value) => value && value !== "Unspecified" && value !== "Unknown Job Title")
      )
    ).sort((left, right) => left.localeCompare(right));

    return {
      id: dimension.id,
      label: dimension.label,
      groups: groupNames.map((name) => {
        const groupId = `${dimension.id}-${slugify(name)}`;
        const byDept: Record<
          string,
          { responses: number; current: number; comparisons: Record<string, number> }
        > = {};

        groups.forEach((group) => {
          const slice = (campaignLabel: string) =>
            respondentsForCampaign(respondents, campaignLabel).filter(
              (respondent) =>
                respondent[groupField] === group.name && respondent[dimension.field] === name
            );

          const currentSlice = slice(currentLabel);
          if (currentSlice.length < minimumSegmentSize) return;

          byDept[group.id] = {
            responses: currentSlice.length,
            current: personAverageScore(currentSlice, scoredItemIds) ?? 0,
            comparisons: Object.fromEntries(
              comparisons.map((comparison) => {
                const priorLabel =
                  campaigns.find((label) => campaignId(label) === comparison.id) ?? comparison.label;
                return [comparison.id, personAverageScore(slice(priorLabel), scoredItemIds) ?? 0];
              })
            ),
          };
        });

        return { id: groupId, name, byDept };
      }),
    };
  });
}

function buildBrandSegments(
  respondents: EmployeeExperienceRespondent[],
  questions: EmployeeExperienceQuestionDefinition[],
  campaigns: string[],
  currentLabel: string,
  brands: Array<{ id: string; name: string }>,
  minimumSegmentSize: number,
  segmentFields?: SegmentFieldDef[]
) {
  const comparisons = buildComparisons(campaigns, currentLabel);
  const scoredItemIds = questions.map((question) => question.itemId);
  const brandSegmentFields: SegmentFieldDef[] = segmentFields ?? [
    ...SEGMENT_FIELDS,
    { id: "job-category", label: "Job Category", field: "fieldCategory" },
  ];

  return brandSegmentFields.map((dimension) => {
    const groupNames = Array.from(
      new Set(
        respondentsForCampaign(respondents, currentLabel)
          .map((respondent) => segmentValue(respondent, dimension.field))
          .filter((value) => value && value !== "Unspecified" && value !== "Unknown Job Title")
      )
    ).sort((left, right) => left.localeCompare(right));

    return {
      id: dimension.id,
      label: dimension.label,
      groups: groupNames.map((name) => {
        const groupId = `${dimension.id}-${slugify(name)}`;
        const byDept: Record<
          string,
          { responses: number; current: number; comparisons: Record<string, number> }
        > = {};

        brands.forEach((brand) => {
          const slice = (campaignLabel: string) =>
            respondentsForCampaign(respondents, campaignLabel).filter(
              (respondent) =>
                respondent.location === brand.name && respondent[dimension.field] === name
            );

          const currentSlice = slice(currentLabel);
          if (currentSlice.length < minimumSegmentSize) return;

          byDept[brand.id] = {
            responses: currentSlice.length,
            current: personAverageScore(currentSlice, scoredItemIds) ?? 0,
            comparisons: Object.fromEntries(
              comparisons.map((comparison) => {
                const priorLabel =
                  campaigns.find((label) => campaignId(label) === comparison.id) ?? comparison.label;
                return [comparison.id, personAverageScore(slice(priorLabel), scoredItemIds) ?? 0];
              })
            ),
          };
        });

        return { id: groupId, name, byDept };
      }),
    };
  });
}

function findSupervisorDimension(questions: EmployeeExperienceQuestionDefinition[]) {
  const dimensions = Array.from(new Set(questions.map((question) => question.dimension)));
  return (
    dimensions.find((dimension) => /supervisor|manager/i.test(dimension)) ??
    dimensions[dimensions.length - 1] ??
    "Supervisor"
  );
}

function buildSupervisors(
  respondents: EmployeeExperienceRespondent[],
  currentLabel: string,
  minimumSegmentSize: number
) {
  const currentRespondents = respondentsForCampaign(respondents, currentLabel);
  const counts = new Map<string, { name: string; dept: string; responses: number }>();

  currentRespondents.forEach((respondent) => {
    if (!isKnownSupervisor(respondent.supervisor)) return;
    const existing = counts.get(respondent.supervisor);
    if (existing) {
      existing.responses += 1;
      return;
    }
    counts.set(respondent.supervisor, {
      name: respondent.supervisor,
      dept: respondent.department,
      responses: 1,
    });
  });

  return Array.from(counts.entries())
    .filter(([, value]) => value.responses >= minimumSegmentSize)
    .sort((left, right) => left[1].name.localeCompare(right[1].name))
    .map(([name, value]) => ({
      id: slugify(name),
      name,
      dept: value.dept,
      responses: value.responses,
    }));
}

export function projectCampaignResultsData(
  data: EmployeeExperienceDashboardData,
  options?: ProjectionOptions
) {
  const currentLabel = resolveCampaignLabel(data, options);
  const campaigns = sortedCampaigns(data.meta.campaigns);
  const comparisons = buildComparisons(campaigns, currentLabel);
  const byDimension = groupQuestionsByDimension(data.questions);

  return {
    client: buildClient(data, options),
    current: {
      id: campaignId(currentLabel),
      label: currentLabel,
      labelLong: currentLabel.toUpperCase(),
    },
    comparisons,
    scale: resolveScale(options),
    indexes: buildStatementProjections(data.questions, data.respondents, campaigns, currentLabel).map(
      (index) => ({
        ...index,
        score: buildPersonScoreCell(
          data.respondents,
          campaigns,
          currentLabel,
          (byDimension.get(index.name) ?? []).map((question) => question.itemId)
        ),
      })
    ),
    overallScore: buildPersonScoreCell(
      data.respondents,
      campaigns,
      currentLabel,
      data.questions.map((question) => question.itemId)
    ),
  };
}

export function projectDepartmentComparisonData(
  data: EmployeeExperienceDashboardData,
  options?: ProjectionOptions,
  groupField: "leadership" | "fieldCategory" = "fieldCategory"
) {
  const currentLabel = resolveCampaignLabel(data, options);
  const campaigns = sortedCampaigns(data.meta.campaigns);
  const jobCategories = buildJobCategories(
    data.respondents,
    currentLabel,
    data.settings.minimumSegmentSize,
    groupField
  );
  const scored = attachPersonScores(
    buildByJobCategoryStatements(
      data.questions,
      data.respondents,
      campaigns,
      currentLabel,
      jobCategories,
      groupField
    ),
    data.questions,
    data.respondents,
    campaigns,
    currentLabel,
    jobCategories,
    matchBy(groupField)
  );

  return {
    client: buildClient(data, options),
    current: {
      id: campaignId(currentLabel),
      label: currentLabel,
      labelLong: currentLabel.toUpperCase(),
    },
    comparisons: buildComparisons(campaigns, currentLabel),
    scale: resolveScale(options),
    display: {
      barAxis: { min: 30, max: 90, ticks: [40, 60, 80] },
      deltaAxis: { min: -10, max: 10, ticks: [-10, 0, 10] },
    },
    departments: jobCategories.map((category) => ({ id: category.id, name: category.name })),
    indexes: scored.indexes,
    overall: scored.overall,
  };
}

export function projectLocationComparisonData(
  data: EmployeeExperienceDashboardData,
  options?: ProjectionOptions
) {
  const currentLabel = resolveCampaignLabel(data, options);
  const campaigns = sortedCampaigns(data.meta.campaigns);
  const locations = buildLocations(
    data.respondents,
    currentLabel,
    data.settings.minimumSegmentSize
  );
  const scored = attachPersonScores(
    buildByLocationStatements(data.questions, data.respondents, campaigns, currentLabel, locations),
    data.questions,
    data.respondents,
    campaigns,
    currentLabel,
    locations,
    matchBy("location")
  );

  return {
    client: buildClient(data, options),
    current: {
      id: campaignId(currentLabel),
      label: currentLabel,
      labelLong: currentLabel.toUpperCase(),
    },
    comparisons: buildComparisons(campaigns, currentLabel),
    scale: resolveScale(options),
    display: {
      barAxis: { min: 30, max: 90, ticks: [40, 60, 80] },
      deltaAxis: { min: -10, max: 10, ticks: [-10, 0, 10] },
    },
    locations: locations.map((location) => ({ id: location.id, name: location.name })),
    indexes: scored.indexes,
    overall: scored.overall,
  };
}

export function projectDivisionComparisonData(
  data: EmployeeExperienceDashboardData,
  options?: ProjectionOptions
) {
  const currentLabel = resolveCampaignLabel(data, options);
  const campaigns = sortedCampaigns(data.meta.campaigns);
  const divisions = buildDivisions(
    data.respondents,
    currentLabel,
    data.settings.minimumSegmentSize
  );
  const scored = attachPersonScores(
    buildByDivisionStatements(data.questions, data.respondents, campaigns, currentLabel, divisions),
    data.questions,
    data.respondents,
    campaigns,
    currentLabel,
    divisions,
    matchBy("division")
  );

  return {
    client: buildClient(data, options),
    current: {
      id: campaignId(currentLabel),
      label: currentLabel,
      labelLong: currentLabel.toUpperCase(),
    },
    comparisons: buildComparisons(campaigns, currentLabel),
    scale: resolveScale(options),
    display: {
      barAxis: { min: 30, max: 90, ticks: [40, 60, 80] },
      deltaAxis: { min: -10, max: 10, ticks: [-10, 0, 10] },
    },
    locations: divisions.map((div) => ({ id: div.id, name: div.name })),
    indexes: scored.indexes,
    overall: scored.overall,
  };
}

export function projectDivisionReportData(
  data: EmployeeExperienceDashboardData,
  options?: ProjectionOptions
) {
  const currentLabel = resolveCampaignLabel(data, options);
  const campaigns = sortedCampaigns(data.meta.campaigns);
  const divisions = buildDivisions(
    data.respondents,
    currentLabel,
    data.settings.minimumSegmentSize
  );
  const comparisons = buildComparisons(campaigns, currentLabel);
  const scored = attachPersonScores(
    buildByJobCategoryStatements(
      data.questions,
      data.respondents,
      campaigns,
      currentLabel,
      divisions,
      "division"
    ),
    data.questions,
    data.respondents,
    campaigns,
    currentLabel,
    divisions,
    matchBy("division")
  );

  return {
    client: buildClient(data, options),
    current: {
      id: campaignId(currentLabel),
      label: currentLabel,
      labelLong: currentLabel.toUpperCase(),
    },
    comparisons,
    scale: resolveScale(options),
    departments: divisions,
    indexes: scored.indexes,
    overall: scored.overall,
    segments: buildSegments(
      data.respondents,
      data.questions,
      campaigns,
      currentLabel,
      divisions,
      data.settings.minimumSegmentSize,
      "division",
      data.meta.segmentFields
    ),
    segmentMinResponses: data.settings.minimumSegmentSize,
  };
}

export function projectJobCategoryReportData(
  data: EmployeeExperienceDashboardData,
  options?: ProjectionOptions,
  groupField: "leadership" | "fieldCategory" = "fieldCategory"
) {
  const currentLabel = resolveCampaignLabel(data, options);
  const campaigns = sortedCampaigns(data.meta.campaigns);
  const jobCategories = buildJobCategories(
    data.respondents,
    currentLabel,
    data.settings.minimumSegmentSize,
    groupField
  );
  const comparisons = buildComparisons(campaigns, currentLabel);
  const scored = attachPersonScores(
    buildByJobCategoryStatements(
      data.questions,
      data.respondents,
      campaigns,
      currentLabel,
      jobCategories,
      groupField
    ),
    data.questions,
    data.respondents,
    campaigns,
    currentLabel,
    jobCategories,
    matchBy(groupField)
  );

  return {
    client: buildClient(data, options),
    current: {
      id: campaignId(currentLabel),
      label: currentLabel,
      labelLong: currentLabel.toUpperCase(),
    },
    comparisons,
    scale: resolveScale(options),
    departments: jobCategories,
    indexes: scored.indexes,
    overall: scored.overall,
    segments: buildSegments(
      data.respondents,
      data.questions,
      campaigns,
      currentLabel,
      jobCategories,
      data.settings.minimumSegmentSize,
      groupField,
      data.meta.segmentFields
    ),
    segmentMinResponses: data.settings.minimumSegmentSize,
  };
}

export function projectDepartmentReportData(
  data: EmployeeExperienceDashboardData,
  options?: ProjectionOptions
) {
  const currentLabel = resolveCampaignLabel(data, options);
  const campaigns = sortedCampaigns(data.meta.campaigns);
  const departments = buildDepartments(
    data.respondents,
    currentLabel,
    data.settings.minimumSegmentSize
  );
  const comparisons = buildComparisons(campaigns, currentLabel);
  const scored = attachPersonScores(
    buildByDeptStatements(data.questions, data.respondents, campaigns, currentLabel, departments),
    data.questions,
    data.respondents,
    campaigns,
    currentLabel,
    departments,
    matchBy("department")
  );

  return {
    client: buildClient(data, options),
    current: {
      id: campaignId(currentLabel),
      label: currentLabel,
      labelLong: currentLabel.toUpperCase(),
    },
    comparisons,
    scale: resolveScale(options),
    departments,
    indexes: scored.indexes,
    overall: scored.overall,
    segments: buildSegments(
      data.respondents,
      data.questions,
      campaigns,
      currentLabel,
      departments,
      data.settings.minimumSegmentSize,
      "department",
      data.meta.segmentFields
    ),
    segmentMinResponses: data.settings.minimumSegmentSize,
  };
}

export function projectDepartmentComparisonByDepartmentData(
  data: EmployeeExperienceDashboardData,
  options?: ProjectionOptions
) {
  const currentLabel = resolveCampaignLabel(data, options);
  const campaigns = sortedCampaigns(data.meta.campaigns);
  const departments = buildDepartments(
    data.respondents,
    currentLabel,
    data.settings.minimumSegmentSize
  );
  const scored = attachPersonScores(
    buildByDeptStatements(data.questions, data.respondents, campaigns, currentLabel, departments),
    data.questions,
    data.respondents,
    campaigns,
    currentLabel,
    departments,
    matchBy("department")
  );

  return {
    client: buildClient(data, options),
    current: {
      id: campaignId(currentLabel),
      label: currentLabel,
      labelLong: currentLabel.toUpperCase(),
    },
    comparisons: buildComparisons(campaigns, currentLabel),
    scale: resolveScale(options),
    display: {
      barAxis: { min: 30, max: 90, ticks: [40, 60, 80] },
      deltaAxis: { min: -10, max: 10, ticks: [-10, 0, 10] },
    },
    departments: departments.map((department) => ({ id: department.id, name: department.name })),
    indexes: scored.indexes,
    overall: scored.overall,
  };
}

export function projectBrandReportData(
  data: EmployeeExperienceDashboardData,
  options?: ProjectionOptions
) {
  const currentLabel = resolveCampaignLabel(data, options);
  const campaigns = sortedCampaigns(data.meta.campaigns);
  const brands = buildBrands(
    data.respondents,
    currentLabel,
    data.settings.minimumSegmentSize
  );
  const comparisons = buildComparisons(campaigns, currentLabel);
  const supervisorDimension = findSupervisorDimension(data.questions);
  const supervisorQuestions = data.questions.filter(
    (question) => question.dimension === supervisorDimension
  );
  const scoredBrands = attachPersonScores(
    buildByBrandStatements(data.questions, data.respondents, campaigns, currentLabel, brands),
    data.questions,
    data.respondents,
    campaigns,
    currentLabel,
    brands,
    matchBy("location")
  );
  const enpsItemIds = (data.enpsDefinitions ?? []).map((definition) => definition.itemId);
  const enpsByDept: Record<string, { current: number | null; comparisons: Record<string, number | null> }> =
    Object.fromEntries(
      brands.map((brand) => {
        const scoreFor = (campaignLabel: string) => {
          const scores = respondentsForCampaign(data.respondents, campaignLabel)
            .filter((respondent) => respondent.location === brand.name)
            .map((respondent) => enpsResponseScore(respondent, enpsItemIds))
            .filter((value): value is number => value != null);
          return scores.length > 0 ? round1(average(scores)) : null;
        };

        return [
          brand.id,
          {
            current: scoreFor(currentLabel),
            comparisons: Object.fromEntries(
              comparisons.map((comparison) => {
                const priorLabel =
                  campaigns.find((label) => campaignId(label) === comparison.id) ?? comparison.label;
                return [comparison.id, scoreFor(priorLabel)];
              })
            ) as Record<string, number | null>,
          },
        ];
      })
    );
  const supervisorHeatmapByDept = Object.fromEntries(
    brands.map((brand) => {
      const brandCurrentRespondents = respondentsForCampaign(data.respondents, currentLabel).filter(
        (respondent) => respondent.location === brand.name
      );
      const supervisorCounts = new Map<string, number>();
      brandCurrentRespondents.forEach((respondent) => {
        if (!isKnownSupervisor(respondent.supervisor)) return;
        supervisorCounts.set(
          respondent.supervisor,
          (supervisorCounts.get(respondent.supervisor) ?? 0) + 1
        );
      });
      const supervisors = Array.from(supervisorCounts.entries())
        .filter(([, count]) => count >= data.settings.minimumSegmentSize)
        .sort((left, right) => left[0].localeCompare(right[0]))
        .map(([name, responses]) => ({
          id: `${brand.id}-${slugify(name)}`,
          name,
          responses,
        }));
      const statements = supervisorQuestions.map((question, index) => ({
        id: `lead-${index + 1}`,
        text: question.statement,
        brandOverall: itemDisplayScore(brandCurrentRespondents, question.itemId),
        scoresBySupervisor: Object.fromEntries(
          supervisors.map((supervisor) => {
            const score = itemDisplayScore(
              brandCurrentRespondents.filter(
                (respondent) => `${brand.id}-${slugify(respondent.supervisor)}` === supervisor.id
              ),
              question.itemId
            );
            return [supervisor.id, score];
          })
        ) as Record<string, number>,
      }));
      return [brand.id, { supervisors, statements }];
    })
  );

  return {
    client: buildClient(data, options),
    current: {
      id: campaignId(currentLabel),
      label: currentLabel,
      labelLong: currentLabel.toUpperCase(),
    },
    comparisons,
    scale: resolveScale(options),
    departments: brands,
    indexes: scoredBrands.indexes,
    overall: scoredBrands.overall,
    segments: buildBrandSegments(
      data.respondents,
      data.questions,
      campaigns,
      currentLabel,
      brands,
      data.settings.minimumSegmentSize,
      data.meta.segmentFields
    ),
    enpsByDept,
    supervisorHeatmap: {
      indexName: supervisorDimension,
      byDept: supervisorHeatmapByDept,
    },
    segmentMinResponses: data.settings.minimumSegmentSize,
  };
}

export interface SegmentBreakdownValue {
  key: string;
  label: string;
  n: number;
}

export interface SegmentBreakdownIndexRef {
  id: string;
  name: string;
  score: number;
}

export interface SegmentBreakdownStatementRow {
  /** Stable row key — prior-campaign rows are matched on this, not on order. */
  key: string;
  text: string;
  scores: Record<string, number>;
  overall: number;
}

/** One statement (or, on the All Indexes rail tab, one index) in a prior campaign. */
export interface SegmentBreakdownPriorStatement {
  scores: Record<string, number | null>;
  overall: number | null;
}

/**
 * Everything the breakdown needs to render "change from a previous survey"
 * without re-projecting: the same funnel/heatmap grain, scored on a prior
 * campaign's respondents. `null` means that cell had too few responses in the
 * prior campaign to show (same minimum-segment rule as the current campaign).
 */
export interface SegmentBreakdownPriorCampaign {
  id: string;
  label: string;
  /** index id -> unit-level index score */
  indexScores: Record<string, number | null>;
  /** index id -> segment key -> score */
  funnelByIndex: Record<string, Record<string, number | null>>;
  /** index id -> statement key -> prior scores */
  statementsByIndex: Record<string, Record<string, SegmentBreakdownPriorStatement>>;
}

export interface SegmentBreakdownUnit {
  respondents: number;
  segments: SegmentBreakdownValue[];
  indexes: SegmentBreakdownIndexRef[];
  funnelByIndex: Record<string, Record<string, number>>;
  statementsByIndex: Record<string, SegmentBreakdownStatementRow[]>;
  /** Only populated when the `priorCampaigns` feature is requested. */
  priorByCampaign?: Record<string, SegmentBreakdownPriorCampaign>;
}

export interface SegmentBreakdownProjection {
  client: ReturnType<typeof buildClient>;
  current: { id: string; label: string; labelLong: string };
  scale: ScoreScale;
  segmentLabel: string;
  departments: Array<{ id: string; name: string; location?: string; responses: number }>;
  byUnit: Record<string, SegmentBreakdownUnit>;
  /** Every campaign other than the current one, oldest first. Empty unless the
   * `priorCampaigns` feature is requested. */
  comparisons: Array<{ id: string; label: string; labelLong: string }>;
  /** The campaign immediately before the current one — the natural default for
   * a "change from the previous survey" toggle. */
  previousId: string | null;
}

/**
 * Opt-in extras for a breakdown page. Both are pilot features currently wired
 * only to DWS office's Division Breakdown; every other breakdown keeps the
 * original index-only rail and score-only visuals until they're rolled out.
 */
export type SegmentBreakdownFeatures = {
  /** Prepend an "All Indexes" summary tab to the index rail. */
  allIndexesTab?: boolean;
  /** Score every visual against prior campaigns so a delta toggle can work. */
  priorCampaigns?: boolean;
};

/** Rail id of the synthetic "All Indexes" tab (every real index is a slug). */
export const ALL_INDEXES_ID = "all-indexes-summary";
export const ALL_INDEXES_NAME = "All Indexes";

// A Segment Breakdown's "unit" is the top-level picker (the thing you drill
// into): Basin, Department, Job Category, or a single synthetic unit (AutoSEP).
// `build` lists the units; `match` scopes respondents to one unit.
type BreakdownUnit = {
  build: (
    respondents: EmployeeExperienceRespondent[],
    currentLabel: string,
    minimumSegmentSize: number
  ) => Array<{ id: string; name: string; location?: string; responses: number }>;
  match: (respondent: EmployeeExperienceRespondent, unitName: string) => boolean;
};

const BREAKDOWN_UNIT_BASIN: BreakdownUnit = {
  build: (respondents, currentLabel, minimumSegmentSize) =>
    buildBrands(respondents, currentLabel, minimumSegmentSize),
  match: (respondent, unitName) => respondent.location === unitName,
};

const BREAKDOWN_UNIT_DEPARTMENT: BreakdownUnit = {
  build: (respondents, currentLabel, minimumSegmentSize) =>
    buildDepartments(respondents, currentLabel, minimumSegmentSize),
  match: (respondent, unitName) => respondent.department === unitName,
};

const BREAKDOWN_UNIT_JOB_CATEGORY: BreakdownUnit = {
  build: (respondents, currentLabel, minimumSegmentSize) =>
    buildJobCategories(respondents, currentLabel, minimumSegmentSize),
  match: (respondent, unitName) => (respondent.fieldCategory ?? "") === unitName,
};

const BREAKDOWN_UNIT_DIVISION: BreakdownUnit = {
  build: (respondents, currentLabel, minimumSegmentSize) =>
    buildDivisions(respondents, currentLabel, minimumSegmentSize),
  match: (respondent, unitName) => (respondent.division ?? "") === unitName,
};

// DWS "Role" group is defined on the leadership field (People Leader vs.
// Individual Contributor), so its breakdown drills into leadership.
const BREAKDOWN_UNIT_LEADERSHIP: BreakdownUnit = {
  build: (respondents, currentLabel, minimumSegmentSize) =>
    buildJobCategories(respondents, currentLabel, minimumSegmentSize, "leadership"),
  match: (respondent, unitName) => (respondent.leadership ?? "") === unitName,
};

const BREAKDOWN_UNIT_SUPERVISOR: BreakdownUnit = {
  build: (respondents, currentLabel, minimumSegmentSize) =>
    buildSupervisors(respondents, currentLabel, minimumSegmentSize).map((supervisor) => ({
      id: supervisor.id,
      name: supervisor.name,
      location: supervisor.dept,
      responses: supervisor.responses,
    })),
  match: (respondent, unitName) => respondent.supervisor === unitName,
};

// A single synthetic unit spanning the whole (already-scoped) respondent set —
// used for AutoSEP, which is one designation rather than a set of units.
const breakdownUnitSingle = (label: string): BreakdownUnit => ({
  build: (respondents, currentLabel) => {
    const currentRespondents = respondentsForCampaign(respondents, currentLabel);
    return [{ id: "all", name: label, location: "", responses: currentRespondents.length }];
  },
  match: () => true,
});

// A segment dimension a breakdown can slice a unit by. `field` must be a
// populated demographic on the respondent for the scope in question — an
// all-"Unspecified" field yields zero segments and the section is dropped.
export type BreakdownDimension = {
  field: keyof EmployeeExperienceRespondent;
  label: string;
};

// Field (dws-field) demographics: Job Category / Role are the meaningful field
// segments; Division/Leadership aren't used there.
const FIELD_BREAKDOWN_DIMENSIONS: BreakdownDimension[] = [
  { field: "fieldCategory", label: "Job Category" },
  { field: "department", label: "Department" },
  { field: "role", label: "Role" },
  { field: "tenure", label: "Tenure" },
];

// DWS office demographics: Job Category / Role columns are absent (all
// "Unspecified"), so office slices by the fields it actually populates.
// Keep the five peer org cuts cross-available on every breakdown page
// (Division / Basin / Department / Role / Supervisor) — the active unit
// collapses to one segment and is dropped by the ≥2 rule, leaving the
// other four in the switcher. Tenure stays as an extra cut.
export const OFFICE_BREAKDOWN_DIMENSIONS: BreakdownDimension[] = [
  { field: "division", label: "Division" },
  { field: "location", label: "Basin" },
  { field: "department", label: "Department" },
  { field: "leadership", label: "Role" },
  { field: "supervisor", label: "Supervisor" },
  { field: "tenure", label: "Tenure" },
];

// CSG demographics for Brand Breakdown: keep Brand as the primary unit and
// slice by the operational segment fields users requested.
export const CSG_BREAKDOWN_DIMENSIONS: BreakdownDimension[] = [
  { field: "fieldCategory", label: "Job Category" },
  { field: "department", label: "Department" },
  { field: "supervisor", label: "Supervisor" },
  { field: "tenure", label: "Tenure" },
  { field: "generation", label: "Generation" },
];

// Builds one breakdown projection per dimension for a given unit. The dimension
// that equals the unit collapses to a single segment and is filtered out
// downstream by the component's ≥2 rule.
function buildBreakdownSet(
  data: EmployeeExperienceDashboardData,
  options: ProjectionOptions | undefined,
  unit: BreakdownUnit,
  dimensions: BreakdownDimension[] = FIELD_BREAKDOWN_DIMENSIONS,
  features?: SegmentBreakdownFeatures
): SegmentBreakdownProjection[] {
  return dimensions.map((dimension) =>
    projectSegmentBreakdownData(data, options, dimension.field, dimension.label, unit, features)
  );
}

// The "unit" a Segment Breakdown drills into (the top-level picker dimension).
export type BreakdownUnitKey =
  | "basin"
  | "division"
  | "department"
  | "jobCategory"
  | "leadership"
  | "supervisor"
  | "autosep";

// On-demand builder for a single breakdown set. Called from the dashboard only
// when a breakdown perspective is actually active, so the heavy projection work
// never runs for the other (far more common) perspectives.
export function projectBreakdownSet(
  data: EmployeeExperienceDashboardData,
  options: ProjectionOptions | undefined,
  unitKey: BreakdownUnitKey,
  dimensions?: BreakdownDimension[],
  features?: SegmentBreakdownFeatures
): SegmentBreakdownProjection[] {
  const unit =
    unitKey === "basin"
      ? BREAKDOWN_UNIT_BASIN
      : unitKey === "division"
        ? BREAKDOWN_UNIT_DIVISION
        : unitKey === "department"
          ? BREAKDOWN_UNIT_DEPARTMENT
          : unitKey === "jobCategory"
            ? BREAKDOWN_UNIT_JOB_CATEGORY
            : unitKey === "leadership"
              ? BREAKDOWN_UNIT_LEADERSHIP
              : unitKey === "supervisor"
                ? BREAKDOWN_UNIT_SUPERVISOR
                : breakdownUnitSingle("AutoSEP");
  return buildBreakdownSet(data, options, unit, dimensions, features);
}

// Segment Breakdown (DWS Field redesign pilot only): for each basin, scores a
// segment dimension (Job Category by default — Greenhat, Leadhand, Roughneck,
// Operator, Supervisor, …) per index (funnel) and per statement (heatmap), so a
// leader can compare how the segment performs within their own unit. Unlike
// `buildBrandSegments` (a single blended score per group), this keeps the full
// index/statement grain so the funnel and heatmap can both re-score together
// when the rail index changes. Reuses the same respondent slicing and
// `itemDisplayScore` math as every other report projector in this file.
export function projectSegmentBreakdownData(
  data: EmployeeExperienceDashboardData,
  options?: ProjectionOptions,
  segmentField: keyof EmployeeExperienceRespondent = "fieldCategory",
  segmentLabel = "Job Category",
  unit: BreakdownUnit = BREAKDOWN_UNIT_BASIN,
  features?: SegmentBreakdownFeatures
): SegmentBreakdownProjection {
  const currentLabel = resolveCampaignLabel(data, options);
  const minimumSegmentSize = data.settings.minimumSegmentSize;
  const units = unit.build(data.respondents, currentLabel, minimumSegmentSize);
  const currentRespondents = respondentsForCampaign(data.respondents, currentLabel);
  const indexDefs = Array.from(groupQuestionsByDimension(data.questions).entries()).map(
    ([name, items]) => ({ id: slugify(name), name, items })
  );
  const allItemIds = indexDefs.flatMap((def) => def.items.map((question) => question.itemId));

  const sorted = sortedCampaigns(data.meta.campaigns);
  const comparisons = features?.priorCampaigns ? buildComparisons(sorted, currentLabel) : [];
  const currentPosition = sorted.indexOf(currentLabel);
  const previousLabel = currentPosition > 0 ? sorted[currentPosition - 1] : null;
  const priorLabels = comparisons.map(
    (comparison) => sorted.find((label) => campaignId(label) === comparison.id) ?? comparison.label
  );

  const byUnit: Record<string, SegmentBreakdownUnit> = {};

  units.forEach((brand) => {
    const unitRespondents = currentRespondents.filter((respondent) => unit.match(respondent, brand.name));

    const counts = new Map<string, number>();
    unitRespondents.forEach((respondent) => {
      const value = String(respondent[segmentField] ?? "").trim();
      if (segmentField === "supervisor" && !isKnownSupervisor(value)) return;
      if (segmentField === "location" && !isKnownBrandSegment(value)) return;
      if (!value || value === "Unspecified" || value === "Unknown Job Title") return;
      counts.set(value, (counts.get(value) ?? 0) + 1);
    });
    const segments: SegmentBreakdownValue[] = Array.from(counts.entries())
      .filter(([, n]) => n >= minimumSegmentSize)
      .sort((left, right) => left[0].localeCompare(right[0]))
      .map(([name, n]) => ({ key: slugify(name), label: name, n }));

    const respondentsForSegment = (key: string) =>
      unitRespondents.filter((respondent) => slugify(String(respondent[segmentField] ?? "")) === key);

    const indexes: SegmentBreakdownIndexRef[] = indexDefs.map((def) => ({
      id: def.id,
      name: def.name,
      score:
        personAverageScore(
          unitRespondents,
          def.items.map((question) => question.itemId)
        ) ?? 0,
    }));

    const funnelByIndex: Record<string, Record<string, number>> = {};
    const statementsByIndex: Record<string, SegmentBreakdownStatementRow[]> = {};

    indexDefs.forEach((def) => {
      const funnelRow: Record<string, number> = {};
      segments.forEach((segment) => {
        funnelRow[segment.key] =
          personAverageScore(
            respondentsForSegment(segment.key),
            def.items.map((question) => question.itemId)
          ) ?? 0;
      });
      funnelByIndex[def.id] = funnelRow;

      statementsByIndex[def.id] = def.items
        .map((question) => {
          const scores: Record<string, number> = {};
          segments.forEach((segment) => {
            scores[segment.key] = itemDisplayScore(respondentsForSegment(segment.key), question.itemId);
          });
          return {
            key: `item-${question.itemId}`,
            text: question.statement,
            scores,
            overall: itemDisplayScore(unitRespondents, question.itemId),
          };
        })
        .sort((left, right) => {
          const byOverall = right.overall - left.overall;
          if (byOverall !== 0) return byOverall;
          return left.text.localeCompare(right.text);
        });
    });

    // "All Indexes": one synthetic rail tab scored on every statement at once,
    // whose heatmap rows are the indexes themselves rather than statements —
    // the same drill-down one level up.
    if (features?.allIndexesTab && indexDefs.length > 1) {
      indexes.unshift({
        id: ALL_INDEXES_ID,
        name: ALL_INDEXES_NAME,
        score: personAverageScore(unitRespondents, allItemIds) ?? 0,
      });

      const overallFunnel: Record<string, number> = {};
      segments.forEach((segment) => {
        overallFunnel[segment.key] = personAverageScore(respondentsForSegment(segment.key), allItemIds) ?? 0;
      });
      funnelByIndex[ALL_INDEXES_ID] = overallFunnel;

      statementsByIndex[ALL_INDEXES_ID] = indexDefs
        .map((def) => {
          const itemIds = def.items.map((question) => question.itemId);
          const scores: Record<string, number> = {};
          segments.forEach((segment) => {
            scores[segment.key] = personAverageScore(respondentsForSegment(segment.key), itemIds) ?? 0;
          });
          return {
            key: def.id,
            text: def.name,
            scores,
            overall: personAverageScore(unitRespondents, itemIds) ?? 0,
          };
        })
        .sort((left, right) => {
          const byOverall = right.overall - left.overall;
          if (byOverall !== 0) return byOverall;
          return left.text.localeCompare(right.text);
        });
    }

    // Prior campaigns, scored at exactly the same grain so the delta toggle is
    // a pure display switch. A cell whose prior population is below the
    // minimum segment size stays `null` — shown as "—" rather than a delta
    // computed off a handful of people.
    let priorByCampaign: Record<string, SegmentBreakdownPriorCampaign> | undefined;
    if (features?.priorCampaigns && comparisons.length > 0) {
      priorByCampaign = {};
      comparisons.forEach((comparison, comparisonIndex) => {
        const priorRespondents = respondentsForCampaign(data.respondents, priorLabels[comparisonIndex]).filter(
          (respondent) => unit.match(respondent, brand.name)
        );
        const priorUnitRows = priorRespondents.length >= minimumSegmentSize ? priorRespondents : null;
        const priorSegment = (key: string) => {
          const rows = priorRespondents.filter(
            (respondent) => slugify(String(respondent[segmentField] ?? "")) === key
          );
          return rows.length >= minimumSegmentSize ? rows : null;
        };
        const priorScore = (rows: EmployeeExperienceRespondent[] | null, itemIds: number[]) =>
          rows ? personAverageScore(rows, itemIds) : null;

        const indexScores: Record<string, number | null> = {};
        const priorFunnelByIndex: Record<string, Record<string, number | null>> = {};
        const priorStatementsByIndex: Record<string, Record<string, SegmentBreakdownPriorStatement>> = {};

        const scoreOneTab = (
          tabId: string,
          rows: Array<{ key: string; itemIds: number[] }>,
          tabItemIds: number[]
        ) => {
          indexScores[tabId] = priorScore(priorUnitRows, tabItemIds);
          const funnel: Record<string, number | null> = {};
          segments.forEach((segment) => {
            funnel[segment.key] = priorScore(priorSegment(segment.key), tabItemIds);
          });
          priorFunnelByIndex[tabId] = funnel;

          const statements: Record<string, SegmentBreakdownPriorStatement> = {};
          rows.forEach((row) => {
            const scores: Record<string, number | null> = {};
            segments.forEach((segment) => {
              scores[segment.key] = priorScore(priorSegment(segment.key), row.itemIds);
            });
            statements[row.key] = {
              scores,
              overall: priorScore(priorUnitRows, row.itemIds),
            };
          });
          priorStatementsByIndex[tabId] = statements;
        };

        indexDefs.forEach((def) => {
          const itemIds = def.items.map((question) => question.itemId);
          scoreOneTab(
            def.id,
            def.items.map((question) => ({ key: `item-${question.itemId}`, itemIds: [question.itemId] })),
            itemIds
          );
        });

        if (statementsByIndex[ALL_INDEXES_ID]) {
          scoreOneTab(
            ALL_INDEXES_ID,
            indexDefs.map((def) => ({ key: def.id, itemIds: def.items.map((question) => question.itemId) })),
            allItemIds
          );
        }

        priorByCampaign![comparison.id] = {
          id: comparison.id,
          label: comparison.label,
          indexScores,
          funnelByIndex: priorFunnelByIndex,
          statementsByIndex: priorStatementsByIndex,
        };
      });
    }

    byUnit[brand.id] = {
      respondents: unitRespondents.length,
      segments,
      indexes,
      funnelByIndex,
      statementsByIndex,
      priorByCampaign,
    };
  });

  return {
    client: buildClient(data, options),
    current: {
      id: campaignId(currentLabel),
      label: currentLabel,
      labelLong: currentLabel.toUpperCase(),
    },
    scale: resolveScale(options),
    segmentLabel,
    departments: units,
    byUnit,
    comparisons,
    previousId: previousLabel ? campaignId(previousLabel) : null,
  };
}

export function projectSupervisorReportData(
  data: EmployeeExperienceDashboardData,
  options?: ProjectionOptions
) {
  const currentLabel = resolveCampaignLabel(data, options);
  const campaigns = sortedCampaigns(data.meta.campaigns);
  const comparisons = buildComparisons(campaigns, currentLabel);
  const supervisorDimension = findSupervisorDimension(data.questions);
  const supervisorQuestions = data.questions.filter(
    (question) => question.dimension === supervisorDimension
  );
  const supervisors = buildSupervisors(
    data.respondents,
    currentLabel,
    data.settings.minimumSegmentSize
  );
  const currentRespondents = respondentsForCampaign(data.respondents, currentLabel);

  const statements = supervisorQuestions.map((question, index) => {
    const bySup: Record<string, { current: number; comparisons: Record<string, number> }> = {};
    supervisors.forEach((supervisor) => {
      const slice = (campaignLabel: string) =>
        respondentsForCampaign(data.respondents, campaignLabel).filter(
          (respondent) => respondent.supervisor === supervisor.name
        );
      bySup[supervisor.id] = {
        current: itemDisplayScore(slice(currentLabel), question.itemId),
        comparisons: Object.fromEntries(
          comparisons.map((comparison) => {
            const priorLabel =
              campaigns.find((label) => campaignId(label) === comparison.id) ?? comparison.label;
            return [comparison.id, itemDisplayScore(slice(priorLabel), question.itemId)];
          })
        ),
      };
    });

    const orgCurrent = itemDisplayScore(currentRespondents, question.itemId);
    const orgComparisons = Object.fromEntries(
      comparisons.map((comparison) => {
        const priorLabel =
          campaigns.find((label) => campaignId(label) === comparison.id) ?? comparison.label;
        return [
          comparison.id,
          itemDisplayScore(respondentsForCampaign(data.respondents, priorLabel), question.itemId),
        ];
      })
    );

    return {
      id: `mgr-s${index + 1}`,
      text: question.statement,
      bySup,
      org: {
        current: orgCurrent,
        comparisons: orgComparisons,
      },
    };
  });

  return {
    client: buildClient(data, options),
    current: {
      id: campaignId(currentLabel),
      label: currentLabel,
      labelLong: currentLabel.toUpperCase(),
    },
    comparisons,
    scale: resolveScale(options),
    display: { barAxis: { min: 55, max: 100, ticks: [60, 70, 80, 90, 100] } },
    supervisors,
    index: {
      id: slugify(supervisorDimension),
      name: supervisorDimension,
      statements,
      score: buildGroupScores(
        data.respondents,
        campaigns,
        currentLabel,
        supervisorQuestions.map((question) => question.itemId),
        supervisors,
        matchBy("supervisor")
      ),
    },
  };
}

// Supervisor treated as a normal segment (like department) across ALL indexes,
// rendered by the department report component (field dashboard).
export function projectSupervisorSegmentReportData(
  data: EmployeeExperienceDashboardData,
  options?: ProjectionOptions
) {
  const currentLabel = resolveCampaignLabel(data, options);
  const campaigns = sortedCampaigns(data.meta.campaigns);
  const comparisons = buildComparisons(campaigns, currentLabel);
  const supervisors = buildSupervisors(
    data.respondents,
    currentLabel,
    data.settings.minimumSegmentSize
  );

  // DWS office only: the Supervisor report shows only the Supervisor index's
  // statements — no index rail, no other indexes. Scope the projected indexes
  // to just the supervisor/manager dimension so the chart + statement table
  // render that single set (the component drops the rail automatically at one
  // index). Field keeps all indexes (it was explicitly reworked to behave like
  // a normal segment report).
  const allSupervisorIndexes = buildBySupervisorStatements(
    data.questions,
    data.respondents,
    campaigns,
    currentLabel,
    supervisors
  );
  const supervisorDimensionId = slugify(findSupervisorDimension(data.questions));
  const supervisorOnly = allSupervisorIndexes.filter(
    (index) => index.id === supervisorDimensionId
  );
  const supervisorIndexes =
    options?.supervisorSingleIndex && supervisorOnly.length > 0
      ? supervisorOnly
      : allSupervisorIndexes;
  const scopedQuestions = data.questions.filter((question) =>
    supervisorIndexes.some((index) => index.name === question.dimension)
  );
  const scoredSupervisors = attachPersonScores(
    supervisorIndexes,
    scopedQuestions,
    data.respondents,
    campaigns,
    currentLabel,
    supervisors,
    matchBy("supervisor")
  );

  return {
    client: buildClient(data, options),
    current: {
      id: campaignId(currentLabel),
      label: currentLabel,
      labelLong: currentLabel.toUpperCase(),
    },
    comparisons,
    scale: resolveScale(options),
    departments: supervisors,
    indexes: scoredSupervisors.indexes,
    overall: scoredSupervisors.overall,
    segments: buildSegments(
      data.respondents,
      data.questions,
      campaigns,
      currentLabel,
      supervisors,
      data.settings.minimumSegmentSize,
      "supervisor",
      data.meta.segmentFields
    ),
    segmentMinResponses: data.settings.minimumSegmentSize,
  };
}

// Supervisor comparison is always the Supervisor index only — no Culture /
// Engage/etc. rails. (The dedicated Supervisor Report can still show all
// indexes on field; Comparison stays single-index everywhere.)
export function projectSupervisorComparisonData(
  data: EmployeeExperienceDashboardData,
  options?: ProjectionOptions
) {
  const currentLabel = resolveCampaignLabel(data, options);
  const campaigns = sortedCampaigns(data.meta.campaigns);
  const supervisors = buildSupervisors(
    data.respondents,
    currentLabel,
    data.settings.minimumSegmentSize
  );

  const allIndexes = buildBySupervisorStatements(
    data.questions,
    data.respondents,
    campaigns,
    currentLabel,
    supervisors
  );
  const supervisorDimensionId = slugify(findSupervisorDimension(data.questions));
  const supervisorOnly = allIndexes.filter((index) => index.id === supervisorDimensionId);
  const indexes = supervisorOnly.length > 0 ? supervisorOnly : allIndexes;
  const scored = attachPersonScores(
    indexes,
    data.questions.filter((question) => indexes.some((index) => index.name === question.dimension)),
    data.respondents,
    campaigns,
    currentLabel,
    supervisors,
    matchBy("supervisor")
  );

  return {
    client: buildClient(data, options),
    current: {
      id: campaignId(currentLabel),
      label: currentLabel,
      labelLong: currentLabel.toUpperCase(),
    },
    comparisons: buildComparisons(campaigns, currentLabel),
    scale: resolveScale(options),
    display: {
      barAxis: { min: 30, max: 90, ticks: [40, 60, 80] },
      deltaAxis: { min: -10, max: 10, ticks: [-10, 0, 10] },
    },
    departments: supervisors.map((supervisor) => ({ id: supervisor.id, name: supervisor.name })),
    indexes: scored.indexes,
    overall: scored.overall,
  };
}

export function projectEnpsReportData(
  data: EmployeeExperienceDashboardData,
  options?: ProjectionOptions
): EnpsReportProjection {
  const campaigns = sortedCampaigns(data.meta.campaigns);
  const currentLabel = resolveCampaignLabel(data, options);
  const currentIndex = campaigns.findIndex((label) => label === currentLabel);
  const previousLabel =
    currentIndex > 0
      ? campaigns[currentIndex - 1]
      : campaigns.filter((label) => label !== currentLabel).at(-1) ?? null;
  const enpsDefinitions = data.enpsDefinitions ?? [];
  const itemIds = enpsDefinitions.map((definition) => definition.itemId);
  const currentRespondents = respondentsForCampaign(data.respondents, currentLabel);
  const previousRespondents = previousLabel
    ? respondentsForCampaign(data.respondents, previousLabel)
    : [];

  const statementLabel =
    enpsDefinitions[0]?.statement?.trim() || "I would recommend this company as a great place to work.";

  if (itemIds.length === 0) {
    return {
      client: buildClient(data, options),
      current: {
        id: campaignId(currentLabel),
        label: currentLabel,
        labelLong: currentLabel.toUpperCase(),
      },
      previous: previousLabel
        ? {
            id: campaignId(previousLabel),
            label: previousLabel,
            labelLong: previousLabel.toUpperCase(),
          }
        : null,
      hasEnpsData: false,
      statementLabel,
      summary: {
        responses: 0,
        score: 0,
        previousScore: null,
        delta: null,
      },
      brandRows: [],
      departmentRows: [],
      supervisorRows: [],
    };
  }

  const currentScores = currentRespondents
    .map((respondent) => enpsResponseScore(respondent, itemIds))
    .filter((value): value is number => value !== null);
  const previousScores = previousRespondents
    .map((respondent) => enpsResponseScore(respondent, itemIds))
    .filter((value): value is number => value !== null);
  const currentScore = currentScores.length > 0 ? round1(average(currentScores)) : 0;
  const previousScore = previousScores.length > 0 ? round1(average(previousScores)) : null;

  return {
    client: buildClient(data, options),
    current: {
      id: campaignId(currentLabel),
      label: currentLabel,
      labelLong: currentLabel.toUpperCase(),
    },
    previous: previousLabel
      ? {
          id: campaignId(previousLabel),
          label: previousLabel,
          labelLong: previousLabel.toUpperCase(),
        }
      : null,
    hasEnpsData: currentScores.length > 0,
    statementLabel,
    summary: {
      responses: currentScores.length,
      score: currentScore,
      previousScore,
      delta: previousScore == null ? null : round1(currentScore - previousScore),
    },
    brandRows: buildEnpsRows(
      currentRespondents,
      previousRespondents,
      itemIds,
      3,
      (respondent) => respondent.location,
      (group) => isKnownBrandSegment(group)
    ),
    departmentRows: buildEnpsRows(
      currentRespondents,
      previousRespondents,
      itemIds,
      data.settings.minimumSegmentSize,
      (respondent) => respondent.department
    ),
    supervisorRows: buildEnpsRows(
      currentRespondents,
      previousRespondents,
      itemIds,
      data.settings.minimumSegmentSize,
      (respondent) => respondent.supervisor
    ),
  };
}

export function projectHistoricalData(
  data: EmployeeExperienceDashboardData,
  options?: ProjectionOptions
) {
  const campaigns = sortedCampaigns(data.meta.campaigns);
  const currentLabel = resolveCampaignLabel(data, options);
  const departmentStats = new Map<
    string,
    { location: string; byCampaign: Record<string, number>; maxResponses: number }
  >();
  data.respondents.forEach((respondent) => {
    const existing = departmentStats.get(respondent.department) ?? {
      location: respondent.location,
      byCampaign: {},
      maxResponses: 0,
    };
    const next = (existing.byCampaign[respondent.campaignLabel] ?? 0) + 1;
    existing.byCampaign[respondent.campaignLabel] = next;
    existing.maxResponses = Math.max(existing.maxResponses, next);
    if (!existing.location && respondent.location) {
      existing.location = respondent.location;
    }
    departmentStats.set(respondent.department, existing);
  });
  const departments = Array.from(departmentStats.entries())
    .filter(([, stats]) => stats.maxResponses >= data.settings.minimumSegmentSize)
    .sort((left, right) => left[0].localeCompare(right[0]))
    .map(([name, stats]) => ({
      id: slugify(name),
      name,
      location: stats.location,
      responses: stats.byCampaign[currentLabel] ?? 0,
      responsesByCampaign: Object.fromEntries(
        campaigns.map((campaignLabel) => [campaignId(campaignLabel), stats.byCampaign[campaignLabel] ?? 0])
      ) as Record<string, number>,
    }));

  const historyCampaigns = campaigns.map((label, index) => ({
    id: campaignId(label),
    label,
    short: label,
    month: index * 5,
  }));

  const latestCampaignLabel = campaigns[campaigns.length - 1] ?? "";
  const latestCampaignId = campaignId(latestCampaignLabel);

  const unsortedIndexes = Array.from(groupQuestionsByDimension(data.questions).entries()).map(
    ([dimension, items]) => ({
      id: slugify(dimension),
      name: dimension,
      statements: items.map((question, index) => {
        const byDept: Record<string, Record<string, number | null>> = {};
        departments.forEach((department) => {
          const series: Record<string, number | null> = {};
          campaigns.forEach((campaignLabel) => {
            const deptRespondents = respondentsForCampaign(data.respondents, campaignLabel).filter(
              (respondent) => respondent.department === department.name
            );
            series[campaignId(campaignLabel)] = itemDisplayScoreNullable(deptRespondents, question.itemId);
          });
          byDept[department.id] = series;
        });
        // Person-weighted org series for holistic KPIs / Org avg (never equal-weight depts).
        const byOrg: Record<string, number | null> = {};
        campaigns.forEach((campaignLabel) => {
          byOrg[campaignId(campaignLabel)] = itemDisplayScoreNullable(
            respondentsForCampaign(data.respondents, campaignLabel),
            question.itemId
          );
        });
        // Person-weighted location/brand series for brand insight copy.
        const locationNames = Array.from(
          new Set(
            data.respondents
              .map((respondent) => respondent.location?.trim())
              .filter((value): value is string => Boolean(value))
          )
        );
        const byLocation: Record<string, Record<string, number | null>> = {};
        locationNames.forEach((locationName) => {
          const series: Record<string, number | null> = {};
          campaigns.forEach((campaignLabel) => {
            const locationRespondents = respondentsForCampaign(data.respondents, campaignLabel).filter(
              (respondent) => respondent.location === locationName
            );
            series[campaignId(campaignLabel)] = itemDisplayScoreNullable(
              locationRespondents,
              question.itemId
            );
          });
          byLocation[slugify(locationName)] = series;
        });
        return {
          id: `${slugify(dimension)}-${index + 1}`,
          text: question.statement,
          byDept,
          byOrg,
          byLocation,
        };
      }),
    })
  );

  // Sort indexes by their person-weighted org avg in the latest campaign, highest first.
  const indexes = [...unsortedIndexes].sort((a, b) => {
    const scoreForIndex = (idx: typeof a) => {
      const allScores = idx.statements
        .map((stmt) => stmt.byOrg?.[latestCampaignId])
        .filter((v): v is number => v != null);
      return allScores.length > 0 ? average(allScores) : 0;
    };
    return scoreForIndex(b) - scoreForIndex(a);
  });

  const orgResponsesByCampaign = Object.fromEntries(
    campaigns.map((campaignLabel) => [
      campaignId(campaignLabel),
      respondentsForCampaign(data.respondents, campaignLabel).length,
    ])
  ) as Record<string, number>;

  // Person-average score series. Every point is the direct average of the people
  // in scope for that campaign — never a roll-up of statement or department
  // cells. `overallSeries` is scored over every statement in one pass, so it is
  // not the average of the per-index series either.
  const byCampaign = new Map<string, EmployeeExperienceRespondent[]>();
  data.respondents.forEach((respondent) => {
    const existing = byCampaign.get(respondent.campaignLabel) ?? [];
    existing.push(respondent);
    byCampaign.set(respondent.campaignLabel, existing);
  });
  const historyLocations = Array.from(
    new Set(
      data.respondents
        .map((respondent) => respondent.location?.trim())
        .filter((value): value is string => Boolean(value))
    )
  );
  const buildSeries = (itemIds: number[]): PersonScoreSeries => {
    const seriesFor = (matches: (respondent: EmployeeExperienceRespondent) => boolean) => {
      const series: Record<string, number | null> = {};
      campaigns.forEach((campaignLabel) => {
        series[campaignId(campaignLabel)] = personAverageScore(
          (byCampaign.get(campaignLabel) ?? []).filter(matches),
          itemIds
        );
      });
      return series;
    };
    const byDept: Record<string, Record<string, number | null>> = {};
    departments.forEach((department) => {
      byDept[department.id] = seriesFor((respondent) => respondent.department === department.name);
    });
    const byLocation: Record<string, Record<string, number | null>> = {};
    historyLocations.forEach((locationName) => {
      byLocation[slugify(locationName)] = seriesFor(
        (respondent) => respondent.location === locationName
      );
    });
    const byOrg: Record<string, number | null> = {};
    campaigns.forEach((campaignLabel) => {
      byOrg[campaignId(campaignLabel)] = personAverageScore(
        byCampaign.get(campaignLabel) ?? [],
        itemIds
      );
    });
    return { byDept, byLocation, byOrg };
  };

  const questionsByDimension = groupQuestionsByDimension(data.questions);
  const scoredIndexes = indexes.map((index) => ({
    ...index,
    series: buildSeries((questionsByDimension.get(index.name) ?? []).map((question) => question.itemId)),
  }));
  const overallSeries = buildSeries(data.questions.map((question) => question.itemId));

  return {
    client: buildClient(data, options),
    scale: resolveScale(options),
    departments,
    campaigns: historyCampaigns,
    indexes: scoredIndexes,
    overallSeries,
    orgResponsesByCampaign,
  };
}

// Each projection here is O(respondents × groups × statements × campaigns) and
// there are ~16 of them, but only the handful the *visible* perspective needs
// are ever read on a given page view. Building them all eagerly meant ~85
// projections (this bundle is instantiated several times) ran on every SSR +
// hydration pass over 2k+ respondents — the dominant cause of slow first load.
//
// So the bundle is lazy: every field is a getter that computes its projection
// on first access and caches it. Reading `bundle.brandReport` still "just
// works", but untouched fields cost nothing. Do NOT spread this object or call
// Object.values on it — that would force every getter to evaluate and defeat
// the whole optimization.
export function buildEmployeeExperienceReportBundle(
  data: EmployeeExperienceDashboardData,
  options?: ProjectionOptions
) {
  const cache = new Map<string, unknown>();
  const once = <T>(key: string, compute: () => T): T => {
    if (!cache.has(key)) cache.set(key, compute());
    return cache.get(key) as T;
  };
  return {
    get campaignResults() {
      return once("campaignResults", () => projectCampaignResultsData(data, options));
    },
    get departmentComparison() {
      return once("departmentComparison", () => projectDepartmentComparisonData(data, options));
    },
    get departmentComparisonByDepartment() {
      return once("departmentComparisonByDepartment", () =>
        projectDepartmentComparisonByDepartmentData(data, options)
      );
    },
    get locationComparison() {
      return once("locationComparison", () => projectLocationComparisonData(data, options));
    },
    get divisionComparison() {
      return once("divisionComparison", () => projectDivisionComparisonData(data, options));
    },
    get brandReport() {
      return once("brandReport", () => projectBrandReportData(data, options));
    },
    // NOTE: Segment Breakdown sets are intentionally NOT built here. They are
    // heavy and only one is ever visible at a time, so they're computed on
    // demand via `projectBreakdownSet` from the component.
    get divisionReport() {
      return once("divisionReport", () => projectDivisionReportData(data, options));
    },
    get jobCategoryReport() {
      return once("jobCategoryReport", () => projectJobCategoryReportData(data, options));
    },
    get leadershipReport() {
      return once("leadershipReport", () => projectJobCategoryReportData(data, options, "leadership"));
    },
    get leadershipComparison() {
      return once("leadershipComparison", () => projectDepartmentComparisonData(data, options, "leadership"));
    },
    get departmentReport() {
      return once("departmentReport", () => projectDepartmentReportData(data, options));
    },
    get supervisorReport() {
      return once("supervisorReport", () => projectSupervisorReportData(data, options));
    },
    get supervisorSegmentReport() {
      return once("supervisorSegmentReport", () => projectSupervisorSegmentReportData(data, options));
    },
    get supervisorComparison() {
      return once("supervisorComparison", () => projectSupervisorComparisonData(data, options));
    },
    get enpsReport() {
      return once("enpsReport", () => projectEnpsReportData(data, options));
    },
    get historicalReport() {
      return once("historicalReport", () => projectHistoricalData(data, options));
    },
  };
}
