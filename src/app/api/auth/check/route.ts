import { NextRequest, NextResponse } from "next/server";
import { verifySession, getSessionCookie } from "../../../../lib/session";

export async function GET(request: NextRequest) {
  const sessionCookie = getSessionCookie(request.cookies);

  if (!sessionCookie) {
    return NextResponse.json({ role: null }, { status: 401 });
  }

  const session = await verifySession(sessionCookie.value);

  if (!session) {
    return NextResponse.json({ role: null }, { status: 401 });
  }

  return NextResponse.json({ role: session.role });
}
