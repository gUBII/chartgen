export default function KPIgenPage() {
  return (
    <main className="mx-auto max-w-7xl px-6 pt-10 pb-16 space-y-5">
      <section className="futuristic-panel p-8 sm:p-10">
        <p className="landing-mono text-xs text-cyan-100/80">Audit Traceability Layer</p>
        <h2 className="landing-mono mt-3 text-[clamp(2rem,5vw,3.25rem)] text-cyan-50">
          KPIgen Governance Signals
        </h2>
        <p className="text-muted mt-4 max-w-3xl text-sm sm:text-base leading-relaxed">
          KPIgen exposes audit-readiness indicators for approvals, commit traceability, and evidence
          completeness. Use this surface to inspect governance posture before final ledger actions.
        </p>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <article className="futuristic-panel p-6 border-cyan-500/25">
          <p className="landing-mono text-xs text-cyan-200">Signal 01</p>
          <h3 className="mt-2 text-lg font-semibold text-cyan-50">Approval Integrity</h3>
          <p className="text-muted mt-2 text-sm">
            Detects invalid reviewer-role approvals and self-approval attempts before commit.
          </p>
        </article>
        <article className="futuristic-panel p-6 border-blue-500/25">
          <p className="landing-mono text-xs text-blue-200">Signal 02</p>
          <h3 className="mt-2 text-lg font-semibold text-blue-50">Provenance Health</h3>
          <p className="text-muted mt-2 text-sm">
            Tracks provenance hash continuity so chart lineage can be reconstructed without gaps.
          </p>
        </article>
        <article className="futuristic-panel p-6 border-emerald-500/25">
          <p className="landing-mono text-xs text-emerald-200">Signal 03</p>
          <h3 className="mt-2 text-lg font-semibold text-emerald-50">Commit Readiness</h3>
          <p className="text-muted mt-2 text-sm">
            Highlights whether candidate batches meet governance controls for safe ledger promotion.
          </p>
        </article>
      </section>

      <section className="futuristic-panel p-6 border-cyan-500/25">
        <p className="landing-mono text-xs text-cyan-200">Next Actions</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <a
            href="/uat"
            className="rounded-full border border-cyan-300/45 bg-cyan-400/20 px-4 py-2 text-xs font-semibold text-cyan-50 hover:bg-cyan-400/30 transition"
          >
            Open Integrity Checks Engine
          </a>
          <a
            href="/mar"
            className="rounded-full border border-emerald-300/45 bg-emerald-400/20 px-4 py-2 text-xs font-semibold text-emerald-50 hover:bg-emerald-400/30 transition"
          >
            Review MAR Module
          </a>
        </div>
      </section>
    </main>
  );
}
