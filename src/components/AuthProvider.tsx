"use client";

import { ReactNode, createContext, useContext, useState, useEffect, useCallback } from "react";

interface AuthContextValue {
  role: "full" | "guest" | null;
  refreshRole: () => Promise<void>;
  applyRole: (nextRole: "full" | "guest" | null) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<"full" | "guest" | null>(null);

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
    } catch (error) {
      console.error("Failed to check auth role:", error);
      setRole(null);
    }
  }, []);

  useEffect(() => {
    void refreshRole();
  }, [refreshRole]);

  return (
    <AuthContext.Provider value={{ role, refreshRole, applyRole: setRole }}>
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
