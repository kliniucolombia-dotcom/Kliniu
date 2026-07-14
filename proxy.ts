import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const hasSession = request.cookies.has("kliniu_session");
  const { pathname } = request.nextUrl;

  if (
    (pathname.startsWith("/mi-cuenta") || pathname.startsWith("/panel") || pathname.startsWith("/empaque") || pathname.startsWith("/admin") || pathname.startsWith("/empleado")) &&
    !hasSession
  ) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if ((pathname.startsWith("/login") || pathname.startsWith("/registro")) && hasSession) {
    return NextResponse.redirect(new URL("/mi-cuenta", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/mi-cuenta/:path*", "/panel/:path*", "/empaque/:path*", "/admin/:path*", "/empleado/:path*", "/login", "/registro"],
};
