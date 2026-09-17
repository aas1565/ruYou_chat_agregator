import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const COOKIE_NAME = "ruyou_session";

export function middleware(request: NextRequest) {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  const { pathname } = request.nextUrl;
  const isLogin = pathname === "/login";
  const isPublicAsset = pathname.startsWith("/_next") || pathname.startsWith("/favicon");

  if (isPublicAsset) return NextResponse.next();

  // Stale cookie after db seed/reset: clear and stay on login (avoids redirect loop)
  if (isLogin) {
    if (request.nextUrl.searchParams.get("expired") === "1" && token) {
      const response = NextResponse.redirect(new URL("/login", request.url));
      response.cookies.delete(COOKIE_NAME);
      return response;
    }
    return NextResponse.next();
  }

  if (!token && !pathname.startsWith("/api")) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
