"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useRef, useCallback } from "react";
import { useAuth } from "../AuthProvider";

interface NavItem {
  href: string;
  label: string;
  fullOnly?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/mar", label: "MAR" },
  { href: "/restoration", label: "Restoration" },
];

const FULL_ACCESS_ITEMS: NavItem[] = [
  { href: "/admin", label: "Admin", fullOnly: true },
  { href: "/audit-engine", label: "Audit Engine", fullOnly: true },
  { href: "/audit-explorer", label: "Audit Explorer", fullOnly: true },
];

const MORE_ITEMS: NavItem[] = [
  { href: "/chartgen-core", label: "Chartgen Core" },
  { href: "/whats-new", label: "Release Notes" },
  { href: "/uat", label: "UAT Center", fullOnly: true },
  { href: "/kpigen", label: "KPI Signals" },
  { href: "/deployment-notes", label: "Deployment Notes" },
];

function NavLink({
  href,
  label,
  active,
  restricted,
  onClick,
}: {
  href: string;
  label: string;
  active: boolean;
  restricted: boolean;
  onClick?: () => void;
}) {
  return (
    <Link
      href={restricted ? "/login" : href}
      aria-disabled={restricted}
      onClick={onClick}
      className={`tab-link ${active ? "tab-link-active" : ""} ${restricted ? "tab-link-login-required" : ""}`}
    >
      <span className="tab-dot" aria-hidden />
      {label}
      {restricted && (
        <span className="ml-1.5 text-[10px] text-orange-300 font-normal">
          (login)
        </span>
      )}
    </Link>
  );
}

function NavDropdown({
  items,
  pathname,
  isFullUser,
  restrictedView,
}: {
  items: NavItem[];
  pathname: string;
  isFullUser: boolean;
  restrictedView: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleEsc);
    };
  }, [open]);

  const visibleItems = items.filter(
    (item) => !item.fullOnly || isFullUser,
  );

  if (visibleItems.length === 0) return null;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        className="tab-link"
      >
        <span className="tab-dot" aria-hidden />
        More
        <svg
          className={`ml-1 h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1.5 z-30 min-w-[180px] rounded-xl border border-cyan-400/25 bg-slate-900/95 backdrop-blur-xl py-1.5 shadow-xl">
          {visibleItems.map((item) => {
            const active = pathname.startsWith(item.href);
            const restricted = item.fullOnly && restrictedView;
            return (
              <Link
                key={item.href}
                href={restricted ? "/login" : item.href}
                onClick={() => setOpen(false)}
                className={`block px-4 py-2 text-xs transition ${
                  active
                    ? "text-cyan-100 bg-cyan-400/10"
                    : "text-slate-300 hover:text-slate-100 hover:bg-slate-400/10"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function UserActions({
  isFullUser,
  isRoleResolved,
}: {
  isFullUser: boolean;
  isRoleResolved: boolean;
}) {
  const router = useRouter();
  const { applyRole } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

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

  if (isFullUser) {
    return (
      <button
        onClick={handleLogout}
        disabled={isLoggingOut}
        className="inline-flex min-h-[44px] items-center rounded-full border border-slate-400/30 px-3 py-2 text-xs text-slate-300 hover:text-slate-100 hover:border-slate-300/40 transition disabled:opacity-50"
      >
        {isLoggingOut ? "Logging out..." : "Logout"}
      </button>
    );
  }

  if (isRoleResolved) {
    return (
      <Link
        href="/login"
        className="inline-flex min-h-[44px] items-center rounded-full border border-cyan-300/40 bg-cyan-400/15 px-3 py-2 text-xs font-semibold text-cyan-100 hover:bg-cyan-400/25 transition"
      >
        Login
      </Link>
    );
  }

  return null;
}

function MobileNavDrawer({
  open,
  items,
  pathname,
  isFullUser,
  restrictedView,
  onClose,
}: {
  open: boolean;
  items: NavItem[];
  pathname: string;
  isFullUser: boolean;
  restrictedView: boolean;
  onClose: () => void;
}) {
  const drawerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [open, onClose]);

  if (!open) return null;

  const visibleItems = items.filter(
    (item) => !item.fullOnly || isFullUser,
  );

  return (
    <div ref={drawerRef} className="sm:hidden" role="navigation" aria-label="Mobile navigation">
      <div className="tab-list flex flex-col gap-1.5 mt-2">
        {visibleItems.map((item) => {
          const active = pathname.startsWith(item.href);
          const restricted = item.fullOnly && restrictedView;
          return (
            <NavLink
              key={item.href}
              href={item.href}
              label={item.label}
              active={active}
              restricted={!!restricted}
              onClick={onClose}
            />
          );
        })}
      </div>
    </div>
  );
}

function PrimaryNav() {
  const pathname = usePathname();
  const { role: userRole, isRoleResolved } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isFullUser = userRole === "full";
  const restrictedView = isRoleResolved && userRole !== "full";

  const allPrimaryItems = [...NAV_ITEMS, ...FULL_ACCESS_ITEMS];

  const activeLabel =
    allPrimaryItems.find((item) => pathname.startsWith(item.href))?.label ??
    "Modules";

  const closeMobile = useCallback(() => setMobileOpen(false), []);

  return (
    <nav className="tab-nav" aria-label="Primary navigation">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 pb-3 sm:pb-5">
        <div className="tab-shell">
          <div className="tab-list-panel">
            {/* Mobile toggle */}
            <button
              type="button"
              className="tab-menu-toggle sm:hidden"
              aria-expanded={mobileOpen}
              aria-controls="primary-mobile-nav"
              onClick={() => setMobileOpen((prev) => !prev)}
            >
              <span className="tab-dot" aria-hidden />
              {mobileOpen ? "Close Menu" : `Menu \u2022 ${activeLabel}`}
            </button>

            {/* Desktop nav */}
            <div className="tab-list-wrap">
              <div className="tab-list">
                {NAV_ITEMS.map((item) => (
                  <NavLink
                    key={item.href}
                    href={item.href}
                    label={item.label}
                    active={pathname.startsWith(item.href)}
                    restricted={false}
                  />
                ))}
                {FULL_ACCESS_ITEMS.map((item) => (
                  <NavLink
                    key={item.href}
                    href={item.href}
                    label={item.label}
                    active={pathname.startsWith(item.href)}
                    restricted={!!restrictedView}
                  />
                ))}
                <NavDropdown
                  items={MORE_ITEMS}
                  pathname={pathname}
                  isFullUser={isFullUser}
                  restrictedView={!!restrictedView}
                />
              </div>
            </div>

            {/* Mobile drawer */}
            <div id="primary-mobile-nav">
              <MobileNavDrawer
                open={mobileOpen}
                items={[...allPrimaryItems, ...MORE_ITEMS]}
                pathname={pathname}
                isFullUser={isFullUser}
                restrictedView={!!restrictedView}
                onClose={closeMobile}
              />
            </div>
          </div>

          <div className="tab-actions">
            <UserActions
              isFullUser={isFullUser}
              isRoleResolved={isRoleResolved}
            />
          </div>
        </div>
      </div>
    </nav>
  );
}

export { PrimaryNav };
