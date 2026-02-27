'use node';

import { NextRequest, NextResponse } from "next/server";
import { verifySession } from "./src/lib/session";

// Routes that don't require authentication
const publicRoutes = ["/login", "/_next", "/api/auth"];
const staticRoutes = [
  "/favicon.ico",
  "/gubii-profile.png",
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".svg",
  ".webp",
];

// Routes that only allow guests to preview (read-only)
const guestPreviewRoutes = ["/mar", "/mealtime-chartgen"];

// Routes that require authentication
const protectedRoutes = ["/restoration", "/kpigen", "/uat"];

// API routes that require authentication for write operations
const apiWriteRoutes = [
  "PATCH /api/engine/preview",
  "PATCH /api/engine/mar-preview",
  "POST /api/engine/commit",
];

export function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;
  const method = request.method;

  // Allow public routes and static files
  if (
    publicRoutes.some((route) => pathname.startsWith(route)) ||
    staticRoutes.some((route) => pathname.includes(route))
  ) {
    return NextResponse.next();
  }

  // Get session cookie
  const sessionCookie = request.cookies.get("gwc_session");
  let sessionRole: "full" | "guest" | null = null;

  if (sessionCookie) {
    const session = verifySession(sessionCookie.value);
    if (session) {
      sessionRole = session.role;
    }
  }

  // No session at all - redirect to login
  if (!sessionRole) {
    // Allow guest preview routes for reading
    if (
      guestPreviewRoutes.includes(pathname) &&
      method === "GET"
    ) {
      // Set guest role for this request
      const response = NextResponse.next();
      response.headers.set("x-user-role", "guest");
      return response;
    }

    // Allow POST preview/export APIs for guests
    if (
      (pathname === "/api/engine/preview" ||
        pathname === "/api/engine/mar-preview" ||
        pathname === "/api/engine/export-pdf") &&
      method === "POST"
    ) {
      const response = NextResponse.next();
      response.headers.set("x-user-role", "guest");
      return response;
    }

    // All other routes: redirect to login
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Session exists
  if (sessionRole === "guest") {
    // Guests can only access preview routes (GET)
    if (guestPreviewRoutes.includes(pathname) && method === "GET") {
      const response = NextResponse.next();
      response.headers.set("x-user-role", "guest");
      return response;
    }

    // Guests can use POST preview/export APIs
    if (
      (pathname === "/api/engine/preview" ||
        pathname === "/api/engine/mar-preview" ||
        pathname === "/api/engine/export-pdf") &&
      method === "POST"
    ) {
      const response = NextResponse.next();
      response.headers.set("x-user-role", "guest");
      return response;
    }

    // Guests cannot write or access protected routes
    if (
      protectedRoutes.some((route) => pathname.startsWith(route)) ||
      (pathname.startsWith("/api/engine/") &&
        (method === "PATCH" || method === "POST") &&
        pathname !== "/api/engine/preview" &&
        pathname !== "/api/engine/mar-preview" &&
        pathname !== "/api/engine/export-pdf")
    ) {
      // For API routes, return 401
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      // For page routes, redirect to login
      return NextResponse.redirect(new URL("/login", request.url));
    }

    // Set guest header
    const response = NextResponse.next();
    response.headers.set("x-user-role", "guest");
    return response;
  }

  // sessionRole === "full" - allow all access
  const response = NextResponse.next();
  response.headers.set("x-user-role", "full");
  return response;
}

// Configure which routes use middleware
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
