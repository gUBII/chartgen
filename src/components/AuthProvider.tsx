"use client";

import { ReactNode, createContext, useContext, useState, useEffect } from "react";

interface AuthContextValue {
  role: "full" | "guest" | null;
  refreshRole: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<"full" | "guest" | null>(null);

  const refreshRole = async () => {
    try {
      const response = await fetch("/api/auth/check", { method: "GET" });
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
  };

  useEffect(() => {
    refreshRole();
  }, []);

  return (
    <AuthContext.Provider value={{ role, refreshRole }}>
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
