import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, LockKeyhole, ShieldCheck } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DwsEmployeeExperienceDashboardClient } from "@/app/employee-experience/dws/dashboard-client";
import { loadDwsEmployeeExperienceDashboardData } from "@/lib/employee-experience/dws-dashboard";
import { getPortalAssetById } from "@/lib/portal/workspace";

interface DashboardAssetPageProps {
  params: Promise<{
    assetId: string;
  }>;
}

export default async function DashboardAssetPage({ params }: DashboardAssetPageProps) {
  const { assetId } = await params;
  const asset = getPortalAssetById(assetId);

  if (!asset || asset.type !== "dashboard") {
    notFound();
  }

  if (assetId === "dws-employee-experience") {
    const data = loadDwsEmployeeExperienceDashboardData();
    return <DwsEmployeeExperienceDashboardClient data={data} />;
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#60727D]">
          Protected Dashboard Route
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[#102533]">
          {asset.title}
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-[#60727D]">
          This route exists so dashboard access can live inside the authenticated portal instead of
          linking directly to a public-facing page.
        </p>
      </div>

      <Card className="rounded-[28px] border-[#D6DEE3] bg-white shadow-sm">
        <CardHeader>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EEF3F6] text-[#18384E]">
            <LockKeyhole className="h-5 w-5" />
          </div>
          <CardTitle className="pt-4 text-xl text-[#102533]">Portal-owned access layer</CardTitle>
          <CardDescription className="text-sm leading-relaxed text-[#60727D]">
            The next step is to render the actual dashboard here, with client-aware permissions and
            file-backed data assignment sitting behind the portal shell.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl bg-[#F5F8FA] px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#60727D]">
              Current state
            </p>
            <p className="mt-2 text-sm text-[#102533]">
              Dashboard asset is now routed through the authenticated portal structure.
            </p>
          </div>
          <div className="rounded-2xl bg-[#F5F8FA] px-4 py-4">
            <div className="flex items-center gap-2 text-[#18384E]">
              <ShieldCheck className="h-4 w-4" />
              <p className="text-xs font-semibold uppercase tracking-[0.18em]">Next hardening pass</p>
            </div>
            <p className="mt-2 text-sm text-[#102533]">
              Attach this route to client-specific dashboard assignments instead of generic demo access.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-3">
        <Button asChild className="rounded-full bg-[#102F4A] text-white hover:bg-[#0C2740]">
          <Link href="/portal/dashboards">
            Back to dashboards
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
        {asset.previewHref ? (
          <Button asChild variant="outline" className="rounded-full border-[#C9D2D8]">
            <Link href={asset.previewHref}>Open current preview route</Link>
          </Button>
        ) : null}
      </div>
    </div>
  );
}
