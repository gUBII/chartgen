import type { ReactNode } from "react";
import { SiteHeader } from "./SiteHeader";
import { PrimaryNav } from "./PrimaryNav";
import { SiteFooter } from "./SiteFooter";

interface AppLayoutProps {
  children: ReactNode;
}

function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="app-shell">
      <header className="site-header">
        <SiteHeader />
        <PrimaryNav />
      </header>
      <div className="page-shell">{children}</div>
      <SiteFooter />
      <div aria-hidden className="orb orb-a" />
      <div aria-hidden className="orb orb-b" />
      <div aria-hidden className="orb orb-c" />
    </div>
  );
}

export { AppLayout };
export type { AppLayoutProps };
