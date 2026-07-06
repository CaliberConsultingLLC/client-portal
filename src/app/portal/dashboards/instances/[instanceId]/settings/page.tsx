import { notFound } from "next/navigation";
import { DashboardInstanceSettingsForm } from "@/components/portal/dashboard-instance-settings-form";
import { isInternalFirebaseRole, requireFirebasePortalUser } from "@/lib/firebase/auth";
import { getFirebaseDashboardInstanceById } from "@/lib/firebase/dashboard-store";

interface DashboardInstanceSettingsPageProps {
  params: Promise<{
    instanceId: string;
  }>;
}

export default async function DashboardInstanceSettingsPage({
  params,
}: DashboardInstanceSettingsPageProps) {
  const { instanceId } = await params;
  const user = await requireFirebasePortalUser();

  if (!isInternalFirebaseRole(user.role)) {
    notFound();
  }

  const instance = await getFirebaseDashboardInstanceById(instanceId);

  if (!instance) {
    notFound();
  }

  return (
    <DashboardInstanceSettingsForm
      instanceId={instanceId}
      title={instance.title}
      initialValues={{
        family: instance.family,
        status: instance.settings.status,
        visibilityThreshold: instance.settings.visibilityThreshold,
        hiddenDimensionIds: instance.settings.hiddenDimensionIds ?? [],
        dataSourceLabel: instance.dataSource.label,
        dataSourceKind: instance.dataSource.kind,
        dataSourceSourceClientId: instance.dataSource.sourceClientId,
        dataSourceNotes: instance.dataSource.notes,
        dataMapping: instance.dataMapping ?? null,
      }}
    />
  );
}
