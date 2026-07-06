export type InternalDemoEnvironmentFamily =
  | "collaboration"
  | "integration"
  | "employee_experience";

export type InternalDemoEnvironmentStatus = "ready" | "in_progress";

export interface InternalDemoEnvironment {
  id: string;
  title: string;
  family: InternalDemoEnvironmentFamily;
  description: string;
  dataSourceLabel: string;
  status: InternalDemoEnvironmentStatus;
  /** Portal asset id used by the dashboard renderer. */
  publishAssetId?: string;
  /** Dashboard library id used when assigning to a client workspace. */
  publishDashboardId?: string;
  /** Optional instance id for perspective wiring during lab previews. */
  previewInstanceId?: string;
}

export const INTERNAL_DEMO_ENVIRONMENTS: InternalDemoEnvironment[] = [
  {
    id: "collaboration",
    title: "Collaboration",
    family: "collaboration",
    description:
      "Synthetic collaboration demo with scenario controls, relationship maps, and report tabs for internal walkthroughs.",
    dataSourceLabel: "Synthetic collaboration demo dataset",
    status: "ready",
    publishAssetId: "collaboration-dashboard",
    publishDashboardId: "collaboration-v1",
    previewInstanceId: "collaboration-demo-instance",
  },
  {
    id: "integration-effectiveness",
    title: "Integration Effectiveness",
    family: "integration",
    description:
      "Canopy-style integration reporting with statement breakdowns, segment views, and employee voice analysis.",
    dataSourceLabel: "Integration demo CSV workspace",
    status: "ready",
    publishAssetId: "integration-dashboard",
    publishDashboardId: "integration-effectiveness-v1",
    previewInstanceId: "integration-demo-instance",
  },
  {
    id: "employee-experience",
    title: "Employee Experience",
    family: "employee_experience",
    description:
      "DWS employee experience demo rebuilt from the bundled CSV template, including trends, department cuts, and comment themes.",
    dataSourceLabel: "DWS employee experience demo CSV template",
    status: "ready",
    publishAssetId: "dws-employee-experience",
    publishDashboardId: "employee-experience-v1",
    previewInstanceId: "dws-employee-experience-instance",
  },
];

export function getInternalDemoEnvironment(environmentId: string) {
  return INTERNAL_DEMO_ENVIRONMENTS.find((environment) => environment.id === environmentId) ?? null;
}

export function listInternalDemoEnvironments() {
  return INTERNAL_DEMO_ENVIRONMENTS;
}

export function getInternalDemoLabHref(environmentId: string) {
  return `/portal/dashboards/lab/${environmentId}`;
}

export function formatInternalDemoFamilyLabel(family: InternalDemoEnvironmentFamily) {
  return family.replace(/_/g, " ");
}
