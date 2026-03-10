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
      .from("surveys")
      .select("*, campaign:campaigns(id, name, org_id, organization:organizations(id, name))")
      .order("created_at", { ascending: false });

    if (campaignId) {
      query = query.eq("campaign_id", campaignId);
    }

    const { data: surveys, error } = await query;

    if (error) {
      console.error("Error fetching surveys:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ surveys: surveys || [] });
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
    const { title, campaign_id, surveymonkey_id } = body;

    if (!title || !campaign_id) {
      return NextResponse.json(
        { error: "Title and campaign are required" },
        { status: 400 }
      );
    }

    const { data: survey, error } = await supabase
      .from("surveys")
      .insert({
        title,
        campaign_id,
        surveymonkey_id: surveymonkey_id || null,
        status: "draft",
        response_count: 0,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating survey:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ survey }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
