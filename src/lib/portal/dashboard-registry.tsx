import type { ReactNode } from "react";
import { CollaborationDemoEnvironment } from "@/components/collaboration/demo-environment";
import { DwsEmployeeExperienceDashboardClient } from "@/app/employee-experience/dws/dashboard-client";
import { IntegrationEffectivenessDashboardClient } from "@/app/integration-effectiveness/demo/dashboard-client";
import { LiveCollaborationDashboard } from "@/components/collaboration/live-collaboration-dashboard";
import { loadTopFlightCollaborationDashboardData } from "@/lib/collaboration/tf-collaboration";
import { loadTechSystemsCollaborationDashboardData } from "@/lib/collaboration/tsi-collaboration";
import { getFirebaseDashboardInstanceById } from "@/lib/firebase/dashboard-store";
import {
  loadDwsEmployeeExperienceDashboardData,
  loadEmployeeExperienceSyntheticDemoData,
} from "@/lib/employee-experience/dws-dashboard";
import { getDashboardPerspectiveInstancesByDashboardId } from "@/lib/firebase/perspective-store";
import { loadCanopyIntegrationDashboardData } from "@/lib/integration-effectiveness/canopy-demo";
import { type EmployeeExperienceUserAccess } from "@/lib/firebase/user-access";

export interface PortalDashboardRenderOptions {
  dashboardInstanceId?: string;
  demo?: boolean;
  canEditGuidance?: boolean;
  employeeExperienceAccess?: EmployeeExperienceUserAccess;
}

export interface PortalDashboardRendererDefinition {
  assetId: string;
  title: string;
  family: "collaboration" | "integration" | "employee_experience";
  render: (options?: PortalDashboardRenderOptions) => Promise<ReactNode>;
}

function normalizeRendererAssetId(assetId: string) {
  return assetId.split("--")[0] ?? assetId;
}

function eeDashboardProps(options?: PortalDashboardRenderOptions) {
  return {
    dashboardInstanceId: options?.dashboardInstanceId,
    canEditGuidance: options?.canEditGuidance ?? false,
    portalAccess: options?.employeeExperienceAccess,
  };
}

function EmployeeExperienceAwaitingData({ title }: { title: string }) {
  return (
    <div className="mx-auto max-w-3xl space-y-4 py-16">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#60727D]">Awaiting survey data</p>
      <h1 className="text-3xl font-semibold tracking-tight text-[#2B2B2B]">{title}</h1>
      <p className="text-sm leading-relaxed text-[#60727D]">
        This dashboard is set up and will populate as soon as the first campaign is loaded. Upload{" "}
        <code>TSi EE Database.csv</code> and <code>TSi EE Statements.csv</code> to{" "}
        <code>clients/tsi/data/</code> in Firebase Storage.
      </p>
    </div>
  );
}

async function renderEmployeeExperienceDashboard(options?: PortalDashboardRenderOptions) {
  const sharedProps = eeDashboardProps(options);

  if (options?.demo) {
    const data = await loadDwsEmployeeExperienceDashboardData({ demo: true });
    return (
      <DwsEmployeeExperienceDashboardClient
        data={data}
        logoUrl="/top-flight-logo.png"
        {...sharedProps}
      />
    );
  }

  if (options?.dashboardInstanceId) {
    const instance = await getFirebaseDashboardInstanceById(options.dashboardInstanceId);
    if (instance?.dataSource.kind === "synthetic_demo") {
      const data = await loadEmployeeExperienceSyntheticDemoData({
        hiddenDimensionIds: instance.settings.hiddenDimensionIds ?? [],
      });
      return (
        <DwsEmployeeExperienceDashboardClient
          data={data}
          logoUrl={instance.logoUrl ?? undefined}
          redesignLayout={instance.settings.redesignEnabled ?? false}
          {...sharedProps}
        />
      );
    }

    const sourceClientId = instance?.dataSource.sourceClientId ?? undefined;
    // TSI is scaffolded ahead of its first survey upload. Until both CSVs are in
    // clients/tsi/data, show where the data goes instead of an error page.
    if (sourceClientId === "tsi") {
      try {
        const data = await loadDwsEmployeeExperienceDashboardData({
          hiddenDimensionIds: instance?.settings.hiddenDimensionIds ?? [],
          sourceClientId,
        });
        if (data.meta.campaigns.length === 0) {
          return <EmployeeExperienceAwaitingData title={instance?.title ?? "Employee Experience"} />;
        }
        return (
          <DwsEmployeeExperienceDashboardClient
            data={data}
            logoUrl={instance?.logoUrl ?? "/tsi-logo.svg"}
            redesignLayout={instance?.settings.redesignEnabled ?? false}
            {...sharedProps}
          />
        );
      } catch (error) {
        console.error("TSI employee experience data is not available yet.", error);
        return <EmployeeExperienceAwaitingData title={instance?.title ?? "Employee Experience"} />;
      }
    }

    const data = await loadDwsEmployeeExperienceDashboardData({
      hiddenDimensionIds: instance?.settings.hiddenDimensionIds ?? [],
      sourceClientId,
    });
    return (
      <DwsEmployeeExperienceDashboardClient
        data={data}
        logoUrl={instance?.logoUrl ?? undefined}
        redesignLayout={instance?.settings.redesignEnabled ?? false}
        {...sharedProps}
      />
    );
  }

  const data = await loadDwsEmployeeExperienceDashboardData();
  return <DwsEmployeeExperienceDashboardClient data={data} {...sharedProps} />;
}

const dashboardRegistry: Record<string, PortalDashboardRendererDefinition> = {
  "collaboration-dashboard": {
    assetId: "collaboration-dashboard",
    title: "Collaboration",
    family: "collaboration",
    render: async ({ employeeExperienceAccess } = {}) => (
      <CollaborationDemoEnvironment portalAccess={employeeExperienceAccess} />
    ),
  },
  "tf-collaboration": {
    assetId: "tf-collaboration",
    title: "Top Flight Collaboration",
    family: "collaboration",
    render: async ({ employeeExperienceAccess } = {}) => {
      const { dataset, organizationName, campaignName } =
        await loadTopFlightCollaborationDashboardData();
      return (
        <LiveCollaborationDashboard
          dataset={dataset}
          campaignName={campaignName}
          organizationName={organizationName}
          logoUrl="/top-flight-logo.png"
          portalAccess={employeeExperienceAccess}
        />
      );
    },
  },
  "tsi-collaboration": {
    assetId: "tsi-collaboration",
    title: "Tech Systems Collaboration",
    family: "collaboration",
    render: async ({ employeeExperienceAccess } = {}) => {
      const { dataset, organizationName, campaignName } =
        await loadTechSystemsCollaborationDashboardData();
      return (
        <LiveCollaborationDashboard
          dataset={dataset}
          campaignName={campaignName}
          organizationName={organizationName}
          logoUrl="/tsi-logo.svg"
          portalAccess={employeeExperienceAccess}
        />
      );
    },
  },
  "integration-dashboard": {
    assetId: "integration-dashboard",
    title: "Integration Effectiveness",
    family: "integration",
    render: async ({ dashboardInstanceId, demo, employeeExperienceAccess } = {}) => {
      const [data, perspectiveInstances] = await Promise.all([
        loadCanopyIntegrationDashboardData({ demo }),
        getDashboardPerspectiveInstancesByDashboardId(
          dashboardInstanceId ?? "integration-demo-instance"
        ),
      ]);
      return (
        <IntegrationEffectivenessDashboardClient
          data={data}
          perspectiveInstances={perspectiveInstances}
          portalAccess={employeeExperienceAccess}
        />
      );
    },
  },
  "csg-integration-dashboard": {
    assetId: "csg-integration-dashboard",
    title: "Integration Effectiveness",
    family: "integration",
    render: async ({ dashboardInstanceId, demo, employeeExperienceAccess } = {}) => {
      const [data, perspectiveInstances] = await Promise.all([
        loadCanopyIntegrationDashboardData({ demo }),
        getDashboardPerspectiveInstancesByDashboardId(
          dashboardInstanceId ?? "csg-integration-instance"
        ),
      ]);
      return (
        <IntegrationEffectivenessDashboardClient
          data={data}
          perspectiveInstances={perspectiveInstances}
          portalAccess={employeeExperienceAccess}
        />
      );
    },
  },
  "dws-employee-experience": {
    assetId: "dws-employee-experience",
    title: "DWS Employee Experience",
    family: "employee_experience",
    render: renderEmployeeExperienceDashboard,
  },
  "employee-experience": {
    assetId: "employee-experience",
    title: "Employee Experience",
    family: "employee_experience",
    render: renderEmployeeExperienceDashboard,
  },
};

export function getPortalDashboardDefinition(assetId: string) {
  return dashboardRegistry[normalizeRendererAssetId(assetId)] ?? null;
}

export function listPortalDashboardDefinitions() {
  return Object.values(dashboardRegistry);
}

export async function renderPortalDashboardAsset(
  assetId: string,
  options?: PortalDashboardRenderOptions
) {
  const definition = getPortalDashboardDefinition(assetId);

  if (!definition) {
    return null;
  }

  return definition.render(options);
}
