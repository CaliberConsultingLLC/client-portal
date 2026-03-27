import Link from "next/link";
import { ArrowRight, BarChart3, LayoutPanelTop } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { requireFirebasePortalUser } from "@/lib/firebase/auth";
import { getAccessibleDashboardAssignments } from "@/lib/firebase/portal-access";

export default async function PortalDashboardsPage() {
  const user = await requireFirebasePortalUser();
  const dashboardCards = await getAccessibleDashboardAssignments(user);

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#60727D]">Dashboards</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[#102533]">
          Interactive dashboards assigned to your account
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-[#60727D]">
          This section is designed to house each client-facing dashboard as a separate portal asset,
          with access controlled independently over time.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {dashboardCards.length === 0 ? (
          <Card className="rounded-[28px] border-[#D6DEE3] bg-white shadow-sm lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-xl text-[#102533]">No dashboards assigned</CardTitle>
              <CardDescription className="text-sm leading-relaxed text-[#60727D]">
                Once a dashboard is published to one of your client workspaces, it will appear here.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : null}
        {dashboardCards.map((card) => (
          <Card key={card.id} className="rounded-[28px] border-[#D6DEE3] bg-white shadow-sm">
            <CardHeader>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EEF3F6] text-[#18384E]">
                <BarChart3 className="h-5 w-5" />
              </div>
              <CardTitle className="pt-4 text-xl text-[#102533]">{card.title}</CardTitle>
              <CardDescription className="text-sm leading-relaxed text-[#60727D]">
                {card.description}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              <span className="inline-flex items-center gap-2 rounded-full bg-[#F4F7F9] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-[#60727D]">
                <LayoutPanelTop className="h-3.5 w-3.5" />
                {card.status === "active" ? "Ready to launch" : "Draft"}
              </span>
              <Button asChild variant="outline" className="rounded-full border-[#C9D2D8]">
                <Link href={card.href}>
                  Open dashboard
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
