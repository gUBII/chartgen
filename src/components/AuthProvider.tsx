"use client";

import { ReactNode, createContext, useContext, useState, useEffect, useCallback } from "react";

interface AuthContextValue {
  role: "full" | "guest" | null;
  isRoleResolved: boolean;
  refreshRole: () => Promise<void>;
  applyRole: (nextRole: "full" | "guest" | null) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/**
 * Extract role from session cookie synchronously (for hydration).
 * This avoids a brief "null" state flash on first paint.
 */
function extractRoleFromCookie(): "full" | "guest" | null {
  try {
    const cookies = document.cookie.split(";");
    const sessionCookie = cookies.find((c) => c.trim().startsWith("session="));
    if (!sessionCookie) return null;

    const token = sessionCookie.split("=")[1];
    if (!token) return null;

    // Decode the payload (first part before the dot, no signature verification needed yet)
    const [payloadB64] = token.split(".");
    if (!payloadB64) return null;

    // Decode base64url to string
    const padded = payloadB64.replace(/-/g, "+").replace(/_/g, "/");
    const mod = padded.length % 4;
    const withPadding = mod === 0 ? padded : padded + "=".repeat(4 - mod);
    const payloadStr = atob(withPadding);
    const payload = JSON.parse(payloadStr) as { role?: string };

    if (payload.role === "full" || payload.role === "guest") {
      return payload.role;
    }
    return null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  // Initialize both role and isRoleResolved from the cookie during hydration.
  const [role, setRole] = useState<"full" | "guest" | null>(() =>
    extractRoleFromCookie()
  );
  const [isRoleResolved, setIsRoleResolved] = useState(() => {
    // Mark as resolved if we successfully extracted a role from the cookie.
    return extractRoleFromCookie() !== null;
  });

  const refreshRole = useCallback(async () => {
    try {
      const response = await fetch("/api/auth/check", {
        method: "GET",
        cache: "no-store",
        credentials: "same-origin",
      });
      if (response.ok) {
        const data = await response.json();
        setRole(data.role);
      } else {
        setRole(null);
      }
      setIsRoleResolved(true);
    } catch (error) {
      console.error("Failed to check auth role:", error);
      setRole(null);
      setIsRoleResolved(true);
    }
  }, []);

  useEffect(() => {
    // Verify the token and update state if needed.
    // No setState in effect body: state is already initialized from cookie during hydration.
    void refreshRole();
    // Empty dependency array: only run once on mount to avoid infinite loops.
    // refreshRole is memoized with useCallback([]), so it's safe here.
  }, [refreshRole]);

  const applyRole = (nextRole: "full" | "guest" | null) => {
    setRole(nextRole);
    setIsRoleResolved(true);
  };

  return <AuthContext.Provider value={{ role, isRoleResolved, refreshRole, applyRole }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
