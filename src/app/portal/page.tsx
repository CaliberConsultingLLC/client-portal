import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, ClipboardList } from "lucide-react";

export default function PortalHomePage() {
  return (
    <>
      <div className="mb-8">
        <h1 className="text-2xl font-extrabold text-text-primary">
          Welcome to your portal
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          Access your reports and track survey progress.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <Card className="transition-shadow hover:shadow-md">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-[--radius-md] bg-nsp-blue-50 text-nsp-blue-500">
                <BarChart3 className="h-5 w-5" />
              </div>
              <CardTitle>Reports</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-text-secondary">
              View your published reports and dashboards.
            </p>
          </CardContent>
        </Card>

        <Card className="transition-shadow hover:shadow-md">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-[--radius-md] bg-nsp-orange-50 text-nsp-orange-400">
                <ClipboardList className="h-5 w-5" />
              </div>
              <CardTitle>Surveys</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-text-secondary">
              Check the status of active surveys in your organization.
            </p>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
