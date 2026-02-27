import Link from "next/link";

export default function DeploymentNotesPage() {
  return (
    <main className="mx-auto max-w-7xl px-6 pt-10 pb-16">
      <section className="futuristic-panel p-8 sm:p-10">
        <p className="landing-mono text-xs text-amber-200">Deployment + Platform</p>
        <h2 className="landing-mono mt-3 text-4xl text-amber-50">Request Deployment Notes</h2>
        <p className="text-muted mt-4 max-w-3xl text-sm leading-7">
          Chartgen is independently authored by Farhan Rashid (gUBII) and deployed in Nexis365-hosted environments
          supporting GoodwillCare and COHS operations. Nexis365 provides hosting and platform capabilities for these
          deployments; product ownership and governance remain independent.
        </p>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-amber-400/25 bg-slate-900/60 p-5">
            <p className="text-amber-100 font-semibold">What deployment notes cover</p>
            <ul className="mt-3 space-y-2 text-xs text-slate-200">
              <li>- Environment topology and hosting boundaries</li>
              <li>- Database connectivity and migration runbook expectations</li>
              <li>- Operational roles for platform vs product governance</li>
              <li>- Incident escalation and audit evidence responsibilities</li>
            </ul>
          </div>
          <div className="rounded-xl border border-amber-400/25 bg-slate-900/60 p-5">
            <p className="text-amber-100 font-semibold">Request channels</p>
            <ul className="mt-3 space-y-2 text-xs text-slate-200">
              <li>- GitHub repository issues for implementation documentation requests</li>
              <li>- Founder contact for deployment governance clarification</li>
              <li>- Controlled release notes shared per deployment milestone</li>
            </ul>
            <div className="mt-4 flex flex-wrap gap-2">
              <a
                href="https://github.com/gUBII/chartgen/issues"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full border border-amber-300/45 bg-amber-400/20 px-4 py-2 text-xs font-semibold text-amber-50 hover:bg-amber-400/30 transition"
              >
                Open GitHub Issue
              </a>
              <a
                href="https://github.com/gUBII"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full border border-cyan-300/45 bg-cyan-400/20 px-4 py-2 text-xs font-semibold text-cyan-50 hover:bg-cyan-400/30 transition"
              >
                Contact Founder
              </a>
            </div>
          </div>
        </div>

        <Link
          href="/"
          className="mt-7 inline-flex rounded-full border border-slate-400/45 bg-slate-700/30 px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700/45 transition"
        >
          Back to Homepage
        </Link>
      </section>
    </main>
  );
}
