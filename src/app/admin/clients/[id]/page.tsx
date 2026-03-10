"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  Building2,
  Save,
  Megaphone,
  Trash2,
} from "lucide-react";
import type { Organization, Campaign } from "@/types/database";

const SIZE_RANGES = ["1-50", "51-200", "201-500", "501-1000", "1001-5000", "5000+"];
const INDUSTRIES = [
  "Technology", "Healthcare", "Finance", "Manufacturing", "Education",
  "Retail", "Government", "Non-Profit", "Professional Services", "Other",
];

export default function ClientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const clientId = params.id as string;

  const [client, setClient] = useState<Organization | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  // Editable fields
  const [name, setName] = useState("");
  const [industry, setIndustry] = useState("");
  const [sizeRange, setSizeRange] = useState("");
  const [contactEmail, setContactEmail] = useState("");

  const fetchClient = useCallback(async () => {
    try {
      const res = await fetch(`/api/clients/${clientId}`);
      if (!res.ok) {
        router.push("/admin/clients");
        return;
      }
      const data = await res.json();
      const c = data.client as Organization;
      setClient(c);
      setName(c.name);
      setIndustry(c.industry || "");
      setSizeRange(c.size_range || "");
      setContactEmail(c.primary_contact_email || "");
    } catch {
      router.push("/admin/clients");
    } finally {
      setLoading(false);
    }
  }, [clientId, router]);

  const fetchCampaigns = useCallback(async () => {
    try {
      const res = await fetch(`/api/campaigns?org_id=${clientId}`);
      if (res.ok) {
        const data = await res.json();
        setCampaigns(data.campaigns || []);
      }
    } catch {
      // silently fail — campaigns are supplementary
    }
  }, [clientId]);

  useEffect(() => {
    fetchClient();
    fetchCampaigns();
  }, [fetchClient, fetchCampaigns]);

  const handleSave = async () => {
    setSaving(true);
    setMessage("");
    try {
      const res = await fetch(`/api/clients/${clientId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          industry: industry || null,
          size_range: sizeRange || null,
          primary_contact_email: contactEmail || null,
        }),
      });
      if (res.ok) {
        setMessage("Saved successfully");
        const data = await res.json();
        setClient(data.client);
      } else {
        const err = await res.json();
        setMessage(err.error || "Failed to save");
      }
    } catch {
      setMessage("Network error");
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(""), 3000);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this client? This cannot be undone.")) return;
    try {
      const res = await fetch(`/api/clients/${clientId}`, { method: "DELETE" });
      if (res.ok) {
        router.push("/admin/clients");
      }
    } catch {
      setMessage("Failed to delete");
    }
  };

  const statusColor = (status: string) => {
    switch (status) {
      case "active": return "success" as const;
      case "draft": return "secondary" as const;
      case "completed": return "default" as const;
      case "paused": return "warning" as const;
      default: return "outline" as const;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!client) return null;

  return (
    <>
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/admin/clients")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-extrabold text-text-primary">
              {client.name}
            </h1>
            <p className="text-sm text-text-muted">{client.slug}</p>
          </div>
        </div>
        <Button variant="outline" size="sm" className="text-nsp-red-500 hover:bg-nsp-red-50" onClick={handleDelete}>
          <Trash2 className="mr-2 h-4 w-4" />
          Delete
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Edit form */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Organization Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                label="Organization Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <Select
                  label="Industry"
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                >
                  <option value="">Select industry...</option>
                  {INDUSTRIES.map((ind) => (
                    <option key={ind} value={ind}>{ind}</option>
                  ))}
                </Select>
                <Select
                  label="Organization Size"
                  value={sizeRange}
                  onChange={(e) => setSizeRange(e.target.value)}
                >
                  <option value="">Select size range...</option>
                  {SIZE_RANGES.map((size) => (
                    <option key={size} value={size}>{size} employees</option>
                  ))}
                </Select>
              </div>
              <Input
                label="Primary Contact Email"
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
              />

              <div className="flex items-center gap-3 pt-2">
                <Button onClick={handleSave} disabled={saving}>
                  <Save className="mr-2 h-4 w-4" />
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
                {message && (
                  <span className="text-sm text-text-secondary">{message}</span>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar stats */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Quick Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-text-muted">Campaigns</span>
                <span className="font-semibold">{campaigns.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-text-muted">Active</span>
                <span className="font-semibold">
                  {campaigns.filter((c) => c.status === "active").length}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-text-muted">Created</span>
                <span className="text-sm">
                  {new Date(client.created_at).toLocaleDateString()}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Megaphone className="h-4 w-4" />
                Campaigns
              </CardTitle>
            </CardHeader>
            <CardContent>
              {campaigns.length === 0 ? (
                <p className="text-sm text-text-muted">
                  No campaigns yet.
                </p>
              ) : (
                <div className="space-y-2">
                  {campaigns.map((campaign) => (
                    <button
                      key={campaign.id}
                      className="flex w-full items-center justify-between rounded-lg p-2 text-left text-sm transition hover:bg-surface-secondary"
                      onClick={() => router.push(`/admin/campaigns/${campaign.id}`)}
                    >
                      <span className="font-medium">{campaign.name}</span>
                      <Badge variant={statusColor(campaign.status)}>
                        {campaign.status}
                      </Badge>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
