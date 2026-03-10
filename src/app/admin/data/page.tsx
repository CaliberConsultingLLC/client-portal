import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Database, Upload } from "lucide-react";

export default function DataPage() {
  return (
    <>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-text-primary">Data</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Monitor the data pipeline and manage imports.
          </p>
        </div>
        <Button variant="outline">
          <Upload className="mr-2 h-4 w-4" />
          Import CSV
        </Button>
      </div>

      <div className="grid gap-5 sm:grid-cols-3">
        <Card>
          <CardContent className="p-5">
            <p className="text-2xl font-extrabold text-text-primary">0</p>
            <p className="text-xs text-text-muted">Total Responses</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-2xl font-extrabold text-text-primary">0</p>
            <p className="text-xs text-text-muted">Pending Processing</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-2xl font-extrabold text-text-primary">0</p>
            <p className="text-xs text-text-muted">Failed Imports</p>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Pipeline Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center py-8">
            <Database className="h-8 w-8 text-text-muted" />
            <p className="mt-3 text-sm text-text-muted">
              No data activity yet. Import data or connect a survey to begin.
            </p>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
