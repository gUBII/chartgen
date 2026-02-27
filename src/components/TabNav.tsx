"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useAuth } from "./AuthProvider";

export function TabNav() {
  const pathname = usePathname();
  const { role: userRole } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const isMarActive = pathname.startsWith("/mar");
  const isMealtimeActive =
    pathname.startsWith("/mealtime-chartgen") || pathname.startsWith("/restoration");
  const isKpiActive = pathname.startsWith("/kpigen");
  const isUatActive = pathname.startsWith("/uat");

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      window.location.href = "/login";
    } catch (err) {
      console.error("Logout error:", err);
      setIsLoggingOut(false);
    }
  };

  return (
    <nav className="tab-nav">
      <div className="mx-auto max-w-7xl px-6 pb-5">
        <div className="flex items-center justify-between">
          <div className="tab-list">
            <Link
              href="/mar"
              className={`tab-link ${isMarActive ? "tab-link-active" : ""}`}
            >
              <span className="tab-dot" aria-hidden />
              MAR Chart Module
              {userRole === "guest" && (
                <span className="ml-2 text-xs text-slate-400 font-normal">(preview)</span>
              )}
            </Link>
            <Link
              href="/mealtime-chartgen"
              className={`tab-link ${isMealtimeActive ? "tab-link-active" : ""}`}
            >
              <span className="tab-dot" aria-hidden />
              Mealtime Chart Module
              {userRole === "guest" && (
                <span className="ml-2 text-xs text-slate-400 font-normal">(preview)</span>
              )}
            </Link>
            <button
              disabled={userRole === "guest"}
              className={`tab-link ${isKpiActive ? "tab-link-active" : ""} ${
                userRole === "guest" ? "opacity-50 cursor-not-allowed" : ""
              }`}
              onClick={() => {
                if (userRole !== "guest") {
                  window.location.href = "/kpigen";
                }
              }}
            >
              <span className="tab-dot" aria-hidden />
              Audit Traceability Layer
              {userRole === "guest" && (
                <span className="ml-2 text-xs text-orange-400 font-normal">(login required)</span>
              )}
            </button>
            <button
              disabled={userRole === "guest"}
              className={`tab-link ${isUatActive ? "tab-link-active" : ""} ${
                userRole === "guest" ? "opacity-50 cursor-not-allowed" : ""
              }`}
              onClick={() => {
                if (userRole !== "guest") {
                  window.location.href = "/uat";
                }
              }}
            >
              <span className="tab-dot" aria-hidden />
              Integrity Checks Engine
              {userRole === "guest" && (
                <span className="ml-2 text-xs text-orange-400 font-normal">(login required)</span>
              )}
            </button>
          </div>

          {userRole === "full" && (
            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="ml-4 text-xs text-slate-400 hover:text-slate-200 transition disabled:opacity-50"
            >
              {isLoggingOut ? "Logging out..." : "Logout"}
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
