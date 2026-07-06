import { type NextRequest, NextResponse } from "next/server";

const FIREBASE_SESSION_COOKIE_NAME = "firebase_session";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Admin uses Firebase portal auth (see src/app/admin/layout.tsx).
  if (pathname.startsWith("/admin")) {
    const firebaseSession = request.cookies.get(FIREBASE_SESSION_COOKIE_NAME)?.value;
    if (!firebaseSession) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("redirect", pathname);
      return NextResponse.redirect(url);
    }
    return NextResponse.next({ request });
  }

  if (pathname.startsWith("/auth/callback")) {
    const { updateSession } = await import("@/lib/supabase/middleware");
    try {
      const { supabaseResponse } = await updateSession(request);
      return supabaseResponse;
    } catch (error) {
      console.error("Supabase session update failed", error);
      return NextResponse.next({ request });
    }
  }

  return NextResponse.next({ request });
}

export const config = {
  matcher: ["/admin/:path*", "/auth/callback"],
};
