import Link from "next/link";

type CoreModule = {
  id: string;
  name: string;
  route: string;
  access: "public" | "full";
  purpose: string;
  apis: string[];
  status: "live" | "in-progress";
};

const CORE_MODULES: CoreModule[] = [
  {
    id: "mar",
    name: "MAR Module",
    route: "/mar",
    access: "public",
    purpose: "Medication administration preview, review, and commit workflow.",
    apis: ["/api/engine/mar-preview", "/api/engine/commit", "/api/engine/export-pdf"],
    status: "live",
  },
  {
    id: "restoration",
    name: "Restoration Dashboard",
    route: "/restoration",
    access: "public",
    purpose: "Synthetic timeline generation and grouped ledger commit across chart families.",
    apis: ["/api/engine/preview", "/api/engine/commit", "/api/engine/export-pdf"],
    status: "live",
  },
  {
    id: "admin",
    name: "Admin Console",
    route: "/admin",
    access: "full",
    purpose: "Single-entry CRUD lane for chart families, staff, and participants.",
    apis: ["/api/admin/entries", "/api/admin/staff", "/api/admin/participants"],
    status: "live",
  },
  {
    id: "audit-engine",
    name: "Audit Engine",
    route: "/audit-engine",
    access: "full",
    purpose: "Gap-report generation and KPI-driven audit analysis.",
    apis: ["/api/audit/gap-report", "/api/audit/kpi"],
    status: "in-progress",
  },
  {
    id: "audit-explorer",
    name: "Audit Explorer",
    route: "/audit-explorer",
    access: "full",
    purpose: "Filterable explorer for audit events, meals, MAR logs, and restoration batches.",
    apis: ["/api/audit/explorer"],
    status: "live",
  },
  {
    id: "qa",
    name: "Blue Team QA",
    route: "/uat",
    access: "full",
    purpose: "Operational DB health, stress flows, cleanup controls, and anomaly surfaces.",
    apis: ["/api/ops/db-health", "/api/ops/uat", "/api/qa/detect-anomalies"],
    status: "live",
  },
];

const STATUS_STYLE: Record<CoreModule["status"], string> = {
  live: "border-emerald-300/40 bg-emerald-500/15 text-emerald-100",
  "in-progress": "border-amber-300/40 bg-amber-500/15 text-amber-100",
};

export default function ChartgenCorePage() {
  return (
    <main className="mx-auto max-w-7xl px-6 pt-10 pb-16 space-y-8">
      <section className="futuristic-panel p-8 sm:p-10 border-cyan-500/30 bg-gradient-to-br from-cyan-500/10 to-transparent">
        <p className="landing-mono text-xs text-cyan-200">Core System Catalog</p>
        <h2 className="landing-mono mt-3 text-[clamp(2rem,5vw,3.4rem)] text-cyan-50">
          Chartgen Core
        </h2>
        <p className="text-muted mt-4 max-w-3xl text-sm sm:text-base">
          Operational map of core modules, APIs, and access boundaries used for day-to-day governance and release decisions.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            href="/"
            className="rounded-full border border-cyan-300/45 bg-cyan-400/20 px-4 py-2 text-xs font-semibold text-cyan-50 hover:bg-cyan-400/30 transition"
          >
            Back to Home
          </Link>
          <Link
            href="/whats-new"
            className="rounded-full border border-blue-300/45 bg-blue-400/20 px-4 py-2 text-xs font-semibold text-blue-50 hover:bg-blue-400/30 transition"
          >
            View Release Timeline
          </Link>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {CORE_MODULES.map((module) => (
          <article key={module.id} className="futuristic-panel p-6 border-cyan-500/25">
            <div className="flex items-start justify-between gap-3">
              <h3 className="landing-mono text-lg text-cyan-50">{module.name}</h3>
              <span
                className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider ${STATUS_STYLE[module.status]}`}
              >
                {module.status === "live" ? "Live" : "In Progress"}
              </span>
            </div>
            <p className="mt-3 text-xs text-slate-200 leading-6">{module.purpose}</p>
            <div className="mt-4 text-[11px] text-slate-300">
              <p>
                <span className="font-semibold text-cyan-100">Route:</span>{" "}
                <code>{module.route}</code>
              </p>
              <p className="mt-1">
                <span className="font-semibold text-cyan-100">Access:</span>{" "}
                {module.access === "full" ? "Full user" : "Standard"}
              </p>
            </div>
            <div className="mt-3 space-y-1">
              {module.apis.map((api) => (
                <p key={api} className="text-[11px] text-slate-300">
                  - <code>{api}</code>
                </p>
              ))}
            </div>
            <Link
              href={module.route}
              className="mt-4 inline-flex rounded-full border border-cyan-300/40 bg-cyan-400/15 px-3 py-1.5 text-[11px] font-semibold text-cyan-50 hover:bg-cyan-400/25 transition"
            >
              Open Module
            </Link>
          </article>
        ))}
      </section>

      <section className="futuristic-panel p-6 border-blue-500/25">
        <p className="landing-mono text-xs text-blue-200">Execution Topology</p>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <div className="rounded-xl border border-blue-400/25 bg-slate-900/60 p-4">
            <p className="text-blue-100 text-xs font-semibold uppercase tracking-wider">Input Lane</p>
            <p className="mt-2 text-xs text-slate-200">Admin single-entry + generator previews create structured candidate data.</p>
          </div>
          <div className="rounded-xl border border-blue-400/25 bg-slate-900/60 p-4">
            <p className="text-blue-100 text-xs font-semibold uppercase tracking-wider">Validation Lane</p>
            <p className="mt-2 text-xs text-slate-200">Audit Engine, Explorer, and QA checks identify readiness gaps before commit.</p>
          </div>
          <div className="rounded-xl border border-blue-400/25 bg-slate-900/60 p-4">
            <p className="text-blue-100 text-xs font-semibold uppercase tracking-wider">Commit Lane</p>
            <p className="mt-2 text-xs text-slate-200">Grouped transaction writes promote records to the operational ledger atomically.</p>
          </div>
        </div>
      </section>
    </main>
  );
}
