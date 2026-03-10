import { Card, CardContent } from "@/components/ui/card";
import { ClipboardList } from "lucide-react";

export default function PortalSurveysPage() {
  return (
    <>
      <div className="mb-8">
        <h1 className="text-2xl font-extrabold text-text-primary">Surveys</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Active surveys for your organization.
        </p>
      </div>

      <Card>
        <CardContent className="flex flex-col items-center py-16">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-nsp-blue-50 text-nsp-blue-500">
            <ClipboardList className="h-6 w-6" />
          </div>
          <h3 className="mt-4 text-sm font-semibold text-text-primary">
            No active surveys
          </h3>
          <p className="mt-1 text-sm text-text-muted">
            Surveys will appear here when your consultant launches a campaign.
          </p>
        </CardContent>
      </Card>
    </>
  );
}
