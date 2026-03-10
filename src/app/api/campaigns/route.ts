import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  // TODO: Verify admin auth
  // TODO: Fetch campaigns with related org/survey data
  return NextResponse.json({ campaigns: [] });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // TODO: Verify admin auth
    // TODO: Validate input
    // TODO: Create campaign in Supabase
    // TODO: Optionally create SurveyMonkey survey

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
