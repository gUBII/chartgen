import { NextRequest } from "next/server";
import { getSessionCookie, verifySession } from "./session";

export async function requireFullSession(request: NextRequest): Promise<boolean> {
  const sessionCookie = getSessionCookie(request.cookies);
  if (!sessionCookie?.value) return false;
  const session = await verifySession(sessionCookie.value);
  return session?.role === "full";
}
