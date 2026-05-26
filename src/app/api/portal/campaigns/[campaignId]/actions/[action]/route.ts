import { NextRequest, NextResponse } from "next/server";
import { getOptionalFirebaseUser } from "@/lib/firebase/auth";
import {
  closeCampaign,
  launchCampaign,
  pauseCampaign,
  resumeCampaign,
  sendCampaignReminder,
  syncCampaignResponses,
} from "@/lib/firebase/campaign-store";

const CAMPAIGN_ADMIN_EMAIL = "dustin@caliberconsultingllc.org";

interface CampaignActionRouteContext {
  params: Promise<{
    campaignId: string;
    action: string;
  }>;
}

export async function POST(request: NextRequest, { params }: CampaignActionRouteContext) {
  try {
    const actor = await getOptionalFirebaseUser();

    if (!actor) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (actor.email !== CAMPAIGN_ADMIN_EMAIL) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { campaignId, action } = await params;
    const body = await request.json().catch(() => ({})) as Record<string, unknown>;
    const actionActor = { email: actor.email };
    let result: unknown;

    switch (action) {
      case "launch":
        result = await launchCampaign(campaignId, actionActor);
        break;
      case "sync":
        result = await syncCampaignResponses(campaignId, actionActor);
        break;
      case "reminder":
        result = await sendCampaignReminder(
          campaignId,
          body.channel === "email" || body.channel === "text" || body.channel === "all"
            ? body.channel
            : "all",
          actionActor
        );
        break;
      case "close":
        result = await closeCampaign(campaignId, actionActor);
        break;
      case "pause":
        result = await pauseCampaign(campaignId, actionActor);
        break;
      case "resume":
        result = await resumeCampaign(campaignId, actionActor);
        break;
      default:
        return NextResponse.json({ error: "Unknown campaign action." }, { status: 404 });
    }

    return NextResponse.json({ result });
  } catch (error) {
    console.error("Failed to run campaign action", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to run campaign action.",
      },
      { status: 500 }
    );
  }
}
