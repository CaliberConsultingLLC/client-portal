import type { CollaborationData } from "@/types/collaboration";

export const DEMO_ROLES = [
  "IC",
  "Supervisor",
  "Manager",
  "Director",
  "Exec",
] as const;

export const DEMO_GENERATIONS = [
  "Gen Z",
  "Millennial",
  "Gen X",
  "Boomer",
] as const;

export const DEMO_TENURE_BANDS = [
  "0-1 year",
  "1-3 years",
  "3-5 years",
  "5-10 years",
  "10+ years",
] as const;

export type DemoRole = (typeof DEMO_ROLES)[number];
export type DemoGeneration = (typeof DEMO_GENERATIONS)[number];
export type DemoTenureBand = (typeof DEMO_TENURE_BANDS)[number];

export interface DemoRespondent {
  id: string;
  department: string;
  role: DemoRole;
  generation: DemoGeneration;
  tenure: DemoTenureBand;
  cdrsRatings: Record<string, number | null>;
  ciScores: Record<string, number[]>;
}

export interface DemoScenario {
  id: string;
  label: string;
  description: string;
  organizationName: string;
  campaignName: string;
  departments: string[];
  defaultDepartmentCount: number;
  respondentTarget: number;
  cdrsCenter: number;
  ciCenter: number;
  departmentBias: Record<string, number>;
  strongPairs: Array<readonly [string, string]>;
  weakPairs: Array<readonly [string, string]>;
  sparseDepartments?: string[];
  heatedDepartments?: string[];
  blindSpotDepartments?: string[];
}

export interface DemoFilters {
  department: string;
  role: DemoRole | "all";
  generation: DemoGeneration | "all";
  tenure: DemoTenureBand | "all";
}

interface BuildDemoRespondentsOptions {
  respondentTarget?: number;
}

interface BuildDemoCollaborationDataOptions {
  minimumResponses?: number;
}

export const DEMO_CI_QUESTIONS = [
  "How effectively does this department communicate the information your team needs to execute well?",
  "When this department makes decisions that affect your team, how well are you informed and involved?",
  "How well do this department's priorities align with your team's priorities?",
  "Does this department provide the support your team needs to move work forward?",
  "How proactive is this department in solving shared problems with your team?",
  "When friction appears, how constructively does this department work through it?",
  "How reliable is this department in following through on commitments?",
  "How consistently does this department deliver work at the quality your team expects?",
  "How compatible are your team's operating rhythms and working styles with this department?",
] as const;

const QUESTION_BIASES = [0.55, 0.15, 0.35, 0.2, 0.45, -0.45, 0.7, 0.4, -0.1];

const ROLE_WEIGHTS: Array<[DemoRole, number]> = [
  ["IC", 0.46],
  ["Supervisor", 0.2],
  ["Manager", 0.17],
  ["Director", 0.11],
  ["Exec", 0.06],
];

const GENERATION_WEIGHTS: Array<[DemoGeneration, number]> = [
  ["Gen Z", 0.15],
  ["Millennial", 0.39],
  ["Gen X", 0.29],
  ["Boomer", 0.17],
];

const TENURE_WEIGHTS: Array<[DemoTenureBand, number]> = [
  ["0-1 year", 0.12],
  ["1-3 years", 0.24],
  ["3-5 years", 0.19],
  ["5-10 years", 0.24],
  ["10+ years", 0.21],
];

const ROLE_BIAS: Record<DemoRole, number> = {
  IC: -0.35,
  Supervisor: -0.12,
  Manager: 0.12,
  Director: 0.34,
  Exec: 0.52,
};

const GENERATION_BIAS: Record<DemoGeneration, number> = {
  "Gen Z": -0.28,
  Millennial: 0,
  "Gen X": 0.18,
  Boomer: 0.3,
};

const TENURE_BIAS: Record<DemoTenureBand, number> = {
  "0-1 year": -0.45,
  "1-3 years": -0.2,
  "3-5 years": 0.05,
  "5-10 years": 0.24,
  "10+ years": 0.42,
};

export const DEMO_SCENARIOS: DemoScenario[] = [
  {
    id: "balanced-growth",
    label: "Balanced Growth",
    description:
      "A generally healthy organization with a few normal seams between fast-growing functions.",
    organizationName: "Summit Atlas Group",
    campaignName: "Collaboration",
    departments: [
      "Sales",
      "Marketing",
      "Finance",
      "People Operations",
      "Operations",
      "Customer Success",
      "Product",
      "Technology",
      "Revenue Operations",
      "Legal",
      "Design",
      "Procurement",
    ],
    defaultDepartmentCount: 8,
    respondentTarget: 132,
    cdrsCenter: 7.05,
    ciCenter: 7.2,
    departmentBias: {
      Sales: 0.18,
      Marketing: 0.08,
      Finance: 0.02,
      "People Operations": 0.1,
      Operations: -0.02,
      "Customer Success": 0.14,
      Product: 0.07,
      Technology: 0.12,
      "Revenue Operations": -0.06,
      Legal: -0.08,
      Design: 0.11,
      Procurement: -0.11,
    },
    strongPairs: [
      ["Sales", "Marketing"],
      ["Product", "Technology"],
      ["Operations", "Customer Success"],
      ["Design", "Product"],
      ["Finance", "Procurement"],
    ],
    weakPairs: [
      ["Sales", "Finance"],
      ["Operations", "People Operations"],
      ["Marketing", "Legal"],
      ["Revenue Operations", "Customer Success"],
    ],
    sparseDepartments: ["Finance"],
    heatedDepartments: ["Finance", "Operations"],
    blindSpotDepartments: ["Sales"],
  },
  {
    id: "cross-functional-strain",
    label: "Cross-Functional Strain",
    description:
      "A transformation period where some departments are aligned, but execution handoffs are under pressure.",
    organizationName: "North Ridge Services",
    campaignName: "Collaboration",
    departments: [
      "Commercial",
      "Revenue Operations",
      "Finance",
      "People Operations",
      "Delivery",
      "Support",
      "Strategy",
      "Data & Insights",
      "Executive Team",
      "Client Success",
      "IT",
      "Operations Excellence",
      "Legal",
    ],
    defaultDepartmentCount: 9,
    respondentTarget: 156,
    cdrsCenter: 6.45,
    ciCenter: 6.1,
    departmentBias: {
      Commercial: 0.04,
      "Revenue Operations": -0.04,
      Finance: -0.08,
      "People Operations": 0.02,
      Delivery: -0.12,
      Support: 0.06,
      Strategy: 0.05,
      "Data & Insights": 0.09,
      "Executive Team": -0.02,
      "Client Success": 0.08,
      IT: -0.06,
      "Operations Excellence": -0.03,
      Legal: -0.07,
    },
    strongPairs: [
      ["Commercial", "Support"],
      ["Strategy", "Data & Insights"],
      ["People Operations", "Executive Team"],
      ["Client Success", "Support"],
      ["IT", "Data & Insights"],
    ],
    weakPairs: [
      ["Commercial", "Finance"],
      ["Delivery", "Executive Team"],
      ["Delivery", "Revenue Operations"],
      ["Operations Excellence", "Commercial"],
      ["Legal", "Delivery"],
    ],
    sparseDepartments: ["Executive Team", "Strategy"],
    heatedDepartments: ["Delivery", "Finance"],
    blindSpotDepartments: ["Executive Team"],
  },
  {
    id: "integration-recovery",
    label: "Integration Recovery",
    description:
      "A post-integration story with visible friction across legacy teams, but improving alignment in the center.",
    organizationName: "Orion Field Systems",
    campaignName: "Collaboration",
    departments: [
      "Field Operations",
      "Client Delivery",
      "Sales",
      "Finance",
      "People & Culture",
      "Technology",
      "PMO",
      "Leadership",
      "Procurement",
      "Analytics",
      "Support",
      "Quality",
    ],
    defaultDepartmentCount: 8,
    respondentTarget: 148,
    cdrsCenter: 6.15,
    ciCenter: 5.8,
    departmentBias: {
      "Field Operations": -0.06,
      "Client Delivery": 0.03,
      Sales: -0.02,
      Finance: -0.06,
      "People & Culture": 0.08,
      Technology: 0.11,
      PMO: 0.07,
      Leadership: -0.01,
      Procurement: -0.09,
      Analytics: 0.06,
      Support: 0.02,
      Quality: -0.04,
    },
    strongPairs: [
      ["Technology", "PMO"],
      ["People & Culture", "Leadership"],
      ["Client Delivery", "Field Operations"],
      ["Analytics", "Technology"],
      ["Quality", "Field Operations"],
    ],
    weakPairs: [
      ["Sales", "Finance"],
      ["Field Operations", "Technology"],
      ["Sales", "Client Delivery"],
      ["Procurement", "Sales"],
      ["Support", "Leadership"],
    ],
    sparseDepartments: ["Leadership", "PMO"],
    heatedDepartments: ["Sales", "Field Operations"],
    blindSpotDepartments: ["Leadership"],
  },
];

function hashString(value: string) {
  let hash = 1779033703;
  for (let i = 0; i < value.length; i++) {
    hash = Math.imul(hash ^ value.charCodeAt(i), 3432918353);
    hash = (hash << 13) | (hash >>> 19);
  }
  return hash >>> 0;
}

function mulberry32(seed: number) {
  return function rand() {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function avg(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function pickWeighted<T extends string>(
  rng: () => number,
  items: Array<[T, number]>
): T {
  const total = items.reduce((sum, [, weight]) => sum + weight, 0);
  let cursor = rng() * total;
  for (const [value, weight] of items) {
    cursor -= weight;
    if (cursor <= 0) return value;
  }
  return items[items.length - 1][0];
}

function buildShiftedWeights<T extends string>(
  items: Array<[T, number]>,
  seed: string,
  variance: number
): Array<[T, number]> {
  return items.map(([value, weight]) => [
    value,
    Math.max(0.04, weight + directionalOffset(`${seed}:${value}`) * variance),
  ]);
}

function pairKey(left: string, right: string) {
  return [left, right].sort().join("::");
}

function pairMap(pairs: Array<readonly [string, string]>, amount: number) {
  const map = new Map<string, number>();
  for (const [left, right] of pairs) {
    map.set(pairKey(left, right), amount);
  }
  return map;
}

function directionalOffset(seed: string) {
  const rng = mulberry32(hashString(seed));
  return rng() * 2.2 - 1.1;
}

function filterPairsToDepartments(
  pairs: Array<readonly [string, string]>,
  activeDepartments: string[]
) {
  const activeSet = new Set(activeDepartments);
  return pairs.filter(
    ([left, right]) => activeSet.has(left) && activeSet.has(right)
  );
}

function pickFallbackDepartments(
  scenario: DemoScenario,
  activeDepartments: string[],
  count: number,
  direction: "low" | "high"
) {
  const sorted = activeDepartments
    .slice()
    .sort((left, right) =>
      direction === "low"
        ? (scenario.departmentBias[left] ?? 0) - (scenario.departmentBias[right] ?? 0)
        : (scenario.departmentBias[right] ?? 0) - (scenario.departmentBias[left] ?? 0)
    );
  return sorted.slice(0, Math.min(count, sorted.length));
}

export function deriveScenarioWithDepartmentCount(
  scenario: DemoScenario,
  requestedDepartmentCount: number
): DemoScenario {
  const safeCount = clamp(
    Math.round(requestedDepartmentCount || scenario.defaultDepartmentCount),
    4,
    scenario.departments.length
  );
  const departments = scenario.departments.slice(0, safeCount);
  const sparseDepartments =
    scenario.sparseDepartments?.filter((department) => departments.includes(department)) ?? [];
  const heatedDepartments =
    (scenario.heatedDepartments?.filter((department) => departments.includes(department)) ?? [])
      .slice(0, 2);
  const blindSpotDepartments =
    (scenario.blindSpotDepartments?.filter((department) => departments.includes(department)) ?? [])
      .slice(0, 1);

  return {
    ...scenario,
    departments,
    defaultDepartmentCount: safeCount,
    strongPairs: filterPairsToDepartments(scenario.strongPairs, departments),
    weakPairs: filterPairsToDepartments(scenario.weakPairs, departments),
    sparseDepartments,
    heatedDepartments:
      heatedDepartments.length > 0
        ? heatedDepartments
        : pickFallbackDepartments(scenario, departments, 2, "low"),
    blindSpotDepartments:
      blindSpotDepartments.length > 0
        ? blindSpotDepartments
        : pickFallbackDepartments(scenario, departments, 1, "high"),
  };
}

function buildDepartmentCounts(
  scenario: DemoScenario,
  rng: () => number,
  respondentTarget: number
) {
  const effectiveTarget = Math.max(respondentTarget, scenario.departments.length);
  const minPerDepartment = effectiveTarget >= scenario.departments.length * 4 ? 4 : 1;
  const reserved = minPerDepartment * scenario.departments.length;
  const extraPool = Math.max(0, effectiveTarget - reserved);
  const counts: Record<string, number> = {};
  const weightedShares = scenario.departments.map((department) => {
    const bias = scenario.departmentBias[department] ?? 0;
    const sparsePenalty = scenario.sparseDepartments?.includes(department)
      ? -0.24
      : 0;
    const weight = Math.max(0.15, 1 + bias + sparsePenalty + rng() * 0.65);
    return { department, rawShare: weight * extraPool };
  });
  const totalWeight = weightedShares.reduce(
    (sum, item) => sum + item.rawShare,
    0
  );
  let assigned = 0;
  const remainders: Array<{ department: string; remainder: number }> = [];

  for (const department of scenario.departments) {
    const share =
      totalWeight > 0
        ? (weightedShares.find((item) => item.department === department)?.rawShare ?? 0) /
          totalWeight *
          extraPool
        : 0;
    const whole = Math.floor(share);
    counts[department] = minPerDepartment + whole;
    assigned += whole;
    remainders.push({ department, remainder: share - whole });
  }

  let remaining = extraPool - assigned;
  remainders
    .sort((left, right) => right.remainder - left.remainder)
    .forEach((entry) => {
      if (remaining <= 0) return;
      counts[entry.department] += 1;
      remaining -= 1;
    });

  return counts;
}

function buildRelationMatrix(scenario: DemoScenario) {
  const strongPairs = pairMap(scenario.strongPairs, 1.15);
  const weakPairs = pairMap(scenario.weakPairs, -1.75);
  const matrix: Record<string, Record<string, number>> = {};

  for (const source of scenario.departments) {
    matrix[source] = {};

    for (const target of scenario.departments) {
      if (source === target) {
        matrix[source][target] = 0;
        continue;
      }

      const sharedPairKey = pairKey(source, target);
      const pairBias =
        strongPairs.get(sharedPairKey) ??
        weakPairs.get(sharedPairKey) ??
        0;
      const sourceBias = (scenario.departmentBias[source] ?? 0) * 0.45;
      const targetBias = (scenario.departmentBias[target] ?? 0) * 0.72;
      const heatedPenalty =
        scenario.heatedDepartments?.includes(source) ||
        scenario.heatedDepartments?.includes(target)
          ? -0.32
          : 0;
      const sparsePenalty =
        scenario.sparseDepartments?.includes(source) ||
        scenario.sparseDepartments?.includes(target)
          ? -0.35
          : 0;
      const blindSpotBias =
        (scenario.blindSpotDepartments?.includes(source) ? 0.55 : 0) +
        (scenario.blindSpotDepartments?.includes(target) ? -0.6 : 0);
      const directionalBias = directionalOffset(
        `${scenario.id}:${source}->${target}`
      );
      const structuralVariance =
        directionalOffset(`${scenario.id}:${sharedPairKey}:structure`) * 0.55;

      matrix[source][target] = clamp(
        scenario.cdrsCenter +
          sourceBias +
          targetBias +
          pairBias +
          heatedPenalty +
          sparsePenalty +
          blindSpotBias +
          directionalBias * 1.1 +
          structuralVariance,
        1.8,
        9.35
      );
    }
  }

  return matrix;
}

export function buildDemoRespondents(
  scenario: DemoScenario,
  seed: string | number,
  options?: BuildDemoRespondentsOptions
) {
  const respondentTarget = Math.max(
    options?.respondentTarget ?? scenario.respondentTarget,
    scenario.departments.length
  );
  const rng = mulberry32(hashString(`${scenario.id}:${seed}`));
  const relationMatrix = buildRelationMatrix(scenario);
  const counts = buildDepartmentCounts(scenario, rng, respondentTarget);
  const respondents: DemoRespondent[] = [];

  for (const department of scenario.departments) {
    const roleWeights = buildShiftedWeights(
      ROLE_WEIGHTS,
      `${scenario.id}:${department}:role-mix`,
      0.08
    );
    const generationWeights = buildShiftedWeights(
      GENERATION_WEIGHTS,
      `${scenario.id}:${department}:generation-mix`,
      0.07
    );
    const tenureWeights = buildShiftedWeights(
      TENURE_WEIGHTS,
      `${scenario.id}:${department}:tenure-mix`,
      0.08
    );

    for (let index = 0; index < counts[department]; index++) {
      const role = pickWeighted(rng, roleWeights);
      const generation = pickWeighted(rng, generationWeights);
      const tenure = pickWeighted(rng, tenureWeights);
      const profileBias =
        ROLE_BIAS[role] + GENERATION_BIAS[generation] + TENURE_BIAS[tenure];
      const respondentVolatility = rng() * 1.6 - 0.8;

      const cdrsRatings: Record<string, number | null> = {};
      const ciScores: Record<string, number[]> = {};

      for (const target of scenario.departments) {
        if (target === department) {
          cdrsRatings[target] = null;
          ciScores[target] = [];
          continue;
        }

        const relationBase = relationMatrix[department][target];
        const heatedPair =
          scenario.heatedDepartments?.includes(department) ||
          scenario.heatedDepartments?.includes(target);
        const blindSpotSource = scenario.blindSpotDepartments?.includes(department);
        const blindSpotTarget = scenario.blindSpotDepartments?.includes(target);
        const pairSpecificDrift =
          directionalOffset(`${scenario.id}:${department}:${target}:pair-drift`) * 0.55;
        const heatedVariance = heatedPair ? rng() * 1.2 - 0.6 : 0;
        const perceptionBias = blindSpotSource ? 0.45 : blindSpotTarget ? -0.35 : 0;
        const primaryHotspot = Math.floor(
          mulberry32(hashString(`${scenario.id}:${department}:${target}:hotspot-primary`))() *
            DEMO_CI_QUESTIONS.length
        );
        const secondaryHotspot =
          (primaryHotspot +
            2 +
            Math.floor(
              mulberry32(
                hashString(`${scenario.id}:${department}:${target}:hotspot-secondary`)
              )() * 3
            )) %
          DEMO_CI_QUESTIONS.length;
        const cdrsScore = clamp(
          relationBase +
            profileBias * 1.05 +
            respondentVolatility +
            pairSpecificDrift +
            heatedVariance +
            perceptionBias +
            (rng() * 2.4 - 1.2),
          1,
          10
        );
        const ciBase = clamp(
          scenario.ciCenter +
            (relationBase - scenario.cdrsCenter) * 1.25 +
            profileBias * 1.2 +
            respondentVolatility * 1.05 +
            pairSpecificDrift * 0.9 +
            heatedVariance * 0.6 +
            (blindSpotTarget ? -0.55 : 0) +
            (scenario.departmentBias[target] ?? 0) * 1.15,
          1,
          10
        );

        cdrsRatings[target] = round2(cdrsScore);
        ciScores[target] = DEMO_CI_QUESTIONS.map((_, questionIndex) =>
          round2(
            clamp(
              ciBase +
                QUESTION_BIASES[questionIndex] +
                (questionIndex === primaryHotspot ? -0.85 : 0) +
                (questionIndex === secondaryHotspot ? -0.45 : 0) +
                (heatedPair && questionIndex === 5 ? -0.55 : 0) +
                (blindSpotTarget && (questionIndex === 1 || questionIndex === 6) ? -0.45 : 0) +
                (rng() * 2.8 - 1.4),
              1,
              10
            )
          )
        );
      }

      respondents.push({
        id: `EMP-${String(respondents.length + 1).padStart(4, "0")}`,
        department,
        role,
        generation,
        tenure,
        cdrsRatings,
        ciScores,
      });
    }
  }

  return respondents;
}

export function filterDemoRespondents(
  respondents: DemoRespondent[],
  filters: DemoFilters
) {
  return respondents.filter((respondent) => {
    if (filters.department !== "all" && respondent.department !== filters.department) return false;
    if (filters.role !== "all" && respondent.role !== filters.role) return false;
    if (
      filters.generation !== "all" &&
      respondent.generation !== filters.generation
    ) {
      return false;
    }
    if (filters.tenure !== "all" && respondent.tenure !== filters.tenure) {
      return false;
    }
    return true;
  });
}

export function buildDemoCollaborationData(
  respondents: DemoRespondent[],
  departments: string[],
  options?: BuildDemoCollaborationDataOptions
): CollaborationData {
  const minimumResponses = options?.minimumResponses ?? 1;
  const incomingScores: Record<string, number[]> = {};
  const outgoingScores: Record<string, number[]> = {};
  const heatmapScores: Record<string, Record<string, number[]>> = {};
  const ciQuestionScores: Record<string, number[][]> = {};
  const ciPairScores: Record<string, Record<string, number[]>> = {};

  for (const department of departments) {
    incomingScores[department] = [];
    outgoingScores[department] = [];
    heatmapScores[department] = {};
    ciQuestionScores[department] = DEMO_CI_QUESTIONS.map(() => []);
    ciPairScores[department] = {};

    for (const target of departments) {
      heatmapScores[department][target] = [];
      if (target !== department) ciPairScores[department][target] = [];
    }
  }

  for (const respondent of respondents) {
    for (const target of departments) {
      if (target === respondent.department) continue;

      const cdrsScore = respondent.cdrsRatings[target];
      if (typeof cdrsScore === "number") {
        incomingScores[target].push(cdrsScore);
        outgoingScores[respondent.department].push(cdrsScore);
        heatmapScores[respondent.department][target].push(cdrsScore);
      }

      const ciScoresForTarget = respondent.ciScores[target];
      ciScoresForTarget?.forEach((score, questionIndex) => {
        ciQuestionScores[target][questionIndex].push(score);
      });
      if (
        ciScoresForTarget?.length &&
        departments.includes(respondent.department)
      ) {
        ciPairScores[target][respondent.department].push(...ciScoresForTarget);
      }
    }
  }

  const departmentMetrics = departments
    .map((department) => {
      const questionScores = DEMO_CI_QUESTIONS.map((question, questionIndex) => ({
        question,
        score:
          ciQuestionScores[department][questionIndex].length >= minimumResponses
            ? round2(avg(ciQuestionScores[department][questionIndex]))
            : 0,
        responseCount: ciQuestionScores[department][questionIndex].length,
      }));
      const ciValues = ciQuestionScores[department]
        .filter((questionScores) => questionScores.length >= minimumResponses)
        .flat();
      const incomingValues = incomingScores[department];
      const outgoingValues = outgoingScores[department];

      return {
        department,
        incomingCDRS:
          incomingValues.length >= minimumResponses ? round2(avg(incomingValues)) : 0,
        outgoingCDRS:
          outgoingValues.length >= minimumResponses ? round2(avg(outgoingValues)) : 0,
        collaborationIndex: round2(avg(ciValues)),
        incomingCount: incomingValues.length,
        outgoingCount: outgoingValues.length,
        ciCount: ciValues.length,
        questionScores,
      };
    })
    .sort((left, right) => right.incomingCDRS - left.incomingCDRS);

  const heatmapMatrix = departments.map((department) => ({
    department,
    scores: Object.fromEntries(
      departments.map((target) => [
        target,
        target === department
          ? null
          : heatmapScores[department][target].length >= minimumResponses
            ? round2(avg(heatmapScores[department][target]))
            : null,
      ])
    ),
  }));

  const departmentDetails = departments.map((department) => {
    const metrics = departmentMetrics.find(
      (metric) => metric.department === department
    );
    const ciRaterIds = new Set<string>();
    for (const respondent of respondents) {
      if (respondent.department === department) continue;
      if ((respondent.ciScores[department]?.length ?? 0) > 0) {
        ciRaterIds.add(respondent.id);
      }
    }

    return {
      department,
      incomingCDRS: metrics?.incomingCDRS ?? 0,
      outgoingCDRS: metrics?.outgoingCDRS ?? 0,
      collaborationIndex: metrics?.collaborationIndex ?? 0,
      responseCount: metrics?.incomingCount ?? 0,
      ciRaterCount: ciRaterIds.size,
      incomingByDept: departments
        .filter((source) => source !== department)
        .map((source) => ({
          department: source,
          score: round2(avg(heatmapScores[source][department])),
          count: heatmapScores[source][department].length,
        }))
        .filter((entry) => entry.count >= minimumResponses)
        .sort((left, right) => right.score - left.score),
      outgoingByDept: departments
        .filter((target) => target !== department)
        .map((target) => ({
          department: target,
          score: round2(avg(heatmapScores[department][target])),
          count: heatmapScores[department][target].length,
        }))
        .filter((entry) => entry.count >= minimumResponses)
        .sort((left, right) => right.score - left.score),
      ciByDept: departments
        .filter((source) => source !== department)
        .map((source) => ({
          department: source,
          score: round2(avg(ciPairScores[department][source])),
          count: ciPairScores[department][source].length,
        }))
        .filter((entry) => entry.count >= minimumResponses)
        .sort((left, right) => right.score - left.score),
      questionScores: metrics?.questionScores ?? [],
    };
  });

  const allIncoming = departmentMetrics
    .map((metric) => metric.incomingCDRS)
    .filter((score) => score > 0);
  const allOutgoing = departmentMetrics
    .map((metric) => metric.outgoingCDRS)
    .filter((score) => score > 0);
  const avgIncoming = round2(avg(allIncoming));
  const avgOutgoing = round2(avg(allOutgoing));

  return {
    meta: {
      totalRespondents: respondents.length,
      totalDepartments: departments.length,
      dwsAverageIncoming: avgIncoming,
      dwsAverageOutgoing: avgOutgoing,
      dwsAverageOverall: round2(avg([avgIncoming, avgOutgoing].filter(Boolean))),
      departments,
      ciQuestions: [...DEMO_CI_QUESTIONS],
    },
    departmentMetrics,
    heatmapMatrix,
    departmentDetails,
  };
}

