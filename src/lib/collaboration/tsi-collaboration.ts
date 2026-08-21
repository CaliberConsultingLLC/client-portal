import {
  buildCollaborationDataFromRespondents,
  type CollaborationComment,
  type CollaborationDataset,
} from "@/lib/collaboration/collaboration-dataset";
import {
  buildDemoRespondents,
  DEMO_CI_QUESTIONS,
  DEMO_GENERATIONS,
  DEMO_ROLES,
  DEMO_TENURE_BANDS,
  type DemoScenario,
} from "@/lib/collaboration/demo-data";

export const TSI_COLLABORATION_ORGANIZATION_NAME = "Tech Systems, Inc";
export const TSI_COLLABORATION_CAMPAIGN_NAME = "Collaboration Campaign";

export const TSI_COLLABORATION_DEPARTMENTS = [
  "Accounts Payable",
  "Accounts Receivable",
  "Customer Service",
  "Field Lead",
  "Field Management",
  "Field Operations – Technicians",
  "Finance – Excludes Payroll",
  "Fusion Center – CFA",
  "Fusion Center – Monitoring",
  "Fusion Center – Support",
  "Fusion Center – Verizon",
  "Human Resources",
  "IT",
  "Marketing",
  "OUS",
  "Payroll",
  "Purchasing",
  "Quality Assurance",
  "Sales",
  "Solutions Architects",
] as const;

const COMMENT_PROMPT =
  "What would help this department collaborate more effectively with your team?";

const COMMENT_BANK: Array<{ about: string; from: string; text: string }> = [
  {
    about: "Purchasing",
    from: "Field Operations – Technicians",
    text: "Parts and materials often arrive later than the job plan assumes. A clearer lead-time signal would keep field work from stalling mid-install.",
  },
  {
    about: "Purchasing",
    from: "Field Management",
    text: "When substitutions happen, we usually find out after the crew is already on site. Earlier notice would save a lot of rework.",
  },
  {
    about: "Field Operations – Technicians",
    from: "Fusion Center – Support",
    text: "Ticket handoffs are uneven. If status updates came through more consistently, we would spend less time chasing the same jobs.",
  },
  {
    about: "Fusion Center – Support",
    from: "Field Operations – Technicians",
    text: "Dispatch notes are sometimes incomplete when we arrive. A little more context on the original issue would help us close calls the first time.",
  },
  {
    about: "Sales",
    from: "Finance – Excludes Payroll",
    text: "Deal terms sometimes change after the quote is already in motion. A shared checkpoint before commitments go out would reduce cleanup later.",
  },
  {
    about: "Finance – Excludes Payroll",
    from: "Sales",
    text: "Approvals can sit longer than expected. Knowing who owns the next step would help us keep clients from waiting.",
  },
  {
    about: "Payroll",
    from: "Field Management",
    text: "Timecard questions tend to pile up at the end of the period. A mid-cycle check would catch most of the issues earlier.",
  },
  {
    about: "Field Management",
    from: "Payroll",
    text: "Exceptions are easier to resolve when supervisors respond the same day. That is happening more often, but not everywhere yet.",
  },
  {
    about: "Solutions Architects",
    from: "Sales",
    text: "Design reviews have been tighter lately. Keeping that same rhythm on larger multi-site work would help us set cleaner expectations.",
  },
  {
    about: "Sales",
    from: "Solutions Architects",
    text: "Scope conversations go better when we are looped in before a verbal commitment. We can usually get there if we get a day of notice.",
  },
  {
    about: "Customer Service",
    from: "Fusion Center – Verizon",
    text: "Client callbacks sometimes overlap with tickets we already have open. One shared view of the account would keep us from duplicating work.",
  },
  {
    about: "Fusion Center – Verizon",
    from: "Customer Service",
    text: "Escalations move faster when the account notes are current. That is inconsistent by shift more than by process.",
  },
  {
    about: "IT",
    from: "Fusion Center – Monitoring",
    text: "System access requests are usually straightforward. The delay is mostly in knowing which queue a request landed in.",
  },
  {
    about: "Fusion Center – Monitoring",
    from: "IT",
    text: "Change windows are easier to support when we hear about them a day ahead. Last-minute notices still happen on a few tools.",
  },
  {
    about: "Human Resources",
    from: "Field Lead",
    text: "New-hire paperwork is in good shape. The gap is usually onboarding timing versus when someone is expected on a job site.",
  },
  {
    about: "Quality Assurance",
    from: "Field Operations – Technicians",
    text: "QA findings are useful when they come with a specific example. Generic closeout notes are harder to act on in the field.",
  },
  {
    about: "Field Operations – Technicians",
    from: "Quality Assurance",
    text: "Most crews are responsive. A few sites still treat punch-list items as optional until a manager follows up.",
  },
  {
    about: "Marketing",
    from: "Sales",
    text: "Campaign materials land well when we see them before they go to clients. Short internal previews would keep messaging aligned.",
  },
  {
    about: "Accounts Payable",
    from: "Purchasing",
    text: "Invoice questions are fair, but they often come after the vendor has already followed up twice. A same-week review cycle would help.",
  },
  {
    about: "Accounts Receivable",
    from: "Customer Service",
    text: "Billing questions from clients are easier to answer when AR flags the account early. We usually get there, just not on the first call.",
  },
  {
    about: "OUS",
    from: "Purchasing",
    text: "International orders need more lead time than domestic work. That difference is understood in some teams and missed in others.",
  },
  {
    about: "Fusion Center – CFA",
    from: "Fusion Center – Monitoring",
    text: "Coverage handoffs overnight are generally solid. The weak spot is leftover notes that do not make it into the next shift briefing.",
  },
  {
    about: "Fusion Center – Monitoring",
    from: "Fusion Center – CFA",
    text: "Alarm context is better than it used to be. We still occasionally get a ticket with a site name and very little else.",
  },
  {
    about: "Field Lead",
    from: "Field Management",
    text: "Daily plans are clearer when leads flag crew constraints in the morning huddle instead of after the first stop.",
  },
  {
    about: "IT",
    from: "Solutions Architects",
    text: "Tooling requests move faster when the use case is spelled out up front. We can usually support it if we know the client constraint.",
  },
  {
    about: "Human Resources",
    from: "Customer Service",
    text: "Staffing coverage during peak weeks is the main pinch. Advance notice of schedule changes would help us keep phones covered.",
  },
  {
    about: "Finance – Excludes Payroll",
    from: "Accounts Payable",
    text: "Coding guidance is consistent once we get it. The wait for a decision on exception invoices is what slows the close.",
  },
  {
    about: "Sales",
    from: "Customer Service",
    text: "Handoffs after a sale are smoother when the account contacts and system notes are complete on day one.",
  },
  {
    about: "Solutions Architects",
    from: "IT",
    text: "Architecture decisions are easier to support when we are in the review, not just copied on the finished drawing.",
  },
  {
    about: "Quality Assurance",
    from: "Fusion Center – Support",
    text: "Repeat-call patterns would be more useful if QA shared them as a weekly digest instead of one-off emails.",
  },
];

export const TSI_COLLABORATION_SCENARIO: DemoScenario = {
  id: "tsi-collaboration-preview",
  label: "Tech Systems Collaboration",
  description:
    "Synthetic collaboration dataset for Tech Systems, Inc. with moderate cross-department variation.",
  organizationName: TSI_COLLABORATION_ORGANIZATION_NAME,
  campaignName: TSI_COLLABORATION_CAMPAIGN_NAME,
  departments: [...TSI_COLLABORATION_DEPARTMENTS],
  defaultDepartmentCount: TSI_COLLABORATION_DEPARTMENTS.length,
  respondentTarget: 214,
  cdrsCenter: 6.98,
  ciCenter: 7.12,
  departmentBias: {
    "Accounts Payable": -0.04,
    "Accounts Receivable": 0.03,
    "Customer Service": 0.16,
    "Field Lead": 0.05,
    "Field Management": 0.07,
    "Field Operations – Technicians": -0.15,
    "Finance – Excludes Payroll": -0.08,
    "Fusion Center – CFA": 0.1,
    "Fusion Center – Monitoring": 0.08,
    "Fusion Center – Support": -0.06,
    "Fusion Center – Verizon": -0.13,
    "Human Resources": 0.12,
    IT: 0.05,
    Marketing: 0.09,
    OUS: -0.03,
    Payroll: -0.1,
    Purchasing: -0.17,
    "Quality Assurance": 0.14,
    Sales: 0.11,
    "Solutions Architects": 0.18,
  },
  strongPairs: [
    ["Sales", "Solutions Architects"],
    ["Customer Service", "Sales"],
    ["Field Operations – Technicians", "Field Management"],
    ["Field Lead", "Field Management"],
    ["Fusion Center – Monitoring", "Fusion Center – Support"],
    ["Fusion Center – CFA", "Fusion Center – Monitoring"],
    ["Accounts Payable", "Accounts Receivable"],
    ["Finance – Excludes Payroll", "Payroll"],
    ["IT", "Solutions Architects"],
    ["Quality Assurance", "Field Operations – Technicians"],
    ["Human Resources", "Field Management"],
  ],
  weakPairs: [
    ["Field Operations – Technicians", "Fusion Center – Support"],
    ["Sales", "Finance – Excludes Payroll"],
    ["Purchasing", "Field Operations – Technicians"],
    ["Marketing", "Field Lead"],
    ["Payroll", "Field Management"],
    ["Fusion Center – Verizon", "Customer Service"],
    ["OUS", "Purchasing"],
    ["Accounts Payable", "Field Operations – Technicians"],
  ],
  sparseDepartments: ["Marketing", "Solutions Architects", "OUS"],
  heatedDepartments: ["Purchasing", "Field Operations – Technicians"],
  blindSpotDepartments: ["Sales"],
};

export interface TsiCollaborationDashboardData {
  dataset: CollaborationDataset;
  organizationName: string;
  campaignName: string;
}

function buildTsiComments(respondents: CollaborationDataset["respondents"]): CollaborationComment[] {
  const byDepartment = new Map<string, typeof respondents>();
  for (const respondent of respondents) {
    const list = byDepartment.get(respondent.department) ?? [];
    list.push(respondent);
    byDepartment.set(respondent.department, list);
  }

  return COMMENT_BANK.flatMap((entry, index) => {
    const sourcePool = byDepartment.get(entry.from) ?? [];
    const source = sourcePool[index % Math.max(sourcePool.length, 1)];
    if (!source) {
      return [];
    }

    return [
      {
        id: `tsi-comment-${index + 1}`,
        aboutDepartment: entry.about,
        fromDepartment: entry.from,
        role: source.role,
        generation: source.generation,
        tenure: source.tenure,
        prompt: COMMENT_PROMPT,
        text: entry.text,
      },
    ];
  });
}

let cachedDataset: CollaborationDataset | null = null;

export function getTechSystemsCollaborationDataset(): CollaborationDataset {
  if (cachedDataset) {
    return cachedDataset;
  }

  const departments = [...TSI_COLLABORATION_DEPARTMENTS];
  const respondents = buildDemoRespondents(TSI_COLLABORATION_SCENARIO, "tsi-collab-2026");
  const comments = buildTsiComments(respondents);
  const data = buildCollaborationDataFromRespondents(
    respondents,
    departments,
    [...DEMO_CI_QUESTIONS]
  );

  cachedDataset = {
    departments,
    ciQuestions: [...DEMO_CI_QUESTIONS],
    respondents,
    comments,
    data,
    roles: [...DEMO_ROLES],
    generations: [...DEMO_GENERATIONS],
    tenures: [...DEMO_TENURE_BANDS],
  };

  return cachedDataset;
}

export async function loadTechSystemsCollaborationDashboardData(): Promise<TsiCollaborationDashboardData> {
  return {
    dataset: getTechSystemsCollaborationDataset(),
    organizationName: TSI_COLLABORATION_ORGANIZATION_NAME,
    campaignName: TSI_COLLABORATION_CAMPAIGN_NAME,
  };
}
