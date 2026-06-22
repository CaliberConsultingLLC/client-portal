import Link from "next/link";
import { ReadoutViewer } from "@/components/portal/readout-viewer";
import { isInternalFirebaseRole, requireFirebasePortalUser } from "@/lib/firebase/auth";
import { getAccessiblePortalClients } from "@/lib/firebase/portal-access";
import { getPublishedFirebaseReadoutForClient } from "@/lib/firebase/readout-store";
import { Button } from "@/components/ui/button";

export default async function PortalInsightsPage({
  searchParams,
}: {
  searchParams: Promise<{ clientId?: string }>;
}) {
  const user = await requireFirebasePortalUser();
  const isInternalUser = isInternalFirebaseRole(user.role);
  const clients = await getAccessiblePortalClients(user);
  const { clientId } = await searchParams;
  const activeClient = clients.find((client) => client.id === clientId) ?? clients[0] ?? null;

  if (!activeClient) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-16">
        <div className="rounded-3xl border border-dashed border-[#C9D2D8] bg-white px-8 py-12 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#60727D]">Insights</p>
          <h1 className="mt-3 text-3xl font-semibold text-[#2B2B2B]">No client is assigned.</h1>
          <p className="mt-3 text-sm text-[#60727D]">
            Your account does not currently have an active client workspace to load readouts from.
          </p>
        </div>
      </div>
    );
  }

  const readout = await getPublishedFirebaseReadoutForClient(activeClient.id);
  const hasMultipleClients = clients.length > 1;

  if (!readout) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-16">
        {hasMultipleClients ? (
          <div className="mb-6 flex flex-wrap gap-2">
            {clients.map((client) => {
              const isActive = client.id === activeClient.id;
              return (
                <Button
                  key={client.id}
                  asChild
                  variant={isActive ? "default" : "outline"}
                  className={
                    isActive
                      ? "rounded-full bg-[#2B2B2B] text-white hover:bg-[#102533]"
                      : "rounded-full border-[#C9D2D8] bg-white text-[#355365] hover:bg-[#F5F8FA]"
                  }
                >
                  <Link href={`/portal/insights?clientId=${encodeURIComponent(client.id)}`}>
                    {client.name}
                  </Link>
                </Button>
              );
            })}
          </div>
        ) : null}
        <div className="rounded-3xl border border-dashed border-[#C9D2D8] bg-white px-8 py-12 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#60727D]">Insights</p>
          <h1 className="mt-3 text-3xl font-semibold text-[#2B2B2B]">
            No published insight readout.
          </h1>
          <p className="mt-3 text-sm text-[#60727D]">
            {isInternalUser
              ? `No readout is currently published for ${activeClient.name}. Publish one in Readout Manager, then refresh this page.`
              : `There is no published insight readout for ${activeClient.name} right now.`}
          </p>
          {isInternalUser ? (
            <div className="mt-6 flex justify-center">
              <Button
                asChild
                variant="outline"
                className="rounded-full border-[#C9D2D8] bg-white text-[#355365] hover:bg-[#F5F8FA]"
              >
                <Link href="/admin/readouts">Open Readout Manager</Link>
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {hasMultipleClients ? (
        <div className="mx-6 mt-4 flex flex-wrap gap-2">
          {clients.map((client) => {
            const isActive = client.id === activeClient.id;
            return (
              <Button
                key={client.id}
                asChild
                variant={isActive ? "default" : "outline"}
                className={
                  isActive
                    ? "rounded-full bg-[#2B2B2B] text-white hover:bg-[#102533]"
                    : "rounded-full border-[#C9D2D8] bg-white text-[#355365] hover:bg-[#F5F8FA]"
                }
              >
                <Link href={`/portal/insights?clientId=${encodeURIComponent(client.id)}`}>
                  {client.name}
                </Link>
              </Button>
            );
          })}
        </div>
      ) : null}
      <ReadoutViewer readout={readout} clientName={activeClient.name} isInternalUser={isInternalUser} />
    </div>
  );
}
