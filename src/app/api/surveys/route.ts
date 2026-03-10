import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  // TODO: Verify auth (admin or client scoped)
  // TODO: Fetch surveys, optionally filtered by org_id
  return NextResponse.json({ surveys: [] });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // TODO: Verify admin auth
    // TODO: Create survey config in Supabase
    // TODO: Link to SurveyMonkey survey ID

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
