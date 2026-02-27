"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function TabNav() {
  const pathname = usePathname();

  const isMarActive = pathname.startsWith("/mar");
  const isMealtimeActive =
    pathname.startsWith("/mealtime-chartgen") || pathname.startsWith("/restoration");
  const isKpiActive = pathname.startsWith("/kpigen");
  const isUatActive = pathname.startsWith("/uat");

  return (
    <nav className="tab-nav">
      <div className="mx-auto max-w-7xl px-6 pb-5">
        <div className="tab-list">
          <Link
            href="/mar"
            className={`tab-link ${isMarActive ? "tab-link-active" : ""}`}
          >
            <span className="tab-dot" aria-hidden />
            MAR
          </Link>
          <Link
            href="/mealtime-chartgen"
            className={`tab-link ${isMealtimeActive ? "tab-link-active" : ""}`}
          >
            <span className="tab-dot" aria-hidden />
            Mealtime Chartgen
          </Link>
          <Link
            href="/kpigen"
            className={`tab-link ${isKpiActive ? "tab-link-active" : ""}`}
          >
            <span className="tab-dot" aria-hidden />
            KPIgen
          </Link>
          <Link
            href="/uat"
            className={`tab-link ${isUatActive ? "tab-link-active" : ""}`}
          >
            <span className="tab-dot" aria-hidden />
            UAT
          </Link>
        </div>
      </div>
    </nav>
  );
}
