"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { ArrowLeft } from "lucide-react";
import { PortalContentFrame } from "@/components/portal/portal-content-frame";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface ClientInformationFormProps {
  clientId: string;
  initialValues: {
    name: string;
    industry?: string | null;
    executivePocEmail?: string | null;
    hrPocEmail?: string | null;
    contractDate?: string | null;
    arr?: string | null;
    notes?: string | null;
  };
}

export function ClientInformationForm({
  clientId,
  initialValues,
}: ClientInformationFormProps) {
  const [form, setForm] = useState({
    name: initialValues.name,
    industry: initialValues.industry ?? "",
    executivePocEmail: initialValues.executivePocEmail ?? "",
    hrPocEmail: initialValues.hrPocEmail ?? "",
    contractDate: initialValues.contractDate ?? "",
    arr: initialValues.arr ?? "",
    notes: initialValues.notes ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(`/api/portal/clients/${clientId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error || "Unable to save client information.");
      }

      setSuccess("Client information updated successfully.");
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : "Unable to save client information."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <PortalContentFrame>
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#60727D]">
              Client Workspace
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[#2B2B2B]">
              Client Information
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-[#60727D]">
              Edit the core client details that should stay attached to this workspace record.
            </p>
          </div>
          <Button asChild variant="outline" className="rounded-full border-[#C9D2D8]">
            <Link href="/portal/clients">
              <ArrowLeft className="h-4 w-4" />
              Back to clients
            </Link>
          </Button>
        </div>

        <Card className="rounded-[28px] border-[#D6DEE3] bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl text-[#2B2B2B]">Organization Details</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <Input
                label="Org Name"
                value={form.name}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                required
              />
              <Input label="Client ID" value={clientId} disabled />
              <Input
                label="Industry"
                value={form.industry}
                onChange={(event) =>
                  setForm((current) => ({ ...current, industry: event.target.value }))
                }
              />
              <Input
                label="Exec POC Email"
                type="email"
                value={form.executivePocEmail}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    executivePocEmail: event.target.value,
                  }))
                }
              />
              <Input
                label="HR POC Email"
                type="email"
                value={form.hrPocEmail}
                onChange={(event) =>
                  setForm((current) => ({ ...current, hrPocEmail: event.target.value }))
                }
              />
              <Input
                label="Contract Date"
                type="date"
                value={form.contractDate}
                onChange={(event) =>
                  setForm((current) => ({ ...current, contractDate: event.target.value }))
                }
              />
              <Input
                label="ARR"
                value={form.arr}
                onChange={(event) => setForm((current) => ({ ...current, arr: event.target.value }))}
              />
            </div>

            <Textarea
              label="Notes"
              value={form.notes}
              onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
              className="min-h-[160px]"
            />

            {error ? <p className="text-sm text-[#B04C4C]">{error}</p> : null}
            {success ? <p className="text-sm text-[#355365]">{success}</p> : null}

            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={saving}
                className="rounded-full bg-[#2B2B2B] text-white hover:bg-[#386B45]"
              >
                {saving ? "Saving..." : "Save Information"}
              </Button>
            </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </PortalContentFrame>
  );
}
