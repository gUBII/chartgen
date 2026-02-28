export function ComplianceSection() {
  return (
    <section className="futuristic-panel p-6 border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 to-transparent">
      <p className="landing-mono text-xs text-emerald-200">Compliance Framing (NDIS Intent)</p>
      <p className="text-muted mt-3 text-sm leading-7">
        Chartgen is positioned as an audit modelling and compliance simulation layer. Outputs are framed as evidence structure,
        validation signals, and audit-readiness indicators rather than certified compliance claims.
      </p>
      <div className="mt-4 grid gap-4 md:grid-cols-2 text-xs leading-6">
        <div className="rounded-xl border border-emerald-400/25 bg-slate-900/60 p-4">
          <p className="text-emerald-100 font-semibold">Medication documentation controls</p>
          <p className="text-slate-200 mt-1">
            Supports clear records of medications, dosages, participant identification, and incident evidence aligned with medication management intent.
          </p>
        </div>
        <div className="rounded-xl border border-emerald-400/25 bg-slate-900/60 p-4">
          <p className="text-emerald-100 font-semibold">Mealtime support documentation</p>
          <p className="text-slate-200 mt-1">
            Supports evidence structure for mealtime management plans, controls, and observed execution aligned with mealtime intent.
          </p>
        </div>
        <div className="rounded-xl border border-emerald-400/25 bg-slate-900/60 p-4">
          <p className="text-emerald-100 font-semibold">Audit traceability</p>
          <p className="text-slate-200 mt-1">
            Structures who/what/when/why events to support quality audit preparation and governance review cycles.
          </p>
        </div>
        <div className="rounded-xl border border-emerald-400/25 bg-slate-900/60 p-4">
          <p className="text-emerald-100 font-semibold">Governance layering</p>
          <p className="text-slate-200 mt-1">
            Adds evidence slots and risk signals so governance teams can close documentation gaps systematically.
          </p>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-3 text-xs">
        <a href="https://www.ndiscommission.gov.au/rules-and-standards/ndis-practice-standards/core-module-provision-supports-environment" target="_blank" rel="noopener noreferrer" className="text-emerald-200 hover:text-emerald-100 underline">
          NDIS Practice Standards - provision of supports environment
        </a>
        <a href="https://www.ndiscommission.gov.au/rules-and-standards/ndis-practice-standards" target="_blank" rel="noopener noreferrer" className="text-emerald-200 hover:text-emerald-100 underline">
          NDIS Practice Standards overview
        </a>
      </div>
    </section>
  );
}
