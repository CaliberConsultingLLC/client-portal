import { NextRequest, NextResponse } from "next/server";
import { getOptionalFirebaseUser } from "@/lib/firebase/auth";
import { createCampaign } from "@/lib/firebase/campaign-store";
import { getCensusUploadById } from "@/lib/firebase/census-store";

const CAMPAIGN_ADMIN_EMAIL = "dustin@caliberconsultingllc.org";

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

function parseDate(value: unknown, label: string) {
  const text = String(value ?? "").trim();
  const date = new Date(text);

  if (!text || Number.isNaN(date.getTime())) {
    throw new Error(`${label} is required.`);
  }

  return date;
}

function parseConfig(payload: Record<string, unknown>) {
  const channels = Array.isArray(payload.channels)
    ? payload.channels.filter((channel): channel is "email" | "text" =>
        channel === "email" || channel === "text"
      )
    : [];

  if (channels.length === 0) {
    throw new Error("Choose at least one campaign channel.");
  }

  const maxReminders = Number(payload.maxReminders);
  const targetResponseRate = Number(payload.targetResponseRate);
  const frequency: "daily" | "weekly" | "biweekly" | "custom" =
    payload.frequency === "daily" ||
    payload.frequency === "weekly" ||
    payload.frequency === "biweekly" ||
    payload.frequency === "custom"
      ? payload.frequency
      : "weekly";

  return {
    channels,
    surveyWindowStart: parseDate(payload.surveyWindowStart, "Survey window start"),
    surveyWindowEnd: parseDate(payload.surveyWindowEnd, "Survey window end"),
    reminderSchedule: {
      frequency,
      dayOfWeek: typeof payload.dayOfWeek === "string" ? payload.dayOfWeek : "wednesday",
      maxReminders: Number.isFinite(maxReminders) ? maxReminders : 3,
    },
    targetResponseRate: Number.isFinite(targetResponseRate) ? targetResponseRate : 80,
    autoCloseOnTarget: payload.autoCloseOnTarget === true,
    dryRun: payload.dryRun !== false,
  };
}

export async function POST(request: NextRequest) {
  try {
    const actor = await getOptionalFirebaseUser();

    if (!actor) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (actor.email !== CAMPAIGN_ADMIN_EMAIL) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const payload = await request.json() as Record<string, unknown>;
    const clientId = String(payload.clientId ?? "").trim();
    const censusId = String(payload.censusId ?? "").trim();
    const surveyLabel = String(payload.surveyLabel ?? "").trim();
    const smSurveyId = String(payload.smSurveyId ?? "").trim();

    if (!clientId || !censusId || !surveyLabel || !smSurveyId) {
      return badRequest("Client, census, survey label, and SurveyMonkey survey ID are required.");
    }

    if (clientId !== "demo") {
      return badRequest("Campaign automation is only enabled for the demo client.");
    }

    const census = await getCensusUploadById(censusId);

    if (!census || census.clientId !== clientId) {
      return badRequest("Choose a census upload for the demo client.");
    }

    const campaign = await createCampaign({
      clientId,
      censusId,
      surveyLabel,
      smSurveyId,
      totalRecipients: census.rowCount,
      config: parseConfig(payload),
      createdBy: actor.email,
    });

    return NextResponse.json({ campaign });
  } catch (error) {
    console.error("Failed to create campaign", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to create campaign.",
      },
      { status: 500 }
    );
  }
}
