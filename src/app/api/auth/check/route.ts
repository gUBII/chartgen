import { NextRequest, NextResponse } from "next/server";
import { verifySession } from "../../../../lib/session";

export async function GET(request: NextRequest) {
  const sessionCookie = request.cookies.get("gwc_session");

  if (!sessionCookie) {
    return NextResponse.json({ role: null }, { status: 401 });
  }

  const session = await verifySession(sessionCookie.value);

  if (!session) {
    return NextResponse.json({ role: null }, { status: 401 });
  }

  return NextResponse.json({ role: session.role });
}
