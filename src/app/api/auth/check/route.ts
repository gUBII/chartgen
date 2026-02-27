import { NextRequest, NextResponse } from "next/server";
import { verifySession, getSessionTokenFromRequest } from "../../../../lib/session";

export async function GET(request: NextRequest) {
  const sessionToken = getSessionTokenFromRequest(request);

  if (!sessionToken) {
    return NextResponse.json({ role: null }, { status: 401 });
  }

  const session = await verifySession(sessionToken);

  if (!session) {
    return NextResponse.json({ role: null }, { status: 401 });
  }

  return NextResponse.json({ role: session.role });
}
