import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const BLOCKED_UAS = [
  "curl", "wget", "python-requests", "scrapy", "httpie",
  "postman", "insomnia", "node-fetch", "axios", "got/",
  "php/", "java/", "ruby", "perl", "libwww",
];

const ALLOWED_BOTS = ["googlebot", "bingbot", "yandexbot", "duckduckbot", "slurp"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/data")) {
    return new NextResponse(
      JSON.stringify({ error: "Forbidden" }),
      { status: 403, headers: { "Content-Type": "application/json" } }
    );
  }

  if (pathname.startsWith("/on-this-day")) {
    const ua = (request.headers.get("user-agent") || "").toLowerCase();
    const isAllowedBot = ALLOWED_BOTS.some((bot) => ua.includes(bot));
    if (!isAllowedBot) {
      const isBlockedScraper = BLOCKED_UAS.some((b) => ua.includes(b));
      if (isBlockedScraper) {
        return new NextResponse(
          "<html><body><h1>Please enable JavaScript</h1><p>This page requires a modern browser.</p></body></html>",
          { status: 403, headers: { "Content-Type": "text/html" } }
        );
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/data/:path*", "/on-this-day/:path*"],
};
