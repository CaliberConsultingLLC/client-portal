import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  FIREBASE_SESSION_COOKIE_NAME,
  getFirebaseSessionDurationMs,
} from "@/lib/firebase/auth";
import { getFirebaseAdminAuth } from "@/lib/firebase/admin";

export async function POST(request: NextRequest) {
  try {
    const { idToken } = await request.json();

    if (!idToken || typeof idToken !== "string") {
      return NextResponse.json({ error: "Missing idToken" }, { status: 400 });
    }

    const expiresIn = getFirebaseSessionDurationMs();
    const sessionCookie = await getFirebaseAdminAuth().createSessionCookie(idToken, {
      expiresIn,
    });

    const cookieStore = await cookies();
    cookieStore.set(FIREBASE_SESSION_COOKIE_NAME, sessionCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: Math.floor(expiresIn / 1000),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to create Firebase session cookie", error);
    return NextResponse.json(
      { error: "Unable to create authenticated session." },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.delete(FIREBASE_SESSION_COOKIE_NAME);
  return NextResponse.json({ success: true });
}
