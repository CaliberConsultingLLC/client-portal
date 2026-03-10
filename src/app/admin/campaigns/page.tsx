import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Megaphone, Plus } from "lucide-react";

export default function CampaignsPage() {
  return (
    <>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-text-primary">Campaigns</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Manage survey campaigns across clients.
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          New Campaign
        </Button>
      </div>

      <Card>
        <CardContent className="flex flex-col items-center py-16">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-nsp-blue-50 text-nsp-blue-500">
            <Megaphone className="h-6 w-6" />
          </div>
          <h3 className="mt-4 text-sm font-semibold text-text-primary">
            No campaigns yet
          </h3>
          <p className="mt-1 text-sm text-text-muted">
            Create a campaign to start collecting survey data.
          </p>
        </CardContent>
      </Card>
    </>
  );
}
