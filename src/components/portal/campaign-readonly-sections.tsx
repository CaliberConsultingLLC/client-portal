import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CampaignStatusBadge } from "@/components/portal/campaign-status-badge";
import type {
  CampaignActivityLogEntry,
  CampaignDetail,
  CampaignRecipient,
  CampaignSummary,
} from "@/types/campaign";

interface CampaignListProps {
  campaigns: CampaignSummary[];
  clientNamesById: Record<string, string>;
}

function formatDate(value?: string | null) {
  if (!value) {
    return "Not set";
  }

  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateTime(value?: string | null) {
  if (!value) {
    return "Not logged";
  }

  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function CampaignList({ campaigns, clientNamesById }: CampaignListProps) {
  if (campaigns.length === 0) {
    return (
      <Card className="rounded-[28px] border-dashed border-[#D6DEE3] bg-white shadow-sm">
        <CardContent className="px-6 py-12 text-sm text-[#60727D]">
          No campaigns have been created for your accessible clients yet.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4">
      {campaigns.map((campaign) => (
        <Card key={campaign.id} className="rounded-[28px] border-[#D6DEE3] bg-white shadow-sm">
          <CardContent className="p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-lg font-semibold text-[#2B2B2B]">
                    {campaign.surveyLabel}
                  </h2>
                  <CampaignStatusBadge status={campaign.status} />
                </div>
                <p className="mt-2 text-sm leading-relaxed text-[#60727D]">
                  {clientNamesById[campaign.clientId] ?? campaign.clientId} · SM Survey {campaign.smSurveyId}
                </p>
              </div>
              <Button asChild className="rounded-full bg-[#2B2B2B] text-white hover:bg-[#386B45]">
                <Link href={`/portal/campaigns/${campaign.id}`}>
                  View Campaign
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-4">
              <Metric label="Response Rate" value={`${campaign.responseRate}%`} />
              <Metric label="Responded" value={`${campaign.respondedCount}/${campaign.totalRecipients}`} />
              <Metric label="Reminders" value={campaign.config.reminderSchedule.remindersSent} />
              <Metric label="Window Ends" value={formatDate(campaign.config.surveyWindowEnd)} />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-[#E5EBEF] bg-[#F8FAFB] px-4 py-3">
      <p className="text-lg font-bold text-[#2B2B2B]">{value}</p>
      <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#60727D]">
        {label}
      </p>
    </div>
  );
}

export function CampaignOverview({ campaign }: { campaign: CampaignDetail }) {
  return (
    <div className="grid gap-4 md:grid-cols-4">
      <Metric label="Response Rate" value={`${campaign.responseRate}%`} />
      <Metric label="Recipients" value={campaign.totalRecipients} />
      <Metric label="Reminders Sent" value={campaign.config.reminderSchedule.remindersSent} />
      <Metric label="Window Ends" value={formatDate(campaign.config.surveyWindowEnd)} />
    </div>
  );
}

export function CampaignConfigurationSummary({ campaign }: { campaign: CampaignDetail }) {
  return (
    <Card className="rounded-[28px] border-[#D6DEE3] bg-white shadow-sm">
      <CardHeader>
        <CardTitle className="text-base font-semibold uppercase tracking-[0.2em] text-[#2B2B2B]">
          Configuration
        </CardTitle>
        <CardDescription className="text-[#60727D]">
          Read-only configuration for Phase 2. Write controls arrive in Phase 3.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 text-sm text-[#60727D] md:grid-cols-2">
        <ConfigRow label="Channels" value={campaign.config.channels.join(", ") || "None"} />
        <ConfigRow label="Dry Run" value={campaign.config.dryRun ? "On" : "Off"} />
        <ConfigRow label="Survey Opens" value={formatDate(campaign.config.surveyWindowStart)} />
        <ConfigRow label="Survey Closes" value={formatDate(campaign.config.surveyWindowEnd)} />
        <ConfigRow label="Reminder Frequency" value={campaign.config.reminderSchedule.frequency} />
        <ConfigRow label="Max Reminders" value={campaign.config.reminderSchedule.maxReminders} />
        <ConfigRow label="Target Response" value={`${campaign.config.targetResponseRate}%`} />
        <ConfigRow label="Auto Close" value={campaign.config.autoCloseOnTarget ? "Enabled" : "Disabled"} />
      </CardContent>
    </Card>
  );
}

function ConfigRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-[#E5EBEF] bg-[#F8FAFB] px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#60727D]">
        {label}
      </p>
      <p className="mt-1 font-semibold text-[#2B2B2B]">{value}</p>
    </div>
  );
}

export function RecipientTable({ recipients }: { recipients: CampaignRecipient[] }) {
  return (
    <Card className="overflow-hidden rounded-[28px] border-[#D6DEE3] bg-white shadow-sm">
      <CardHeader>
        <CardTitle className="text-base font-semibold uppercase tracking-[0.2em] text-[#2B2B2B]">
          Recipients
        </CardTitle>
        <CardDescription className="text-[#60727D]">
          Read-only recipient map. This populates when a configured campaign is launched.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        {recipients.length === 0 ? (
          <div className="px-6 py-10 text-sm text-[#60727D]">
            No recipients have been copied into this campaign yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-[#F5F8FA] text-xs uppercase tracking-[0.14em] text-[#60727D]">
                <tr>
                  <th className="px-5 py-3">EID</th>
                  <th className="px-5 py-3">Name</th>
                  <th className="px-5 py-3">Email</th>
                  <th className="px-5 py-3">Phone</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Via</th>
                  <th className="px-5 py-3">Reminders</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5EBEF]">
                {recipients.map((recipient) => (
                  <tr key={recipient.eid}>
                    <td className="px-5 py-3 font-semibold text-[#2B2B2B]">{recipient.eid}</td>
                    <td className="px-5 py-3 text-[#2B2B2B]">
                      {[recipient.firstName, recipient.lastName].filter(Boolean).join(" ") || "-"}
                    </td>
                    <td className="px-5 py-3 text-[#60727D]">{recipient.email || "-"}</td>
                    <td className="px-5 py-3 text-[#60727D]">{recipient.phone || "-"}</td>
                    <td className="px-5 py-3 text-[#60727D]">
                      {recipient.responded ? "Responded" : "Pending"}
                    </td>
                    <td className="px-5 py-3 text-[#60727D]">{recipient.respondedVia ?? "-"}</td>
                    <td className="px-5 py-3 text-[#60727D]">{recipient.remindersReceived}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function ActivityLog({ entries }: { entries: CampaignActivityLogEntry[] }) {
  return (
    <Card className="rounded-[28px] border-[#D6DEE3] bg-white shadow-sm">
      <CardHeader>
        <CardTitle className="text-base font-semibold uppercase tracking-[0.2em] text-[#2B2B2B]">
          Activity Log
        </CardTitle>
        <CardDescription className="text-[#60727D]">
          Immutable campaign audit trail.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {entries.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#D6DEE3] px-4 py-8 text-sm text-[#60727D]">
            No activity has been logged yet.
          </div>
        ) : (
          entries.map((entry) => (
            <div key={entry.id} className="rounded-2xl border border-[#E5EBEF] bg-[#F8FAFB] p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="font-semibold text-[#2B2B2B]">{entry.action}</p>
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[#60727D]">
                  {formatDateTime(entry.timestamp)}
                </span>
              </div>
              <p className="mt-2 text-sm text-[#60727D]">
                {entry.dryRun ? "Dry run" : "Live"} · Triggered by {entry.triggeredBy ?? "system"}
              </p>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
