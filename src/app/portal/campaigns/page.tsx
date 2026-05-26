import { Megaphone } from "lucide-react";
import { AdminDirectoryShell } from "@/components/portal/admin-directory-shell";
import { CampaignCreateModal } from "@/components/portal/campaign-create-modal";
import { CampaignList } from "@/components/portal/campaign-readonly-sections";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireFirebasePortalUser } from "@/lib/firebase/auth";
import { listCampaignsForClientIds } from "@/lib/firebase/campaign-store";
import { listCensusUploads } from "@/lib/firebase/census-store";
import { getAccessiblePortalClients } from "@/lib/firebase/portal-access";

export default async function PortalCampaignsPage() {
  const user = await requireFirebasePortalUser();
  const clients = await getAccessiblePortalClients(user);
  const clientIds = clients.map((client) => client.id);
  const [campaigns, censusUploads] = await Promise.all([
    listCampaignsForClientIds(clientIds),
    listCensusUploads(["demo"]),
  ]);
  const clientNamesById = Object.fromEntries(clients.map((client) => [client.id, client.name]));
  const activeCampaigns = campaigns.filter((campaign) =>
    ["configured", "launched", "active", "paused"].includes(campaign.status)
  );

  return (
    <AdminDirectoryShell
      filters={
        <Card className="rounded-[28px] border-[#D6DEE3] bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-semibold uppercase tracking-[0.2em] text-[#2B2B2B]">
              Campaign Controls
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-relaxed text-[#60727D]">
            <p>Phase 2 is read-only. Campaign creation and configuration arrive in Phase 3.</p>
            <p>Automation remains demo-only and dry-run by default.</p>
          </CardContent>
        </Card>
      }
      sidePanel={
        <Card className="rounded-[28px] border-[#D6DEE3] bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-semibold uppercase tracking-[0.2em] text-[#2B2B2B]">
              Campaign Automation
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm leading-relaxed text-[#60727D]">
            <p>
              Campaigns connect one census upload to one SurveyMonkey survey and keep response state
              in a campaign-specific recipient map.
            </p>
            <p>
              The activity log is the audit trail for every manual action and dry-run simulation.
            </p>
          </CardContent>
        </Card>
      }
    >
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-[#60727D]">
              <Megaphone className="h-4 w-4" />
              Campaigns
            </p>
            <h1 className="mt-3 text-xl font-semibold uppercase tracking-[0.24em] text-[#2B2B2B] sm:text-2xl">
              Survey Campaign Automation
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-[#60727D]">
              Read-only campaign operations workspace for survey launch, reminder, and response
              tracking workflows.
            </p>
          </div>
          <CampaignCreateModal
            clients={clients.map((client) => ({ id: client.id, name: client.name }))}
            censusUploads={censusUploads}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <SummaryCard label="Campaigns" value={campaigns.length} />
          <SummaryCard label="Active Workflows" value={activeCampaigns.length} />
          <SummaryCard
            label="Dry Run Campaigns"
            value={campaigns.filter((campaign) => campaign.config.dryRun).length}
          />
        </div>

        <CampaignList campaigns={campaigns} clientNamesById={clientNamesById} />
      </div>
    </AdminDirectoryShell>
  );
}

function SummaryCard({ label, value }: { label: string; value: string | number }) {
  return (
    <Card className="rounded-[24px] border-[#D6DEE3] bg-white shadow-sm">
      <CardContent className="p-5">
        <p className="text-2xl font-extrabold text-[#2B2B2B]">{value}</p>
        <p className="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#60727D]">
          {label}
        </p>
      </CardContent>
    </Card>
  );
}
