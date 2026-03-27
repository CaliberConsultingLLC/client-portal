import Link from "next/link";
import { ArrowRight, BarChart3, Database, FolderKanban } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requireFirebasePortalUser } from "@/lib/firebase/auth";
import {
  getAccessibleDashboardAssignments,
  getAccessibleDataWorkspaces,
  getAccessiblePortalClients,
} from "@/lib/firebase/portal-access";

export default async function PortalClientsPage() {
  const user = await requireFirebasePortalUser();
  const [clients, workspaces, assignments] = await Promise.all([
    getAccessiblePortalClients(user),
    getAccessibleDataWorkspaces(user),
    getAccessibleDashboardAssignments(user),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#60727D]">
          Client Workspaces
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[#102533]">
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
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#EEF3F6] text-[#18384E]">
              <FolderKanban className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-extrabold text-[#102533]">{clients.length}</p>
              <p className="text-xs text-[#60727D]">Accessible workspaces</p>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-[26px] border-[#D6DEE3] bg-white shadow-sm">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#EEF3F6] text-[#18384E]">
              <BarChart3 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-extrabold text-[#102533]">{assignments.length}</p>
              <p className="text-xs text-[#60727D]">Visible dashboards</p>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-[26px] border-[#D6DEE3] bg-white shadow-sm">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#EEF3F6] text-[#18384E]">
              <Database className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-extrabold text-[#102533]">{workspaces.length}</p>
              <p className="text-xs text-[#60727D]">Data workspaces</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {clients.map((client) => {
          const workspace = workspaces.find((item) => item.clientId === client.id);
          const clientAssignments = assignments.filter((item) => item.clientId === client.id);
          const configuredFiles =
            workspace?.files.filter((file) => file.status === "configured" || file.status === "sample")
              .length ?? 0;

          return (
            <Card key={client.id} className="rounded-[28px] border-[#D6DEE3] bg-white shadow-sm">
              <CardHeader className="space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <CardTitle className="text-2xl text-[#102533]">{client.name}</CardTitle>
                    <CardDescription className="mt-2 text-sm leading-relaxed text-[#60727D]">
                      {client.isDemo
                        ? "Reserved demo environment for previews and walkthroughs."
                        : "Client-specific workspace with independent dashboard, data, and publishing controls."}
                    </CardDescription>
                  </div>
                  <Badge variant={client.status === "active" ? "success" : "secondary"}>
                    {client.status === "active" ? "Active" : "Draft"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="rounded-2xl bg-[#F5F8FA] px-4 py-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#60727D]">
                      Dashboards
                    </p>
                    <p className="mt-2 text-xl font-bold text-[#102533]">{clientAssignments.length}</p>
                  </div>
                  <div className="rounded-2xl bg-[#F5F8FA] px-4 py-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#60727D]">
                      Files Ready
                    </p>
                    <p className="mt-2 text-xl font-bold text-[#102533]">{configuredFiles}</p>
                  </div>
                  <div className="rounded-2xl bg-[#F5F8FA] px-4 py-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#60727D]">
                      Client ID
                    </p>
                    <p className="mt-2 text-sm font-semibold text-[#102533]">{client.id}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-4">
                  <div className="text-sm text-[#60727D]">
                    {workspace?.notes ?? "Workspace details will appear here once data is configured."}
                  </div>
                  <Button asChild variant="outline" className="rounded-full border-[#C9D2D8]">
                    <Link href={`/portal/clients/${client.id}`}>
                      Open workspace
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
