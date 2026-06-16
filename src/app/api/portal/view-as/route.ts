import { NextRequest, NextResponse } from "next/server";
import {
  PORTAL_VIEW_AS_COOKIE_NAME,
  getOptionalFirebaseUser,
  isSuperAdmin,
} from "@/lib/firebase/auth";
import { getPortalClientById } from "@/lib/portal/clients";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const user = await getOptionalFirebaseUser();

  // Authorize against the *real* role so the toggle still works while previewing.
  if (!user || !isSuperAdmin(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { enabled?: boolean; clientId?: string } = {};
  try {
    body = await req.json();
  } catch {
    // Empty body -> treat as a plain toggle off.
  }

  const response = NextResponse.json({ ok: true });

  if (body.enabled) {
    const clientId = String(body.clientId ?? "").trim();

    // Only allow previewing as a known portal client.
    if (!getPortalClientById(clientId)) {
      return NextResponse.json({ error: "Unknown client" }, { status: 400 });
    }

    response.cookies.set(PORTAL_VIEW_AS_COOKIE_NAME, clientId, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 8,
    });
  } else {
    // Explicitly expire on the same cookie scope used when setting.
    response.cookies.set(PORTAL_VIEW_AS_COOKIE_NAME, "", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 0,
    });
  }

  return response;
}
