import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Block direct access to data files
  if (pathname.startsWith("/data")) {
    return new NextResponse(
      JSON.stringify({ error: "Forbidden" }),
      {
        status: 403,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  const response = NextResponse.next();

  // Anti-scraping and security headers
  response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set(
    "Content-Security-Policy",
    "frame-ancestors 'none'"
  );

  return response;
}

export const config = {
  matcher: ["/data/:path*", "/"],
};
