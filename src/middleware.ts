import { NextRequest, NextResponse } from "next/server";

const APP_ROUTE_PREFIXES = [
  "/dashboard",
  "/learn",
  "/courses",
  "/workbench",
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (APP_ROUTE_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) {
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-vibequest-path", pathname);
    return NextResponse.rewrite(new URL("/", request.url), {
      request: {
        headers: requestHeaders,
      },
    });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|images|.*\\..*).*)"],
};
