"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { CampaignDetail } from "@/types/campaign";

function toDateInput(value?: string | null) {
  return value ? value.slice(0, 10) : "";
}

export function CampaignConfigurationPanel({ campaign }: { campaign: CampaignDetail }) {
  const router = useRouter();
  const [surveyWindowStart, setSurveyWindowStart] = useState(toDateInput(campaign.config.surveyWindowStart));
  const [surveyWindowEnd, setSurveyWindowEnd] = useState(toDateInput(campaign.config.surveyWindowEnd));
  const [channels, setChannels] = useState<string[]>(campaign.config.channels);
  const [frequency, setFrequency] = useState<string>(campaign.config.reminderSchedule.frequency);
  const [dayOfWeek, setDayOfWeek] = useState(campaign.config.reminderSchedule.dayOfWeek ?? "wednesday");
  const [maxReminders, setMaxReminders] = useState(String(campaign.config.reminderSchedule.maxReminders));
  const [targetResponseRate, setTargetResponseRate] = useState(String(campaign.config.targetResponseRate));
  const [dryRun, setDryRun] = useState(campaign.config.dryRun);
  const [autoCloseOnTarget, setAutoCloseOnTarget] = useState(campaign.config.autoCloseOnTarget);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

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
    setMessage("");
    setError("");

    try {
      const response = await fetch(`/api/portal/campaigns/${campaign.id}/config`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
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
      const payload = await response.json() as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error || "Unable to update campaign configuration.");
      }

      setMessage("Campaign configuration saved.");
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to update campaign configuration.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="rounded-[28px] border-[#D6DEE3] bg-white shadow-sm">
      <CardHeader>
        <CardTitle className="text-base font-semibold uppercase tracking-[0.2em] text-[#2B2B2B]">
          Configuration
        </CardTitle>
        <CardDescription className="text-[#60727D]">
          Updates write only to the new campaign document and activity log.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-5">
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

          <div className="grid gap-3 rounded-2xl border border-[#E5EBEF] bg-[#F8FAFB] p-4 md:grid-cols-2">
            <label className="flex items-center gap-3 text-sm font-semibold text-[#2B2B2B]">
              <input type="checkbox" checked={channels.includes("email")} onChange={() => toggleChannel("email")} />
              Email channel
            </label>
            <label className="flex items-center gap-3 text-sm font-semibold text-[#2B2B2B]">
              <input type="checkbox" checked={channels.includes("text")} onChange={() => toggleChannel("text")} />
              Text channel
            </label>
            <label className="flex items-center gap-3 text-sm font-semibold text-[#2B2B2B]">
              <input type="checkbox" checked={dryRun} onChange={(event) => setDryRun(event.target.checked)} />
              Dry run mode
            </label>
            <label className="flex items-center gap-3 text-sm font-semibold text-[#2B2B2B]">
              <input
                type="checkbox"
                checked={autoCloseOnTarget}
                onChange={(event) => setAutoCloseOnTarget(event.target.checked)}
              />
              Auto-close on target
            </label>
          </div>

          {message ? <p className="text-sm text-[#386B45]">{message}</p> : null}
          {error ? <p className="text-sm text-[#B04C4C]">{error}</p> : null}

          <Button
            type="submit"
            disabled={saving || channels.length === 0}
            className="rounded-full bg-[#2B2B2B] text-white hover:bg-[#386B45]"
          >
            {saving ? "Saving..." : "Save Configuration"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
