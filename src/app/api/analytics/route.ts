import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const orgId = searchParams.get("org_id");
  const campaignId = searchParams.get("campaign_id");
  const metric = searchParams.get("metric");

  // TODO: Verify auth
  // TODO: Query aggregated_metrics based on filters
  // TODO: Support metric types: trait_scores, dimension_averages, trends, benchmarks

  return NextResponse.json({ data: [] });
}
