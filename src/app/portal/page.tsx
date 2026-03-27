import { PortalHomeContent } from "@/components/portal/portal-home-content";
import { requireFirebasePortalUser } from "@/lib/firebase/auth";
import { getAccessibleDashboardAssignments, getAccessiblePortalClients } from "@/lib/firebase/portal-access";

export default async function PortalHomePage() {
  const user = await requireFirebasePortalUser();
  const [clients, assignments] = await Promise.all([
    getAccessiblePortalClients(user),
    getAccessibleDashboardAssignments(user),
  ]);

  return (
    <PortalHomeContent
      dashboardCount={assignments.length}
      reportCount={0}
      documentCount={0}
      portalClientCount={clients.length}
      welcomeTitle="A secure home base for dashboards, reports, and supporting materials."
      welcomeBody={
        clients.length > 0
          ? `Your current access is scoped across ${clients.length} client workspace${clients.length === 1 ? "" : "s"}, with dashboard visibility controlled from Firebase-backed assignments.`
          : "This portal is structured so each client workspace can remain fully separate, with its own dashboards, reports, documents, and resources."
      }
    />
  );
}
