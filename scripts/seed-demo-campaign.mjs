import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { cert, getApp, getApps, initializeApp } from "firebase-admin/app";
import {
  FieldValue,
  Timestamp,
  initializeFirestore,
} from "firebase-admin/firestore";

const CAMPAIGN_ID = "camp_demo_test_001";
const CLIENT_ID = "demo";
const SURVEY_ID = "422546676";
const CREATED_BY = "dustin@caliberconsultingllc.org";

function loadEnvFile(fileName) {
  const filePath = resolve(process.cwd(), fileName);

  if (!existsSync(filePath)) {
    return;
  }

  const text = readFileSync(filePath, "utf8");

  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");
    const key = trimmed.slice(0, separatorIndex).trim();
    let value = trimmed.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

function getRequiredEnv(name) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required Firebase admin env: ${name}`);
  }

  return value;
}

function getAdminApp() {
  if (getApps().length > 0) {
    return getApp();
  }

  return initializeApp({
    credential: cert({
      projectId: getRequiredEnv("FIREBASE_PROJECT_ID"),
      clientEmail: getRequiredEnv("FIREBASE_CLIENT_EMAIL"),
      privateKey: getRequiredEnv("FIREBASE_PRIVATE_KEY").replace(/\\n/g, "\n"),
    }),
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  });
}

async function findDemoCensusId(db) {
  const snapshot = await db
    .collection("censusUploads")
    .where("clientId", "==", CLIENT_ID)
    .where("surveyId", "==", SURVEY_ID)
    .limit(1)
    .get();

  return snapshot.docs[0]?.id ?? "demo-census-422546676";
}

function validateCampaignReadback(campaign) {
  const requiredFields = [
    "campaignId",
    "clientId",
    "censusId",
    "surveyLabel",
    "smSurveyId",
    "collectors",
    "config",
    "status",
    "responseRate",
    "respondedCount",
    "totalRecipients",
    "recipientMap",
    "createdAt",
    "createdBy",
    "updatedAt",
    "launchedAt",
    "closedAt",
  ];

  const missingFields = requiredFields.filter((field) => !(field in campaign));

  if (missingFields.length > 0) {
    throw new Error(`Seeded campaign is missing fields: ${missingFields.join(", ")}`);
  }

  if (campaign.clientId !== CLIENT_ID) {
    throw new Error(`Expected clientId "${CLIENT_ID}", received "${campaign.clientId}"`);
  }

  if (campaign.config?.dryRun !== true) {
    throw new Error("Phase 1 demo campaign must default to dryRun: true");
  }
}

async function main() {
  loadEnvFile(".env.local");
  loadEnvFile(".env");

  const app = getAdminApp();
  const db = initializeFirestore(app, { preferRest: true });
  const campaignRef = db.collection("campaigns").doc(CAMPAIGN_ID);
  const existingCampaign = await campaignRef.get();

  if (!existingCampaign.exists || process.argv.includes("--force")) {
    const censusId = await findDemoCensusId(db);
    const now = Timestamp.now();

    await campaignRef.set({
      campaignId: CAMPAIGN_ID,
      clientId: CLIENT_ID,
      censusId,
      surveyLabel: "Demo Engagement Survey",
      smSurveyId: SURVEY_ID,
      collectors: {},
      config: {
        channels: ["email"],
        surveyWindowStart: Timestamp.fromDate(new Date("2026-06-01T00:00:00.000Z")),
        surveyWindowEnd: Timestamp.fromDate(new Date("2026-06-30T23:59:59.999Z")),
        reminderSchedule: {
          frequency: "weekly",
          dayOfWeek: "wednesday",
          maxReminders: 3,
          remindersSent: 0,
          lastReminderDate: null,
          nextReminderDate: null,
        },
        targetResponseRate: 80,
        autoCloseOnTarget: false,
        dryRun: true,
      },
      status: "configured",
      responseRate: 0,
      respondedCount: 0,
      totalRecipients: 5,
      recipientMap: {},
      createdAt: now,
      createdBy: CREATED_BY,
      updatedAt: now,
      launchedAt: null,
      closedAt: null,
    });

    await campaignRef.collection("activityLog").add({
      timestamp: FieldValue.serverTimestamp(),
      action: "CAMPAIGN_CREATED",
      triggeredBy: CREATED_BY,
      dryRun: true,
      payload: {
        source: "scripts/seed-demo-campaign.mjs",
        campaignId: CAMPAIGN_ID,
      },
      result: "SEEDED_PHASE_1",
      recipientsAffected: [],
      metadata: {
        clientId: CLIENT_ID,
        smSurveyId: SURVEY_ID,
      },
    });
  }

  const readback = await campaignRef.get();

  if (!readback.exists) {
    throw new Error(`Campaign "${CAMPAIGN_ID}" was not created.`);
  }

  const campaign = readback.data();
  validateCampaignReadback(campaign);

  console.log(
    JSON.stringify(
      {
        success: true,
        campaignId: readback.id,
        clientId: campaign.clientId,
        censusId: campaign.censusId,
        status: campaign.status,
        dryRun: campaign.config.dryRun,
        totalRecipients: campaign.totalRecipients,
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
