import Link from "next/link";
import { notFound } from "next/navigation";
import { ReadoutDeckViewer } from "@/components/portal/readout-deck-viewer";
import { isInternalFirebaseRole, requireFirebasePortalUser } from "@/lib/firebase/auth";
import { getFirebaseReadoutById, updateFirebaseReadout } from "@/lib/firebase/readout-store";
import { getFirebasePortalClients } from "@/lib/firebase/portal-store";
import { getReadoutDashboardLinkOptions } from "@/lib/readout/dashboard-link-options";
import { buildDefaultReadoutDeck } from "@/lib/readout/default-deck";

function clientLogoFor(clientId: string) {
  switch (clientId) {
    case "dws":
      return "/deep-well-services-logo.png";
    case "csg":
      return "/canopy-services-logo.png";
    case "tf":
      return "/top-flight-logo.png";
    case "tsi":
      return "/tsi-logo.svg";
    default:
      return "/CClogo3.png";
  }
}

export default async function PortalReadoutModifyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireFirebasePortalUser();

  if (!isInternalFirebaseRole(user.role)) {
    notFound();
  }

  const { id } = await params;
  const [readoutDoc, clients] = await Promise.all([
    getFirebaseReadoutById(id),
    getFirebasePortalClients(),
  ]);

  if (!readoutDoc) {
    notFound();
  }

  const client = clients.find((entry) => entry.id === readoutDoc.clientId);
  const clientName = client?.name ?? readoutDoc.clientId;

  let readout = readoutDoc;
  if (!readout.deck) {
    readout = await updateFirebaseReadout({
      readoutId: readout.id,
      deck: buildDefaultReadoutDeck(clientName),
    });
  }

  const dashboardLinkOptions = await getReadoutDashboardLinkOptions(readout.clientId);

  return (
    <div className="relative">
      <div className="absolute left-6 top-3 z-40">
        <Link
          href={`/portal/readouts/${readout.id}`}
          className="inline-flex rounded-full border border-[#D4DAD4] bg-white/95 px-3 py-1.5 text-xs font-semibold text-[#355365] shadow-sm hover:bg-[#F5F8FA]"
        >
          ← Details
        </Link>
      </div>
      <ReadoutDeckViewer
        readout={readout}
        clientName={clientName}
        clientLogoUrl={clientLogoFor(readout.clientId)}
        isInternalUser
        dashboardLinkOptions={dashboardLinkOptions}
      />
    </div>
  );
}
