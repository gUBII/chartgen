"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../../components/AuthProvider";

export default function LoginPage() {
  const router = useRouter();
  const { refreshRole } = useAuth();
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
        await refreshRole();
        router.push("/");
        return;
      }

      const data = await response.json();
      setError(data.error || "Access denied.");
    } catch {
      setError("Unable to process login right now.");
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
        await refreshRole();
        router.push("/");
        return;
      }

      setError("Guest preview is temporarily unavailable.");
    } catch {
      setError("Unable to process guest access right now.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="mx-auto max-w-7xl px-6 pt-12 pb-16">
      <section className="mx-auto max-w-xl futuristic-panel p-8 sm:p-10">
        <p className="landing-mono text-xs text-cyan-200">Access Control</p>
        <h2 className="landing-mono mt-3 text-4xl text-cyan-50">Chartgen by gUBII</h2>
        <p className="text-muted mt-4 text-sm leading-6">
          Governance-first clinical documentation audit engine deployed in Nexis365-hosted environments.
        </p>
        <p className="mt-4 rounded-xl border border-cyan-400/25 bg-cyan-500/10 px-4 py-3 text-xs leading-6 text-cyan-100/90">
          Full access is restricted to authorized governance and operations users. Guest access provides read-only module preview.
        </p>

        {error ? (
          <div className="mt-5 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-100">
            {error}
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <label className="block text-xs font-semibold uppercase tracking-widest text-cyan-200" htmlFor="password">
            Access Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter access password"
            className="w-full rounded-lg border border-cyan-500/35 bg-slate-900/70 px-4 py-3 text-cyan-50 placeholder-slate-500 focus:outline-none focus:border-cyan-400/60 focus:ring-1 focus:ring-cyan-400/30"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-lg border border-cyan-400/45 bg-cyan-500/20 px-4 py-3 text-xs font-semibold uppercase tracking-widest text-cyan-50 hover:bg-cyan-500/30 transition disabled:opacity-50"
          >
            {isLoading ? "Authorizing..." : "Login"}
          </button>
        </form>

        <div className="my-6 flex items-center gap-4">
          <div className="h-px flex-1 bg-cyan-500/25" />
          <span className="text-[10px] uppercase tracking-wider text-slate-500">or</span>
          <div className="h-px flex-1 bg-cyan-500/25" />
        </div>

        <button
          onClick={handleGuestAccess}
          disabled={isLoading}
          className="w-full rounded-lg border border-slate-500/50 bg-slate-800/60 px-4 py-3 text-xs font-semibold uppercase tracking-widest text-slate-200 hover:bg-slate-700/60 transition disabled:opacity-50"
        >
          Continue as Guest (Read-only)
        </button>

        <div className="mt-7 grid gap-3 sm:grid-cols-2">
          <Link
            href="/deployment-notes"
            className="rounded-lg border border-amber-300/40 bg-amber-500/15 px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-amber-100 hover:bg-amber-500/25 transition"
          >
            Request Deployment Notes
          </Link>
          <Link
            href="/audit-readiness"
            className="rounded-lg border border-blue-300/40 bg-blue-500/15 px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-blue-100 hover:bg-blue-500/25 transition"
          >
            Audit-readiness Overview
          </Link>
        </div>
      </section>
    </main>
  );
}
