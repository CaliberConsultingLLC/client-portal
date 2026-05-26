import { NextRequest, NextResponse } from "next/server";
import { getOptionalFirebaseUser } from "@/lib/firebase/auth";
import { getCampaignById, updateCampaignConfig } from "@/lib/firebase/campaign-store";

const CAMPAIGN_ADMIN_EMAIL = "dustin@caliberconsultingllc.org";

interface CampaignConfigRouteContext {
  params: Promise<{
    campaignId: string;
  }>;
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

export async function PATCH(request: NextRequest, { params }: CampaignConfigRouteContext) {
  try {
    const actor = await getOptionalFirebaseUser();

    if (!actor) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (actor.email !== CAMPAIGN_ADMIN_EMAIL) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { campaignId } = await params;
    const campaign = await getCampaignById(campaignId);

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found." }, { status: 404 });
    }

    if (campaign.clientId !== "demo") {
      return NextResponse.json(
        { error: "Campaign automation is only enabled for the demo client." },
        { status: 400 }
      );
    }

    const payload = await request.json() as Record<string, unknown>;
    const updatedCampaign = await updateCampaignConfig(campaignId, parseConfig(payload), actor.email);

    return NextResponse.json({ campaign: updatedCampaign });
  } catch (error) {
    console.error("Failed to update campaign config", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to update campaign config.",
      },
      { status: 500 }
    );
  }
}
