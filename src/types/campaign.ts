export type CampaignStatus =
  | "draft"
  | "configured"
  | "launched"
  | "active"
  | "paused"
  | "closing"
  | "closed";

export type CampaignChannel = "email" | "text";

export interface CampaignCollector {
  smCollectorId: string;
  type: CampaignChannel;
  label?: string;
  createdAt?: string | null;
  status: "active" | "closed";
}

export interface CampaignConfig {
  channels: CampaignChannel[];
  surveyWindowStart?: string | null;
  surveyWindowEnd?: string | null;
  reminderSchedule: {
    frequency: "daily" | "weekly" | "biweekly" | "custom";
    dayOfWeek?: string | null;
    maxReminders: number;
    remindersSent: number;
    lastReminderDate?: string | null;
    nextReminderDate?: string | null;
  };
  targetResponseRate: number;
  autoCloseOnTarget: boolean;
  dryRun: boolean;
}

export interface CampaignRecipient {
  eid: string;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  smRecipientId?: string | null;
  responded: boolean;
  respondedAt?: string | null;
  respondedVia?: CampaignChannel | null;
  remindersReceived: number;
  lastReminderDate?: string | null;
  channels: CampaignChannel[];
}

export interface CampaignSummary {
  id: string;
  campaignId: string;
  clientId: string;
  censusId: string;
  surveyLabel: string;
  smSurveyId: string;
  status: CampaignStatus;
  responseRate: number;
  respondedCount: number;
  totalRecipients: number;
  config: CampaignConfig;
  createdAt?: string | null;
  createdBy?: string | null;
  updatedAt?: string | null;
  launchedAt?: string | null;
  closedAt?: string | null;
}

export interface CampaignDetail extends CampaignSummary {
  collectors: {
    email?: CampaignCollector | null;
    text?: CampaignCollector[];
  };
  recipientMap: Record<string, CampaignRecipient>;
}

export interface CampaignActivityLogEntry {
  id: string;
  timestamp?: string | null;
  action: string;
  triggeredBy?: string | null;
  dryRun: boolean;
  payload?: unknown;
  result?: unknown;
  recipientsAffected?: string[];
  metadata?: Record<string, unknown>;
}
