"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "./AuthProvider";

export function TabNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { role: userRole, isRoleResolved, applyRole } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const isMarActive = pathname.startsWith("/mar");
  const isMealtimeActive =
    pathname.startsWith("/mealtime-chartgen") || pathname.startsWith("/restoration");
  const isAuditEngineActive = pathname.startsWith("/audit-engine");
  const isAuditExplorerActive = pathname.startsWith("/audit-explorer");
  const isFullUser = userRole === "full";
  const restrictedView = isRoleResolved && userRole !== "full";
  const auditEngineHref = isFullUser || !isRoleResolved ? "/audit-engine" : "/login";
  const auditExplorerHref = isFullUser || !isRoleResolved ? "/audit-explorer" : "/login";
  const activeModuleLabel = isMarActive
    ? "MAR"
    : isMealtimeActive
      ? "Mealtime"
      : isAuditEngineActive
        ? "Audit Engine"
        : isAuditExplorerActive
          ? "Audit Explorer"
          : "Modules";

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

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
      <div className="mx-auto max-w-7xl px-4 sm:px-6 pb-3 sm:pb-5">
        <div className="tab-shell">
          <div className="tab-list-panel">
            <button
              type="button"
              className="tab-menu-toggle sm:hidden"
              aria-expanded={isMobileMenuOpen}
              aria-controls="mobile-tab-list"
              onClick={() => setIsMobileMenuOpen((prev) => !prev)}
            >
              <span className="tab-dot" aria-hidden />
              {isMobileMenuOpen ? "Close Menu" : `Menu • ${activeModuleLabel}`}
            </button>

            <div
              id="mobile-tab-list"
              className={`tab-list-wrap ${isMobileMenuOpen ? "tab-list-wrap-open" : ""}`}
            >
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
                  href={auditEngineHref}
                  aria-disabled={restrictedView}
                  className={`tab-link ${isAuditEngineActive ? "tab-link-active" : ""} ${
                    restrictedView ? "tab-link-login-required" : ""
                  }`}
                >
                  <span className="tab-dot" aria-hidden />
                  Audit Engine
                  {restrictedView && (
                    <span className="ml-2 text-xs text-orange-300 font-normal">(login required)</span>
                  )}
                </Link>
                <Link
                  href={auditExplorerHref}
                  aria-disabled={restrictedView}
                  className={`tab-link ${isAuditExplorerActive ? "tab-link-active" : ""} ${
                    restrictedView ? "tab-link-login-required" : ""
                  }`}
                >
                  <span className="tab-dot" aria-hidden />
                  Audit Explorer
                  {restrictedView && (
                    <span className="ml-2 text-xs text-orange-300 font-normal">(login required)</span>
                  )}
                </Link>
              </div>
            </div>
          </div>

          <div className="tab-actions">
            {isFullUser && (
              <button
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="inline-flex min-h-[44px] items-center rounded-full border border-slate-400/30 px-3 py-2 text-xs text-slate-300 hover:text-slate-100 hover:border-slate-300/40 transition disabled:opacity-50"
              >
                {isLoggingOut ? "Logging out..." : "Logout"}
              </button>
            )}
            {isRoleResolved && !isFullUser && (
              <Link
                href="/login"
                className="inline-flex min-h-[44px] items-center rounded-full border border-cyan-300/40 bg-cyan-400/15 px-3 py-2 text-xs font-semibold text-cyan-100 hover:bg-cyan-400/25 transition"
              >
                Login
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
