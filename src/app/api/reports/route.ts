import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  // TODO: Verify auth
  // TODO: Fetch reports (admin sees all, client sees shared only via RLS)
  return NextResponse.json({ reports: [] });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // TODO: Verify admin auth
    // TODO: Create report config in Supabase

    return NextResponse.json(
      { error: "Not implemented" },
      { status: 501 }
    );
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
