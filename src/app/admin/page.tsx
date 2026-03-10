"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Building2, Megaphone, ClipboardList, Users, ArrowRight } from "lucide-react";
import type { Organization, Campaign, Survey } from "@/types/database";

interface DashboardStats {
  clientCount: number;
  activeCampaigns: number;
  activeSurveys: number;
  totalResponses: number;
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentClients, setRecentClients] = useState<Organization[]>([]);
  const [recentCampaigns, setRecentCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboard() {
      try {
        const [clientsRes, campaignsRes, surveysRes] = await Promise.all([
          fetch("/api/clients"),
          fetch("/api/campaigns"),
          fetch("/api/surveys"),
        ]);

        const clients: Organization[] = clientsRes.ok
          ? (await clientsRes.json()).clients || []
          : [];
        const campaigns: Campaign[] = campaignsRes.ok
          ? (await campaignsRes.json()).campaigns || []
          : [];
        const surveys: Survey[] = surveysRes.ok
          ? (await surveysRes.json()).surveys || []
          : [];

        setStats({
          clientCount: clients.length,
          activeCampaigns: campaigns.filter((c) => c.status === "active").length,
          activeSurveys: surveys.filter((s) => s.status === "active").length,
          totalResponses: surveys.reduce((sum, s) => sum + s.response_count, 0),
        });

        setRecentClients(clients.slice(0, 5));
        setRecentCampaigns(campaigns.slice(0, 5));
      } catch (err) {
        console.error("Dashboard error:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchDashboard();
  }, []);

  const statCards = [
    { label: "Active Clients", value: stats?.clientCount ?? 0, icon: Building2, href: "/admin/clients" },
    { label: "Running Campaigns", value: stats?.activeCampaigns ?? 0, icon: Megaphone, href: "/admin/campaigns" },
    { label: "Active Surveys", value: stats?.activeSurveys ?? 0, icon: ClipboardList, href: "/admin/surveys" },
    { label: "Total Responses", value: stats?.totalResponses ?? 0, icon: Users, href: "/admin/data" },
  ];

  return (
    <>
      <div className="mb-8">
        <h1 className="text-2xl font-extrabold text-text-primary">Dashboard</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Overview of your consulting platform.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <button
            key={stat.label}
            onClick={() => router.push(stat.href)}
            className="text-left"
          >
            <Card className="transition-shadow hover:shadow-md">
              <CardContent className="flex items-center gap-4 p-5">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-nsp-blue-50 text-nsp-blue-500">
                  <stat.icon className="h-5 w-5" />
                </div>
                <div>
                  {loading ? (
                    <Skeleton className="h-8 w-12" />
                  ) : (
                    <p className="text-2xl font-extrabold text-text-primary">
                      {stat.value}
                    </p>
                  )}
                  <p className="text-xs text-text-muted">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          </button>
        ))}
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Clients</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/admin/clients")}
            >
              View all
              <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Button>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-8 w-full" />
                ))}
              </div>
            ) : recentClients.length === 0 ? (
              <p className="text-sm text-text-muted">
                No clients yet. Add your first client to get started.
              </p>
            ) : (
              <div className="space-y-2">
                {recentClients.map((client) => (
                  <button
                    key={client.id}
                    onClick={() => router.push(`/admin/clients/${client.id}`)}
                    className="flex w-full items-center gap-3 rounded-lg p-2 text-left transition hover:bg-surface-secondary"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-nsp-blue-50 text-nsp-blue-600">
                      <Building2 className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{client.name}</p>
                      <p className="text-xs text-text-muted">{client.industry || "—"}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Campaigns</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/admin/campaigns")}
            >
              View all
              <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Button>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-8 w-full" />
                ))}
              </div>
            ) : recentCampaigns.length === 0 ? (
              <p className="text-sm text-text-muted">
                No campaigns yet. Create one to start collecting data.
              </p>
            ) : (
              <div className="space-y-2">
                {recentCampaigns.map((campaign) => (
                  <button
                    key={campaign.id}
                    onClick={() => router.push(`/admin/campaigns/${campaign.id}`)}
                    className="flex w-full items-center gap-3 rounded-lg p-2 text-left transition hover:bg-surface-secondary"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-nsp-orange-50 text-nsp-orange-600">
                      <Megaphone className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{campaign.name}</p>
                      <p className="text-xs text-text-muted capitalize">{campaign.status}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
