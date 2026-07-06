import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { DashboardPerspectiveInstance, PerspectiveLibraryItem } from "@/types/portal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardInstancePageFrame } from "@/components/portal/dashboard-instance-page-frame";

interface DashboardInstancePerspectivesViewProps {
  instanceId: string;
  dashboardTitle: string;
  perspectiveInstances: DashboardPerspectiveInstance[];
  libraryById: Map<string, PerspectiveLibraryItem>;
}

export function DashboardInstancePerspectivesView({
  instanceId,
  dashboardTitle,
  perspectiveInstances,
  libraryById,
}: DashboardInstancePerspectivesViewProps) {
  const categoryCount = new Set(
    perspectiveInstances.flatMap((instance) => instance.categoryIds ?? [])
  ).size;
  const customizedCount = perspectiveInstances.filter((instance) => instance.isCustomized).length;

  return (
    <DashboardInstancePageFrame>
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#60727D]">
              Dashboard Instance
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[#2B2B2B]">
              Perspectives
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-[#60727D]">
              These are the dashboard-local perspective instances currently attached to this dashboard.
              Each one is linked to a perspective library item so future adoption and replacement can be
              managed intentionally.
            </p>
            <p className="mt-3 text-base font-semibold text-[#2B2B2B]">{dashboardTitle}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button asChild variant="outline" className="rounded-full border-[#C9D2D8]">
              <Link href={`/portal/dashboards/instances/${instanceId}/information`}>
                Manage information
              </Link>
            </Button>
            <Button asChild variant="outline" className="rounded-full border-[#C9D2D8]">
              <Link href={`/portal/dashboards/instances/${instanceId}/settings`}>
                Manage settings
              </Link>
            </Button>
            <Button asChild variant="outline" className="rounded-full border-[#C9D2D8]">
              <Link href={`/portal/dashboards/instances/${instanceId}/access`}>
                Manage access
              </Link>
            </Button>
            <Button asChild variant="outline" className="rounded-full border-[#C9D2D8]">
              <Link href="/portal/dashboards">
                <ArrowLeft className="h-4 w-4" />
                Back to dashboards
              </Link>
            </Button>
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          <Card className="rounded-[26px] border-[#D6DEE3] bg-white shadow-sm">
            <CardContent className="p-5">
              <p className="text-2xl font-extrabold text-[#2B2B2B]">{perspectiveInstances.length}</p>
              <p className="text-xs text-[#60727D]">Perspective Instances</p>
            </CardContent>
          </Card>
          <Card className="rounded-[26px] border-[#D6DEE3] bg-white shadow-sm">
            <CardContent className="p-5">
              <p className="text-2xl font-extrabold text-[#2B2B2B]">{categoryCount}</p>
              <p className="text-xs text-[#60727D]">Category Groups</p>
            </CardContent>
          </Card>
          <Card className="rounded-[26px] border-[#D6DEE3] bg-white shadow-sm">
            <CardContent className="p-5">
              <p className="text-2xl font-extrabold text-[#2B2B2B]">{customizedCount}</p>
              <p className="text-xs text-[#60727D]">Customized Instances</p>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          {perspectiveInstances.map((instance) => {
            const libraryItem = libraryById.get(instance.libraryItemId);

            return (
              <Card
                key={instance.id}
                className="overflow-hidden rounded-[28px] border-[#D6DEE3] bg-white shadow-sm"
              >
                <CardContent className="space-y-5 p-6">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="min-w-0 xl:max-w-[580px]">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="rounded-full bg-[#F4F7F9] px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#60727D]">
                          Order {instance.order}
                        </span>
                        <span className="rounded-full bg-[#F4F7F9] px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#60727D]">
                          {instance.status}
                        </span>
                      </div>
                      <p className="mt-4 text-[1.6rem] font-semibold leading-tight text-[#2B2B2B]">
                        {instance.title}
                      </p>
                      <p className="mt-3 text-sm leading-relaxed text-[#60727D]">{instance.description}</p>
                    </div>

                    <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] xl:min-w-[420px]">
                      <div className="rounded-2xl bg-[#F5F8FA] px-5 py-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#60727D]">
                          Library Source
                        </p>
                        <p className="mt-2 text-base font-semibold text-[#2B2B2B]">
                          {libraryItem?.title ?? instance.libraryItemId}
                        </p>
                      </div>
                      <div className="rounded-2xl bg-[#F5F8FA] px-5 py-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#60727D]">
                          Renderer Key
                        </p>
                        <p className="mt-2 break-all text-base font-semibold text-[#2B2B2B]">
                          {instance.rendererKey}
                        </p>
                      </div>
                      <div className="rounded-2xl bg-[#F5F8FA] px-5 py-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#60727D]">
                          Category Bindings
                        </p>
                        <p className="mt-2 text-base font-semibold text-[#2B2B2B]">
                          {instance.categoryLabels?.length ? instance.categoryLabels.join(", ") : "None"}
                        </p>
                      </div>
                      <div className="rounded-2xl bg-[#F5F8FA] px-5 py-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#60727D]">
                          Customization
                        </p>
                        <p className="mt-2 text-base font-semibold text-[#2B2B2B]">
                          {instance.isCustomized ? "Dashboard-local override" : "Library-aligned"}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </DashboardInstancePageFrame>
  );
}
