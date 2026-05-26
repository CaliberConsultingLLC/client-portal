"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { CensusUploadSummary } from "@/types/census";

interface CampaignClientOption {
  id: string;
  name: string;
}

interface CampaignCreateModalProps {
  clients: CampaignClientOption[];
  censusUploads: CensusUploadSummary[];
}

export function CampaignCreateModal({ clients, censusUploads }: CampaignCreateModalProps) {
  const router = useRouter();
  const demoClients = clients.filter((client) => client.id === "demo");
  const [open, setOpen] = useState(false);
  const [clientId, setClientId] = useState(demoClients[0]?.id ?? "");
  const availableCensus = useMemo(
    () => censusUploads.filter((upload) => upload.clientId === clientId),
    [censusUploads, clientId]
  );
  const [censusId, setCensusId] = useState(availableCensus[0]?.id ?? "");
  const [surveyLabel, setSurveyLabel] = useState("Demo Engagement Survey");
  const [smSurveyId, setSmSurveyId] = useState("422546676");
  const [surveyWindowStart, setSurveyWindowStart] = useState("2026-06-01");
  const [surveyWindowEnd, setSurveyWindowEnd] = useState("2026-06-30");
  const [channels, setChannels] = useState<string[]>(["email"]);
  const [frequency, setFrequency] = useState("weekly");
  const [dayOfWeek, setDayOfWeek] = useState("wednesday");
  const [maxReminders, setMaxReminders] = useState("3");
  const [targetResponseRate, setTargetResponseRate] = useState("80");
  const [dryRun, setDryRun] = useState(true);
  const [autoCloseOnTarget, setAutoCloseOnTarget] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function handleClientChange(nextClientId: string) {
    const nextCensus = censusUploads.find((upload) => upload.clientId === nextClientId);
    setClientId(nextClientId);
    setCensusId(nextCensus?.id ?? "");
  }

  function toggleChannel(channel: "email" | "text") {
    setChannels((current) =>
      current.includes(channel)
        ? current.filter((item) => item !== channel)
        : [...current, channel]
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");

    try {
      const response = await fetch("/api/portal/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId,
          censusId,
          surveyLabel,
          smSurveyId,
          surveyWindowStart,
          surveyWindowEnd,
          channels,
          frequency,
          dayOfWeek,
          maxReminders: Number(maxReminders),
          targetResponseRate: Number(targetResponseRate),
          dryRun,
          autoCloseOnTarget,
        }),
      });
      const payload = await response.json() as { error?: string; campaign?: { id: string } };

      if (!response.ok || !payload.campaign) {
        throw new Error(payload.error || "Unable to create campaign.");
      }

      setOpen(false);
      router.push(`/portal/campaigns/${payload.campaign.id}`);
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to create campaign.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="rounded-full bg-[#2B2B2B] text-white hover:bg-[#386B45]">
          <Plus className="h-4 w-4" />
          Create Campaign
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[88vh] max-w-2xl overflow-y-auto rounded-[28px] border-[#D6DEE3] p-0">
        <DialogHeader className="border-b border-[#E1E7EB] px-6 py-5">
          <DialogTitle className="text-xl text-[#2B2B2B]">Create Campaign</DialogTitle>
          <DialogDescription className="text-[#60727D]">
            Phase 3 creates configured demo campaigns only. Dry run stays on by default.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6 px-6 py-6">
          <section className="space-y-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#60727D]">
              Client and Census
            </p>
            <Select
              label="Client"
              value={clientId}
              onChange={(event) => handleClientChange(event.target.value)}
              required
            >
              {demoClients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </Select>
            <Select
              label="Census Upload"
              value={censusId}
              onChange={(event) => setCensusId(event.target.value)}
              required
            >
              {availableCensus.length === 0 ? (
                <option value="">No demo census uploads available</option>
              ) : (
                availableCensus.map((upload) => (
                  <option key={upload.id} value={upload.id}>
                    {upload.surveyLabel} · {upload.rowCount} rows
                  </option>
                ))
              )}
            </Select>
          </section>

          <section className="space-y-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#60727D]">
              SurveyMonkey Link
            </p>
            <Input
              label="Survey Label"
              value={surveyLabel}
              onChange={(event) => setSurveyLabel(event.target.value)}
              required
            />
            <Input
              label="SurveyMonkey Survey ID"
              value={smSurveyId}
              onChange={(event) => setSmSurveyId(event.target.value)}
              required
            />
          </section>

          <section className="space-y-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#60727D]">
              Configuration
            </p>
            <div className="grid gap-4 md:grid-cols-2">
              <Input
                label="Survey Window Start"
                type="date"
                value={surveyWindowStart}
                onChange={(event) => setSurveyWindowStart(event.target.value)}
                required
              />
              <Input
                label="Survey Window End"
                type="date"
                value={surveyWindowEnd}
                onChange={(event) => setSurveyWindowEnd(event.target.value)}
                required
              />
              <Select label="Reminder Frequency" value={frequency} onChange={(event) => setFrequency(event.target.value)}>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="biweekly">Biweekly</option>
                <option value="custom">Custom</option>
              </Select>
              <Select label="Reminder Day" value={dayOfWeek} onChange={(event) => setDayOfWeek(event.target.value)}>
                <option value="monday">Monday</option>
                <option value="tuesday">Tuesday</option>
                <option value="wednesday">Wednesday</option>
                <option value="thursday">Thursday</option>
                <option value="friday">Friday</option>
              </Select>
              <Input
                label="Max Reminders"
                type="number"
                min={0}
                value={maxReminders}
                onChange={(event) => setMaxReminders(event.target.value)}
              />
              <Input
                label="Target Response Rate"
                type="number"
                min={0}
                max={100}
                value={targetResponseRate}
                onChange={(event) => setTargetResponseRate(event.target.value)}
              />
            </div>
            <div className="grid gap-3 rounded-2xl border border-[#E5EBEF] bg-[#F8FAFB] p-4">
              <label className="flex items-center gap-3 text-sm font-semibold text-[#2B2B2B]">
                <input
                  type="checkbox"
                  checked={channels.includes("email")}
                  onChange={() => toggleChannel("email")}
                />
                Email channel
              </label>
              <label className="flex items-center gap-3 text-sm font-semibold text-[#2B2B2B]">
                <input
                  type="checkbox"
                  checked={channels.includes("text")}
                  onChange={() => toggleChannel("text")}
                />
                Text channel
              </label>
              <label className="flex items-center gap-3 text-sm font-semibold text-[#2B2B2B]">
                <input
                  type="checkbox"
                  checked={dryRun}
                  onChange={(event) => setDryRun(event.target.checked)}
                />
                Dry run mode
              </label>
              <label className="flex items-center gap-3 text-sm font-semibold text-[#2B2B2B]">
                <input
                  type="checkbox"
                  checked={autoCloseOnTarget}
                  onChange={(event) => setAutoCloseOnTarget(event.target.checked)}
                />
                Auto-close on target response rate
              </label>
            </div>
          </section>

          {error ? <p className="text-sm text-[#B04C4C]">{error}</p> : null}

          <Button
            type="submit"
            disabled={saving || !clientId || !censusId || channels.length === 0}
            className="w-full rounded-full bg-[#2B2B2B] text-white hover:bg-[#386B45]"
          >
            {saving ? "Creating..." : "Create Campaign"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
