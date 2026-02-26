import type { ReactNode } from "react";
import "./globals.css";
import { TabNav } from "../components/TabNav";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="bg-white border-b border-gray-200">
          <div className="mx-auto max-w-7xl px-6 py-2">
            <h1 className="text-lg font-semibold text-gray-900">ChartGen</h1>
          </div>
          <TabNav />
        </header>
        {children}
      </body>
    </html>
  );
}
