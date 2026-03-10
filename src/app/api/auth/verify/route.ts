import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { token } = await req.json();

    if (!token) {
      return NextResponse.json(
        { error: "Token is required" },
        { status: 400 }
      );
    }

    // TODO: Look up token in magic_link_tokens
    // TODO: Verify not expired (48hr) and not used
    // TODO: Mark token as used
    // TODO: Create or sign in Supabase user
    // TODO: Set session cookie

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
