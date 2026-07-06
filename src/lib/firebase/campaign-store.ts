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
import { getSurveyMonkeyToken, requireSurveyMonkeyToken } from "@/lib/surveymonkey/token";
import { getCensusPreviewById } from "./census-store";
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

interface CampaignActionActor {
  email: string;
}

type CampaignActionPayload = Record<string, unknown>;

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

function toDryRun(value: unknown) {
  if (value === false || value === "false") {
    return false;
  }

  return true;
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
    dryRun: toDryRun(config.dryRun),
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
    dashboardInstanceId:
      typeof data.dashboardInstanceId === "string" ? data.dashboardInstanceId : null,
    surveyWaveLabel: typeof data.surveyWaveLabel === "string" ? data.surveyWaveLabel : null,
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

function assertSurveyMonkeyTokenIfLive(dryRun: boolean) {
  if (!dryRun && !getSurveyMonkeyToken()) {
    throw new Error(
      "Missing SurveyMonkey API token. Set SURVEYMONKEY_ACCESS_TOKEN (or SURVEYMONKEY_TOKEN) in the environment, or turn dry-run mode back on."
    );
  }
}

async function surveyMonkeyRequest(method: string, path: string, body?: unknown) {
  const token = requireSurveyMonkeyToken();

  const response = await fetch(`https://api.surveymonkey.com/v3${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(`SurveyMonkey API error: ${JSON.stringify(result)}`);
  }

  return result;
}

async function executeCampaignAction({
  campaignId,
  action,
  triggeredBy,
  dryRun,
  payload,
  recipientsAffected = [],
  liveRequest,
}: {
  campaignId: string;
  action: string;
  triggeredBy: string;
  dryRun: boolean;
  payload: CampaignActionPayload;
  recipientsAffected?: string[];
  liveRequest?: {
    method: string;
    path: string;
    body?: unknown;
  };
}) {
  const campaignRef = getFirebaseAdminFirestore().collection(CAMPAIGNS_COLLECTION).doc(campaignId);

  if (dryRun) {
    await campaignRef.collection(ACTIVITY_LOG_COLLECTION).add({
      timestamp: new Date(),
      action,
      triggeredBy,
      dryRun: true,
      payload,
      result: "SIMULATED_SUCCESS",
      recipientsAffected,
      metadata: {},
    });

    return { success: true, simulated: true, id: "DRY_RUN_ID" };
  }

  if (!liveRequest) {
    await campaignRef.collection(ACTIVITY_LOG_COLLECTION).add({
      timestamp: new Date(),
      action,
      triggeredBy,
      dryRun: false,
      payload,
      result: "SUCCESS",
      recipientsAffected,
      metadata: {},
    });

    return { success: true };
  }

  const result = await surveyMonkeyRequest(liveRequest.method, liveRequest.path, liveRequest.body);

  await campaignRef.collection(ACTIVITY_LOG_COLLECTION).add({
    timestamp: new Date(),
    action,
    triggeredBy,
    dryRun: false,
    payload,
    result,
    recipientsAffected,
    metadata: {},
  });

  return result;
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

const SYNCABLE_CAMPAIGN_STATUSES: CampaignStatus[] = ["launched", "active", "closing"];

/**
 * Returns every campaign that is currently in-flight, across all clients.
 * Used by the nightly cron to refresh response rates without a client scope.
 */
export async function listActiveCampaignsForSync() {
  const firestore = getFirebaseAdminFirestore();
  const snapshots = await Promise.all(
    chunkArray(SYNCABLE_CAMPAIGN_STATUSES, 10).map((chunk) =>
      firestore.collection(CAMPAIGNS_COLLECTION).where("status", "in", chunk).get()
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
    dryRun: toDryRun(input.dryRun),
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

function findFirstValue(row: Record<string, string>, aliases: string[]) {
  const normalizedAliases = new Set(aliases.map((alias) => alias.toLowerCase().replace(/[^a-z0-9]/g, "")));
  const match = Object.entries(row).find(([key]) =>
    normalizedAliases.has(key.toLowerCase().replace(/[^a-z0-9]/g, ""))
  );

  return match?.[1]?.trim() || null;
}

function buildRecipientMap(
  rows: Record<string, string>[],
  channels: CampaignChannel[]
): Record<string, CampaignRecipient> {
  return Object.fromEntries(
    rows.flatMap((row, index) => {
      const eid = findFirstValue(row, ["eid", "id", "employee id", "employeeid"]) ?? `ROW_${index + 1}`;
      const firstName = findFirstValue(row, ["first name", "firstname", "given name"]);
      const lastName = findFirstValue(row, ["last name", "lastname", "surname"]);
      const email = findFirstValue(row, ["email", "email address", "work email"]);
      const phone = findFirstValue(row, ["phone", "phone number", "mobile", "mobile phone", "cell phone"]);

      return [
        [
          eid,
          {
            eid,
            firstName,
            lastName,
            email,
            phone,
            smRecipientId: null,
            responded: false,
            respondedAt: null,
            respondedVia: null,
            remindersReceived: 0,
            lastReminderDate: null,
            channels,
          },
        ],
      ];
    })
  );
}

export async function launchCampaign(campaignId: string, actor: CampaignActionActor) {
  const campaign = await getCampaignById(campaignId);

  if (!campaign) {
    throw new Error("CAMPAIGN_NOT_FOUND");
  }

  assertAutomationClientAllowed(campaign.clientId);

  if (campaign.status !== "configured") {
    throw new Error(`Campaign must be configured before launch. Current status: ${campaign.status}`);
  }

  const dryRun = campaign.config.dryRun;
  assertSurveyMonkeyTokenIfLive(dryRun);
  const preview = await getCensusPreviewById(campaign.censusId);

  if (!preview.upload || preview.rows.length === 0) {
    throw new Error("Campaign census is missing or has no processed rows.");
  }

  const recipients = preview.rows;
  const recipientMap = buildRecipientMap(recipients, campaign.config.channels);
  const contactPayload = Object.values(recipientMap).map((recipient) => ({
    email: recipient.email,
    first_name: recipient.firstName,
    last_name: recipient.lastName,
    custom_fields: { 1: recipient.eid },
  }));

  const collectorResult = await executeCampaignAction({
    campaignId,
    action: "EMAIL_COLLECTOR_CREATED",
    triggeredBy: actor.email,
    dryRun,
    payload: {
      endpoint: `POST /v3/surveys/${campaign.smSurveyId}/collectors`,
      body: { type: "email", name: `${campaign.surveyLabel} - Email` },
    },
    liveRequest: {
      method: "POST",
      path: `/surveys/${campaign.smSurveyId}/collectors`,
      body: { type: "email", name: `${campaign.surveyLabel} - Email` },
    },
  });
  const collectorId = typeof collectorResult.id === "string" ? collectorResult.id : "DRY_RUN_ID";

  await executeCampaignAction({
    campaignId,
    action: "CONTACTS_UPLOADED",
    triggeredBy: actor.email,
    dryRun,
    payload: {
      endpoint: `POST /v3/collectors/${collectorId}/messages`,
      body: { recipients: contactPayload },
    },
    recipientsAffected: Object.keys(recipientMap),
    liveRequest: {
      method: "POST",
      path: `/collectors/${collectorId}/messages`,
      body: { recipients: contactPayload },
    },
  });

  await executeCampaignAction({
    campaignId,
    action: "INITIAL_INVITE_SENT",
    triggeredBy: actor.email,
    dryRun,
    payload: {
      endpoint: `POST /v3/collectors/${collectorId}/messages`,
      body: { type: "invite_email", subject: `Survey: ${campaign.surveyLabel}` },
    },
    recipientsAffected: Object.keys(recipientMap),
    liveRequest: {
      method: "POST",
      path: `/collectors/${collectorId}/messages`,
      body: { type: "invite_email", subject: `Survey: ${campaign.surveyLabel}` },
    },
  });

  await getFirebaseAdminFirestore().collection(CAMPAIGNS_COLLECTION).doc(campaignId).update({
    status: "active",
    recipientMap,
    totalRecipients: Object.keys(recipientMap).length,
    launchedAt: new Date(),
    updatedAt: new Date(),
    "collectors.email": {
      smCollectorId: collectorId,
      type: "email",
      createdAt: new Date(),
      status: "active",
    },
  });

  return { success: true, dryRun, recipientCount: Object.keys(recipientMap).length };
}

export async function syncCampaignResponses(campaignId: string, actor: CampaignActionActor) {
  const campaign = await getCampaignById(campaignId);

  if (!campaign) {
    throw new Error("CAMPAIGN_NOT_FOUND");
  }

  assertAutomationClientAllowed(campaign.clientId);

  if (campaign.config.dryRun) {
    await executeCampaignAction({
      campaignId,
      action: "RESPONSES_SYNCED",
      triggeredBy: actor.email,
      dryRun: true,
      payload: {
        endpoint: `GET /v3/surveys/${campaign.smSurveyId}/responses/bulk?status=completed`,
        note: "Dry run - no real responses fetched.",
      },
    });

    return { success: true, dryRun: true, newResponses: 0 };
  }

  assertSurveyMonkeyTokenIfLive(false);

  const responsePayload = await surveyMonkeyRequest(
    "GET",
    `/surveys/${campaign.smSurveyId}/responses/bulk?status=completed`
  );
  const recipientMap = { ...campaign.recipientMap };
  let newResponses = 0;

  for (const response of Array.isArray(responsePayload.data) ? responsePayload.data : []) {
    const respondentEmail = response?.metadata?.contact?.email?.value;
    const eid = Object.keys(recipientMap).find((key) => recipientMap[key]?.email === respondentEmail);

    if (eid && !recipientMap[eid].responded) {
      recipientMap[eid] = {
        ...recipientMap[eid],
        responded: true,
        respondedAt: typeof response.date_modified === "string" ? response.date_modified : new Date().toISOString(),
        respondedVia: "email",
      };
      newResponses += 1;
    }
  }

  const respondedCount = Object.values(recipientMap).filter((recipient) => recipient.responded).length;
  const responseRate = campaign.totalRecipients > 0
    ? Math.round((respondedCount / campaign.totalRecipients) * 100)
    : 0;

  await getFirebaseAdminFirestore().collection(CAMPAIGNS_COLLECTION).doc(campaignId).update({
    recipientMap,
    respondedCount,
    responseRate,
    updatedAt: new Date(),
  });

  await executeCampaignAction({
    campaignId,
    action: "RESPONSES_SYNCED",
    triggeredBy: actor.email,
    dryRun: false,
    payload: {
      endpoint: `GET /v3/surveys/${campaign.smSurveyId}/responses/bulk?status=completed`,
    },
    recipientsAffected: Object.values(recipientMap).filter((recipient) => recipient.responded).map((recipient) => recipient.eid),
  });

  return { success: true, dryRun: false, newResponses, respondedCount, responseRate };
}

export async function sendCampaignReminder(
  campaignId: string,
  channel: "email" | "text" | "all",
  actor: CampaignActionActor
) {
  const campaign = await getCampaignById(campaignId);

  if (!campaign) {
    throw new Error("CAMPAIGN_NOT_FOUND");
  }

  assertAutomationClientAllowed(campaign.clientId);

  if (campaign.status !== "active") {
    throw new Error(`Campaign must be active to send reminders. Current status: ${campaign.status}`);
  }

  if (campaign.config.reminderSchedule.remindersSent >= campaign.config.reminderSchedule.maxReminders) {
    throw new Error(`Maximum reminders (${campaign.config.reminderSchedule.maxReminders}) already sent.`);
  }

  await syncCampaignResponses(campaignId, actor);

  const refreshedCampaign = await getCampaignById(campaignId);

  if (!refreshedCampaign) {
    throw new Error("CAMPAIGN_NOT_FOUND");
  }

  const recipientMap = { ...refreshedCampaign.recipientMap };
  const nonRespondents = Object.values(recipientMap).filter((recipient) => !recipient.responded);
  const nonRespondentEids = nonRespondents.map((recipient) => recipient.eid);
  const dryRun = refreshedCampaign.config.dryRun;

  if ((channel === "email" || channel === "all") && refreshedCampaign.config.channels.includes("email")) {
    await executeCampaignAction({
      campaignId,
      action: "EMAIL_REMINDER_SENT",
      triggeredBy: actor.email,
      dryRun,
      payload: {
        endpoint: `POST /v3/collectors/${refreshedCampaign.collectors.email?.smCollectorId ?? "DRY_RUN_ID"}/messages`,
        body: { type: "reminder", subject: `Reminder: ${refreshedCampaign.surveyLabel}` },
        nonRespondentCount: nonRespondents.length,
      },
      recipientsAffected: nonRespondentEids,
      liveRequest: {
        method: "POST",
        path: `/collectors/${refreshedCampaign.collectors.email?.smCollectorId}/messages`,
        body: { type: "reminder", subject: `Reminder: ${refreshedCampaign.surveyLabel}` },
      },
    });
  }

  if ((channel === "text" || channel === "all") && refreshedCampaign.config.channels.includes("text")) {
    const textRecipients = nonRespondents.filter((recipient) => recipient.phone);

    await executeCampaignAction({
      campaignId,
      action: "TEXT_REMINDER_SENT",
      triggeredBy: actor.email,
      dryRun: true,
      payload: {
        note: "TEXT COLLECTOR REQUIRES CHROME AUTOMATION - NOT API-SUPPORTED",
        recipientPhones: textRecipients.map((recipient) => ({ eid: recipient.eid, phone: recipient.phone })),
        nonRespondentCount: textRecipients.length,
      },
      recipientsAffected: textRecipients.map((recipient) => recipient.eid),
    });
  }

  for (const recipient of nonRespondents) {
    recipientMap[recipient.eid] = {
      ...recipientMap[recipient.eid],
      remindersReceived: recipientMap[recipient.eid].remindersReceived + 1,
      lastReminderDate: new Date().toISOString(),
    };
  }

  await getFirebaseAdminFirestore().collection(CAMPAIGNS_COLLECTION).doc(campaignId).update({
    recipientMap,
    "config.reminderSchedule.remindersSent": refreshedCampaign.config.reminderSchedule.remindersSent + 1,
    "config.reminderSchedule.lastReminderDate": new Date(),
    updatedAt: new Date(),
  });

  return { success: true, dryRun, nonRespondentCount: nonRespondents.length };
}

export async function closeCampaign(campaignId: string, actor: CampaignActionActor) {
  const campaign = await getCampaignById(campaignId);

  if (!campaign) {
    throw new Error("CAMPAIGN_NOT_FOUND");
  }

  assertAutomationClientAllowed(campaign.clientId);

  if (campaign.collectors.email?.smCollectorId) {
    assertSurveyMonkeyTokenIfLive(campaign.config.dryRun);

    await executeCampaignAction({
      campaignId,
      action: "COLLECTOR_CLOSED",
      triggeredBy: actor.email,
      dryRun: campaign.config.dryRun,
      payload: {
        endpoint: `PATCH /v3/collectors/${campaign.collectors.email.smCollectorId}`,
        body: { status: "closed" },
      },
      liveRequest: {
        method: "PATCH",
        path: `/collectors/${campaign.collectors.email.smCollectorId}`,
        body: { status: "closed" },
      },
    });
  }

  await getFirebaseAdminFirestore().collection(CAMPAIGNS_COLLECTION).doc(campaignId).update({
    status: "closed",
    closedAt: new Date(),
    updatedAt: new Date(),
  });

  return { success: true, dryRun: campaign.config.dryRun, finalResponseRate: campaign.responseRate };
}

export async function pauseCampaign(campaignId: string, actor: CampaignActionActor) {
  const campaign = await getCampaignById(campaignId);

  if (!campaign) {
    throw new Error("CAMPAIGN_NOT_FOUND");
  }

  assertAutomationClientAllowed(campaign.clientId);

  if (campaign.status !== "active") {
    throw new Error("Can only pause active campaigns.");
  }

  await getFirebaseAdminFirestore().collection(CAMPAIGNS_COLLECTION).doc(campaignId).update({
    status: "paused",
    updatedAt: new Date(),
  });

  await executeCampaignAction({
    campaignId,
    action: "CAMPAIGN_PAUSED",
    triggeredBy: actor.email,
    dryRun: campaign.config.dryRun,
    payload: { campaignId },
  });

  return { success: true };
}

export async function resumeCampaign(campaignId: string, actor: CampaignActionActor) {
  const campaign = await getCampaignById(campaignId);

  if (!campaign) {
    throw new Error("CAMPAIGN_NOT_FOUND");
  }

  assertAutomationClientAllowed(campaign.clientId);

  if (campaign.status !== "paused") {
    throw new Error("Can only resume paused campaigns.");
  }

  await getFirebaseAdminFirestore().collection(CAMPAIGNS_COLLECTION).doc(campaignId).update({
    status: "active",
    updatedAt: new Date(),
  });

  await executeCampaignAction({
    campaignId,
    action: "CAMPAIGN_RESUMED",
    triggeredBy: actor.email,
    dryRun: campaign.config.dryRun,
    payload: { campaignId },
  });

  return { success: true };
}
