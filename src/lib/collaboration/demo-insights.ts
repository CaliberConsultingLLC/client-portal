import type { CollaborationData } from "@/types/collaboration";
import {
  DEMO_CI_QUESTIONS,
  type DemoRespondent,
} from "@/lib/collaboration/demo-data";
import {
  formatScoreDeltaForDisplay,
  formatScoreForDisplay,
} from "@/lib/collaboration/display-format";

export interface ExecutiveKpi {
  label: string;
  value: string;
  tone: "neutral" | "good" | "warning";
  detail: string;
}

export interface RelationshipInsight {
  id: string;
  departments: string;
  leftDepartment: string;
  rightDepartment: string;
  leftToRight: number;
  rightToLeft: number;
  mutualScore: number;
  collaborationIndex: number;
  perceptionGap: number;
  volume: number;
  riskIndex: number;
  opportunityIndex: number;
}

export interface DepartmentPriorityRow {
  id: string;
  partner: string;
  incoming: number;
  outgoing: number;
  mutual: number;
  perceptionGap: number;
  ci: number;
  responseVolume: number;
  priorityScore: number;
}

export interface SegmentSummary {
  id: string;
  label: string;
  respondents: number;
  outgoingCdrs: number;
  outgoingCi: number;
  cdrsVsOrg: number;
  ciVsOrg: number;
  weakestRelationship: string;
}

export interface DepartmentSegmentSummary {
  id: string;
  label: string;
  respondents: number;
  incomingCdrs: number;
  outgoingCdrs: number;
  gap: number;
  ci: number;
}

export interface QuestionInsight {
  id: string;
  question: string;
  score: number;
  responseCount: number;
}

export interface PartnerQuestionHotspot {
  id: string;
  partner: string;
  weakestQuestion: string;
  score: number;
}

export interface ActionPriority {
  title: string;
  detail: string;
  tone: "risk" | "protect" | "segment";
}

interface OrderedPairAggregate {
  cdrsScores: number[];
  ciScores: number[][];
}

function avg(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

function titleCase(type: string) {
  return type.charAt(0).toUpperCase() + type.slice(1);
}

function orderedPairKey(source: string, target: string) {
  return `${source}::${target}`;
}

function pairKey(left: string, right: string) {
  return [left, right].sort().join("::");
}

function buildOrderedPairAggregates(
  respondents: DemoRespondent[],
  departments: string[]
) {
  const orderedPairs = new Map<string, OrderedPairAggregate>();

  for (const source of departments) {
    for (const target of departments) {
      if (source === target) continue;
      orderedPairs.set(orderedPairKey(source, target), {
        cdrsScores: [],
        ciScores: DEMO_CI_QUESTIONS.map(() => []),
      });
    }
  }

  for (const respondent of respondents) {
    for (const target of departments) {
      if (target === respondent.department) continue;
      const pair = orderedPairs.get(orderedPairKey(respondent.department, target));
      if (!pair) continue;

      const cdrs = respondent.cdrsRatings[target];
      if (typeof cdrs === "number") {
        pair.cdrsScores.push(cdrs);
      }
      respondent.ciScores[target]?.forEach((score, index) => {
        pair.ciScores[index].push(score);
      });
    }
  }

  return orderedPairs;
}

export function buildExecutiveKpis(
  data: CollaborationData,
  relationships: RelationshipInsight[]
): ExecutiveKpi[] {
  const riskyRelationships = relationships.filter(
    (relationship) => relationship.riskIndex >= 2.2
  ).length;
  const fragileDepartments = data.departmentMetrics.filter(
    (metric) => metric.incomingCDRS > 0 && metric.outgoingCDRS - metric.incomingCDRS > 0.45
  ).length;
  const highTrustRelationships = relationships
    .filter((relationship) => relationship.opportunityIndex >= 2)
    .length;

  return [
    {
      label: "Enterprise CDRS",
      value: formatScoreForDisplay(data.meta.dwsAverageOverall),
      tone: data.meta.dwsAverageOverall >= 7.2 ? "good" : "warning",
      detail: "Average relational strength across the enterprise.",
    },
    {
      label: "At-Risk Critical Pairs",
      value: String(riskyRelationships),
      tone: riskyRelationships > 3 ? "warning" : "neutral",
      detail: "Business-critical relationships with weak mutual trust or high misalignment.",
    },
    {
      label: "Leadership Blind Spots",
      value: String(fragileDepartments),
      tone: fragileDepartments > 0 ? "warning" : "neutral",
      detail: "Departments rating others higher than they are rated in return.",
    },
    {
      label: "Strengths To Protect",
      value: String(highTrustRelationships),
      tone: highTrustRelationships > 0 ? "good" : "neutral",
      detail: "High-trust relationships executives should preserve during change.",
    },
  ];
}

export function buildRelationshipInsights(
  respondents: DemoRespondent[],
  departments: string[]
) {
  const orderedPairs = buildOrderedPairAggregates(respondents, departments);
  const relationships: RelationshipInsight[] = [];

  for (let index = 0; index < departments.length; index++) {
    for (let inner = index + 1; inner < departments.length; inner++) {
      const leftDepartment = departments[index];
      const rightDepartment = departments[inner];
      const left = orderedPairs.get(orderedPairKey(leftDepartment, rightDepartment));
      const right = orderedPairs.get(orderedPairKey(rightDepartment, leftDepartment));

      const leftToRight = round2(avg(left?.cdrsScores ?? []));
      const rightToLeft = round2(avg(right?.cdrsScores ?? []));
      const leftCi = avg((left?.ciScores ?? []).flat());
      const rightCi = avg((right?.ciScores ?? []).flat());
      const mutualScore = round2(avg([leftToRight, rightToLeft].filter(Boolean)));
      const collaborationIndex = round2(avg([leftCi, rightCi].filter(Boolean)));
      const perceptionGap = round2(Math.abs(leftToRight - rightToLeft));
      const volume = (left?.cdrsScores.length ?? 0) + (right?.cdrsScores.length ?? 0);
      const riskIndex = round2(
        (8.5 - mutualScore) * 0.45 +
          perceptionGap * 1.15 +
          Math.min(volume / 24, 2.5)
      );
      const opportunityIndex = round2(
        Math.max(mutualScore - 6.5, 0) * 0.55 +
          Math.max(collaborationIndex - 6.8, 0) * 0.65 +
          Math.min(volume / 24, 1.75)
      );

      relationships.push({
        id: pairKey(leftDepartment, rightDepartment),
        departments: `${leftDepartment} ↔ ${rightDepartment}`,
        leftDepartment,
        rightDepartment,
        leftToRight,
        rightToLeft,
        mutualScore,
        collaborationIndex,
        perceptionGap,
        volume,
        riskIndex,
        opportunityIndex,
      });
    }
  }

  return relationships;
}

export function buildDepartmentPriorityRows(
  respondents: DemoRespondent[],
  departments: string[],
  selectedDepartment: string
) {
  const orderedPairs = buildOrderedPairAggregates(respondents, departments);

  return departments
    .filter((department) => department !== selectedDepartment)
    .map((partner) => {
      const outgoing = orderedPairs.get(orderedPairKey(selectedDepartment, partner));
      const incoming = orderedPairs.get(orderedPairKey(partner, selectedDepartment));
      const outgoingAvg = round2(avg(outgoing?.cdrsScores ?? []));
      const incomingAvg = round2(avg(incoming?.cdrsScores ?? []));
      const outgoingCi = avg((outgoing?.ciScores ?? []).flat());
      const incomingCi = avg((incoming?.ciScores ?? []).flat());
      const ci = round2(avg([outgoingCi, incomingCi].filter(Boolean)));
      const volume =
        (outgoing?.cdrsScores.length ?? 0) + (incoming?.cdrsScores.length ?? 0);
      const mutual = round2(avg([incomingAvg, outgoingAvg].filter(Boolean)));
      const perceptionGap = round2(outgoingAvg - incomingAvg);
      const priorityScore = round2(
        Math.max(7.6 - mutual, 0) * 0.9 +
          Math.abs(perceptionGap) * 1.1 +
          Math.min(volume / 18, 2)
      );

      return {
        id: `${selectedDepartment}-${partner}`,
        partner,
        incoming: incomingAvg,
        outgoing: outgoingAvg,
        mutual,
        perceptionGap,
        ci,
        responseVolume: volume,
        priorityScore,
      };
    })
    .sort((left, right) => right.priorityScore - left.priorityScore);
}

export function buildQuestionInsights(
  respondents: DemoRespondent[],
  selectedDepartment: string
) {
  const questionBuckets = DEMO_CI_QUESTIONS.map(() => [] as number[]);

  for (const respondent of respondents) {
    if (respondent.department === selectedDepartment) continue;
    respondent.ciScores[selectedDepartment]?.forEach((score, index) => {
      questionBuckets[index].push(score);
    });
  }

  return DEMO_CI_QUESTIONS.map((question, index) => ({
    id: `${selectedDepartment}-question-${index}`,
    question,
    score: round2(avg(questionBuckets[index])),
    responseCount: questionBuckets[index].length,
  })).sort((left, right) => left.score - right.score);
}

export function buildPartnerQuestionHotspots(
  respondents: DemoRespondent[],
  departments: string[],
  selectedDepartment: string
) {
  return departments
    .filter((department) => department !== selectedDepartment)
    .map((partner) => {
      const questionBuckets = DEMO_CI_QUESTIONS.map(() => [] as number[]);

      for (const respondent of respondents) {
        if (respondent.department !== partner) continue;
        respondent.ciScores[selectedDepartment]?.forEach((score, index) => {
          questionBuckets[index].push(score);
        });
      }

      const weakestIndex = questionBuckets.reduce((lowestIndex, bucket, index) =>
        avg(bucket) < avg(questionBuckets[lowestIndex]) ? index : lowestIndex
      , 0);

      return {
        id: `${selectedDepartment}-${partner}-hotspot`,
        partner,
        weakestQuestion: DEMO_CI_QUESTIONS[weakestIndex],
        score: round2(avg(questionBuckets[weakestIndex])),
      };
    })
    .sort((left, right) => left.score - right.score)
    .slice(0, 8);
}

export function buildSegmentSummary(
  respondents: DemoRespondent[],
  data: CollaborationData,
  type: "role" | "generation" | "tenure"
) {
  const values = new Set<string>();
  respondents.forEach((respondent) => values.add(String(respondent[type])));

  const orgOutgoing = avg(
    respondents.flatMap((respondent) =>
      Object.values(respondent.cdrsRatings).filter(
        (score): score is number => typeof score === "number"
      )
    )
  );
  const orgOutgoingCi = avg(
    respondents.flatMap((respondent) => Object.values(respondent.ciScores).flat())
  );

  const summaries: SegmentSummary[] = [];

  values.forEach((value) => {
    const subset = respondents.filter((respondent) => String(respondent[type]) === value);
    if (subset.length < 2) return;
    const outgoingValues = subset.flatMap((respondent) =>
      Object.values(respondent.cdrsRatings).filter(
        (score): score is number => typeof score === "number"
      )
    );
    const ciValues = subset.flatMap((respondent) =>
      Object.values(respondent.ciScores).flat()
    );
    const relationships = buildRelationshipInsights(subset, data.meta.departments);
    const weakestRelationship = relationships
      .sort((left, right) => right.riskIndex - left.riskIndex)[0]
      ?.departments ?? "No pair available";
    const outgoing = avg(outgoingValues);
    const outgoingCi = avg(ciValues);

    summaries.push({
      id: `${type}-${value}`,
      label: `${titleCase(type)}: ${value}`,
      respondents: subset.length,
      outgoingCdrs: round2(outgoing),
      outgoingCi: round2(outgoingCi),
      cdrsVsOrg: round2(outgoing - orgOutgoing),
      ciVsOrg: round2(outgoingCi - orgOutgoingCi),
      weakestRelationship,
    });
  });

  return summaries.sort((left, right) => left.outgoingCdrs - right.outgoingCdrs);
}

export function buildDepartmentSegmentSummary(
  respondents: DemoRespondent[],
  selectedDepartment: string,
  type: "role" | "generation" | "tenure"
): DepartmentSegmentSummary[] {
  const subset = respondents.filter(
    (respondent) => respondent.department === selectedDepartment
  );
  const values = Array.from(new Set(subset.map((respondent) => String(respondent[type]))));

  return values
    .map((value) => {
      const segmentRespondents = subset.filter(
        (respondent) => String(respondent[type]) === value
      );
      if (segmentRespondents.length < 2) {
        return null;
      }
      const outgoingValues = segmentRespondents.flatMap((respondent) =>
        Object.values(respondent.cdrsRatings).filter(
          (score): score is number => typeof score === "number"
        )
      );
      const incomingValues = respondents
        .filter((respondent) => String(respondent[type]) === value)
        .map((respondent) => respondent.cdrsRatings[selectedDepartment])
        .filter((score): score is number => typeof score === "number");
      const ciValues = segmentRespondents.flatMap((respondent) =>
        Object.values(respondent.ciScores).flat()
      );
      const outgoing = round2(avg(outgoingValues));
      const incoming = round2(avg(incomingValues));
      return {
        id: `${selectedDepartment}-${type}-${value}`,
        label: value,
        respondents: segmentRespondents.length,
        incomingCdrs: incoming,
        outgoingCdrs: outgoing,
        gap: round2(Math.abs(outgoing - incoming)),
        ci: round2(avg(ciValues)),
      };
    })
    .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))
    .sort((left, right) => left.outgoingCdrs - right.outgoingCdrs);
}

export function buildActionPriorities(
  departmentRows: DepartmentPriorityRow[],
  questionInsights: QuestionInsight[],
  segmentRows: Array<{
    label: string;
    respondents: number;
    outgoingCdrs: number;
  }>
) {
  const priorities: ActionPriority[] = [];
  const highestRisk = departmentRows[0];
  const strongestRelationship = [...departmentRows].sort(
    (left, right) => right.mutual - left.mutual
  )[0];
  const weakestQuestion = questionInsights[0];
  const lowestSegment = segmentRows[0];

  if (highestRisk) {
    priorities.push({
      title: `Stabilize ${highestRisk.partner}`,
      detail: `Mutual strength is ${formatScoreForDisplay(
        highestRisk.mutual
      )} with a ${formatScoreDeltaForDisplay(highestRisk.perceptionGap)}-point perception gap.`,
      tone: "risk",
    });
  }

  if (weakestQuestion) {
    priorities.push({
      title: "Repair the lowest experience dimension",
      detail: `${weakestQuestion.question} is the weakest incoming signal at ${formatScoreForDisplay(
        weakestQuestion.score
      )}.`,
      tone: "risk",
    });
  }

  if (lowestSegment) {
    priorities.push({
      title: `Listen closely to ${lowestSegment.label}`,
      detail: `${lowestSegment.respondents} respondents from this segment are scoring collaboration at ${formatScoreForDisplay(
        lowestSegment.outgoingCdrs
      )}.`,
      tone: "segment",
    });
  }

  if (strongestRelationship) {
    priorities.push({
      title: `Protect ${strongestRelationship.partner}`,
      detail: `This is the strongest mutual relationship at ${formatScoreForDisplay(
        strongestRelationship.mutual
      )} and can be used as a template for other partnerships.`,
      tone: "protect",
    });
  }

  return priorities.slice(0, 4);
}

export function buildExecutiveNarrative(
  data: CollaborationData,
  relationships: RelationshipInsight[]
) {
  const lowestDepartment = data.departmentMetrics
    .filter((metric) => metric.incomingCDRS > 0)
    .sort((left, right) => left.incomingCDRS - right.incomingCDRS)[0];
  const biggestGap = data.departmentMetrics
    .filter((metric) => metric.incomingCDRS > 0 && metric.outgoingCDRS > 0)
    .sort(
      (left, right) =>
        Math.abs(right.outgoingCDRS - right.incomingCDRS) -
        Math.abs(left.outgoingCDRS - left.incomingCDRS)
    )[0];
  const riskiestRelationship = relationships.sort(
    (left, right) => right.riskIndex - left.riskIndex
  )[0];

  return [
    lowestDepartment
      ? `${lowestDepartment.department} is receiving the weakest enterprise feedback and should be on the executive agenda.`
      : "No department signal available yet.",
    biggestGap
      ? `${biggestGap.department} shows the largest incoming/outgoing mismatch, which often signals an unseen leadership blind spot.`
      : "No alignment gap was detected.",
    riskiestRelationship
      ? `${riskiestRelationship.departments} is the most critical relationship risk when mutual trust and perception gap are considered together.`
      : "No relationship risk could be calculated.",
  ];
}

