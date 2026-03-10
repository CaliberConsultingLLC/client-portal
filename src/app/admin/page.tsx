import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Megaphone, ClipboardList, Users } from "lucide-react";

const stats = [
  { label: "Active Clients", value: "—", icon: Building2 },
  { label: "Running Campaigns", value: "—", icon: Megaphone },
  { label: "Open Surveys", value: "—", icon: ClipboardList },
  { label: "Total Responses", value: "—", icon: Users },
];

export default function AdminDashboardPage() {
  return (
    <>
      <div className="mb-8">
        <h1 className="text-2xl font-extrabold text-text-primary">Dashboard</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Overview of your consulting platform.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-[--radius-md] bg-nsp-blue-50 text-nsp-blue-500">
                <stat.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-extrabold text-text-primary">
                  {stat.value}
                </p>
                <p className="text-xs text-text-muted">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-10">
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-text-muted">
              No activity yet. Create your first client to get started.
            </p>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
