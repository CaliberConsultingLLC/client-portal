import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart3, Plus } from "lucide-react";

export default function ReportsPage() {
  return (
    <>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-text-primary">Reports</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Build and manage client reports.
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          New Report
        </Button>
      </div>

      <Card>
        <CardContent className="flex flex-col items-center py-16">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-nsp-blue-50 text-nsp-blue-500">
            <BarChart3 className="h-6 w-6" />
          </div>
          <h3 className="mt-4 text-sm font-semibold text-text-primary">
            No reports yet
          </h3>
          <p className="mt-1 text-sm text-text-muted">
            Create a report once you have survey data to visualize.
          </p>
        </CardContent>
      </Card>
    </>
  );
}
