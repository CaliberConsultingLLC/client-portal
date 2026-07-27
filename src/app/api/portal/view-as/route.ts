import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  PORTAL_VIEW_AS_COOKIE_NAME,
  getActualRole,
  getOptionalFirebaseUser,
  isInternalFirebaseRole,
} from "@/lib/firebase/auth";
import { getFirebaseUserDoc } from "@/lib/firebase/user-store";

export const runtime = "nodejs";

async function resolveAuthorizedActor() {
  const user = await getOptionalFirebaseUser();

  // Authorize against the *real* role so the toggle still works while previewing.
  if (!user || !isInternalFirebaseRole(getActualRole(user))) {
    return null;
  }
  return user;
}

async function applyViewAsCookie(uid: string) {
  const cookieStore = await cookies();
  cookieStore.set(PORTAL_VIEW_AS_COOKIE_NAME, uid, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
}

async function clearViewAsCookie() {
  const cookieStore = await cookies();
  cookieStore.set(PORTAL_VIEW_AS_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

export async function GET(req: NextRequest) {
  const actor = await resolveAuthorizedActor();
  if (!actor) {
    const blockedUrl = new URL("/portal", req.url);
    blockedUrl.searchParams.set("viewAsError", "forbidden");
    return NextResponse.redirect(blockedUrl);
  }

  const uid = req.nextUrl.searchParams.get("uid")?.trim() ?? "";
  const nextPath = req.nextUrl.searchParams.get("next")?.trim() || "/portal";
  const nextUrl = new URL(nextPath.startsWith("/") ? nextPath : "/portal", req.url);
  if (uid) {
    const targetUser = await getFirebaseUserDoc(uid);
    if (!targetUser || !targetUser.isActive) {
      const errorUrl = new URL("/portal", req.url);
      errorUrl.searchParams.set("viewAsError", "unknown-user");
      return NextResponse.redirect(errorUrl);
    }
    const response = NextResponse.redirect(nextUrl);
    response.headers.set("Cache-Control", "no-store");
    response.cookies.set(PORTAL_VIEW_AS_COOKIE_NAME, uid, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 8,
    });
    await applyViewAsCookie(uid);
    return response;
  }

  const response = NextResponse.redirect(nextUrl);
  response.headers.set("Cache-Control", "no-store");
  response.cookies.set(PORTAL_VIEW_AS_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  await clearViewAsCookie();
  return response;
}

export async function POST(req: NextRequest) {
  const actor = await resolveAuthorizedActor();
  if (!actor) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { enabled?: boolean; uid?: string } = {};
  try {
    body = await req.json();
  } catch {
    // Empty body -> treat as a plain toggle off.
  }

  if (body.enabled) {
    const uid = String(body.uid ?? "").trim();

    const targetUser = await getFirebaseUserDoc(uid);
    if (!targetUser || !targetUser.isActive) {
      return NextResponse.json({ error: "Unknown user" }, { status: 400 });
    }

    await applyViewAsCookie(uid);
  } else {
    await clearViewAsCookie();
  }

  return NextResponse.json({ ok: true });
}
