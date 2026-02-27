import { NextRequest, NextResponse } from "next/server";
import { verifySession, getSessionTokenFromRequest } from "../../../../lib/session";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const debugMode = searchParams.get("debug") === "1";
  const rawCookieHeader = request.headers.get("cookie");
  const sessionToken = getSessionTokenFromRequest(request);
  const cookieParserToken = request.cookies.get("gwc_session")?.value ?? null;

  let unverifiedRole: string | null = null;
  if (sessionToken) {
    try {
      const [payloadB64] = sessionToken.split(".");
      if (payloadB64) {
        const padded = payloadB64.replace(/-/g, "+").replace(/_/g, "/");
        const mod = padded.length % 4;
        const withPadding = mod === 0 ? padded : padded + "=".repeat(4 - mod);
        const payloadStr = atob(withPadding);
        const payload = JSON.parse(payloadStr) as { role?: string };
        unverifiedRole = typeof payload.role === "string" ? payload.role : null;
      }
    } catch {
      unverifiedRole = null;
    }
  }

  console.info("[auth/check] token diagnostics", {
    hasRawCookieHeader: Boolean(rawCookieHeader),
    hasParserCookie: Boolean(cookieParserToken),
    hasSessionToken: Boolean(sessionToken),
    tokenLength: sessionToken?.length ?? 0,
    unverifiedRole,
  });

  if (debugMode) {
    return NextResponse.json({
      role: null,
      debug: {
        hasRawCookieHeader: Boolean(rawCookieHeader),
        hasParserCookie: Boolean(cookieParserToken),
        hasSessionToken: Boolean(sessionToken),
        tokenLength: sessionToken?.length ?? 0,
        unverifiedRole,
      },
    });
  }

  if (!sessionToken) {
    return NextResponse.json({ role: null }, { status: 401 });
  }

  const session = await verifySession(sessionToken);
  console.info("[auth/check] verify result", {
    verified: Boolean(session),
    role: session?.role ?? null,
  });

  if (!session) {
    return NextResponse.json({ role: null }, { status: 401 });
  }

  return NextResponse.json({ role: session.role });
}
