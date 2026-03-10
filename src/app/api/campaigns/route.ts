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

    let query = supabase
      .from("campaigns")
      .select("*, organization:organizations(id, name, slug)")
      .order("created_at", { ascending: false });

    if (orgId) {
      query = query.eq("org_id", orgId);
    }

    const { data: campaigns, error } = await query;

    if (error) {
      console.error("Error fetching campaigns:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ campaigns: campaigns || [] });
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
    const { name, org_id, product_module_id, description, starts_at, ends_at } = body;

    if (!name || !org_id) {
      return NextResponse.json(
        { error: "Name and organization are required" },
        { status: 400 }
      );
    }

    const { data: campaign, error } = await supabase
      .from("campaigns")
      .insert({
        name,
        org_id,
        product_module_id: product_module_id || null,
        description: description || null,
        status: "draft",
        starts_at: starts_at || null,
        ends_at: ends_at || null,
      })
      .select("*, organization:organizations(id, name, slug)")
      .single();

    if (error) {
      console.error("Error creating campaign:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ campaign }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
