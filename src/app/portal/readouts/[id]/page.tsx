import { Suspense } from "react";
import { notFound } from "next/navigation";
import { ReadoutEditorShell } from "@/components/admin/readout-editor-shell";
import { isInternalFirebaseRole, requireFirebasePortalUser } from "@/lib/firebase/auth";
import { getFirebaseReadoutById } from "@/lib/firebase/readout-store";
import { getFirebasePortalClients } from "@/lib/firebase/portal-store";

export default async function PortalReadoutEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireFirebasePortalUser();

  if (!isInternalFirebaseRole(user.role)) {
    notFound();
  }

  const { id } = await params;
  const [readout, clients] = await Promise.all([getFirebaseReadoutById(id), getFirebasePortalClients()]);

  if (!readout) {
    notFound();
  }

  const clientName = clients.find((client) => client.id === readout.clientId)?.name ?? readout.clientId;

  return (
    <Suspense fallback={<div className="px-6 py-10 text-sm text-[#60727D]">Loading readout editor…</div>}>
      <ReadoutEditorShell initialReadout={readout} clientName={clientName} basePath="/portal/readouts" />
    </Suspense>
  );
}
