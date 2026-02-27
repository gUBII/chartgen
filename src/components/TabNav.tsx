"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "./AuthProvider";

export function TabNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { role: userRole, isRoleResolved, applyRole } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const isMarActive = pathname.startsWith("/mar");
  const isMealtimeActive =
    pathname.startsWith("/mealtime-chartgen") || pathname.startsWith("/restoration");
  const isKpiActive = pathname.startsWith("/kpigen");
  const isUatActive = pathname.startsWith("/uat");
  const isFullUser = userRole === "full";
  const restrictedView = isRoleResolved && userRole !== "full";
  const kpiHref = isFullUser || !isRoleResolved ? "/kpigen" : "/login";
  const uatHref = isFullUser || !isRoleResolved ? "/uat" : "/login";

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      applyRole(null);
      router.push("/login");
      router.refresh();
    } catch (err) {
      console.error("Logout error:", err);
      setIsLoggingOut(false);
    }
  };

  return (
    <nav className="tab-nav">
      <div className="mx-auto max-w-7xl px-6 pb-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="tab-list">
            <Link
              href="/mar"
              className={`tab-link ${isMarActive ? "tab-link-active" : ""}`}
            >
              <span className="tab-dot" aria-hidden />
              MAR Chart Module
              {restrictedView && (
                <span className="ml-2 text-xs text-slate-400 font-normal">(preview)</span>
              )}
            </Link>
            <Link
              href="/mealtime-chartgen"
              className={`tab-link ${isMealtimeActive ? "tab-link-active" : ""}`}
            >
              <span className="tab-dot" aria-hidden />
              Mealtime Chart Module
              {restrictedView && (
                <span className="ml-2 text-xs text-slate-400 font-normal">(preview)</span>
              )}
            </Link>
            <Link
              href={kpiHref}
              aria-disabled={restrictedView}
              className={`tab-link ${isKpiActive ? "tab-link-active" : ""} ${
                restrictedView ? "tab-link-login-required" : ""
              }`}
            >
              <span className="tab-dot" aria-hidden />
              Audit Traceability Layer
              {restrictedView && (
                <span className="ml-2 text-xs text-orange-300 font-normal">(login required)</span>
              )}
            </Link>
            <Link
              href={uatHref}
              aria-disabled={restrictedView}
              className={`tab-link ${isUatActive ? "tab-link-active" : ""} ${
                restrictedView ? "tab-link-login-required" : ""
              }`}
            >
              <span className="tab-dot" aria-hidden />
              Integrity Checks Engine
              {restrictedView && (
                <span className="ml-2 text-xs text-orange-300 font-normal">(login required)</span>
              )}
            </Link>
          </div>

          {isFullUser && (
            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="inline-flex min-h-[44px] items-center rounded-full border border-slate-400/30 px-3 py-2 text-xs text-slate-300 hover:text-slate-100 hover:border-slate-300/40 transition disabled:opacity-50 sm:ml-4"
            >
              {isLoggingOut ? "Logging out..." : "Logout"}
            </button>
          )}
          {isRoleResolved && !isFullUser && (
            <Link
              href="/login"
              className="inline-flex min-h-[44px] items-center rounded-full border border-cyan-300/40 bg-cyan-400/15 px-3 py-2 text-xs font-semibold text-cyan-100 hover:bg-cyan-400/25 transition sm:ml-4"
            >
              Login
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
