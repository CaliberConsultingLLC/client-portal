import { getPortalClients } from "@/lib/portal/clients";
import type { ClientDataWorkspace } from "@/types/csv-management";

const workspaceOverrides: Record<string, Partial<ClientDataWorkspace>> = {
  demo: {
    status: "demo",
    sourceOfTruth: "Internal demo CSV set",
    storageTarget: "Application-managed demo workspace",
    linkedDashboards: ["Collaboration Dashboard", "Integration Dashboard"],
    files: [
      {
        id: "demo-collaboration-responses",
        label: "Collaboration Responses CSV",
        description: "Sample response file for collaboration walkthroughs",
        status: "sample",
      },
      {
        id: "demo-collaboration-statements",
        label: "Collaboration Statements CSV",
        description: "Sample statements file for collaboration walkthroughs",
        status: "sample",
      },
      {
        id: "demo-integration-database",
        label: "Integration Database CSV",
        description: "Sample database file for integration reporting",
        status: "sample",
      },
      {
        id: "demo-integration-campaign",
        label: "Integration Campaign CSV",
        description: "Sample campaign file for integration reporting",
        status: "sample",
      },
    ],
    notes:
      "Reserved for internal demos and client previews so live client environments do not need to be exposed.",
  },
  csg: {
    status: "ready",
    sourceOfTruth: "Vendor-delivered CSV extracts",
    storageTarget: "Portal-managed CSV workspace",
    linkedDashboards: ["Integration Dashboard"],
    files: [
      {
        id: "csg-integration-database",
        label: "Integration Database CSV",
        description: "Primary source file for the integration dashboard",
        status: "configured",
      },
      {
        id: "csg-integration-campaign",
        label: "Integration Campaign CSV",
        description: "Campaign comparison file used by the dashboard",
        status: "configured",
      },
    ],
    notes:
      "Best candidate for the first real CSV workflow because there is already a dashboard pattern to anchor it.",
  },
  dws: {
    status: "ready",
    sourceOfTruth: "DWS Power BI source CSV exports",
    storageTarget: "Portal-managed CSV workspace",
    linkedDashboards: ["DWS Employee Experience Dashboard"],
    files: [
      {
        id: "dws-employee-experience-database",
        label: "DWS Database CSV",
        description: "Primary respondent-level source file for the employee experience dashboard",
        status: "configured",
      },
      {
        id: "dws-employee-experience-statements",
        label: "DWS Campaign Statements CSV",
        description: "Statement and index mapping file used to build the dashboard",
        status: "configured",
      },
      {
        id: "dws-power-bi-reference",
        label: "DWS Executive PBIX",
        description: "Reference Power BI file used to mirror reporting structure and logic",
        status: "configured",
      },
    ],
    notes:
      "DWS now has an active employee experience dashboard assignment backed by the current CSV extracts and mapped from the PBIX reference file.",
  },
};

export function getClientDataWorkspaces(): ClientDataWorkspace[] {
  return getPortalClients().map((client) => {
    const override = workspaceOverrides[client.id];

    return {
      clientId: client.id,
      clientName: client.name,
      shortName: client.shortName,
      status: client.isDemo ? "demo" : "needs_setup",
      sourceOfTruth: "Vendor-delivered CSV extracts",
      storageTarget: "Portal-managed CSV workspace",
      linkedDashboards: [],
      files: [
        {
          id: `${client.id}-primary`,
          label: "Primary Response CSV",
          description: "Main survey export or respondent-level source file",
          status: "missing",
        },
        {
          id: `${client.id}-supplemental`,
          label: "Supplemental Mapping CSV",
          description: "Optional lookup, benchmark, or campaign comparison file",
          status: "missing",
        },
      ],
      notes:
        "Workspace stub created. Data schema, dashboard mapping, and file rules still need to be finalized.",
      ...override,
    };
  });
}
