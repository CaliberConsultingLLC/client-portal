import { notFound } from "next/navigation";
import { LockKeyhole, ShieldCheck } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireFirebasePortalUser } from "@/lib/firebase/auth";
import { getAccessibleDashboardAssignments } from "@/lib/firebase/portal-access";
import { getPortalDashboardDefinition, renderPortalDashboardAsset } from "@/lib/portal/dashboard-registry";

interface DashboardAssetPageProps {
  params: Promise<{
    assetId: string;
  }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

function isDemoParam(value: string | string[] | undefined) {
  const normalized = Array.isArray(value) ? value[0] : value;
  return normalized === "true" || normalized === "1" || normalized === "demo";
}

export default async function DashboardAssetPage({ params, searchParams }: DashboardAssetPageProps) {
  const { assetId } = await params;
  const resolvedSearchParams = await searchParams;
  const user = await requireFirebasePortalUser();
  const assignments = await getAccessibleDashboardAssignments(user);
  const assignment = assignments.find((item) => item.assetId === assetId);

  if (!assignment) {
    notFound();
  }

  const renderer = getPortalDashboardDefinition(assetId);

  if (renderer) {
    const renderedDashboard = await renderPortalDashboardAsset(assetId, {
      dashboardInstanceId: assignment.dashboardInstanceId,
      demo: isDemoParam(resolvedSearchParams?.demo),
      canEditGuidance: user.role === "super_admin",
      employeeExperienceAccess: user.employeeExperienceAccess,
    });
    if (renderedDashboard) {
      return renderedDashboard;
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#60727D]">
          Protected Dashboard Route
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[#2B2B2B]">
          {assignment.title}
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-[#60727D]">
          This dashboard route is reserved for portal-owned access so users only see dashboards that
          are explicitly assigned to their account.
        </p>
      </div>

      <Card className="rounded-[28px] border-[#D6DEE3] bg-white shadow-sm">
        <CardHeader>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EEF3F6] text-[#386B45]">
            <LockKeyhole className="h-5 w-5" />
          </div>
          <CardTitle className="pt-4 text-xl text-[#2B2B2B]">Portal-owned access layer</CardTitle>
          <CardDescription className="text-sm leading-relaxed text-[#60727D]">
            This dashboard has a valid portal assignment but does not have an in-portal renderer
            wired up yet.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl bg-[#F5F8FA] px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#60727D]">
              Current state
            </p>
            <p className="mt-2 text-sm text-[#2B2B2B]">
              Dashboard access is controlled through the authenticated portal assignment layer.
            </p>
          </div>
          <div className="rounded-2xl bg-[#F5F8FA] px-4 py-4">
            <div className="flex items-center gap-2 text-[#386B45]">
              <ShieldCheck className="h-4 w-4" />
              <p className="text-xs font-semibold uppercase tracking-[0.18em]">Next hardening pass</p>
            </div>
            <p className="mt-2 text-sm text-[#2B2B2B]">
              Add a renderer entry for `{assetId}` in the shared dashboard registry so this view can be
              resolved without changing the route itself.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
