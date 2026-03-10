import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  const { supabaseResponse, user } = await updateSession(request);
  const { pathname } = request.nextUrl;

  // Protect admin routes — require authenticated user
  if (pathname.startsWith("/admin")) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = "/sign-in";
      url.searchParams.set("redirect", pathname);
      return NextResponse.redirect(url);
    }
  }

  // Protect portal routes — require authenticated user
  if (pathname.startsWith("/portal")) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = "/magic-link";
      url.searchParams.set("expired", "true");
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    // Run middleware on admin and portal routes, plus auth callback
    "/admin/:path*",
    "/portal/:path*",
    "/auth/callback",
  ],
};
