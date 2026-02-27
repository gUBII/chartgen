/**
 * Auth credentials validation helper
 * Supports both legacy SITE_PASSWORD and new username+password auth
 */

interface Credential {
  username: string;
  password: string;
}

/**
 * Parse credentials from env var
 * Format: JSON array of {username, password} objects
 * or newline-delimited format (username:password per line)
 */
function parseCredentials(credentialString: string): Map<string, string> {
  const map = new Map<string, string>();

  try {
    // Try JSON format first
    if (credentialString.trim().startsWith("[")) {
      const creds: Credential[] = JSON.parse(credentialString);
      for (const cred of creds) {
        if (cred.username && cred.password) {
          map.set(cred.username, cred.password);
        }
      }
      return map;
    }
  } catch {
    // Not JSON, try line-delimited format
  }

  // Line-delimited format: username:password per line
  const lines = credentialString.split("\n").filter((line) => line.trim());
  for (const line of lines) {
    const [username, password] = line.split(":").map((s) => s.trim());
    if (username && password) {
      map.set(username, password);
    }
  }

  return map;
}

export interface AuthResult {
  valid: boolean;
  identity?: string;
  error?: string;
}

/**
 * Validate full user credentials
 * Supports both username+password and legacy SITE_PASSWORD
 * Returns {valid: true, identity: username} for username+password auth
 * Returns {valid: true} for legacy SITE_PASSWORD auth (no identity)
 * Returns {valid: false, error: reason} for failed auth
 */
export function validateFullUserCredentials(
  username: string | null,
  password: string | null
): AuthResult {
  if (!password) {
    return { valid: false, error: "Password required" };
  }

  // Try username+password auth first
  if (username) {
    const credentialString = process.env.FULL_USER_CREDENTIALS;
    if (credentialString) {
      const credentials = parseCredentials(credentialString);
      if (credentials.has(username) && credentials.get(username) === password) {
        return { valid: true, identity: username };
      }
    }
    return { valid: false, error: "Invalid username or password" };
  }

  // Fall back to legacy SITE_PASSWORD (no username provided)
  const sitePassword = process.env.SITE_PASSWORD;
  if (sitePassword && password === sitePassword) {
    return { valid: true }; // No identity for legacy password auth
  }

  return { valid: false, error: "Invalid password" };
}

/**
 * Validate guest access (no credentials required)
 */
export function validateGuestAccess(): boolean {
  return true;
}
