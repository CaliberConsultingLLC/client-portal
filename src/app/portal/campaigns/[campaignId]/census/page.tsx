import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { CensusWorkbench } from "@/components/portal/census-workbench";
import { PortalContentFrame } from "@/components/portal/portal-content-frame";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { requireFirebasePortalUser } from "@/lib/firebase/auth";
import { getCampaignById } from "@/lib/firebase/campaign-store";
import { getCensusUploadById } from "@/lib/firebase/census-store";
import {
  getAccessibleDashboardAssignments,
  getAccessiblePortalClients,
} from "@/lib/firebase/portal-access";

interface CampaignCensusPageProps {
  params: Promise<{ campaignId: string }>;
}

export default async function CampaignCensusPage({ params }: CampaignCensusPageProps) {
  const { campaignId } = await params;
  const user = await requireFirebasePortalUser();

  const [clients, campaign, assignments] = await Promise.all([
    getAccessiblePortalClients(user),
    getCampaignById(campaignId),
    getAccessibleDashboardAssignments(user),
  ]);

  // Only surface campaigns that belong to a client this user can access.
  if (!campaign || !clients.some((client) => client.id === campaign.clientId)) {
    notFound();
  }

  const client = clients.find((item) => item.id === campaign.clientId) ?? null;
  const upload = campaign.censusId ? await getCensusUploadById(campaign.censusId) : null;

  const backButton = (
    <Button asChild variant="outline" className="rounded-full border-[#C9D2D8]">
      <Link href={`/portal/campaigns/${campaign.id}`}>
        <ArrowLeft className="h-4 w-4" />
        Back to campaign
      </Link>
    </Button>
  );

  // Census tied to this campaign isn't available (e.g. removed or never linked).
  if (!upload || (client && upload.clientId !== client.id)) {
    return (
      <PortalContentFrame>
        <div className="space-y-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#60727D]">
                {campaign.surveyLabel}
              </p>
              <h1 className="mt-2 text-xl font-semibold text-[#2B2B2B]">Campaign Census</h1>
            </div>
            {backButton}
          </div>
          <Card className="rounded-[28px] border-dashed border-[#D6DEE3] bg-white shadow-sm">
            <CardContent className="px-6 py-12 text-sm text-[#60727D]">
              No census is currently linked to this campaign.
            </CardContent>
          </Card>
        </div>
      </PortalContentFrame>
    );
  }

  return (
    <PortalContentFrame>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#60727D]">
              {campaign.surveyLabel}
            </p>
            <h1 className="mt-2 text-xl font-semibold text-[#2B2B2B]">Campaign Census</h1>
          </div>
          {backButton}
        </div>

        <CensusWorkbench
          clients={
            client
              ? [{ id: client.id, name: client.name, shortName: client.shortName }]
              : []
          }
          uploads={[upload]}
          dashboards={assignments
            .filter((assignment) => assignment.clientId === campaign.clientId)
            .map((assignment) => ({
              assetId: assignment.assetId,
              clientId: assignment.clientId,
              title: assignment.title,
            }))}
        />
      </div>
    </PortalContentFrame>
  );
}
