import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ClipboardList, Plus } from "lucide-react";

export default function SurveysPage() {
  return (
    <>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-text-primary">Surveys</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Configure and manage SurveyMonkey integrations.
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Connect Survey
        </Button>
      </div>

      <Card>
        <CardContent className="flex flex-col items-center py-16">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-nsp-blue-50 text-nsp-blue-500">
            <ClipboardList className="h-6 w-6" />
          </div>
          <h3 className="mt-4 text-sm font-semibold text-text-primary">
            No surveys connected
          </h3>
          <p className="mt-1 text-sm text-text-muted">
            Link a SurveyMonkey survey to begin importing responses.
          </p>
        </CardContent>
      </Card>
    </>
  );
}
