import { readFileSync } from "fs";
import type {
  IntegrationCommentTheme,
  IntegrationBrandReport,
  IntegrationDashboardData,
  IntegrationDimensionMetric,
  IntegrationGroupMetric,
  IntegrationHeatmap,
  IntegrationPriority,
  IntegrationQuestionMetric,
  IntegrationVoiceEntry,
} from "@/types/integration-effectiveness";

const DATABASE_PATH =
  "C:\\Users\\dusti\\OneDrive\\Client Data\\Canopy\\Canopy Integration Database 2026.csv";
const CAMPAIGN_PATH =
  "C:\\Users\\dusti\\OneDrive\\Client Data\\Canopy\\Canopy Integration Campaign 2026.csv";

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

function parseQuestions(): ParsedQuestion[] {
  const rows = parseCSV(readFileSync(CAMPAIGN_PATH, "utf8").replace(/^\uFEFF/, ""));
  return rows
    .slice(1)
    .map((row) => ({
      itemId: Number.parseInt(row[0] ?? "", 10),
      statement: row[2] ?? "",
    }))
    .filter((row) => Number.isFinite(row.itemId) && row.itemId >= 1 && row.itemId <= 11);
}

function parseRespondents(questionIds: number[]): ParsedRespondent[] {
  const rows = parseCSV(readFileSync(DATABASE_PATH, "utf8").replace(/^\uFEFF/, ""));
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
        .filter((question) => definition.itemIds.includes(question.itemId))
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

export function loadCanopyIntegrationDashboardData(): IntegrationDashboardData {
  const questions = parseQuestions();
  const respondents = parseRespondents(questions.map((question) => question.itemId));
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
      dataSourceLabel: "Canopy Integration Database 2026.csv + Canopy Integration Campaign 2026.csv",
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
