import { Card, CardContent } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";

export default function PortalReportsPage() {
  return (
    <>
      <div className="mb-8">
        <h1 className="text-2xl font-extrabold text-text-primary">Reports</h1>
        <p className="mt-1 text-sm text-text-secondary">
          View your organization&apos;s published reports.
        </p>
      </div>

      <Card>
        <CardContent className="flex flex-col items-center py-16">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-nsp-blue-50 text-nsp-blue-500">
            <BarChart3 className="h-6 w-6" />
          </div>
          <h3 className="mt-4 text-sm font-semibold text-text-primary">
            No reports available
          </h3>
          <p className="mt-1 text-sm text-text-muted">
            Reports will appear here once published by your consultant.
          </p>
        </CardContent>
      </Card>
    </>
  );
}
