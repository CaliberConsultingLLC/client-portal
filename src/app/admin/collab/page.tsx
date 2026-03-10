"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Building2, GitCompareArrows, Plus, Users, Layers } from "lucide-react";
import type { CollabCampaign, Organization } from "@/types/database";

export default function CollabCampaignsPage() {
  const router = useRouter();
  const [campaigns, setCampaigns] = useState<CollabCampaign[]>([]);
  const [clients, setClients] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Form state
  const [name, setName] = useState("");
  const [orgId, setOrgId] = useState("");

  const fetchData = useCallback(async () => {
    try {
      const [collabRes, clientsRes] = await Promise.all([
        fetch("/api/collab-campaigns"),
        fetch("/api/clients"),
      ]);

      if (collabRes.ok) {
        const data = await collabRes.json();
        setCampaigns(data.campaigns || []);
      }
      if (clientsRes.ok) {
        const data = await clientsRes.json();
        setClients(data.clients || []);
      }
    } catch (err) {
      console.error("Failed to fetch data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreate = async () => {
    if (!name.trim() || !orgId) {
      setError("Campaign name and client are required");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/collab-campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          org_id: orgId,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to create campaign");
        return;
      }

      setName("");
      setOrgId("");
      setDialogOpen(false);
      fetchData();
    } catch {
      setError("Network error — please try again");
    } finally {
      setSubmitting(false);
    }
  };

  const statusColor = (status: string) => {
    switch (status) {
      case "ready":
        return "success" as const;
      case "draft":
        return "secondary" as const;
      case "processing":
        return "warning" as const;
      case "error":
        return "destructive" as const;
      default:
        return "secondary" as const;
    }
  };

  const columns = [
    {
      key: "name",
      header: "Campaign",
      render: (campaign: CollabCampaign) => (
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-nsp-green-50 text-nsp-green-600">
            <GitCompareArrows className="h-4 w-4" />
          </div>
          <div>
            <p className="font-medium">{campaign.name}</p>
            <p className="text-xs text-text-muted">{campaign.slug}</p>
          </div>
        </div>
      ),
    },
    {
      key: "organization",
      header: "Client",
      render: (campaign: CollabCampaign) =>
        campaign.organization ? (
          <div className="flex items-center gap-1.5">
            <Building2 className="h-3.5 w-3.5 text-text-muted" />
            <span>{campaign.organization.name}</span>
          </div>
        ) : (
          <span className="text-text-muted">—</span>
        ),
    },
    {
      key: "status",
      header: "Status",
      render: (campaign: CollabCampaign) => (
        <Badge variant={statusColor(campaign.status)}>
          {campaign.status}
        </Badge>
      ),
    },
    {
      key: "respondent_count",
      header: "Respondents",
      render: (campaign: CollabCampaign) =>
        campaign.respondent_count > 0 ? (
          <div className="flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5 text-text-muted" />
            <span>{campaign.respondent_count}</span>
          </div>
        ) : (
          <span className="text-text-muted">—</span>
        ),
    },
    {
      key: "department_count",
      header: "Departments",
      render: (campaign: CollabCampaign) =>
        campaign.department_count > 0 ? (
          <div className="flex items-center gap-1.5">
            <Layers className="h-3.5 w-3.5 text-text-muted" />
            <span>{campaign.department_count}</span>
          </div>
        ) : (
          <span className="text-text-muted">—</span>
        ),
    },
    {
      key: "created_at",
      header: "Created",
      render: (campaign: CollabCampaign) =>
        new Date(campaign.created_at).toLocaleDateString(),
    },
  ];

  return (
    <>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-text-primary">
            Collaboration Campaigns
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            Upload and manage cross-department collaboration survey results.
          </p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Campaign
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Collaboration Campaign</DialogTitle>
              <DialogDescription>
                Set up a new collaboration survey campaign. You can upload data
                after creating it.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <Input
                label="Campaign Name *"
                placeholder="Q1 2026 Collaboration Assessment"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <Select
                label="Client *"
                value={orgId}
                onChange={(e) => setOrgId(e.target.value)}
              >
                <option value="">Select client...</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </Select>

              {error && (
                <p className="text-sm text-nsp-red-500">{error}</p>
              )}
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={submitting}>
                {submitting ? "Creating..." : "Create Campaign"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-3 p-6">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={campaigns}
              onRowClick={(campaign) =>
                router.push(`/admin/collab/${campaign.id}`)
              }
              emptyMessage="No collaboration campaigns yet. Create one to get started."
            />
          )}
        </CardContent>
      </Card>
    </>
  );
}
