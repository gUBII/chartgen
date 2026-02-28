export function OwnershipSection() {
  return (
    <section className="futuristic-panel p-6 border-cyan-500/30 bg-gradient-to-br from-cyan-500/10 to-transparent">
      <p className="landing-mono text-xs text-cyan-200">Ownership and Deployment Clarity</p>
      <div className="mt-4 grid gap-4 md:grid-cols-3 text-sm">
        <div className="rounded-xl border border-cyan-400/25 bg-slate-900/60 p-4">
          <p className="text-cyan-100 font-semibold">Independent Product Ownership</p>
          <p className="text-muted mt-2">
            Chartgen is owned and authored by Farhan Rashid (gUBII) as an independent product initiative.
          </p>
        </div>
        <div className="rounded-xl border border-cyan-400/25 bg-slate-900/60 p-4">
          <p className="text-cyan-100 font-semibold">Nexis365 Hosting Relationship</p>
          <p className="text-muted mt-2">
            Chartgen deployments run in Nexis365-hosted environments that support GoodwillCare and COHS operations.
          </p>
        </div>
        <div className="rounded-xl border border-cyan-400/25 bg-slate-900/60 p-4">
          <p className="text-cyan-100 font-semibold">Governance Independence</p>
          <p className="text-muted mt-2">
            Chartgen leverages platform capabilities where appropriate, while product governance and evolution remain independent.
          </p>
        </div>
      </div>
    </section>
  );
}
