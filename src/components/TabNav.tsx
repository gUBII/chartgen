"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function TabNav() {
  const pathname = usePathname();

  const isRestorationActive = pathname.startsWith("/restoration");
  const isMarActive = pathname.startsWith("/mar");

  return (
    <nav className="border-b border-gray-200 bg-white">
      <div className="mx-auto max-w-7xl px-6 py-4">
        <div className="flex gap-8">
          <Link
            href="/restoration"
            className={`text-sm font-medium pb-2 border-b-2 ${
              isRestorationActive
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-600 hover:text-gray-900"
            }`}
          >
            Meal Chart
          </Link>
          <Link
            href="/mar"
            className={`text-sm font-medium pb-2 border-b-2 ${
              isMarActive
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-600 hover:text-gray-900"
            }`}
          >
            Medical Chart
          </Link>
        </div>
      </div>
    </nav>
  );
}
