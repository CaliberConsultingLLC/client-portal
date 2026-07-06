import { notFound } from "next/navigation";
import { ClientSettingsForm } from "@/components/portal/client-settings-form";
import { isInternalFirebaseRole, requireFirebasePortalUser } from "@/lib/firebase/auth";
import { getFirebasePortalClientById } from "@/lib/firebase/portal-store";

interface ClientSettingsPageProps {
  params: Promise<{
    clientId: string;
  }>;
}

export default async function ClientSettingsPage({ params }: ClientSettingsPageProps) {
  const { clientId } = await params;
  const user = await requireFirebasePortalUser();

  if (!isInternalFirebaseRole(user.role)) {
    notFound();
  }

  const client = await getFirebasePortalClientById(clientId);

  if (!client) {
    notFound();
  }

  return (
    <ClientSettingsForm
      clientId={clientId}
      initialValues={{
        status: client.status,
        visibilityThreshold: client.visibilityThreshold,
      }}
    />
  );
}
