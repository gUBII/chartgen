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

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className={`${displayFont.variable} ${bodyFont.variable}`}>
        <div className="app-shell">
          <header className="site-header">
            <div className="mx-auto max-w-7xl px-6 pt-6 pb-4">
              <p className="brand-kicker">Adaptive Clinical Intelligence</p>
              <h1 className="mt-1 text-3xl font-semibold sm:text-4xl">
                <Link href="/" className="brand-link">
                  Chartgen
                </Link>
              </h1>
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
