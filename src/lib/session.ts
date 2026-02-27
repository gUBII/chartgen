import { createHmac } from "crypto";

export type SessionRole = "full" | "guest";

interface SessionPayload {
  role: SessionRole;
  iat: number; // issued at
}

const SECRET = process.env.SESSION_SECRET || "dev-secret-key-change-in-production";

/**
 * Sign a session token using HMAC
 */
export function signSession(role: SessionRole): string {
  const payload: SessionPayload = {
    role,
    iat: Math.floor(Date.now() / 1000),
  };

  const payloadStr = JSON.stringify(payload);
  const payloadB64 = Buffer.from(payloadStr).toString("base64url");

  const signature = createHmac("sha256", SECRET)
    .update(payloadB64)
    .digest("base64url");

  return `${payloadB64}.${signature}`;
}

/**
 * Verify a session token and return the payload
 */
export function verifySession(token: string): SessionPayload | null {
  try {
    const [payloadB64, signature] = token.split(".");

    if (!payloadB64 || !signature) {
      return null;
    }

    // Verify signature
    const expectedSignature = createHmac("sha256", SECRET)
      .update(payloadB64)
      .digest("base64url");

    if (signature !== expectedSignature) {
      return null;
    }

    // Decode payload
    const payloadStr = Buffer.from(payloadB64, "base64url").toString("utf-8");
    const payload = JSON.parse(payloadStr) as SessionPayload;

    return payload;
  } catch {
    return null;
  }
}
