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
    const campaignId = searchParams.get("campaign_id");

    let query = supabase
      .from("reports")
      .select("*, campaign:campaigns(id, name, org_id, organization:organizations(id, name))")
      .order("created_at", { ascending: false });

    if (campaignId) {
      query = query.eq("campaign_id", campaignId);
    }

    const { data: reports, error } = await query;

    if (error) {
      console.error("Error fetching reports:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ reports: reports || [] });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { title, campaign_id, config } = body;

    if (!title || !campaign_id) {
      return NextResponse.json(
        { error: "Title and campaign are required" },
        { status: 400 }
      );
    }

    const { data: report, error } = await supabase
      .from("reports")
      .insert({
        title,
        campaign_id,
        status: "draft",
        config: config || {},
      })
      .select("*, campaign:campaigns(id, name, org_id)")
      .single();

    if (error) {
      console.error("Error creating report:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ report }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
