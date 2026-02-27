export type SessionRole = "full" | "guest";

interface SessionPayload {
  role: SessionRole;
  iat: number;
  exp: number;
  identity?: string;
}

const SECRET = process.env.SESSION_SECRET || "dev-secret-key-change-in-production";
const SESSION_TTL_SEC = 7 * 24 * 60 * 60;

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
