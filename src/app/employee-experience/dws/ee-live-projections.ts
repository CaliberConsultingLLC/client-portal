import type {
  EmployeeExperienceDashboardData,
  EmployeeExperienceQuestionDefinition,
  EmployeeExperienceRespondent,
} from "@/types/employee-experience";
import { isKnownBrandSegment } from "@/lib/employee-experience/brand-segment";

export const REPORT_SCORE_SCALE = { min: 60, mid: 72.5, max: 85 } as const;

type ProjectionOptions = {
  logoUrl?: string;
  tagline?: string;
  campaignLabel?: string;
};

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

function itemDisplayScore(respondents: EmployeeExperienceRespondent[], itemId: number) {
  const values = respondents
    .map((respondent) => respondent.scores[itemId])
    .filter((value): value is number => value !== null);
  return values.length > 0 ? toDisplayScore(average(values)) : 0;
}

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
  minimumSegmentSize: number
) {
  const currentRespondents = respondentsForCampaign(respondents, currentLabel);
  const counts = new Map<string, number>();
  currentRespondents.forEach((respondent) => {
    const category = respondent.fieldCategory?.trim();
    if (!category) return;
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
      };
    }),
  }));
}

function buildByJobCategoryStatements(
  questions: EmployeeExperienceQuestionDefinition[],
  respondents: EmployeeExperienceRespondent[],
  campaigns: string[],
  currentLabel: string,
  jobCategories: Array<{ id: string; name: string }>
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
            (respondent) => respondent.fieldCategory === category.name
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
      };
    }),
  }));
}

const SEGMENT_FIELDS = [
  { id: "generation", label: "Generation", field: "generation" as const },
  { id: "tenure", label: "Tenure", field: "tenure" as const },
  { id: "role", label: "Role", field: "jobTitle" as const },
];

function buildSegments(
  respondents: EmployeeExperienceRespondent[],
  campaigns: string[],
  currentLabel: string,
  departments: Array<{ id: string; name: string }>,
  minimumSegmentSize: number
) {
  const comparisons = buildComparisons(campaigns, currentLabel);

  return SEGMENT_FIELDS.map((dimension) => {
    const groupNames = Array.from(
      new Set(
        respondentsForCampaign(respondents, currentLabel)
          .map((respondent) => respondent[dimension.field])
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

        departments.forEach((department) => {
          const slice = (campaignLabel: string) =>
            respondentsForCampaign(respondents, campaignLabel).filter(
              (respondent) =>
                respondent.department === department.name && respondent[dimension.field] === name
            );

          const currentSlice = slice(currentLabel);
          if (currentSlice.length < minimumSegmentSize) return;

          byDept[department.id] = {
            responses: currentSlice.length,
            current: toDisplayScore(
              average(
                currentSlice.flatMap((respondent) =>
                  Object.values(respondent.scores).filter((value): value is number => value !== null)
                )
              )
            ),
            comparisons: Object.fromEntries(
              comparisons.map((comparison) => {
                const priorLabel =
                  campaigns.find((label) => campaignId(label) === comparison.id) ?? comparison.label;
                const priorSlice = slice(priorLabel);
                return [
                  comparison.id,
                  priorSlice.length > 0
                    ? toDisplayScore(
                        average(
                          priorSlice.flatMap((respondent) =>
                            Object.values(respondent.scores).filter((value): value is number => value !== null)
                          )
                        )
                      )
                    : 0,
                ];
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
  campaigns: string[],
  currentLabel: string,
  brands: Array<{ id: string; name: string }>,
  minimumSegmentSize: number
) {
  const comparisons = buildComparisons(campaigns, currentLabel);

  return SEGMENT_FIELDS.map((dimension) => {
    const groupNames = Array.from(
      new Set(
        respondentsForCampaign(respondents, currentLabel)
          .map((respondent) => respondent[dimension.field])
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
            current: toDisplayScore(
              average(
                currentSlice.flatMap((respondent) =>
                  Object.values(respondent.scores).filter((value): value is number => value !== null)
                )
              )
            ),
            comparisons: Object.fromEntries(
              comparisons.map((comparison) => {
                const priorLabel =
                  campaigns.find((label) => campaignId(label) === comparison.id) ?? comparison.label;
                const priorSlice = slice(priorLabel);
                return [
                  comparison.id,
                  priorSlice.length > 0
                    ? toDisplayScore(
                        average(
                          priorSlice.flatMap((respondent) =>
                            Object.values(respondent.scores).filter((value): value is number => value !== null)
                          )
                        )
                      )
                    : 0,
                ];
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

  return {
    client: buildClient(data, options),
    current: {
      id: campaignId(currentLabel),
      label: currentLabel,
      labelLong: currentLabel.toUpperCase(),
    },
    comparisons,
    scale: REPORT_SCORE_SCALE,
    indexes: buildStatementProjections(data.questions, data.respondents, campaigns, currentLabel),
  };
}

export function projectDepartmentComparisonData(
  data: EmployeeExperienceDashboardData,
  options?: ProjectionOptions
) {
  const currentLabel = resolveCampaignLabel(data, options);
  const campaigns = sortedCampaigns(data.meta.campaigns);
  const jobCategories = buildJobCategories(
    data.respondents,
    currentLabel,
    data.settings.minimumSegmentSize
  );

  return {
    client: buildClient(data, options),
    current: {
      id: campaignId(currentLabel),
      label: currentLabel,
      labelLong: currentLabel.toUpperCase(),
    },
    comparisons: buildComparisons(campaigns, currentLabel),
    scale: REPORT_SCORE_SCALE,
    display: {
      barAxis: { min: 30, max: 90, ticks: [40, 60, 80] },
      deltaAxis: { min: -10, max: 10, ticks: [-10, 0, 10] },
    },
    departments: jobCategories.map((category) => ({ id: category.id, name: category.name })),
    indexes: buildByJobCategoryStatements(
      data.questions,
      data.respondents,
      campaigns,
      currentLabel,
      jobCategories
    ),
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

  return {
    client: buildClient(data, options),
    current: {
      id: campaignId(currentLabel),
      label: currentLabel,
      labelLong: currentLabel.toUpperCase(),
    },
    comparisons: buildComparisons(campaigns, currentLabel),
    scale: REPORT_SCORE_SCALE,
    display: {
      barAxis: { min: 30, max: 90, ticks: [40, 60, 80] },
      deltaAxis: { min: -10, max: 10, ticks: [-10, 0, 10] },
    },
    locations: locations.map((location) => ({ id: location.id, name: location.name })),
    indexes: buildByLocationStatements(
      data.questions,
      data.respondents,
      campaigns,
      currentLabel,
      locations
    ),
  };
}

export function projectDepartmentReportData(
  data: EmployeeExperienceDashboardData,
  options?: ProjectionOptions
) {
  const currentLabel = resolveCampaignLabel(data, options);
  const campaigns = sortedCampaigns(data.meta.campaigns);
  const jobCategories = buildJobCategories(
    data.respondents,
    currentLabel,
    data.settings.minimumSegmentSize
  );
  const comparisons = buildComparisons(campaigns, currentLabel);

  return {
    client: buildClient(data, options),
    current: {
      id: campaignId(currentLabel),
      label: currentLabel,
      labelLong: currentLabel.toUpperCase(),
    },
    comparisons,
    scale: REPORT_SCORE_SCALE,
    departments: jobCategories,
    indexes: buildByJobCategoryStatements(
      data.questions,
      data.respondents,
      campaigns,
      currentLabel,
      jobCategories
    ),
    segments: buildSegments(
      data.respondents,
      campaigns,
      currentLabel,
      departments,
      data.settings.minimumSegmentSize
    ),
    segmentMinResponses: data.settings.minimumSegmentSize,
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

  return {
    client: buildClient(data, options),
    current: {
      id: campaignId(currentLabel),
      label: currentLabel,
      labelLong: currentLabel.toUpperCase(),
    },
    comparisons,
    scale: REPORT_SCORE_SCALE,
    departments: brands,
    indexes: buildByBrandStatements(
      data.questions,
      data.respondents,
      campaigns,
      currentLabel,
      brands
    ),
    segments: buildBrandSegments(
      data.respondents,
      campaigns,
      currentLabel,
      brands,
      data.settings.minimumSegmentSize
    ),
    enpsByDept,
    segmentMinResponses: data.settings.minimumSegmentSize,
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
    scale: REPORT_SCORE_SCALE,
    display: { barAxis: { min: 55, max: 100, ticks: [60, 70, 80, 90, 100] } },
    supervisors,
    index: {
      id: slugify(supervisorDimension),
      name: supervisorDimension,
      statements,
    },
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

  const indexes = Array.from(groupQuestionsByDimension(data.questions).entries()).map(
    ([dimension, items]) => ({
      id: slugify(dimension),
      name: dimension,
      statements: items.map((question, index) => {
        const byDept: Record<string, Record<string, number>> = {};
        departments.forEach((department) => {
          const series: Record<string, number> = {};
          campaigns.forEach((campaignLabel) => {
            const deptRespondents = respondentsForCampaign(data.respondents, campaignLabel).filter(
              (respondent) => respondent.department === department.name
            );
            series[campaignId(campaignLabel)] = itemDisplayScore(deptRespondents, question.itemId);
          });
          byDept[department.id] = series;
        });
        return {
          id: `${slugify(dimension)}-${index + 1}`,
          text: question.statement,
          byDept,
        };
      }),
    })
  );

  return {
    client: buildClient(data, options),
    scale: REPORT_SCORE_SCALE,
    departments,
    campaigns: historyCampaigns,
    indexes,
  };
}

export function buildEmployeeExperienceReportBundle(
  data: EmployeeExperienceDashboardData,
  options?: ProjectionOptions
) {
  return {
    campaignResults: projectCampaignResultsData(data, options),
    departmentComparison: projectDepartmentComparisonData(data, options),
    locationComparison: projectLocationComparisonData(data, options),
    brandReport: projectBrandReportData(data, options),
    departmentReport: projectDepartmentReportData(data, options),
    supervisorReport: projectSupervisorReportData(data, options),
    enpsReport: projectEnpsReportData(data, options),
    historicalReport: projectHistoricalData(data, options),
  };
}
