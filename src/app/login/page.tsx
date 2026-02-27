"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, role: "full" }),
      });

      if (response.ok) {
        // Redirect to home page
        router.push("/");
      } else {
        const data = await response.json();
        setError(data.error || "Login failed");
      }
    } catch (err) {
      setError("An error occurred. Please try again.");
      console.error("Login error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGuestAccess = async () => {
    setError("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: "", role: "guest" }),
      });

      if (response.ok) {
        // Redirect to home page
        router.push("/");
      } else {
        setError("Failed to enter guest mode");
      }
    } catch (err) {
      setError("An error occurred. Please try again.");
      console.error("Guest access error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <html lang="en">
      <head>
        <title>GoodwillCare</title>
      </head>
      <body className="min-h-screen bg-slate-950 text-slate-50">
        <div className="min-h-screen flex items-center justify-center px-6 relative overflow-hidden">
          {/* Background orbs */}
          <div className="absolute top-0 right-1/4 w-96 h-96 rounded-full bg-cyan-500/10 blur-3xl" />
          <div className="absolute bottom-0 left-1/4 w-96 h-96 rounded-full bg-emerald-500/10 blur-3xl" />

          {/* Login card */}
          <div className="relative z-10 w-full max-w-md">
            {/* Header */}
            <div className="mb-10 text-center">
              <p className="text-xs uppercase tracking-widest text-cyan-300 font-semibold">
                GoodwillCare Database
              </p>
              <h1 className="mt-3 text-4xl font-bold text-cyan-50">
                GoodwillCare
              </h1>
              <p className="mt-2 text-sm text-slate-300">
                Clinical Platform Access
              </p>
            </div>

            {/* Login panel */}
            <div className="rounded-lg border border-cyan-500/30 bg-gradient-to-br from-slate-900/80 to-slate-950/80 backdrop-blur-sm p-8">
              {/* Error message */}
              {error && (
                <div className="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 p-4">
                  <p className="text-sm text-red-200">{error}</p>
                </div>
              )}

              {/* Password form */}
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label
                    htmlFor="password"
                    className="block text-xs font-semibold uppercase tracking-widest text-cyan-300 mb-2"
                  >
                    Password
                  </label>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    className="w-full px-4 py-3 rounded-lg border border-cyan-500/30 bg-slate-900/50 text-cyan-50 placeholder-slate-500 focus:outline-none focus:border-cyan-400/50 focus:ring-1 focus:ring-cyan-400/20 transition"
                    disabled={isLoading}
                  />
                  <p className="mt-2 text-xs text-slate-400">
                    Ask gUBII on WhatsApp for the password
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full px-4 py-3 rounded-lg border border-cyan-400/50 bg-cyan-500/20 text-cyan-50 font-semibold uppercase tracking-widest text-xs hover:bg-cyan-500/30 focus:outline-none focus:ring-1 focus:ring-cyan-400/50 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? "Logging in..." : "Login"}
                </button>
              </form>

              {/* Divider */}
              <div className="my-6 flex items-center gap-4">
                <div className="flex-1 h-px bg-cyan-500/20" />
                <p className="text-xs text-slate-500 uppercase">or</p>
                <div className="flex-1 h-px bg-cyan-500/20" />
              </div>

              {/* Guest access */}
              <button
                onClick={handleGuestAccess}
                disabled={isLoading}
                className="w-full px-4 py-3 rounded-lg border border-slate-500/50 bg-slate-800/50 text-slate-300 font-semibold uppercase tracking-widest text-xs hover:bg-slate-700/50 focus:outline-none focus:ring-1 focus:ring-slate-400/50 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continue as Guest
              </button>
              <p className="mt-3 text-center text-xs text-slate-500">
                Preview & print charts (read-only)
              </p>
            </div>

            {/* WhatsApp CTA */}
            <div className="mt-8 text-center">
              <p className="text-xs text-slate-400 mb-3">Need access?</p>
              <a
                href="https://wa.me/61423016859?text=Hi%20gUBII%2C%20can%20I%20get%20access%20to%20GoodwillCare%3F"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-emerald-400/50 bg-emerald-500/20 px-4 py-2 text-xs font-semibold text-emerald-50 hover:bg-emerald-500/30 transition"
              >
                Ask gUBII on WhatsApp ↗
              </a>
            </div>

            {/* Footer */}
            <p className="mt-8 text-center text-xs text-slate-500">
              Built by{" "}
              <a
                href="https://github.com/gUBII"
                target="_blank"
                rel="noopener noreferrer"
                className="text-cyan-300 hover:text-cyan-100 transition underline"
              >
                gUBII
              </a>
            </p>
          </div>
        </div>

        <style>{`
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          html, body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen",
              "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
          }
        `}</style>
      </body>
    </html>
  );
}
