import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, BookText } from "lucide-react";
import { AdminDirectoryShell } from "@/components/portal/admin-directory-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { isInternalFirebaseRole, requireFirebasePortalUser } from "@/lib/firebase/auth";
import {
  getAccessiblePortalClients,
  getAccessiblePublishedReadouts,
} from "@/lib/firebase/portal-access";

function formatDateLabel(value?: string | null) {
  if (!value) {
    return "Not published yet";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export default async function PortalInsightsPage() {
  const user = await requireFirebasePortalUser();
  const isInternalUser = isInternalFirebaseRole(user.role);

  // Internal users manage decks from Readouts → Modify, not this client presentation route.
  if (isInternalUser) {
    redirect("/portal/readouts");
  }

  const [clients, readouts] = await Promise.all([
    getAccessiblePortalClients(user),
    getAccessiblePublishedReadouts(user),
  ]);
  const clientNameById = new Map(clients.map((client) => [client.id, client.name]));

  return (
    <AdminDirectoryShell
      filters={
        <Card className="rounded-[28px] border-[#D6DEE3] bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-semibold uppercase tracking-[0.2em] text-[#2B2B2B]">
              Readout Access
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-relaxed text-[#60727D]">
            <p>This view lists insight readouts currently assigned to your account.</p>
            <p>Only Available readouts you are permitted to open appear here.</p>
          </CardContent>
        </Card>
      }
      sidePanel={
        <Card className="rounded-[28px] border-[#D6DEE3] bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-semibold uppercase tracking-[0.2em] text-[#2B2B2B]">
              Readout Notes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-relaxed text-[#60727D]">
            <p>Open any assigned readout directly from the action button.</p>
            <p>Each readout is a presentation deck tied to a survey wave or assessment.</p>
          </CardContent>
        </Card>
      }
    >
      <div className="space-y-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#60727D]">Insights</p>
          <h1 className="mt-3 text-xl font-semibold uppercase tracking-[0.24em] text-[#2B2B2B] sm:text-2xl">
            Assigned Readouts
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-[#60727D]">
            Open insight presentations currently available to your client workspace.
          </p>
        </div>

        <div className="grid gap-4">
          {readouts.length === 0 ? (
            <Card className="rounded-[28px] border-dashed border-[#D6DEE3] bg-white shadow-sm">
              <CardContent className="px-6 py-12 text-sm text-[#60727D]">
                No readouts are assigned to your account yet.
              </CardContent>
            </Card>
          ) : null}
          {readouts.map((readout) => {
            const waveLabel =
              readout.deck?.waveLabel?.trim() ||
              readout.surveyWaveLabel?.trim() ||
              null;
            const clientName = clientNameById.get(readout.clientId) ?? readout.clientId;
            const descriptionParts = [
              clientName,
              waveLabel,
              `Updated ${formatDateLabel(readout.publishedAt ?? readout.updatedAt)}`,
            ].filter(Boolean);

            return (
              <Card key={readout.id} className="rounded-[28px] border-[#D6DEE3] bg-white shadow-sm">
                <CardContent className="p-5">
                  <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-3">
                        <h2 className="text-lg font-semibold text-[#2B2B2B]">{readout.name}</h2>
                        <span className="inline-flex items-center gap-2 rounded-full bg-[#F4F7F9] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-[#60727D]">
                          <BookText className="h-3.5 w-3.5" />
                          Ready to open
                        </span>
                      </div>
                      <p className="mt-2 text-sm leading-relaxed text-[#60727D]">
                        {descriptionParts.join(" · ")}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2 sm:justify-self-end">
                      <Button asChild className="rounded-full bg-[#2B2B2B] text-white hover:bg-[#386B45]">
                        <Link href={`/portal/insights/${encodeURIComponent(readout.id)}`}>
                          Open Readout
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </AdminDirectoryShell>
  );
}
