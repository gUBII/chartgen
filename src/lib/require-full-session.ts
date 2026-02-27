import { NextRequest } from "next/server";
import { getSessionTokenFromRequest, verifySession } from "./session";

export async function requireFullSession(request: NextRequest): Promise<boolean> {
  const sessionToken = getSessionTokenFromRequest(request);
  if (!sessionToken) return false;
  const session = await verifySession(sessionToken);
  return session?.role === "full";
}
