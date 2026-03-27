import Link from "next/link";
import { ArrowRight, BarChart3, FileText, FolderOpen, LifeBuoy, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
const quickAccessCards = [
  {
    title: "Dashboards",
    body: "Open the live dashboards assigned to your team and review the latest performance views.",
    href: "/portal/dashboards",
    icon: BarChart3,
  },
  {
    title: "Reports",
    body: "Review published summary reports, presentations, and other finalized deliverables.",
    href: "/portal/reports",
    icon: FileText,
  },
  {
    title: "Documents",
    body: "Access supporting materials, work products, and downloadable client documents.",
    href: "/portal/documents",
    icon: FolderOpen,
  },
  {
    title: "Resources",
    body: "Find helpful references, onboarding guidance, and portal support information.",
    href: "/portal/resources",
    icon: LifeBuoy,
  },
];

interface PortalHomeContentProps {
  basePath?: string;
  dashboardCount?: number;
  reportCount?: number;
  documentCount?: number;
  portalClientCount?: number;
  welcomeTitle?: string;
  welcomeBody?: string;
}

export function PortalHomeContent({
  basePath = "/portal",
  dashboardCount = 0,
  reportCount = 0,
  documentCount = 0,
  portalClientCount = 0,
  welcomeTitle = "A secure home base for dashboards, reports, and supporting materials.",
  welcomeBody = "This portal is structured so each client workspace can remain fully separate, with its own dashboards, reports, documents, and resources.",
}: PortalHomeContentProps) {
  const cardLinks = {
    dashboards: `${basePath}/dashboards`,
    reports: `${basePath}/reports`,
    documents: `${basePath}/documents`,
    resources: `${basePath}/resources`,
  };

  const resolvedQuickAccessCards = quickAccessCards.map((card) => ({
    ...card,
    href:
      card.title === "Dashboards"
        ? cardLinks.dashboards
        : card.title === "Reports"
          ? cardLinks.reports
          : card.title === "Documents"
            ? cardLinks.documents
            : cardLinks.resources,
  }));

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-[32px] border border-[#D6DEE3] bg-[linear-gradient(135deg,_#0F2433_0%,_#18384E_55%,_#34505B_100%)] px-8 py-9 text-white shadow-[0_18px_48px_rgba(16,35,51,0.12)]">
        <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#E8CC70]">
              Client Portal
            </p>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white">
              {welcomeTitle}
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-white/78">
              {welcomeBody}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button
                asChild
                size="lg"
                className="rounded-full bg-[#E8CC70] text-[#102533] hover:bg-[#E0C15A]"
              >
                <Link href={cardLinks.dashboards}>
                  Open Dashboards
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="rounded-full border-white/20 bg-white/10 text-white hover:bg-white/16"
              >
                <Link href={cardLinks.reports}>View Reports</Link>
              </Button>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-[26px] border border-white/10 bg-white/8 p-5 backdrop-blur-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#E8CC70]">
                Access Model
              </p>
              <p className="mt-3 text-lg font-semibold text-white">Client-specific access only</p>
              <p className="mt-2 text-sm leading-relaxed text-white/72">
                Your portal view is intended to show only the materials assigned to your account.
              </p>
            </div>
            <div className="rounded-[26px] border border-white/10 bg-white/8 p-5 backdrop-blur-sm">
              <div className="flex items-center gap-2 text-[#E8CC70]">
                <ShieldCheck className="h-4 w-4" />
                <p className="text-xs font-semibold uppercase tracking-[0.2em]">Security</p>
              </div>
              <p className="mt-3 text-lg font-semibold text-white">Protected login environment</p>
              <p className="mt-2 text-sm leading-relaxed text-white/72">
                Session-based access keeps this experience gated behind authenticated entry.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className="mb-5">
          <h2 className="text-2xl font-semibold tracking-tight text-[#102533]">Quick access</h2>
          <p className="mt-1 text-sm text-[#60727D]">
            Start with the section that best matches what you need today.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {resolvedQuickAccessCards.map((card) => (
            <Link key={card.title} href={card.href} className="group">
              <Card className="h-full rounded-[28px] border-[#D6DEE3] bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_36px_rgba(16,35,51,0.08)]">
                <CardHeader className="space-y-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EEF3F6] text-[#18384E]">
                    <card.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-xl text-[#102533]">{card.title}</CardTitle>
                    <CardDescription className="mt-2 text-sm leading-relaxed text-[#60727D]">
                      {card.body}
                    </CardDescription>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="inline-flex items-center gap-2 text-sm font-semibold text-[#18384E]">
                    Open
                    <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="rounded-[28px] border-[#D6DEE3] bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl text-[#102533]">What this portal is built to support</CardTitle>
            <CardDescription className="text-[#60727D]">
              A simple, professional workspace for client-facing deliverables.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            {[
              "Personalized dashboards by client",
              "Published reports and executive readouts",
              "Downloadable documents and source materials",
              "Expandable permissions as the portal grows",
            ].map((item) => (
              <div key={item} className="rounded-2xl bg-[#F5F8FA] px-4 py-4 text-sm font-medium text-[#102533]">
                {item}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="rounded-[28px] border-[#D6DEE3] bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl text-[#102533]">Next steps</CardTitle>
            <CardDescription className="text-[#60727D]">
              More portal content will appear here as your engagement assets are added.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-2xl bg-[#F5F8FA] px-4 py-4">
              <p className="text-sm font-semibold text-[#102533]">Assigned dashboards</p>
              <p className="mt-1 text-sm text-[#60727D]">
                {dashboardCount} dashboard{dashboardCount === 1 ? "" : "s"} currently mapped in the workspace registry.
              </p>
            </div>
            <div className="rounded-2xl bg-[#F5F8FA] px-4 py-4">
              <p className="text-sm font-semibold text-[#102533]">Reports and documents</p>
              <p className="mt-1 text-sm text-[#60727D]">
                {reportCount + documentCount} report/document asset{reportCount + documentCount === 1 ? "" : "s"} currently defined for the workspace.
              </p>
            </div>
            <div className="rounded-2xl bg-[#F5F8FA] px-4 py-4">
              <p className="text-sm font-semibold text-[#102533]">Client environments</p>
              <p className="mt-1 text-sm text-[#60727D]">
                {portalClientCount} initial client/demo workspace{portalClientCount === 1 ? "" : "s"} now defined in the portal registry.
              </p>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
