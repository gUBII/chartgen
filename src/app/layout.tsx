import type { ReactNode } from "react";
import localFont from "next/font/local";
import "./globals.css";
import { AuthProvider } from "../components/AuthProvider";
import { AppLayout } from "../components/shell/AppLayout";

const displayFont = localFont({
  src: [
    { path: "../../public/fonts/orbitron/orbitron-500.woff2", weight: "500" },
    { path: "../../public/fonts/orbitron/orbitron-700.woff2", weight: "700" },
  ],
  variable: "--font-display",
  display: "swap",
});

const bodyFont = localFont({
  src: [
    { path: "../../public/fonts/space-grotesk/space-grotesk-400.woff2", weight: "400" },
    { path: "../../public/fonts/space-grotesk/space-grotesk-500.woff2", weight: "500" },
    { path: "../../public/fonts/space-grotesk/space-grotesk-600.woff2", weight: "600" },
    { path: "../../public/fonts/space-grotesk/space-grotesk-700.woff2", weight: "700" },
  ],
  variable: "--font-body",
  display: "swap",
});

export const metadata = {
  title: "Chartgen by gUBII",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className={`${displayFont.variable} ${bodyFont.variable}`}>
        <AuthProvider>
          <AppLayout>{children}</AppLayout>
        </AuthProvider>
      </body>
    </html>
  );
}
