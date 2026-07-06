import { notFound } from "next/navigation";
import { DashboardInstanceInformationForm } from "@/components/portal/dashboard-instance-information-form";
import { isInternalFirebaseRole, requireFirebasePortalUser } from "@/lib/firebase/auth";
import { getFirebaseDashboardInstanceById } from "@/lib/firebase/dashboard-store";

interface DashboardInstanceInformationPageProps {
  params: Promise<{
    instanceId: string;
  }>;
}

export default async function DashboardInstanceInformationPage({
  params,
}: DashboardInstanceInformationPageProps) {
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
    <DashboardInstanceInformationForm
      instanceId={instanceId}
      initialValues={{
        assetId: instance.assetId,
        title: instance.title,
        description: instance.description,
        family: instance.family,
        previewHref: instance.previewHref,
        internalNotes: instance.internalNotes,
      }}
    />
  );
}
