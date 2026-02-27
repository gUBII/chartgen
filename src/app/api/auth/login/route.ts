import { NextRequest, NextResponse } from "next/server";
import { signSession } from "../../../../lib/session";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { password, role } = body;

    // Validate role is either "full" or "guest"
    if (role !== "full" && role !== "guest") {
      return NextResponse.json(
        { error: "Invalid role" },
        { status: 400 }
      );
    }

    // For "full" role, verify password
    if (role === "full") {
      const sitePassword = process.env.SITE_PASSWORD;
      if (!sitePassword) {
        return NextResponse.json(
          { error: "SITE_PASSWORD is not configured" },
          { status: 503 }
        );
      }

      if (!password || password !== sitePassword) {
        return NextResponse.json(
          { error: "Invalid password" },
          { status: 401 }
        );
      }
    }

    // Sign the session token
    const token = await signSession(role);

    // Create response with redirect
    const response = NextResponse.json({ success: true });

    // Set httpOnly, secure cookie with 7-day expiration
    response.cookies.set("gwc_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
