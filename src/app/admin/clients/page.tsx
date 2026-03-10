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
import { Building2, Plus, Mail } from "lucide-react";
import type { Organization } from "@/types/database";

const SIZE_RANGES = [
  "1-50",
  "51-200",
  "201-500",
  "501-1000",
  "1001-5000",
  "5000+",
];

const INDUSTRIES = [
  "Technology",
  "Healthcare",
  "Finance",
  "Manufacturing",
  "Education",
  "Retail",
  "Government",
  "Non-Profit",
  "Professional Services",
  "Other",
];

export default function ClientsPage() {
  const router = useRouter();
  const [clients, setClients] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Form state
  const [name, setName] = useState("");
  const [industry, setIndustry] = useState("");
  const [sizeRange, setSizeRange] = useState("");
  const [contactEmail, setContactEmail] = useState("");

  const fetchClients = useCallback(async () => {
    try {
      const res = await fetch("/api/clients");
      if (res.ok) {
        const data = await res.json();
        setClients(data.clients || []);
      }
    } catch (err) {
      console.error("Failed to fetch clients:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  const handleCreate = async () => {
    if (!name.trim()) {
      setError("Organization name is required");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          industry: industry || null,
          size_range: sizeRange || null,
          primary_contact_email: contactEmail || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to create client");
        return;
      }

      // Reset form and refresh list
      setName("");
      setIndustry("");
      setSizeRange("");
      setContactEmail("");
      setDialogOpen(false);
      fetchClients();
    } catch {
      setError("Network error — please try again");
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    {
      key: "name",
      header: "Organization",
      render: (client: Organization) => (
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-nsp-blue-50 text-nsp-blue-600">
            <Building2 className="h-4 w-4" />
          </div>
          <div>
            <p className="font-medium">{client.name}</p>
            <p className="text-xs text-text-muted">{client.slug}</p>
          </div>
        </div>
      ),
    },
    {
      key: "industry",
      header: "Industry",
      render: (client: Organization) =>
        client.industry ? (
          <Badge variant="secondary">{client.industry}</Badge>
        ) : (
          <span className="text-text-muted">—</span>
        ),
    },
    {
      key: "size_range",
      header: "Size",
      render: (client: Organization) =>
        client.size_range ? (
          <span>{client.size_range} employees</span>
        ) : (
          <span className="text-text-muted">—</span>
        ),
    },
    {
      key: "primary_contact_email",
      header: "Contact",
      render: (client: Organization) =>
        client.primary_contact_email ? (
          <div className="flex items-center gap-1.5 text-text-secondary">
            <Mail className="h-3.5 w-3.5" />
            {client.primary_contact_email}
          </div>
        ) : (
          <span className="text-text-muted">—</span>
        ),
    },
    {
      key: "created_at",
      header: "Added",
      render: (client: Organization) =>
        new Date(client.created_at).toLocaleDateString(),
    },
  ];

  return (
    <>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-text-primary">Clients</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Manage your client organizations.
          </p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Client
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Client</DialogTitle>
              <DialogDescription>
                Create a new client organization. You can add campaigns and
                surveys after the client is created.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <Input
                label="Organization Name *"
                placeholder="Acme Corporation"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <Select
                label="Industry"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
              >
                <option value="">Select industry...</option>
                {INDUSTRIES.map((ind) => (
                  <option key={ind} value={ind}>
                    {ind}
                  </option>
                ))}
              </Select>
              <Select
                label="Organization Size"
                value={sizeRange}
                onChange={(e) => setSizeRange(e.target.value)}
              >
                <option value="">Select size range...</option>
                {SIZE_RANGES.map((size) => (
                  <option key={size} value={size}>
                    {size} employees
                  </option>
                ))}
              </Select>
              <Input
                label="Primary Contact Email"
                type="email"
                placeholder="hr@acme.com"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
              />

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
                {submitting ? "Creating..." : "Create Client"}
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
              data={clients}
              onRowClick={(client) =>
                router.push(`/admin/clients/${client.id}`)
              }
              emptyMessage="No clients yet. Add your first client to get started."
            />
          )}
        </CardContent>
      </Card>
    </>
  );
}
