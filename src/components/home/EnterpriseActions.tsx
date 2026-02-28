import Link from "next/link";

export function EnterpriseActions() {
  return (
    <section className="futuristic-panel p-8 border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-transparent">
      <p className="landing-mono text-xs text-amber-200">Enterprise Actions</p>
      <h3 className="landing-mono mt-2 text-2xl text-amber-50">Deployment, Audit, and Module Exploration</h3>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Link href="/mar" className="rounded-xl border border-cyan-300/40 bg-cyan-400/15 px-4 py-3 text-xs font-semibold text-cyan-50 hover:bg-cyan-400/25 transition text-center">
          Explore MAR Module
        </Link>
        <Link href="/restoration" className="rounded-xl border border-emerald-300/40 bg-emerald-400/15 px-4 py-3 text-xs font-semibold text-emerald-50 hover:bg-emerald-400/25 transition text-center">
          Explore Mealtime Module
        </Link>
        <Link href="/deployment-notes" className="rounded-xl border border-amber-300/40 bg-amber-400/15 px-4 py-3 text-xs font-semibold text-amber-50 hover:bg-amber-400/25 transition text-center">
          Request Deployment Notes
        </Link>
        <Link href="/audit-readiness" className="rounded-xl border border-blue-300/40 bg-blue-400/15 px-4 py-3 text-xs font-semibold text-blue-50 hover:bg-blue-400/25 transition text-center">
          Audit-readiness Overview
        </Link>
      </div>
    </section>
  );
}
