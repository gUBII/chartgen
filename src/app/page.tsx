"use client";

import Link from "next/link";
import { useState } from "react";

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
    href: "/mealtime-chartgen",
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

function ProfileImage() {
  const [imageError, setImageError] = useState(false);

  if (imageError) {
    return (
      <div className="w-48 h-48 rounded-full border-2 border-cyan-400/50 bg-gray-800/50 flex items-center justify-center">
        <p className="text-xs text-gray-400 text-center px-4">Founder profile</p>
      </div>
    );
  }

  return (
    <img
      src="/gubii-profile.png"
      alt="Farhan Rashid (gUBII)"
      className="w-48 h-48 rounded-full object-cover border-2 border-cyan-400/50 shadow-lg"
      onError={() => setImageError(true)}
    />
  );
}

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

export default function HomePage() {
  return (
    <main className="mx-auto max-w-7xl px-6 pt-10 pb-16 space-y-6">
      <section className="futuristic-panel futuristic-grid relative p-8 sm:p-12">
        <p className="landing-mono text-xs text-cyan-100/80">Governance and Traceability Enhancement</p>
        <h2 className="landing-mono mt-3 max-w-4xl text-4xl leading-[1.05] text-cyan-50 sm:text-6xl">
          Chartgen by gUBII
        </h2>
        <p className="text-muted mt-4 max-w-3xl text-sm sm:text-base leading-relaxed">
          Compliance-grade chart audit modelling for NDIS-aligned documentation.
          <span className="block mt-2 text-cyan-100">Find documentation gaps before auditors do.</span>
        </p>
        <p className="mt-5 max-w-3xl rounded-xl border border-cyan-400/25 bg-cyan-500/10 px-4 py-3 text-xs leading-6 text-cyan-100/90">
          Deployed in Nexis365-hosted environments supporting GoodwillCare and COHS (independently authored).
        </p>
      </section>

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

      <section className="futuristic-panel p-6">
        <p className="landing-mono text-xs text-cyan-100/80">Core Positioning</p>
        <p className="mt-3 text-sm leading-7 text-slate-100">
          Chartgen is a governance-first clinical documentation audit engine that pressure-tests chart records against NDIS-aligned quality expectations in Nexis365-hosted environments.
        </p>
        <p className="text-muted mt-4 text-sm leading-7">
          Chartgen by gUBII is a compliance intelligence layer for clinical documentation. It models audit expectations, validates critical record elements, and makes gaps discoverable early before external audit pressure hits. Deployed in Nexis365-hosted environments for GoodwillCare and COHS, Chartgen is built for transparency, traceability, and audit readiness.
        </p>
      </section>

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

      <section className="grid gap-4 md:grid-cols-[1fr,1.4fr]">
        <div className="futuristic-panel p-8 flex flex-col items-center justify-center min-h-96 border-cyan-500/30 bg-gradient-to-br from-cyan-500/5 to-transparent">
          <ProfileImage />
        </div>
        <div className="futuristic-panel p-8 border-cyan-500/30 bg-gradient-to-br from-cyan-500/5 to-transparent">
          <p className="landing-mono text-xs text-cyan-300">Founder Authority</p>
          <h3 className="landing-mono mt-2 text-3xl text-cyan-50">Farhan Rashid (gUBII)</h3>
          <p className="text-muted mt-4 text-sm leading-relaxed">
            Farhan Rashid (gUBII) is a governance-first engineer and builder with security-led product instincts.
            As a founding security engineer in Nexis365 environments, he supported major migrations including legacy GoodwillCare into Nexis365-hosted operations and built operational foundations with auditability in mind.
          </p>
          <p className="text-muted mt-4 text-sm leading-relaxed">
            Chartgen is Farhan&apos;s independently authored compliance intelligence product, built as an audit modelling and documentation integrity layer for NDIS-aligned providers. The focus is evidence scaffolding that can withstand scrutiny: traceability, gap detection, and governance structure.
          </p>
          <a
            href="https://github.com/gUBII"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-flex rounded-full border border-cyan-200/50 bg-cyan-300/15 px-4 py-2 text-xs font-semibold text-cyan-50 hover:bg-cyan-300/25 transition"
          >
            Founder Profile
          </a>
        </div>
      </section>

      <section className="futuristic-panel p-8 border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-transparent">
        <p className="landing-mono text-xs text-amber-200">Enterprise Actions</p>
        <h3 className="landing-mono mt-2 text-2xl text-amber-50">Deployment, Audit, and Module Exploration</h3>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Link href="/mar" className="rounded-xl border border-cyan-300/40 bg-cyan-400/15 px-4 py-3 text-xs font-semibold text-cyan-50 hover:bg-cyan-400/25 transition text-center">
            Explore MAR Module
          </Link>
          <Link href="/mealtime-chartgen" className="rounded-xl border border-emerald-300/40 bg-emerald-400/15 px-4 py-3 text-xs font-semibold text-emerald-50 hover:bg-emerald-400/25 transition text-center">
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
    </main>
  );
}
