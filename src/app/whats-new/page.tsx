import Link from "next/link";

type Release = {
  version: string;
  title: string;
  date: string;
  highlights: string[];
};

const RELEASES: Release[] = [
  {
    version: "v3.9",
    title: "UI Kit + Admin Dashboard + Preview API Unification",
    date: "February 28, 2026",
    highlights: [
      "Added reusable UI kit primitives and app shell components for consistent rendering across routes.",
      "Added `/admin` dashboard with participant/staff CRUD and chart-entry management workflows.",
      "Unified preview API behavior across Meal, MAR, Sleep, BGL, and Bowel families.",
      "Removed legacy `/mealtime-chartgen` alias and updated navigation references to canonical routes.",
      "Synced release/docs/protocol truth to current production behavior.",
    ],
  },
  {
    version: "v3.8",
    title: "Netlify Reliability + IACP Guardrail Upgrade",
    date: "February 28, 2026",
    highlights: [
      "Unified ESLint cloud config to `.mjs` for Node compatibility across local and Netlify environments.",
      "Prepended Prisma client generation before Netlify build to prevent stale-client schema mismatches.",
      "Added schema collision gate and strict PASS semantics for destructive-schema prevention.",
      "Consolidated IACP protocol docs (roles, gates, templates) for predictable multi-agent execution.",
    ],
  },
  {
    version: "v3.7",
    title: "Engine Wiring + Multi-Chart Stabilization",
    date: "February 27, 2026",
    highlights: [
      "Wired chart modules through stochastic timeline realization and transactional persistence.",
      "Refactored grouped commit API with strict model checks and 422 validation on invalid source/type payloads.",
      "Stabilized auth/session behavior for Netlify cookie handling and login-loop recovery.",
      "Kept Phase E restoration tab UX with explicit defect visibility and safer mixed-entry classification.",
    ],
  },
  {
    version: "v3.6",
    title: "Blue Team Anomaly Detector + QA Foundations",
    date: "February 27, 2026",
    highlights: [
      "Added `/api/qa/detect-anomalies` with Ghost Shift, Constipation Gap, and Unauthorised Restraint detection.",
      "Added QA test harness and readiness docs for anomaly validation using synthetic records.",
      "Introduced modular restoration scaffolding for deterministic synthetic QA generation.",
    ],
  },
  {
    version: "v3.5",
    title: "Phase E + Post-Release Hardening",
    date: "February 27, 2026",
    highlights: [
      "Implemented grouped commit payload: single `/api/engine/commit` endpoint handles 8 log types (MAR, Meal, Sleep, BGL, Bowel, Hygiene, Community, Repositioning) transactionally.",
      "Refactored restoration dashboard with tabbed UI (Medication | Nutrition & Bowel | Night Routine | Health & Vitals) and defect highlighting (amber backgrounds for flagged rows).",
      "Tightened validation: source/type normalization now rejects invalid values (422) instead of silent coercion; ambiguous bowel types throw AMBIGUOUS_BOWEL_TYPE error.",
      "Fixed grouped model validation to check all 8 models upfront with explicit error messages naming missing models.",
      "Added Prisma `rhel-openssl-3.0.x` binary target for Netlify Edge runtime (fixes 502 engine mismatch errors).",
      "Hardened auth session loop with cookie-header fallback logic for improved resolution reliability.",
      "Created UAT seed scripts (`seed-uat-staff.mjs`, `seed-uat-participant.mjs`) for production testing setup.",
      "Migrated gap-report storage from `/tmp` to PostgreSQL with database-first read strategy and optional fallback.",
    ],
  },
  {
    version: "v3.4",
    title: "KPI Engine & Gemini Flash AI Gap-Report",
    date: "February 27, 2026",
    highlights: [
      "Implemented KPI Engine with Gemini Flash AI integration for gap-report analysis.",
      "Added `/audit-engine` for KPI trends, recommendations, and AI gap-report generation.",
      "Added `/audit-explorer` with data table browser (meal/mar/audit/batch entities with filter/pagination).",
      "Protected `/api/audit/gap-report` endpoint for AI-powered analysis with date-range KPI computation.",
      "Enhanced meal and MAR generators with optional `seed` and `profile` for deterministic stochastic modifiers.",
      "Implemented configurable session TTL via `SESSION_TTL_SEC` environment variable.",
    ],
  },
  {
    version: "v3.2",
    title: "Mobile Navigation + Header Compaction",
    date: "February 27, 2026",
    highlights: [
      "Added homepage What's New section with release cards.",
      "Reduced first-paint auth/nav flicker by resolving role state before restricted indicators.",
      "Fixed auth hydration cookie-parity to read `gwc_session` with legacy `session` fallback.",
      "Added mobile-only dropdown menu toggle to prevent navigation from occupying half of the viewport.",
      "Compacted mobile header spacing and support text for higher first-screen content density.",
      "Raised visible app release marker to v3.2.",
    ],
  },
  {
    version: "v3.1",
    title: "Production Truth and Stability Verification",
    date: "January 2026",
    highlights: [
      "Production deploy verification workflow formalized and documented.",
      "Live DB health sampling integrated into operations cadence.",
      "Next-stage hydration hardening tasks documented.",
    ],
  },
  {
    version: "v3.0",
    title: "Mobile UAT Set A + Brainstorm Workflow",
    date: "January 2026",
    highlights: [
      "Replaced blank KPIgen route with governance signal content.",
      "Improved mobile typography scaling, touch targets, and toolbar responsiveness.",
      "Added brainstormz protocol and mobile UAT execution documentation.",
    ],
  },
  {
    version: "v2.5",
    title: "Lint Workflow Stabilization",
    date: "December 2025",
    highlights: [
      "Moved lint execution to deterministic ESLint command path for Next 16.",
      "Captured known lint debt for explicit follow-up lane.",
      "Aligned build + lint reporting into release operations flow.",
    ],
  },
  {
    version: "v2.4",
    title: "Auth Transition Test Coverage",
    date: "December 2025",
    highlights: [
      "Added login-to-nav state transition integration tests.",
      "Covered full/guest boundaries and logout reset behavior.",
      "Documented practical testing approach in project docs.",
    ],
  },
  {
    version: "v2.3",
    title: "Identity-Aware Login (Phase 1)",
    date: "December 2025",
    highlights: [
      "Introduced optional username + password login path for full users.",
      "Preserved backward compatibility with legacy password-only login.",
      "Extended session payload for identity-aware auth evolution.",
    ],
  },
  {
    version: "v2.2",
    title: "Agent-Orchestrated Delivery Model",
    date: "November 2025",
    highlights: [
      "Added Claude and Gemini communication channels with structured handshakes.",
      "Introduced orchestration, digest, and evidence-gate planning docs.",
      "Improved role reactivity fixes in shared navigation flow.",
    ],
  },
  {
    version: "v2.1",
    title: "Protected Online UAT + Session Hardening",
    date: "November 2025",
    highlights: [
      "Added protected `/api/ops/db-health` and `/api/ops/uat` endpoints.",
      "Implemented signed session hardening with expiry-aware auth checks.",
      "Enabled online stress/cleanup runs with JSON artifact persistence.",
    ],
  },
  {
    version: "v2.0",
    title: "Enterprise Rebrand and UAT Control Center",
    date: "November 2025",
    highlights: [
      "Shifted product positioning to Chartgen by gUBII enterprise framing.",
      "Added dedicated audit-readiness and deployment-notes pages.",
      "Introduced UAT command center and governance-oriented UI direction.",
    ],
  },
  {
    version: "v1.4",
    title: "Deployment Integrity and DB Workflow Clarity",
    date: "November 2025",
    highlights: [
      "Documented Neon pooled/direct URL deployment model.",
      "Improved operational links truth workflow for deploy verification.",
      "Expanded deployment safety guidance for migrations and rollbacks.",
    ],
  },
  {
    version: "v1.3",
    title: "PDF Export and Personalization",
    date: "October 2025",
    highlights: [
      "Added on-demand PDF export for meal and MAR preview charts.",
      "Added personalized founder profile and product presentation updates.",
      "Prepared deployment config for production migration flows.",
    ],
  },
  {
    version: "v1.2",
    title: "Audit Recovery and Provenance Enhancements",
    date: "October 2025",
    highlights: [
      "Added audit recovery enum values and migration updates.",
      "Refined audit generator behavior and verification utilities.",
      "Strengthened provenance and traceability implementation details.",
    ],
  },
  {
    version: "v1.1",
    title: "Approval Governance Controls",
    date: "October 2025",
    highlights: [
      "Added role-based approval rules and batch review controls.",
      "Expanded MAR statuses to better represent real-world administration outcomes.",
      "Improved preview validation and realism behavior in engine flows.",
    ],
  },
  {
    version: "v1.0",
    title: "Core Clinical Chart Engine Foundation",
    date: "October 2025",
    highlights: [
      "Created base Prisma schema for meal and medication tracking.",
      "Implemented restoration API + dashboard workflow foundations.",
      "Established candidate generation, review, and commit architecture baseline.",
    ],
  },
];

export default function WhatsNewPage() {
  return (
    <main className="mx-auto max-w-7xl px-6 pt-10 pb-16 space-y-6">
      <section className="futuristic-panel p-8 sm:p-10">
        <p className="landing-mono text-xs text-blue-200">Release Timeline</p>
        <h2 className="landing-mono mt-3 text-[clamp(2rem,5vw,3.4rem)] text-blue-50">What&apos;s New: v1.0 to v3.9</h2>
        <p className="text-muted mt-4 max-w-3xl text-sm sm:text-base">
          Full staged feature ledger of everything delivered so far, organized by release milestone (timeline window: October 2025 to February 2026).
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            href="/"
            className="rounded-full border border-cyan-300/45 bg-cyan-400/20 px-4 py-2 text-xs font-semibold text-cyan-50 hover:bg-cyan-400/30 transition"
          >
            Back to Home
          </Link>
          <Link
            href="/uat"
            className="rounded-full border border-emerald-300/45 bg-emerald-400/20 px-4 py-2 text-xs font-semibold text-emerald-50 hover:bg-emerald-400/30 transition"
          >
            Open UAT Control Center
          </Link>
        </div>
      </section>

      <section className="space-y-4">
        {RELEASES.map((release) => (
          <article key={release.version} className="futuristic-panel p-6 border-blue-500/25">
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-full border border-blue-300/45 bg-blue-400/20 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-blue-100">
                {release.version}
              </span>
              <p className="text-[11px] uppercase tracking-widest text-blue-200/80">{release.date}</p>
            </div>
            <h3 className="landing-mono mt-3 text-xl text-blue-50">{release.title}</h3>
            <ul className="mt-4 space-y-2 text-sm text-slate-200">
              {release.highlights.map((highlight) => (
                <li key={highlight}>- {highlight}</li>
              ))}
            </ul>
          </article>
        ))}
      </section>
    </main>
  );
}
