import type { ReactNode } from "react";
import Link from "next/link";
import { Orbitron, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { TabNav } from "../components/TabNav";

const displayFont = Orbitron({
  subsets: ["latin"],
  weight: ["500", "700"],
  variable: "--font-display",
});

const bodyFont = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body",
});

export const metadata = {
  title: "Chartgen by gUBII",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className={`${displayFont.variable} ${bodyFont.variable}`}>
        <div className="app-shell">
          <header className="site-header">
            <div className="mx-auto max-w-7xl px-6 pt-6 pb-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="brand-kicker">Chartgen by gUBII</p>
                  <h1 className="mt-1 text-3xl font-semibold sm:text-4xl">
                    <Link href="/" className="brand-link">
                      Chartgen
                    </Link>
                  </h1>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className="inline-block rounded-full border border-emerald-400/50 bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-200 uppercase tracking-widest">
                    v2.0
                  </span>
                  <a
                    href="https://github.com/gUBII"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-cyan-300 hover:text-cyan-100 transition"
                    title="Visit creator on GitHub"
                  >
                    by gUBII ↗
                  </a>
                </div>
              </div>
              <p className="mt-3 text-[11px] leading-5 text-cyan-100/75 max-w-4xl">
                Independently authored product. Deployed in Nexis365-hosted environments supporting GoodwillCare and COHS.
              </p>
            </div>
            <TabNav />
          </header>
          <div className="page-shell">{children}</div>
          <div aria-hidden className="orb orb-a" />
          <div aria-hidden className="orb orb-b" />
          <div aria-hidden className="orb orb-c" />
        </div>
      </body>
    </html>
  );
}
