import { NextRequest, NextResponse } from "next/server";
import { signSession, SESSION_TTL_SEC } from "../../../../lib/session";
import {
  validateFullUserCredentials,
  validateGuestAccess,
} from "../../../../lib/auth-credentials";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password, role } = body;

    // Validate role is either "full" or "guest"
    if (role !== "full" && role !== "guest") {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    // For "full" role, verify credentials
    if (role === "full") {
      const authResult = validateFullUserCredentials(
        username || null,
        password || null
      );
      if (!authResult.valid) {
        return NextResponse.json(
          { error: authResult.error || "Invalid credentials" },
          { status: 401 }
        );
      }

      // Sign session with optional identity
      const token = await signSession("full", authResult.identity);

      const response = NextResponse.json({ success: true });
      response.cookies.set("gwc_session", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: SESSION_TTL_SEC,
        path: "/",
      });

      return response;
    }

    // For "guest" role, no credentials needed
    if (role === "guest") {
      if (!validateGuestAccess()) {
        return NextResponse.json(
          { error: "Guest access unavailable" },
          { status: 503 }
        );
      }

      const token = await signSession("guest");

      const response = NextResponse.json({ success: true });
      response.cookies.set("gwc_session", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: SESSION_TTL_SEC,
        path: "/",
      });

      return response;
    }

    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
