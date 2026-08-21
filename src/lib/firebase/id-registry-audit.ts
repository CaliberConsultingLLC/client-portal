import type { PortalDashboardInstance } from "@/types/portal";

export type IdAuditSeverity = "info" | "warn";

export interface IdAuditFinding {
  severity: IdAuditSeverity;
  instanceId?: string;
  assetId?: string;
  message: string;
  detail?: string;
}

/** Known live client routes — never rename these asset IDs without migration. */
export const PROTECTED_CLIENT_ASSET_IDS = new Set([
  "employee-experience--dws",
  "employee-experience--dws-field",
  "csg-integration-dashboard",
  "collaboration-dashboard",
  "integration-dashboard",
  "tf-collaboration",
  "tsi-collaboration",
]);

const LEGACY_ALIAS_ASSET_IDS = new Set(["dws-employee-experience", "employee-experience--csg"]);

export function auditDashboardInstanceIds(instances: PortalDashboardInstance[]): IdAuditFinding[] {
  const findings: IdAuditFinding[] = [];
  const instanceIds = new Set(instances.map((instance) => instance.id));

  for (const instance of instances) {
    if (PROTECTED_CLIENT_ASSET_IDS.has(instance.assetId)) {
      findings.push({
        severity: "info",
        instanceId: instance.id,
        assetId: instance.assetId,
        message: "Protected live client route",
        detail: `/portal/dashboards/${instance.assetId}`,
      });
    }

    if (LEGACY_ALIAS_ASSET_IDS.has(instance.assetId)) {
      findings.push({
        severity: "warn",
        instanceId: instance.id,
        assetId: instance.assetId,
        message: "Legacy asset ID alias — do not use for new client assignments",
        detail: "Prefer employee-experience--{clientSlug} for EE dashboards.",
      });
    }

    if (instance.id === "dws-employee-experience-instance" && !instanceIds.has("employee-experience-v1-dws-instance")) {
      findings.push({
        severity: "warn",
        instanceId: instance.id,
        assetId: instance.assetId,
        message: "Orphan perspective seed instance ID",
        detail: "Perspective library references dws-employee-experience-instance; live DWS uses employee-experience-v1-dws-instance.",
      });
    }
  }

  if (!instances.some((instance) => instance.assetId === "employee-experience--dws")) {
    findings.push({
      severity: "warn",
      message: "DWS EE asset employee-experience--dws not found in instance registry",
      detail: "Verify Firestore dashboardInstances and access grants for client dws.",
    });
  }

  return findings;
}
