import Link from "next/link";

type WhatsNewFeature = {
  version: string;
  period: string;
  title: string;
  detail: string;
  href: string;
  hrefLabel: string;
};

const WHATS_NEW_FEATURED: WhatsNewFeature[] = [
  {
    version: "v3.9",
    period: "February 28, 2026",
    title: "UI Kit + Admin + Unified Preview",
    detail:
      "Delivered the UI kit shell, admin dashboard lane, and unified preview behavior across chart families.",
    href: "/whats-new",
    hrefLabel: "Open v3.9 Release",
  },
  {
    version: "v3.8",
    period: "February 28, 2026",
    title: "Netlify Reliability + IACP Gates",
    detail:
      "Hardened cloud build parity and formalized agent quality gates for safer release operations.",
    href: "/deployment-notes",
    hrefLabel: "View Deployment Notes",
  },
  {
    version: "v3.6-v3.7",
    period: "February 27, 2026",
    title: "Engine + QA Expansion",
    detail:
      "Expanded stochastic engine wiring and Blue Team anomaly detection for audit-readiness workflows.",
    href: "/whats-new",
    hrefLabel: "Inspect QA Timeline",
  },
];

const RELEASE_TIMELINE = [
  { version: "v3.9", period: "Feb 2026" },
  { version: "v3.8", period: "Feb 2026" },
  { version: "v3.7", period: "Feb 2026" },
  { version: "v3.6", period: "Feb 2026" },
  { version: "v3.5", period: "Feb 2026" },
  { version: "v3.4", period: "Feb 2026" },
  { version: "v3.2", period: "Feb 2026" },
  { version: "v3.1", period: "Jan 2026" },
  { version: "v3.0", period: "Jan 2026" },
  { version: "v2.5", period: "Dec 2025" },
  { version: "v2.4", period: "Dec 2025" },
  { version: "v2.3", period: "Dec 2025" },
  { version: "v2.2", period: "Nov 2025" },
  { version: "v2.1", period: "Nov 2025" },
  { version: "v2.0", period: "Nov 2025" },
  { version: "v1.4", period: "Nov 2025" },
  { version: "v1.3", period: "Oct 2025" },
  { version: "v1.2", period: "Oct 2025" },
  { version: "v1.1", period: "Oct 2025" },
  { version: "v1.0", period: "Oct 2025" },
] as const;

export function ReleasePortal() {
  return (
    <section className="futuristic-panel p-6 border-blue-500/30 bg-gradient-to-br from-blue-500/10 to-transparent">
      <p className="landing-mono text-xs text-blue-200">What&apos;s New Portal</p>
      <h3 className="landing-mono mt-2 text-2xl text-blue-50">Window Inside The Release Window</h3>
      <p className="mt-3 max-w-3xl text-xs leading-6 text-blue-100/85">
        Structured timeline preview from v1.0 to v3.9. Open the portal door to access the full release archive.
      </p>

      <div className="mt-5 rounded-2xl border border-cyan-400/25 bg-slate-950/70 p-3 sm:p-4">
        <div className="mb-3 flex items-center gap-2 border-b border-cyan-400/20 pb-3">
          <span className="h-2.5 w-2.5 rounded-full bg-cyan-300/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-blue-300/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-300/80" />
          <p className="ml-2 text-[10px] uppercase tracking-[0.18em] text-cyan-100/80">
            Release Portal • Oct 2025 -&gt; Feb 2026
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.25fr,0.9fr]">
          <div className="grid gap-3 sm:grid-cols-2">
            {WHATS_NEW_FEATURED.map((item) => (
              <article key={item.title} className="rounded-xl border border-blue-400/25 bg-slate-900/70 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-blue-300/40 bg-blue-400/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-blue-100">
                    {item.version}
                  </span>
                  <p className="text-[10px] uppercase tracking-widest text-blue-200/80">{item.period}</p>
                </div>
                <h4 className="mt-2 text-sm font-semibold text-blue-50">{item.title}</h4>
                <p className="mt-2 text-xs leading-6 text-slate-200">{item.detail}</p>
                <Link
                  href={item.href}
                  className="mt-3 inline-flex rounded-full border border-blue-300/45 bg-blue-400/20 px-3 py-2 text-[11px] font-semibold text-blue-50 hover:bg-blue-400/30 transition"
                >
                  {item.hrefLabel}
                </Link>
              </article>
            ))}
          </div>

          <aside className="rounded-xl border border-cyan-400/25 bg-slate-900/70 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-100">Full Timeline Index</p>
            <div className="mt-3 max-h-56 space-y-2 overflow-y-auto pr-1">
              {RELEASE_TIMELINE.map((release) => (
                <div key={release.version} className="flex items-center justify-between rounded-lg border border-cyan-500/20 bg-cyan-500/5 px-2 py-1.5">
                  <span className="text-xs font-semibold text-cyan-50">{release.version}</span>
                  <span className="text-[10px] uppercase tracking-wider text-cyan-200/80">{release.period}</span>
                </div>
              ))}
            </div>
            <Link
              href="/whats-new"
              className="mt-4 inline-flex w-full items-center justify-center rounded-lg border border-cyan-300/50 bg-cyan-400/20 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-cyan-50 hover:bg-cyan-400/30 transition"
              aria-label="Open full release timeline at whats new page"
            >
              Open Timeline Door
            </Link>
          </aside>
        </div>
      </div>
    </section>
  );
}
