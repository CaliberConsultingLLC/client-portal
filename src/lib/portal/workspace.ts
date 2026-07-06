import type { PortalAsset, PortalWorkspace } from "@/types/portal";
import { getPortalClientById } from "@/lib/portal/clients";

const sharedAssets: PortalAsset[] = [
  {
    id: "collaboration-dashboard",
    title: "Collaboration",
    description:
      "Interactive collaboration reporting designed to surface relationship friction, trust patterns, and action priorities.",
    type: "dashboard",
    status: "active",
    href: "/portal/dashboards/collaboration-dashboard",
    previewHref: "/collaboration/demo",
    updatedLabel: "Updated today",
    tags: ["Dashboard", "Interactive"],
  },
  {
    id: "integration-dashboard",
    title: "Integration Effectiveness",
    description:
      "Integration effectiveness reporting with statement breakdowns, segment views, and employee voice analysis.",
    type: "dashboard",
    status: "active",
    href: "/portal/dashboards/integration-dashboard",
    previewHref: "/integration-effectiveness/demo",
    updatedLabel: "Updated today",
    tags: ["Dashboard", "Interactive"],
  },
  {
    id: "executive-summary",
    title: "Executive Summary",
    description:
      "A concise leadership-ready report area for PDF summaries, presentations, or other final deliverables.",
    type: "report",
    status: "coming_soon",
    updatedLabel: "Ready for upload",
    tags: ["PDF", "Summary"],
  },
  {
    id: "project-documents",
    title: "Project Documents",
    description:
      "A place for decks, summaries, data notes, and any other client-facing supporting files.",
    type: "document",
    status: "coming_soon",
    updatedLabel: "Ready for upload",
    tags: ["Files", "Download"],
  },
  {
    id: "portal-resources",
    title: "Portal Resources",
    description:
      "Reference materials, support information, and client-specific guidance can be added here over time.",
    type: "resource",
    status: "coming_soon",
    updatedLabel: "Ready for setup",
    tags: ["Support", "Reference"],
  },
];

const clientSpecificAssets: Record<string, PortalAsset[]> = {
  csg: [
    {
      id: "csg-integration-dashboard",
      title: "Integration Effectiveness",
      description:
        "A client-ready view of integration results across survey statements, campaign lenses, brand cuts, and employee feedback to help leaders spot strengths, risks, and priority actions.",
      type: "dashboard",
      status: "active",
      href: "/portal/dashboards/csg-integration-dashboard",
      previewHref: "/integration-effectiveness/csg",
      updatedLabel: "Updated today",
      tags: ["Dashboard", "Integration"],
    },
  ],
  tf: [
    {
      id: "tf-collaboration",
      title: "Top Flight Collaboration",
      description:
        "Collaboration reporting for Top Flight, Inc. built from the client's collaboration database and statement map.",
      type: "dashboard",
      status: "active",
      href: "/portal/dashboards/tf-collaboration",
      previewHref: "/portal/dashboards/tf-collaboration",
      updatedLabel: "Updated today",
      tags: ["Dashboard", "Collaboration"],
    },
  ],
  dws: [
    {
      id: "dws-employee-experience",
      title: "DWS Employee Experience",
      description:
        "A DWS-specific employee experience environment rebuilt from the Power BI reporting package and current CSV workspace.",
      type: "dashboard",
      status: "active",
      href: "/portal/dashboards/dws-employee-experience",
      previewHref: "/employee-experience/dws",
      updatedLabel: "Updated today",
      tags: ["Dashboard", "Employee Experience"],
    },
  ],
};

export function getPortalWorkspace(clientId = "demo"): PortalWorkspace {
  const client = getPortalClientById(clientId);
  const workspaceName = client?.isDemo ? "Demo Workspace" : `${client?.name ?? "Client"} Workspace`;

  return {
    id: `${clientId}-workspace`,
    name: workspaceName,
    welcomeTitle: "A secure home base for dashboards, reports, and supporting materials.",
    welcomeBody: client?.isDemo
      ? "This workspace is reserved for controlled demos, previews, and internal walk-throughs without exposing a live client environment."
      : "This portal is structured so each client workspace can remain fully separate, with its own dashboards, reports, documents, and resources.",
    assets: [...sharedAssets, ...(clientSpecificAssets[clientId] ?? [])],
  };
}

export function getPortalAssetsByType(type: PortalAsset["type"], clientId = "demo") {
  return getPortalWorkspace(clientId).assets.filter((asset) => asset.type === type);
}

export function getPortalAssetById(assetId: string, clientId = "demo") {
  const workspaceMatch = getPortalWorkspace(clientId).assets.find((asset) => asset.id === assetId);

  if (workspaceMatch) {
    return workspaceMatch;
  }

  return Object.values(clientSpecificAssets)
    .flat()
    .find((asset) => asset.id === assetId) ?? null;
}
