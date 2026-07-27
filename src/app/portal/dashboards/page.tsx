import Link from "next/link";
import { ArrowRight, LayoutPanelTop } from "lucide-react";
import { DashboardDirectoryList } from "@/components/admin/dashboard-directory-list";
import { Button } from "@/components/ui/button";
import { isInternalFirebaseRole, requireFirebasePortalUser } from "@/lib/firebase/auth";
import { getDashboardDirectoryEntries } from "@/lib/firebase/dashboard-store";
import { getFirebasePortalClients } from "@/lib/firebase/portal-store";
import { getAccessibleDashboardAssignments } from "@/lib/firebase/portal-access";
import type { PortalDashboard, PortalDashboardAccessGrant, PortalDashboardInstance } from "@/types/portal";

function normalizeDashboardTitle(value: string) {
  const title = String(value || "").trim();
  const lower = title.toLowerCase();
  if (lower.includes("employee experience")) return "Employee Experience";
  if (lower.includes("integration effectiveness")) return "Integration Effectiveness";
  return title;
}

type DirectoryInstance = PortalDashboardInstance & {
  dashboard: PortalDashboard | null;
  accessGrants: PortalDashboardAccessGrant[];
};

export default async function PortalDashboardsPage() {
  const user = await requireFirebasePortalUser();

  if (isInternalFirebaseRole(user.role)) {
    const [dashboardDirectory, clients] = await Promise.all([
      getDashboardDirectoryEntries(),
      getFirebasePortalClients(),
    ]);

    const instances = dashboardDirectory.instances as DirectoryInstance[];
    const sortedClients = [...clients].sort((left, right) => left.name.localeCompare(right.name));

    return (
      <DashboardDirectoryList
        clients={sortedClients.map((client) => ({
          id: client.id,
          name: client.name,
          isDemo: client.isDemo,
        }))}
        instances={instances}
        initialClientId={sortedClients[0]?.id ?? ""}
      />
    );
  }

  const dashboardCards = await getAccessibleDashboardAssignments(user);

  return (
    <div className="rounded-2xl border border-[#D4DAD4] bg-[#EEF2EE]">
      <section className="px-8 py-7">
        <div className="mb-6">
          <p className="text-xs font-semibold text-[#8A9A8C]">Portal</p>
          <h1 className="text-2xl font-bold text-[#152238]">Dashboards</h1>
        </div>

        <div className="overflow-hidden rounded-xl border border-[#D4DAD4] bg-white">
          <table className="w-full border-collapse text-sm">
            <thead className="bg-[#F1F5F1]">
              <tr className="border-b-2 border-[#D4DAD4] text-left text-[11px] uppercase tracking-[0.1em] text-[#6E7E96]">
                <th className="px-4 py-3">Dashboard</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {dashboardCards.length === 0 ? (
                <tr>
                  <td className="px-4 py-8 text-sm text-[#6E7E96]" colSpan={3}>
                    No dashboards are assigned to your account yet.
                  </td>
                </tr>
              ) : (
                dashboardCards.map((card) => (
                  <tr key={card.id} className="border-b border-[#EEF2EE] last:border-b-0">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <LayoutPanelTop className="h-4 w-4 text-[#6E7E96]" />
                        <div>
                          <p className="font-semibold text-[#152238]">
                            {normalizeDashboardTitle(card.title)}
                          </p>
                          <p className="text-xs text-[#6E7E96]">{card.description}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${
                          card.status === "active"
                            ? "bg-[#E4EDE5] text-[#2F7048]"
                            : "bg-[#FDF4E3] text-[#8A5E0A]"
                        }`}
                      >
                        {card.status === "active" ? "Active" : "Draft"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        asChild
                        className="rounded-full bg-[#2B2B2B] text-white hover:bg-[#386B45]"
                      >
                        <Link href={card.href}>
                          Open
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
