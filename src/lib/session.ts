export type SessionRole = "full" | "guest";

interface SessionPayload {
  role: SessionRole;
  iat: number;
  exp: number;
  identity?: string;
}

const SECRET = process.env.SESSION_SECRET || "dev-secret-key-change-in-production";
const DEFAULT_SESSION_TTL_SEC = 7 * 24 * 60 * 60;

function resolveSessionTtlSec(raw: string | undefined): number {
  if (!raw) return DEFAULT_SESSION_TTL_SEC;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_SESSION_TTL_SEC;
  }
  return parsed;
}

export const SESSION_TTL_SEC = resolveSessionTtlSec(process.env.SESSION_TTL_SEC);

const encoder = new TextEncoder();

function encodeBase64(bytes: Uint8Array): string {
  if (typeof btoa === "function") {
    let binary = "";
    for (const byte of bytes) {
      binary += String.fromCharCode(byte);
    }
    return btoa(binary);
  }
  return Buffer.from(bytes).toString("base64");
}

function decodeBase64(base64: string): Uint8Array {
  if (typeof atob === "function") {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }
  return new Uint8Array(Buffer.from(base64, "base64"));
}

function toBase64Url(bytes: Uint8Array): string {
  return encodeBase64(bytes)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function fromBase64Url(base64Url: string): Uint8Array {
  const padded = base64Url.replace(/-/g, "+").replace(/_/g, "/");
  const mod = padded.length % 4;
  const withPadding = mod === 0 ? padded : padded + "=".repeat(4 - mod);
  return decodeBase64(withPadding);
}

function bytesToArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;
}

async function importSigningKey() {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

/**
 * Helper: Extract session cookie with parity support.
 * Reads 'gwc_session' first (new), falls back to 'session' (legacy).
 * Used across check/ops/middleware routes for consistent cookie handling.
 */
export function getSessionCookie(cookies: {
  get: (name: string) => { value: string } | undefined;
}): { value: string } | undefined {
  return cookies.get("gwc_session") || cookies.get("session");
}

/**
 * Fallback parser for environments where `request.cookies` may omit custom cookies.
 * Returns the raw session token from Cookie header for `gwc_session` or legacy `session`.
 */
export function getSessionTokenFromCookieHeader(cookieHeader: string | null | undefined): string | null {
  if (!cookieHeader) return null;

  const segments = cookieHeader.split(";");
  for (const segment of segments) {
    const trimmed = segment.trim();
    if (!trimmed) continue;
    const separator = trimmed.indexOf("=");
    if (separator === -1) continue;

    const name = trimmed.slice(0, separator).trim();
    if (name !== "gwc_session" && name !== "session") continue;

    const rawValue = trimmed.slice(separator + 1).trim();
    if (!rawValue) continue;

    try {
      return decodeURIComponent(rawValue);
    } catch {
      return rawValue;
    }
  }

  return null;
}

/**
 * Unified session token extraction with cookie-parser fallback.
 * Prefer structured `request.cookies`, then fallback to raw Cookie header parsing.
 */
export function getSessionTokenFromRequest(request: {
  cookies: { get: (name: string) => { value: string } | undefined };
  headers: { get: (name: string) => string | null };
}): string | null {
  const cookie = getSessionCookie(request.cookies);
  if (cookie?.value) {
    return cookie.value;
  }

  return getSessionTokenFromCookieHeader(request.headers.get("cookie"));
}

/**
 * Sign a session token using HMAC
 */
export async function signSession(role: SessionRole, identity?: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const payload: SessionPayload = {
    role,
    iat: now,
    exp: now + SESSION_TTL_SEC,
    ...(identity && { identity }),
  };

  const payloadBytes = encoder.encode(JSON.stringify(payload));
  const payloadB64 = toBase64Url(payloadBytes);
  const key = await importSigningKey();
  const signatureBuffer = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(payloadB64),
  );
  const signatureB64 = toBase64Url(new Uint8Array(signatureBuffer));

  return `${payloadB64}.${signatureB64}`;
}

/**
 * Verify a session token and return the payload
 */
export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const [payloadB64, signature] = token.split(".");

    if (!payloadB64 || !signature) {
      return null;
    }

    const key = await importSigningKey();
    const signatureBytes = fromBase64Url(signature);
    const isValidSignature = await crypto.subtle.verify(
      "HMAC",
      key,
      bytesToArrayBuffer(signatureBytes),
      encoder.encode(payloadB64),
    );

    if (!isValidSignature) {
      return null;
    }

    const payloadStr = new TextDecoder().decode(fromBase64Url(payloadB64));
    const payload = JSON.parse(payloadStr) as SessionPayload;

    if (payload.role !== "full" && payload.role !== "guest") {
      return null;
    }

    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}
