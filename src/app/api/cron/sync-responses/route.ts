import { NextRequest, NextResponse } from "next/server";
import {
  listActiveCampaignsForSync,
  syncCampaignResponses,
} from "@/lib/firebase/campaign-store";

// Response sync hits SurveyMonkey + Firestore; keep it on the Node runtime
// and give it room to walk every active campaign.
export const runtime = "nodejs";
export const maxDuration = 60;

const CRON_ACTOR = { email: "cron@northstar.system" } as const;

function isAuthorized(req: NextRequest) {
  // Vercel Cron sends `Authorization: Bearer <CRON_SECRET>` automatically
  // when CRON_SECRET is set in the project environment.
  const secret = process.env.CRON_SECRET;

  if (!secret) {
    // No secret configured -> only allow Vercel's internal cron invocations.
    return req.headers.get("x-vercel-cron") === "1";
  }

  const auth = req.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startedAt = new Date().toISOString();
  const campaigns = await listActiveCampaignsForSync();

  const results: Array<{
    campaignId: string;
    clientId: string;
    ok: boolean;
    dryRun?: boolean;
    responseRate?: number;
    respondedCount?: number;
    newResponses?: number;
    error?: string;
  }> = [];

  for (const campaign of campaigns) {
    try {
      // syncCampaignResponses returns a union (dry-run vs live); read the
      // live-only fields defensively so this stays type-safe either way.
      const result: {
        dryRun: boolean;
        newResponses: number;
        responseRate?: number;
        respondedCount?: number;
      } = await syncCampaignResponses(campaign.id, CRON_ACTOR);
      results.push({
        campaignId: campaign.id,
        clientId: campaign.clientId,
        ok: true,
        dryRun: result.dryRun,
        responseRate: result.responseRate,
        respondedCount: result.respondedCount,
        newResponses: result.newResponses,
      });
    } catch (error) {
      // One bad campaign (e.g. a client not yet enabled for automation, or a
      // transient SurveyMonkey error) must not abort the whole nightly run.
      results.push({
        campaignId: campaign.id,
        clientId: campaign.clientId,
        ok: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  const synced = results.filter((entry) => entry.ok).length;

  return NextResponse.json({
    startedAt,
    finishedAt: new Date().toISOString(),
    campaignsScanned: campaigns.length,
    campaignsSynced: synced,
    results,
  });
}
