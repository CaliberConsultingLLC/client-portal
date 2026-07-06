import { notFound } from "next/navigation";
import { ClientInformationForm } from "@/components/portal/client-information-form";
import { isInternalFirebaseRole, requireFirebasePortalUser } from "@/lib/firebase/auth";
import { getFirebasePortalClientById } from "@/lib/firebase/portal-store";

interface ClientInformationPageProps {
  params: Promise<{
    clientId: string;
  }>;
}

export default async function ClientInformationPage({ params }: ClientInformationPageProps) {
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
    <ClientInformationForm
      clientId={clientId}
      initialValues={{
        name: client.name,
        industry: client.industry,
        executivePocEmail: client.executivePocEmail,
        hrPocEmail: client.hrPocEmail,
        contractDate: client.contractDate,
        arr: client.arr,
        notes: client.notes,
      }}
    />
  );
}
