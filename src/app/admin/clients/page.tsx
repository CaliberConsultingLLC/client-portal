import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, Plus } from "lucide-react";

export default function ClientsPage() {
  return (
    <>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-text-primary">Clients</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Manage your client organizations.
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Client
        </Button>
      </div>

      <Card>
        <CardContent className="flex flex-col items-center py-16">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-nsp-blue-50 text-nsp-blue-500">
            <Building2 className="h-6 w-6" />
          </div>
          <h3 className="mt-4 text-sm font-semibold text-text-primary">
            No clients yet
          </h3>
          <p className="mt-1 text-sm text-text-muted">
            Add your first client organization to get started.
          </p>
          <Button variant="outline" size="sm" className="mt-4">
            <Plus className="mr-2 h-4 w-4" />
            Add Client
          </Button>
        </CardContent>
      </Card>
    </>
  );
}
