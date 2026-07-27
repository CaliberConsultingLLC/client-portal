import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { ReadoutDeckViewer } from "@/components/portal/readout-deck-viewer";
import { Button } from "@/components/ui/button";
import { isInternalFirebaseRole, requireFirebasePortalUser } from "@/lib/firebase/auth";
import {
  getAccessiblePortalClients,
  getAccessiblePublishedReadouts,
} from "@/lib/firebase/portal-access";

function clientLogoFor(clientId: string) {
  switch (clientId) {
    case "dws":
      return "/deep-well-services-logo.png";
    case "csg":
      return "/canopy-services-logo.png";
    case "tf":
      return "/top-flight-logo.png";
    default:
      return "/CClogo3.png";
  }
}

export default async function PortalInsightReadoutPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireFirebasePortalUser();
  if (isInternalFirebaseRole(user.role)) {
    redirect("/portal/readouts");
  }

  const { id } = await params;
  const [clients, readouts] = await Promise.all([
    getAccessiblePortalClients(user),
    getAccessiblePublishedReadouts(user),
  ]);
  const readout = readouts.find((item) => item.id === id) ?? null;
  if (!readout?.deck) {
    notFound();
  }

  const client = clients.find((item) => item.id === readout.clientId) ?? null;

  return (
    <div>
      <div className="absolute left-6 top-[calc(var(--app-top-banner-height)+12px)] z-20">
        <Button
          asChild
          variant="outline"
          size="sm"
          className="rounded-full border-[#C9D2D8] bg-white/90 text-[#355365] hover:bg-[#F5F8FA]"
        >
          <Link href="/portal/insights">
            <ArrowLeft className="h-4 w-4" />
            All readouts
          </Link>
        </Button>
      </div>
      <ReadoutDeckViewer
        readout={readout}
        clientName={client?.name ?? readout.clientId}
        clientLogoUrl={clientLogoFor(readout.clientId)}
        isInternalUser={false}
      />
    </div>
  );
}
