import type { ReactNode } from "react";
import { Orbitron, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "../components/AuthProvider";
import { AppLayout } from "../components/shell/AppLayout";

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
        <AuthProvider>
          <AppLayout>{children}</AppLayout>
        </AuthProvider>
      </body>
    </html>
  );
}
