import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import {
  ActivityLog,
  CampaignOverview,
  RecipientTable,
} from "@/components/portal/campaign-readonly-sections";
import { CampaignActionButtons } from "@/components/portal/campaign-action-buttons";
import { CampaignConfigurationPanel } from "@/components/portal/campaign-configuration-panel";
import { CampaignStatusBadge } from "@/components/portal/campaign-status-badge";
import { PortalContentFrame } from "@/components/portal/portal-content-frame";
import { Button } from "@/components/ui/button";
import { requireFirebasePortalUser } from "@/lib/firebase/auth";
import { getCampaignById, listCampaignActivityLog } from "@/lib/firebase/campaign-store";
import { getAccessiblePortalClients } from "@/lib/firebase/portal-access";

interface CampaignDetailPageProps {
  params: Promise<{
    campaignId: string;
  }>;
}

export default async function CampaignDetailPage({ params }: CampaignDetailPageProps) {
  const { campaignId } = await params;
  const user = await requireFirebasePortalUser();
  const [clients, campaign, activityLog] = await Promise.all([
    getAccessiblePortalClients(user),
    getCampaignById(campaignId),
    listCampaignActivityLog(campaignId),
  ]);

  if (!campaign || !clients.some((client) => client.id === campaign.clientId)) {
    notFound();
  }

  const client = clients.find((item) => item.id === campaign.clientId);
  const recipients = Object.values(campaign.recipientMap);

  return (
    <PortalContentFrame>
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#60727D]">
              Campaign Detail
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <h1 className="text-xl font-semibold uppercase tracking-[0.24em] text-[#2B2B2B] sm:text-2xl">
                {campaign.surveyLabel}
              </h1>
              <CampaignStatusBadge status={campaign.status} />
            </div>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-[#60727D]">
              {client?.name ?? campaign.clientId} · SM Survey {campaign.smSurveyId} · Census {campaign.censusId}
            </p>
          </div>
          <div className="space-y-3">
            <CampaignActionButtons campaignId={campaign.id} status={campaign.status} />
            <Button asChild variant="outline" className="rounded-full border-[#C9D2D8]">
              <Link href="/portal/campaigns">
                <ArrowLeft className="h-4 w-4" />
                Back to campaigns
              </Link>
            </Button>
          </div>
        </div>

        <CampaignOverview campaign={campaign} />
        <CampaignConfigurationPanel campaign={campaign} />
        <RecipientTable recipients={recipients} />
        <ActivityLog entries={activityLog} />
      </div>
    </PortalContentFrame>
  );
}
