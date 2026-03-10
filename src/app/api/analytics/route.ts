import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const orgId = searchParams.get("org_id");
    const campaignId = searchParams.get("campaign_id");
    const dimension = searchParams.get("dimension");

    let query = supabase
      .from("aggregated_metrics")
      .select("*")
      .order("computed_at", { ascending: false });

    if (orgId) {
      query = query.eq("org_id", orgId);
    }
    if (campaignId) {
      query = query.eq("campaign_id", campaignId);
    }
    if (dimension) {
      query = query.eq("dimension", dimension);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching analytics:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: data || [] });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
