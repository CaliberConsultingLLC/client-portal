import { PortalHomeContent } from "@/components/portal/portal-home-content";
import type { ResponseRateSummary } from "@/components/portal/response-rate-card";
import { requireFirebasePortalUser } from "@/lib/firebase/auth";
import { listFirebaseUsersByClientId } from "@/lib/firebase/user-store";
import { listCampaignsForClientIds } from "@/lib/firebase/campaign-store";
import {
  getAccessibleDashboardAssignments,
  getAccessiblePortalClients,
  getAccessiblePublishedReadouts,
} from "@/lib/firebase/portal-access";

const ACTIVE_CAMPAIGN_STATUSES = ["launched", "active", "closing"];

export default async function PortalHomePage() {
  const user = await requireFirebasePortalUser();
  const [clients, assignments, readouts] = await Promise.all([
    getAccessiblePortalClients(user),
    getAccessibleDashboardAssignments(user),
    getAccessiblePublishedReadouts(user),
  ]);

  // Newest published readout per client (list is already newest-first).
  const readoutHrefByClientId = new Map<string, string>();
  for (const readout of readouts) {
    if (!readoutHrefByClientId.has(readout.clientId)) {
      readoutHrefByClientId.set(
        readout.clientId,
        `/portal/insights/${encodeURIComponent(readout.id)}`
      );
    }
  }

  const campaigns = await listCampaignsForClientIds(clients.map((client) => client.id));
  const activeCampaigns = campaigns.filter((campaign) =>
    ACTIVE_CAMPAIGN_STATUSES.includes(campaign.status)
  );

  let responseSummary: ResponseRateSummary | null = null;

  if (activeCampaigns.length > 0) {
    const respondedCount = activeCampaigns.reduce((sum, c) => sum + c.respondedCount, 0);
    const totalRecipients = activeCampaigns.reduce((sum, c) => sum + c.totalRecipients, 0);
    const responseRate = totalRecipients > 0
      ? Math.round((respondedCount / totalRecipients) * 100)
      : 0;
    // Newest active campaign drives the target + headline label.
    const primary = activeCampaigns[0];

    responseSummary = {
      responseRate,
      respondedCount,
      totalRecipients,
      targetResponseRate: primary.config.targetResponseRate,
      activeCampaignCount: activeCampaigns.length,
      primaryLabel:
        activeCampaigns.length === 1
          ? primary.surveyLabel
          : `${activeCampaigns.length} active survey campaigns`,
    };
  }

  const activeUsersByClient = await Promise.all(
    clients.map(async (client) => listFirebaseUsersByClientId(client.id))
  );

  const activeUserCount = Array.from(
    new Map(
      activeUsersByClient
        .flat()
        .filter((portalUser) => portalUser.isActive)
        .map((portalUser) => [portalUser.uid, portalUser])
    ).values()
  ).length;

  return (
    <PortalHomeContent
      dashboardCount={assignments.length}
      activeUserCount={activeUserCount}
      responseSummary={responseSummary}
      dashboardItems={assignments.map((assignment) => ({
        id: assignment.id,
        title: assignment.title,
        description: assignment.description,
        href: assignment.href,
        readoutHref:
          readoutHrefByClientId.get(assignment.clientId) ?? "/portal/insights",
      }))}
      welcomeTitle="Your assigned dashboards and materials, all in one place."
      welcomeBody={
        clients.length > 0
          ? `Use this space to open the dashboards and supporting materials currently assigned to your workspace${clients.length === 1 ? "" : "s"}.`
          : "Use this space to open the dashboards and supporting materials currently assigned to your account."
      }
    />
  );
}
