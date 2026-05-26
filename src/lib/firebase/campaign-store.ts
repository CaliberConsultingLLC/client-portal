import type {
  CampaignActivityLogEntry,
  CampaignChannel,
  CampaignCollector,
  CampaignConfig,
  CampaignDetail,
  CampaignRecipient,
  CampaignStatus,
  CampaignSummary,
} from "@/types/campaign";
import { getFirebaseAdminFirestore } from "./admin";

const CAMPAIGNS_COLLECTION = "campaigns";
const ACTIVITY_LOG_COLLECTION = "activityLog";
export const ALLOWED_AUTOMATION_CLIENTS = ["demo"];

interface CampaignConfigInput {
  channels: CampaignChannel[];
  surveyWindowStart: Date;
  surveyWindowEnd: Date;
  reminderSchedule: {
    frequency: "daily" | "weekly" | "biweekly" | "custom";
    dayOfWeek?: string | null;
    maxReminders: number;
  };
  targetResponseRate: number;
  autoCloseOnTarget: boolean;
  dryRun: boolean;
}

interface CreateCampaignInput {
  clientId: string;
  censusId: string;
  surveyLabel: string;
  smSurveyId: string;
  totalRecipients: number;
  config: CampaignConfigInput;
  createdBy: string;
}

function chunkArray<T>(items: T[], size: number) {
  const chunks: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
}

function toIso(value: unknown): string | null {
  if (!value) {
    return null;
  }

  if (typeof value === "string") {
    return value;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (
    typeof value === "object" &&
    "toDate" in value &&
    typeof value.toDate === "function"
  ) {
    return value.toDate().toISOString();
  }

  return null;
}

function toNumber(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function toStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function toChannels(value: unknown): CampaignChannel[] {
  return toStringArray(value).filter((channel): channel is CampaignChannel =>
    channel === "email" || channel === "text"
  );
}

function mapConfig(value: unknown): CampaignConfig {
  const config = typeof value === "object" && value ? value as Record<string, unknown> : {};
  const reminderSchedule =
    typeof config.reminderSchedule === "object" && config.reminderSchedule
      ? config.reminderSchedule as Record<string, unknown>
      : {};

  return {
    channels: toChannels(config.channels),
    surveyWindowStart: toIso(config.surveyWindowStart),
    surveyWindowEnd: toIso(config.surveyWindowEnd),
    reminderSchedule: {
      frequency:
        reminderSchedule.frequency === "daily" ||
        reminderSchedule.frequency === "weekly" ||
        reminderSchedule.frequency === "biweekly" ||
        reminderSchedule.frequency === "custom"
          ? reminderSchedule.frequency
          : "weekly",
      dayOfWeek: typeof reminderSchedule.dayOfWeek === "string" ? reminderSchedule.dayOfWeek : null,
      maxReminders: toNumber(reminderSchedule.maxReminders, 0),
      remindersSent: toNumber(reminderSchedule.remindersSent, 0),
      lastReminderDate: toIso(reminderSchedule.lastReminderDate),
      nextReminderDate: toIso(reminderSchedule.nextReminderDate),
    },
    targetResponseRate: toNumber(config.targetResponseRate, 0),
    autoCloseOnTarget: config.autoCloseOnTarget === true,
    dryRun: config.dryRun !== false,
  };
}

function mapRecipient(value: unknown, fallbackEid: string): CampaignRecipient {
  const recipient = typeof value === "object" && value ? value as Record<string, unknown> : {};

  return {
    eid: typeof recipient.eid === "string" ? recipient.eid : fallbackEid,
    firstName: typeof recipient.firstName === "string" ? recipient.firstName : null,
    lastName: typeof recipient.lastName === "string" ? recipient.lastName : null,
    email: typeof recipient.email === "string" ? recipient.email : null,
    phone: typeof recipient.phone === "string" ? recipient.phone : null,
    smRecipientId: typeof recipient.smRecipientId === "string" ? recipient.smRecipientId : null,
    responded: recipient.responded === true,
    respondedAt: toIso(recipient.respondedAt),
    respondedVia:
      recipient.respondedVia === "email" || recipient.respondedVia === "text"
        ? recipient.respondedVia
        : null,
    remindersReceived: toNumber(recipient.remindersReceived, 0),
    lastReminderDate: toIso(recipient.lastReminderDate),
    channels: toChannels(recipient.channels),
  };
}

function mapCampaignSummary(id: string, data: FirebaseFirestore.DocumentData): CampaignSummary {
  return {
    id,
    campaignId: typeof data.campaignId === "string" ? data.campaignId : id,
    clientId: typeof data.clientId === "string" ? data.clientId : "",
    censusId: typeof data.censusId === "string" ? data.censusId : "",
    surveyLabel: typeof data.surveyLabel === "string" ? data.surveyLabel : "Untitled Campaign",
    smSurveyId: typeof data.smSurveyId === "string" ? data.smSurveyId : "",
    status: typeof data.status === "string" ? data.status as CampaignStatus : "draft",
    responseRate: toNumber(data.responseRate, 0),
    respondedCount: toNumber(data.respondedCount, 0),
    totalRecipients: toNumber(data.totalRecipients, 0),
    config: mapConfig(data.config),
    createdAt: toIso(data.createdAt),
    createdBy: typeof data.createdBy === "string" ? data.createdBy : null,
    updatedAt: toIso(data.updatedAt),
    launchedAt: toIso(data.launchedAt),
    closedAt: toIso(data.closedAt),
  };
}

function mapCollector(value: unknown): CampaignCollector | null {
  const collector = typeof value === "object" && value ? value as Record<string, unknown> : null;

  if (!collector) {
    return null;
  }

  return {
    smCollectorId: typeof collector.smCollectorId === "string" ? collector.smCollectorId : "",
    type: collector.type === "text" ? "text" : "email",
    label: typeof collector.label === "string" ? collector.label : undefined,
    createdAt: toIso(collector.createdAt),
    status: collector.status === "closed" ? "closed" : "active",
  };
}

function mapCampaignDetail(id: string, data: FirebaseFirestore.DocumentData): CampaignDetail {
  const collectors = typeof data.collectors === "object" && data.collectors
    ? data.collectors as Record<string, unknown>
    : {};
  const rawRecipientMap = typeof data.recipientMap === "object" && data.recipientMap
    ? data.recipientMap as Record<string, unknown>
    : {};

  return {
    ...mapCampaignSummary(id, data),
    collectors: {
      email: mapCollector(collectors.email),
      text: Array.isArray(collectors.text)
        ? collectors.text.map(mapCollector).filter((collector): collector is CampaignCollector => Boolean(collector))
        : [],
    },
    recipientMap: Object.fromEntries(
      Object.entries(rawRecipientMap).map(([eid, recipient]) => [eid, mapRecipient(recipient, eid)])
    ),
  };
}

function mapActivityLog(id: string, data: FirebaseFirestore.DocumentData): CampaignActivityLogEntry {
  return {
    id,
    timestamp: toIso(data.timestamp),
    action: typeof data.action === "string" ? data.action : "UNKNOWN_ACTION",
    triggeredBy: typeof data.triggeredBy === "string" ? data.triggeredBy : null,
    dryRun: data.dryRun === true,
    payload: data.payload,
    result: data.result,
    recipientsAffected: toStringArray(data.recipientsAffected),
    metadata: typeof data.metadata === "object" && data.metadata ? data.metadata as Record<string, unknown> : {},
  };
}

export async function listCampaignsForClientIds(clientIds: string[]) {
  if (clientIds.length === 0) {
    return [];
  }

  const firestore = getFirebaseAdminFirestore();
  const snapshots = await Promise.all(
    chunkArray(clientIds, 30).map((chunk) =>
      firestore.collection(CAMPAIGNS_COLLECTION).where("clientId", "in", chunk).get()
    )
  );

  return snapshots
    .flatMap((snapshot) => snapshot.docs.map((doc) => mapCampaignSummary(doc.id, doc.data())))
    .sort((left, right) => (right.updatedAt ?? "").localeCompare(left.updatedAt ?? ""));
}

export async function getCampaignById(campaignId: string) {
  const snapshot = await getFirebaseAdminFirestore()
    .collection(CAMPAIGNS_COLLECTION)
    .doc(campaignId)
    .get();

  if (!snapshot.exists) {
    return null;
  }

  return mapCampaignDetail(snapshot.id, snapshot.data() ?? {});
}

export async function listCampaignActivityLog(campaignId: string, limit = 50) {
  const snapshot = await getFirebaseAdminFirestore()
    .collection(CAMPAIGNS_COLLECTION)
    .doc(campaignId)
    .collection(ACTIVITY_LOG_COLLECTION)
    .orderBy("timestamp", "desc")
    .limit(limit)
    .get();

  return snapshot.docs.map((doc) => mapActivityLog(doc.id, doc.data()));
}

function assertAutomationClientAllowed(clientId: string) {
  if (!ALLOWED_AUTOMATION_CLIENTS.includes(clientId)) {
    throw new Error("CLIENT_NOT_ENABLED_FOR_AUTOMATION");
  }
}

function buildConfig(input: CampaignConfigInput) {
  return {
    channels: input.channels,
    surveyWindowStart: input.surveyWindowStart,
    surveyWindowEnd: input.surveyWindowEnd,
    reminderSchedule: {
      frequency: input.reminderSchedule.frequency,
      dayOfWeek: input.reminderSchedule.dayOfWeek ?? null,
      maxReminders: input.reminderSchedule.maxReminders,
      remindersSent: 0,
      lastReminderDate: null,
      nextReminderDate: null,
    },
    targetResponseRate: input.targetResponseRate,
    autoCloseOnTarget: input.autoCloseOnTarget,
    dryRun: input.dryRun !== false,
  };
}

export async function createCampaign(input: CreateCampaignInput) {
  assertAutomationClientAllowed(input.clientId);

  const firestore = getFirebaseAdminFirestore();
  const campaignId = `camp_${input.clientId}_${input.smSurveyId}_${Date.now()}`;
  const campaignRef = firestore.collection(CAMPAIGNS_COLLECTION).doc(campaignId);
  const now = new Date();

  await campaignRef.set({
    campaignId,
    clientId: input.clientId,
    censusId: input.censusId,
    surveyLabel: input.surveyLabel,
    smSurveyId: input.smSurveyId,
    collectors: {},
    config: buildConfig(input.config),
    status: "configured",
    responseRate: 0,
    respondedCount: 0,
    totalRecipients: input.totalRecipients,
    recipientMap: {},
    createdAt: now,
    createdBy: input.createdBy,
    updatedAt: now,
    launchedAt: null,
    closedAt: null,
  });

  await campaignRef.collection(ACTIVITY_LOG_COLLECTION).add({
    timestamp: now,
    action: "CAMPAIGN_CREATED",
    triggeredBy: input.createdBy,
    dryRun: input.config.dryRun !== false,
    payload: {
      clientId: input.clientId,
      censusId: input.censusId,
      smSurveyId: input.smSurveyId,
      surveyLabel: input.surveyLabel,
    },
    result: "CREATED_FROM_PORTAL",
    recipientsAffected: [],
    metadata: {
      phase: 3,
    },
  });

  return getCampaignById(campaignId);
}

export async function updateCampaignConfig(
  campaignId: string,
  config: CampaignConfigInput,
  triggeredBy: string
) {
  const campaign = await getCampaignById(campaignId);

  if (!campaign) {
    throw new Error("CAMPAIGN_NOT_FOUND");
  }

  assertAutomationClientAllowed(campaign.clientId);

  const campaignRef = getFirebaseAdminFirestore().collection(CAMPAIGNS_COLLECTION).doc(campaignId);
  const nextConfig = {
    ...buildConfig(config),
    reminderSchedule: {
      ...buildConfig(config).reminderSchedule,
      remindersSent: campaign.config.reminderSchedule.remindersSent,
      lastReminderDate: campaign.config.reminderSchedule.lastReminderDate
        ? new Date(campaign.config.reminderSchedule.lastReminderDate)
        : null,
      nextReminderDate: campaign.config.reminderSchedule.nextReminderDate
        ? new Date(campaign.config.reminderSchedule.nextReminderDate)
        : null,
    },
  };

  await campaignRef.update({
    config: nextConfig,
    status: campaign.status === "draft" ? "configured" : campaign.status,
    updatedAt: new Date(),
  });

  await campaignRef.collection(ACTIVITY_LOG_COLLECTION).add({
    timestamp: new Date(),
    action: "CAMPAIGN_CONFIGURED",
    triggeredBy,
    dryRun: nextConfig.dryRun,
    payload: nextConfig,
    result: "CONFIG_UPDATED_FROM_PORTAL",
    recipientsAffected: [],
    metadata: {
      phase: 3,
    },
  });

  return getCampaignById(campaignId);
}
