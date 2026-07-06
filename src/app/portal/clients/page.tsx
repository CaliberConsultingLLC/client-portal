import Link from "next/link";
import { ArrowRight, BarChart3, FolderKanban, Settings, Users } from "lucide-react";
import { AdminDirectoryShell } from "@/components/portal/admin-directory-shell";
import {
  AdminDirectoryOverview,
  AdminDirectorySection,
} from "@/components/portal/admin-directory-table";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { isInternalFirebaseRole, requireFirebasePortalUser } from "@/lib/firebase/auth";
import {
  getAccessibleDashboardAssignments,
  getAccessiblePortalClients,
} from "@/lib/firebase/portal-access";
import { listFirebaseUsersByClientId } from "@/lib/firebase/user-store";

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
  const totalUsers = Array.from(
    new Map(
      clientUsers
        .flatMap((entry) => entry.users)
        .filter((portalUser) => portalUser.isActive)
        .map((portalUser) => [portalUser.uid, portalUser])
    ).values()
  ).length;

  if (isInternalFirebaseRole(user.role)) {
    return (
      <AdminDirectoryShell
        filters={
          <Card className="rounded-[28px] border-[#D6DEE3] bg-white">
            <CardHeader>
              <CardTitle className="text-base font-semibold uppercase tracking-[0.2em] text-[#2B2B2B]">
                Filters
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm leading-relaxed text-[#60727D]">
              <p>The client directory is using the shared portal frame now.</p>
              <p>Status and demo filters can be added here next without changing the core layout.</p>
            </CardContent>
          </Card>
        }
        sidePanel={
          <div className="space-y-4">
            <Card className="rounded-[28px] border-[#D6DEE3] bg-white">
              <CardHeader>
                <CardTitle className="text-base font-semibold uppercase tracking-[0.2em] text-[#2B2B2B]">
                  Workspace Notes
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm leading-relaxed text-[#60727D]">
                <p>Each client workspace keeps its own dashboards, users, settings, and information.</p>
                <p>This rail can later hold internal recommendations or client-specific reminders.</p>
              </CardContent>
            </Card>
          </div>
        }
      >
        <div className="space-y-8">
          <AdminDirectoryOverview
            title="Clients"
            description="Review each client workspace, its assigned dashboards, active users, and direct management actions in one aligned admin view."
            metrics={[
              { label: "Active Clients", value: clients.length },
              { label: "Dashboards", value: assignments.length },
              { label: "Users", value: totalUsers },
            ]}
          />

          <AdminDirectorySection
            title="Client Workspaces"
            description="Each row represents a client workspace with direct links into information, settings, and the client-facing workspace."
            columns={[
              { key: "name", label: "Client Workspace" },
              { key: "id", label: "ID" },
              { key: "dashboards", label: "Dashboards" },
              { key: "users", label: "Users" },
              { key: "status", label: "Status" },
              { key: "actions", label: "Actions" },
            ]}
            rows={clients.map((client) => {
              const clientAssignments = assignments.filter((item) => item.clientId === client.id);
              const workspaceUsers =
                clientUsers.find((entry) => entry.clientId === client.id)?.users.filter((entry) => entry.isActive)
                  .length ?? 0;
              const statusLabel = client.status === "active" ? "Active" : client.status === "inactive" ? "Inactive" : "Demo";
              const statusClasses =
                client.status === "active"
                  ? "bg-[#E7F4EC] text-[#2F6E47]"
                  : client.status === "inactive"
                    ? "bg-[#F7E8E8] text-[#975757]"
                    : "bg-[#F5EDD3] text-[#806728]";

              return {
                id: client.id,
                cells: [
                  <div key="name" className="space-y-1">
                    <p className="font-semibold text-[#2B2B2B]">{client.name}</p>
                    <p className="text-xs font-medium uppercase tracking-[0.16em] text-[#60727D]">
                      {client.slug}
                    </p>
                  </div>,
                  <span key="id" className="font-medium text-[#2B2B2B]">
                    {client.id}
                  </span>,
                  <span key="dashboards" className="font-semibold text-[#2B2B2B]">
                    {clientAssignments.length}
                  </span>,
                  <span key="users" className="font-semibold text-[#2B2B2B]">
                    {workspaceUsers}
                  </span>,
                  <span
                    key="status"
                    className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${statusClasses}`}
                  >
                    {statusLabel}
                  </span>,
                  <div key="actions" className="flex items-center justify-center gap-2">
                    <Button asChild variant="outline" className="rounded-full border-[#C9D2D8]">
                      <Link href={`/portal/clients/${client.id}/information`}>Information</Link>
                    </Button>
                    <Button asChild variant="outline" className="rounded-full border-[#C9D2D8]">
                      <Link href={`/portal/clients/${client.id}/settings`}>
                        <Settings className="h-4 w-4" />
                        Settings
                      </Link>
                    </Button>
                    <Button asChild variant="outline" className="rounded-full border-[#C9D2D8]">
                      <Link href={`/portal/clients/${client.id}`}>
                        Open workspace
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>,
                ],
              };
            })}
            emptyMessage="No client workspaces are available yet."
          />
        </div>
      </AdminDirectoryShell>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#60727D]">
          Client Workspaces
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[#2B2B2B]">
          Individual client environments
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-[#60727D]">
          Each client workspace is isolated so dashboards, documents, data sources, and future
          permissions can be managed separately.
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        <Card className="rounded-[26px] border-[#D6DEE3] bg-white shadow-sm">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#EEF3F6] text-[#386B45]">
              <FolderKanban className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-extrabold text-[#2B2B2B]">{clients.length}</p>
              <p className="text-xs text-[#60727D]">Active Clients</p>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-[26px] border-[#D6DEE3] bg-white shadow-sm">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#EEF3F6] text-[#386B45]">
              <BarChart3 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-extrabold text-[#2B2B2B]">{assignments.length}</p>
              <p className="text-xs text-[#60727D]">Dashboards</p>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-[26px] border-[#D6DEE3] bg-white shadow-sm">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#EEF3F6] text-[#386B45]">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-extrabold text-[#2B2B2B]">{totalUsers}</p>
              <p className="text-xs text-[#60727D]">Users</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        {clients.map((client) => {
          const clientAssignments = assignments.filter((item) => item.clientId === client.id);
          const workspaceUsers =
            clientUsers.find((entry) => entry.clientId === client.id)?.users.filter((entry) => entry.isActive)
              .length ?? 0;
          const clientStatusStripClass =
            client.status === "active"
              ? "bg-[#89A594]"
              : client.status === "inactive"
                ? "bg-[#C98585]"
                : "bg-[#EEDC9F]";

          return (
            <Card
              key={client.id}
              className="overflow-hidden rounded-[28px] border-[#D6DEE3] bg-white shadow-sm"
            >
              <CardContent className="relative p-0">
                <div className={`absolute inset-y-0 left-0 w-[20px] ${clientStatusStripClass}`} />
                <div className="p-5 pl-12">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-stretch xl:justify-between">
                  <div className="flex min-w-0 items-center xl:w-[300px]">
                    <p className="text-[1.4rem] font-semibold leading-tight text-[#2B2B2B]">
                      {client.name}
                    </p>
                  </div>

                  <div className="grid flex-1 gap-3 md:grid-cols-3 xl:max-w-[540px]">
                    <div className="flex min-h-[72px] flex-col items-center justify-center rounded-2xl bg-[#F5F8FA] px-4 py-3 text-center">
                      <p className="max-w-full text-xs font-semibold uppercase tracking-[0.18em] text-[#60727D] break-words">
                        ID
                      </p>
                      <p className="mt-2 max-w-full break-words text-sm font-semibold text-[#2B2B2B]">
                        {client.id}
                      </p>
                    </div>
                    <div className="flex min-h-[72px] flex-col items-center justify-center rounded-2xl bg-[#F5F8FA] px-4 py-3 text-center">
                      <p className="max-w-full text-xs font-semibold uppercase tracking-[0.18em] text-[#60727D] break-words">
                        DB
                      </p>
                      <p className="mt-2 text-xl font-bold text-[#2B2B2B]">{clientAssignments.length}</p>
                    </div>
                    <div className="flex min-h-[72px] flex-col items-center justify-center rounded-2xl bg-[#F5F8FA] px-4 py-3 text-center">
                      <p className="max-w-full text-xs font-semibold uppercase tracking-[0.18em] text-[#60727D] break-words">
                        Users
                      </p>
                      <p className="mt-2 text-xl font-bold text-[#2B2B2B]">{workspaceUsers}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 xl:justify-end">
                    <Button asChild variant="outline" className="rounded-full border-[#C9D2D8]">
                      <Link href={`/portal/clients/${client.id}/information`}>
                        Information
                      </Link>
                    </Button>
                    <Button asChild variant="outline" className="rounded-full border-[#C9D2D8]">
                      <Link href={`/portal/clients/${client.id}/settings`}>
                        <Settings className="h-4 w-4" />
                        Settings
                      </Link>
                    </Button>
                    <Button asChild variant="outline" className="rounded-full border-[#C9D2D8]">
                      <Link href={`/portal/clients/${client.id}`}>
                        Open workspace
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
