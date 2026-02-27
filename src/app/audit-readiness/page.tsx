import Link from "next/link";

export default function AuditReadinessPage() {
  return (
    <main className="mx-auto max-w-7xl px-6 pt-10 pb-16">
      <section className="futuristic-panel p-8 sm:p-10 border-emerald-500/30 bg-gradient-to-br from-emerald-500/8 to-transparent">
        <p className="landing-mono text-xs text-emerald-200">Audit Modelling + Compliance Simulation</p>
        <h2 className="landing-mono mt-3 text-4xl text-emerald-50">Audit-readiness Overview</h2>
        <p className="text-muted mt-4 max-w-3xl text-sm leading-7">
          Chartgen provides evidence structure, validation signals, and audit-readiness indicators to help governance
          teams detect documentation gaps before external review cycles. It is designed to align with the intent of
          NDIS Practice Standards related to medication and mealtime documentation environments.
        </p>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-emerald-400/25 bg-slate-900/60 p-5">
            <p className="text-emerald-100 font-semibold">Readiness signal categories</p>
            <ul className="mt-3 space-y-2 text-xs text-slate-200">
              <li>- Evidence completeness and required field coverage</li>
              <li>- Traceability continuity across edits, approvals, and commits</li>
              <li>- Exception and incident evidence clarity</li>
              <li>- Governance role and approval separation signals</li>
            </ul>
          </div>
          <div className="rounded-xl border border-emerald-400/25 bg-slate-900/60 p-5">
            <p className="text-emerald-100 font-semibold">How to interpret outputs</p>
            <ul className="mt-3 space-y-2 text-xs text-slate-200">
              <li>- Low/medium/high risk signals prioritize remediation order</li>
              <li>- Audit questions expose evidence gaps before formal audits</li>
              <li>- UAT stress outputs validate operational confidence under load</li>
              <li>- Results indicate readiness posture, not certified compliance status</li>
            </ul>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3 text-xs">
          <a
            href="https://www.ndiscommission.gov.au/rules-and-standards/ndis-practice-standards/core-module-provision-supports-environment"
            target="_blank"
            rel="noopener noreferrer"
            className="text-emerald-200 hover:text-emerald-100 underline"
          >
            NDIS Core Module - Provision of supports environment
          </a>
          <a
            href="https://www.ndiscommission.gov.au/rules-and-standards/ndis-practice-standards"
            target="_blank"
            rel="noopener noreferrer"
            className="text-emerald-200 hover:text-emerald-100 underline"
          >
            NDIS Practice Standards
          </a>
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/mar"
            className="rounded-full border border-cyan-300/45 bg-cyan-400/20 px-4 py-2 text-xs font-semibold text-cyan-50 hover:bg-cyan-400/30 transition"
          >
            Explore MAR Module
          </Link>
          <Link
            href="/mealtime-chartgen"
            className="rounded-full border border-emerald-300/45 bg-emerald-400/20 px-4 py-2 text-xs font-semibold text-emerald-50 hover:bg-emerald-400/30 transition"
          >
            Explore Mealtime Module
          </Link>
        </div>
      </section>
    </main>
  );
}
