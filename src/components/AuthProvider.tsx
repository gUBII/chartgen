"use client";

import { ReactNode, createContext, useContext, useState, useEffect, useCallback } from "react";

interface AuthContextValue {
  role: "full" | "guest" | null;
  isRoleResolved: boolean;
  refreshRole: () => Promise<void>;
  applyRole: (nextRole: "full" | "guest" | null) => void;
}

type AuthState = {
  role: "full" | "guest" | null;
  isRoleResolved: boolean;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/**
 * Extract role from session cookie synchronously (for hydration).
 * This avoids a brief "null" state flash on first paint.
 */
function extractRoleFromCookie(): "full" | "guest" | null {
  try {
    const cookies = document.cookie.split(";");
    const sessionCookie = cookies.find((cookie) => {
      const trimmed = cookie.trim();
      return trimmed.startsWith("gwc_session=") || trimmed.startsWith("session=");
    });
    if (!sessionCookie) {
      return null;
    }

    const separatorIndex = sessionCookie.indexOf("=");
    if (separatorIndex === -1) {
      return null;
    }

    const rawToken = sessionCookie.slice(separatorIndex + 1).trim();
    if (!rawToken) {
      return null;
    }
    const token = decodeURIComponent(rawToken);

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

function getInitialAuthState(): AuthState {
  const role = extractRoleFromCookie();
  return {
    role,
    isRoleResolved: role !== null,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  // Parse cookie once on hydration and derive both values from the same snapshot.
  const [authState, setAuthState] = useState<AuthState>(() => getInitialAuthState());

  const refreshRole = useCallback(async () => {
    try {
      const response = await fetch("/api/auth/check", {
        method: "GET",
        cache: "no-store",
        credentials: "same-origin",
      });
      if (response.ok) {
        const data = await response.json();
        setAuthState({
          role: data.role,
          isRoleResolved: true,
        });
      } else {
        setAuthState({
          role: null,
          isRoleResolved: true,
        });
      }
    } catch (error) {
      console.error("Failed to check auth role:", error);
      setAuthState({
        role: null,
        isRoleResolved: true,
      });
    }
  }, []);

  useEffect(() => {
    // Defer role refresh to avoid synchronous state updates in effect body.
    const timerId = window.setTimeout(() => {
      void refreshRole();
    }, 0);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [refreshRole]);

  const applyRole = (nextRole: "full" | "guest" | null) => {
    setAuthState({
      role: nextRole,
      isRoleResolved: true,
    });
  };

  return (
    <AuthContext.Provider
      value={{
        role: authState.role,
        isRoleResolved: authState.isRoleResolved,
        refreshRole,
        applyRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
