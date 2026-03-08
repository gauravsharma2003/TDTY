import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/data")) {
    return new NextResponse(
      JSON.stringify({ error: "Forbidden" }),
      {
        status: 403,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/data/:path*"],
};
