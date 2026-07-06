import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PortalPageFrame } from "@/components/portal/portal-page-frame";

interface DashboardInstancePageFrameProps {
  children: React.ReactNode;
  leftRail?: React.ReactNode;
  rightRail?: React.ReactNode;
}

export function DashboardInstancePageFrame({
  children,
  leftRail,
  rightRail,
}: DashboardInstancePageFrameProps) {
  return (
    <PortalPageFrame
      leftRail={leftRail}
      rightRail={
        rightRail ?? (
          <div className="space-y-4 xl:sticky xl:top-24 xl:self-start">
            <Card className="rounded-[28px] border-[#D6DEE3] bg-white shadow-sm">
              <CardHeader>
                <CardTitle className="text-base font-semibold uppercase tracking-[0.2em] text-[#2B2B2B]">
                  Admin Notes
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm leading-relaxed text-[#60727D]">
                <p>This rail is reserved for operating notes, reminders, and lightweight guidance.</p>
                <p>The center column should remain the stable management surface for this dashboard instance.</p>
              </CardContent>
            </Card>
          </div>
        )
      }
    >
      {children}
    </PortalPageFrame>
  );
}
