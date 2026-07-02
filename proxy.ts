import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(req: NextRequest) {
  const url = req.nextUrl.clone();
  const { pathname } = url;

  // Bypass system routes and public assets
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/static") ||
    pathname.match(/\.(svg|png|jpg|jpeg|gif|webp|ico|css|js|woff|woff2|ttf|otf|json|pdf)$/)
  ) {
    return NextResponse.next();
  }

  const host = req.headers.get("host") || "";
  const platformDomain = process.env.NEXT_PUBLIC_PLATFORM_DOMAIN || "oracleinkpress.com";

  let subdomain = "";

  // Parse subdomain based on environment
  if (host.includes("localhost") || host.includes("127.0.0.1")) {
    const parts = host.split(":");
    const hostname = parts[0];
    const hostParts = hostname.split(".");
    
    // If hostname is e.g. "jase.localhost", hostParts will be ["jase", "localhost"]
    if (hostParts.length > 1 && hostParts[hostParts.length - 1] === "localhost") {
      subdomain = hostParts.slice(0, -1).join(".");
    }
  } else {
    // Production parsing — try matching against configured domain and common patterns
    const hostname = host.split(":")[0]; // strip port if any
    const possibleDomains = [platformDomain, "fastinvoice.shop", "oracleinkpress.com"];
    
    for (const domain of possibleDomains) {
      if (hostname.endsWith(domain) && hostname !== domain && hostname !== `www.${domain}`) {
        const prefix = hostname.substring(0, hostname.length - domain.length - 1);
        if (prefix && prefix !== "www") {
          subdomain = prefix;
          break;
        }
      }
    }
  }

  // If there's a valid subdomain, rewrite the request internally to /journal/[subdomain]/...
  if (subdomain) {
    // Prevent infinite loop if already rewritten
    if (!pathname.startsWith(`/journal/${subdomain}`)) {
      url.pathname = `/journal/${subdomain}${pathname}`;
      return NextResponse.rewrite(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
