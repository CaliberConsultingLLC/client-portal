import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  // TODO: Verify admin auth
  // TODO: Fetch organizations from Supabase
  return NextResponse.json({ clients: [] });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // TODO: Verify admin auth
    // TODO: Validate input
    // TODO: Insert organization into Supabase
    // TODO: Return created organization

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
