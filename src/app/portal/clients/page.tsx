import { ClientDirectoryList } from "@/components/admin/client-directory-list";
import { isInternalFirebaseRole, requireFirebasePortalUser } from "@/lib/firebase/auth";
import {
  getAccessibleDashboardAssignments,
  getAccessiblePortalClients,
} from "@/lib/firebase/portal-access";
import { listFirebaseUsersByClientId } from "@/lib/firebase/user-store";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export default async function PortalClientsPage() {
  const user = await requireFirebasePortalUser();
  const [clients, assignments] = await Promise.all([
    getAccessiblePortalClients(user),
    getAccessibleDashboardAssignments(user),
  ]);
  const clientUsers = await Promise.all(
    clients.map(async (client) => ({
      clientId: client.id,
      users: await listFirebaseUsersByClientId(client.id),
    }))
  );

  const rows = clients
    .map((client) => {
      const clientAssignments = assignments.filter((item) => item.clientId === client.id);
      const workspaceUsers =
        clientUsers.find((entry) => entry.clientId === client.id)?.users.filter((entry) => entry.isActive)
          .length ?? 0;

      return {
        id: client.id,
        name: client.name,
        slug: client.slug,
        status: client.status,
        dashboardCount: clientAssignments.length,
        userCount: workspaceUsers,
      };
    })
    .sort((left, right) => left.name.localeCompare(right.name));

  if (isInternalFirebaseRole(user.role)) {
    return <ClientDirectoryList clients={rows} />;
  }

  return (
    <div className="rounded-2xl border border-[#D4DAD4] bg-[#EEF2EE]">
      <section className="px-8 py-7">
        <div className="mb-6">
          <p className="text-xs font-semibold text-[#8A9A8C]">Portal</p>
          <h1 className="text-2xl font-bold text-[#152238]">Clients</h1>
        </div>

        <div className="overflow-hidden rounded-xl border border-[#D4DAD4] bg-white">
          <table className="w-full border-collapse text-sm">
            <thead className="bg-[#F1F5F1]">
              <tr className="border-b-2 border-[#D4DAD4] text-left text-[11px] uppercase tracking-[0.1em] text-[#6E7E96]">
                <th className="px-4 py-3">Client</th>
                <th className="px-4 py-3">Dashboards</th>
                <th className="px-4 py-3">Users</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td className="px-4 py-8 text-sm text-[#6E7E96]" colSpan={4}>
                    No client workspaces are available yet.
                  </td>
                </tr>
              ) : (
                rows.map((client) => (
                  <tr key={client.id} className="border-b border-[#EEF2EE] last:border-b-0">
                    <td className="px-4 py-3 font-semibold text-[#152238]">{client.name}</td>
                    <td className="px-4 py-3 font-semibold text-[#152238]">
                      {client.dashboardCount}
                    </td>
                    <td className="px-4 py-3 font-semibold text-[#152238]">{client.userCount}</td>
                    <td className="px-4 py-3 text-right">
                      <Button asChild variant="outline" className="rounded-full border-[#D4DAD4]">
                        <Link href={`/portal/clients/${client.id}`}>
                          Open workspace
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
