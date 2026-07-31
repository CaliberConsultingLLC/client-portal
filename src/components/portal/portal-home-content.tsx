import Link from "next/link";
import { BarChart3, BookText, Users } from "lucide-react";
import { PortalContentFrame } from "@/components/portal/portal-content-frame";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponseRateCard, type ResponseRateSummary } from "@/components/portal/response-rate-card";

interface PortalHomeListItem {
  id: string;
  title: string;
  description: string;
  /** Dashboard analytics destination. */
  href?: string;
  /** Insights readout destination for this dashboard's client. */
  readoutHref?: string | null;
}

interface PortalHomeContentProps {
  dashboardCount?: number;
  activeUserCount?: number;
  dashboardItems?: PortalHomeListItem[];
  responseSummary?: ResponseRateSummary | null;
  welcomeTitle?: string;
  welcomeBody?: string;
}

export function PortalHomeContent({
  dashboardCount = 0,
  activeUserCount = 0,
  dashboardItems = [],
  responseSummary = null,
  welcomeTitle = "Your dashboards and support materials in one secure workspace.",
  welcomeBody = "This home page is intended to surface what is available to you without asking you to manage the portal itself.",
}: PortalHomeContentProps) {
  return (
    <PortalContentFrame>
      <div className="space-y-8">
        <section className="overflow-hidden rounded-[32px] border border-[#D7DDD4] bg-[radial-gradient(circle_at_top_right,_rgba(215,179,90,0.22),_transparent_32%),linear-gradient(135deg,_#242424_0%,_#2B2B2B_56%,_#386B45_145%)] px-8 py-9 text-white shadow-[0_18px_48px_rgba(17,17,17,0.14)]">
          <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#E8CC70]">
                Caliber Consulting LLC
              </p>
              <p className="mt-3 text-sm font-medium uppercase tracking-[0.28em] text-white/72">
                People &amp; Culture Solutions
              </p>
              <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white">
                {welcomeTitle}
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-relaxed text-white/78">
                {welcomeBody}
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-[26px] border border-white/10 bg-white/8 p-5 backdrop-blur-sm">
                <div className="flex items-center gap-2 text-[#E8CC70]">
                  <BarChart3 className="h-4 w-4" />
                  <p className="text-xs font-semibold uppercase tracking-[0.2em]">Active Dashboards</p>
                </div>
                <p className="mt-4 text-4xl font-semibold text-white">{dashboardCount}</p>
                <p className="mt-2 text-sm leading-relaxed text-white/72">
                  Interactive dashboards currently available in your portal view.
                </p>
              </div>

              <div className="rounded-[26px] border border-white/10 bg-white/8 p-5 backdrop-blur-sm">
                <div className="flex items-center gap-2 text-[#E8CC70]">
                  <Users className="h-4 w-4" />
                  <p className="text-xs font-semibold uppercase tracking-[0.2em]">Active Users</p>
                </div>
                <p className="mt-4 text-4xl font-semibold text-white">{activeUserCount}</p>
                <p className="mt-2 text-sm leading-relaxed text-white/72">
                  Active user account{activeUserCount === 1 ? "" : "s"} tied to your visible workspace access.
                </p>
              </div>
            </div>
          </div>
        </section>

        {responseSummary ? (
          <section>
            <ResponseRateCard {...responseSummary} />
          </section>
        ) : null}

        <section className="grid gap-6">
          <Card className="rounded-[28px] border-[#D6DEE3] bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl text-[#2B2B2B]">Available dashboards</CardTitle>
              <CardDescription className="text-[#60727D]">
                Live, interactive dashboards assigned to your account.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {dashboardItems.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[#D6DEE3] bg-[#F8FAFB] px-4 py-8 text-sm text-[#60727D]">
                  No dashboards are currently available in this workspace.
                </div>
              ) : (
                dashboardItems.map((item) => {
                  const analyticsHref = item.href ?? "#";
                  const readoutHref = item.readoutHref ?? "/portal/insights";

                  return (
                    <div
                      key={item.id}
                      className="flex flex-col gap-4 rounded-2xl bg-[#F5F8FA] px-4 py-4 sm:flex-row sm:items-start sm:justify-between"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-[#2B2B2B]">{item.title}</p>
                        <p className="mt-1 text-sm leading-relaxed text-[#60727D]">{item.description}</p>
                      </div>
                      <div className="flex shrink-0 flex-wrap items-center gap-2">
                        <Link
                          href={analyticsHref}
                          className="inline-flex items-center gap-2 rounded-full bg-[#386B45] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#2F5A3A]"
                        >
                          <BarChart3 className="h-4 w-4" />
                          Analytics
                        </Link>
                        <Link
                          href={readoutHref}
                          className="inline-flex items-center gap-2 rounded-full border border-[#D6DEE3] bg-white px-4 py-2 text-sm font-semibold text-[#2B2B2B] transition-colors hover:border-[#386B45] hover:text-[#386B45]"
                        >
                          <BookText className="h-4 w-4" />
                          Readout
                        </Link>
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </section>
      </div>
    </PortalContentFrame>
  );
}
