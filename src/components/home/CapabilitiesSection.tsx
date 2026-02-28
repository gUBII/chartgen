import Link from "next/link";

type Capability = {
  key: string;
  title: string;
  summary: string;
  evidenceFields: string[];
  checks: string[];
  auditQuestions: string[];
  href: string;
  tone: "cyan" | "emerald" | "amber" | "blue";
};

const CAPABILITIES: Capability[] = [
  {
    key: "mar",
    title: "MAR Chart Module",
    summary:
      "Medication documentation audit modelling for administration clarity, traceability, and incident-ready evidence structure.",
    evidenceFields: [
      "Participant identifier",
      "Medication name, dosage, route",
      "Scheduled and actual administration timestamps",
      "Exception and omission context",
    ],
    checks: [
      "Completeness of required medication fields",
      "Consistency between status and exception details",
      "Timestamp continuity for administration records",
    ],
    auditQuestions: [
      "Can each medication entry be traced to a participant and time?",
      "Are omissions and deviations documented with sufficient context?",
    ],
    href: "/mar",
    tone: "cyan",
  },
  {
    key: "mealtime",
    title: "Mealtime Chart Module",
    summary:
      "Mealtime management documentation simulation with focus on plan adherence, swallowing observations, and evidence continuity.",
    evidenceFields: [
      "Participant identifier and meal timestamp",
      "Texture and thickness controls",
      "Amount consumed and deviation reason",
      "Swallow observation capture",
    ],
    checks: [
      "Required mealtime fields present for each record",
      "Consistency between volume and amount eaten",
      "Deviation traceability for review context",
    ],
    auditQuestions: [
      "Does the record show mealtime management controls clearly?",
      "Can a reviewer explain changes from plan intent quickly?",
    ],
    href: "/restoration",
    tone: "emerald",
  },
  {
    key: "traceability",
    title: "Audit Traceability Layer",
    summary:
      "Governance-focused who/what/when evidence structure for chart edits, approvals, and ledger promotion decisions.",
    evidenceFields: [
      "Actor identity and role",
      "Approval state transitions",
      "Commit event metadata",
      "Linked provenance hashes",
    ],
    checks: [
      "Segregation-of-duties guard signals",
      "Duplicate commit prevention markers",
      "Commit-time provenance verification status",
    ],
    auditQuestions: [
      "Who approved this data and under what role controls?",
      "Can this record history be reconstructed without gaps?",
    ],
    href: "/kpigen",
    tone: "blue",
  },
  {
    key: "integrity",
    title: "Integrity Checks Engine",
    summary:
      "Validation signal generation and stress workflows to pressure-test data quality and audit-readiness before formal review.",
    evidenceFields: [
      "Validation rule outcomes",
      "Risk signal tiering",
      "Stress-test output metrics",
      "Cleanup and reset controls",
    ],
    checks: [
      "Rule-based completeness and continuity checks",
      "UAT stress thresholds for latency and error rates",
      "Controlled cleanup safeguards",
    ],
    auditQuestions: [
      "What are the highest-risk documentation gaps right now?",
      "Are remediation actions measurable before external audit windows?",
    ],
    href: "/uat",
    tone: "amber",
  },
];

function toneClasses(tone: Capability["tone"]) {
  if (tone === "emerald") {
    return "from-emerald-500/25 text-emerald-100 border-emerald-400/35";
  }
  if (tone === "amber") {
    return "from-amber-500/25 text-amber-100 border-amber-400/35";
  }
  if (tone === "blue") {
    return "from-blue-500/25 text-blue-100 border-blue-400/35";
  }
  return "from-cyan-500/25 text-cyan-100 border-cyan-400/35";
}

export function CapabilitiesSection() {
  return (
    <section className="space-y-4">
      <div>
        <p className="landing-mono text-xs text-cyan-100/80">Product Capability Architecture</p>
        <h3 className="landing-mono mt-2 text-2xl text-cyan-50">Audit Modelling and Compliance Simulation</h3>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {CAPABILITIES.map((cap) => (
          <section key={cap.key} className="futuristic-panel p-6 border-cyan-500/25">
            <div className="flex items-start justify-between gap-3">
              <h4 className="landing-mono text-lg text-white">{cap.title}</h4>
              <span
                className={`rounded-full border px-3 py-1 text-[10px] uppercase tracking-widest bg-gradient-to-r to-transparent ${toneClasses(cap.tone)}`}
              >
                Module
              </span>
            </div>
            <p className="text-muted mt-3 text-sm leading-6">{cap.summary}</p>

            <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-cyan-100">Expected Evidence Fields</p>
            <ul className="mt-2 space-y-1 text-xs text-slate-200">
              {cap.evidenceFields.map((item) => (
                <li key={item}>- {item}</li>
              ))}
            </ul>

            <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-cyan-100">What Chartgen Checks</p>
            <ul className="mt-2 space-y-1 text-xs text-slate-200">
              {cap.checks.map((item) => (
                <li key={item}>- {item}</li>
              ))}
            </ul>

            <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-cyan-100">Audit Questions Supported</p>
            <ul className="mt-2 space-y-1 text-xs text-slate-200">
              {cap.auditQuestions.map((item) => (
                <li key={item}>- {item}</li>
              ))}
            </ul>

            <Link
              href={cap.href}
              className="mt-5 inline-flex rounded-full border border-cyan-300/40 bg-cyan-400/15 px-4 py-2 text-xs font-semibold text-cyan-50 hover:bg-cyan-400/25 transition"
            >
              Explore {cap.title}
            </Link>
          </section>
        ))}
      </div>
    </section>
  );
}
