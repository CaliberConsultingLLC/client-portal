import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PortalPageFrame } from "@/components/portal/portal-page-frame";

interface AdminDirectoryShellProps {
  children: React.ReactNode;
  filters?: React.ReactNode;
  sidePanel?: React.ReactNode;
}

export function AdminDirectoryShell({
  children,
  filters,
  sidePanel,
}: AdminDirectoryShellProps) {
  return (
    <PortalPageFrame
      leftRail={
        <div className="xl:sticky xl:top-24 xl:self-start">
          {filters ? (
            filters
          ) : (
            <Card className="rounded-[28px] border-[#D6DEE3] bg-white shadow-sm">
              <CardHeader>
                <CardTitle className="text-base font-semibold uppercase tracking-[0.2em] text-[#2B2B2B]">
                  Filters
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-[#60727D]">
                Filters can be added here as the admin experience grows.
              </CardContent>
            </Card>
          )}
        </div>
      }
      rightRail={
        <div className="xl:sticky xl:top-24 xl:self-start">
          {sidePanel ? (
            sidePanel
          ) : (
            <Card className="rounded-[28px] border-[#D6DEE3] bg-white shadow-sm">
              <CardHeader>
                <CardTitle className="text-base font-semibold uppercase tracking-[0.2em] text-[#2B2B2B]">
                  Info Panel
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-[#60727D]">
                This side rail is reserved for tips, recommendations, or client-facing guidance later on.
              </CardContent>
            </Card>
          )}
        </div>
      }
    >
      {children}
    </PortalPageFrame>
  );
}
