"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import type { AuditKpiResult } from "../../lib/audit-kpi";

// ─── Types ────────────────────────────────────────────────────────────────────

interface GapReport {
  id: string;
  from: string;
  to: string;
  scope: string | null;
  kpiMetrics: Record<string, number>;
  aiSummary: string;
  recommendations: string[];
  generatedAt: string;
}

type LoadState = "idle" | "loading" | "done" | "error";

// ─── KPI Section ─────────────────────────────────────────────────────────────

function KpiSection() {
  const [state, setState] = useState<LoadState>("loading");
  const [kpi, setKpi] = useState<AuditKpiResult | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    fetch("/api/audit/kpi")
      .then(async (res) => {
        if (!res.ok) {
          const payload = await res.json().catch(() => ({})) as { error?: string };
          throw new Error(payload.error ?? "Failed to load KPI.");
        }
        return res.json() as Promise<{ ok: boolean; data: AuditKpiResult }>;
      })
      .then(({ data }) => {
        setKpi(data);
        setState("done");
      })
      .catch((err: unknown) => {
        setErrorMsg(err instanceof Error ? err.message : "Unknown error.");
        setState("error");
      });
  }, []);

  if (state === "loading") {
    return (
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="futuristic-panel p-6 animate-pulse">
            <div className="h-8 w-16 bg-slate-700 rounded mb-2" />
            <div className="h-3 w-32 bg-slate-700 rounded" />
          </div>
        ))}
      </section>
    );
  }

  if (state === "error") {
    return (
      <section className="futuristic-panel p-4 border border-red-500/40 bg-red-500/10">
        <p className="text-xs text-red-300">KPI unavailable: {errorMsg}</p>
      </section>
    );
  }

  if (!kpi) return null;

  const completionPct = `${kpi.readiness.overallScore}%`;
  const errorRate =
    kpi.totals.auditEvents > 0
      ? `${((kpi.gaps.missingEvidence + kpi.gaps.continuityIssues) / kpi.totals.auditEvents * 100).toFixed(1)}%`
      : "—";
  const gapCount =
    kpi.gaps.missingEvidence +
    kpi.gaps.continuityIssues +
    kpi.gaps.exceptionWithoutFollowup;

  return (
    <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div className="futuristic-panel p-6">
        <div className="text-2xl font-bold text-emerald-400">{completionPct}</div>
        <p className="text-slate-300 text-xs mt-1">Audit Readiness Score</p>
      </div>
      <div className="futuristic-panel p-6">
        <div className="text-2xl font-bold text-cyan-400">{errorRate}</div>
        <p className="text-slate-300 text-xs mt-1">Gap Rate</p>
      </div>
      <div className="futuristic-panel p-6">
        <div className="text-2xl font-bold text-orange-400">{gapCount}</div>
        <p className="text-slate-300 text-xs mt-1">Open Gaps</p>
      </div>
    </section>
  );
}

// ─── Recent Reports Section ───────────────────────────────────────────────────

function RecentReportsSection() {
  const [state, setState] = useState<LoadState>("loading");
  const [reports, setReports] = useState<GapReport[]>([]);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    fetch("/api/audit/gap-report?limit=5")
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to load reports.");
        return res.json() as Promise<GapReport[]>;
      })
      .then((data) => {
        setReports(data);
        setState("done");
      })
      .catch((err: unknown) => {
        setErrorMsg(err instanceof Error ? err.message : "Unknown error.");
        setState("error");
      });
  }, []);

  return (
    <section className="futuristic-panel p-6 space-y-4">
      <h3 className="landing-mono text-lg text-blue-50">Recent Reports</h3>

      {state === "loading" && (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-10 bg-slate-800 rounded animate-pulse" />
          ))}
        </div>
      )}

      {state === "error" && (
        <div className="rounded border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-200">
          {errorMsg}
        </div>
      )}

      {state === "done" && reports.length === 0 && (
        <p className="text-xs text-slate-400">
          No reports yet. Generate your first report below.
        </p>
      )}

      {state === "done" && reports.length > 0 && (
        <ul className="divide-y divide-slate-700">
          {reports.map((r) => (
            <li key={r.id} className="py-3 flex items-center justify-between gap-4">
              <div>
                <p className="text-xs text-slate-200 font-semibold">
                  {r.from.slice(0, 10)} → {r.to.slice(0, 10)}
                  {r.scope ? (
                    <span className="ml-2 text-cyan-400">({r.scope})</span>
                  ) : null}
                </p>
                <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">
                  {r.aiSummary}
                </p>
              </div>
              <Link
                href={`/audit-reports/${r.id}`}
                className="shrink-0 text-xs text-emerald-300 hover:text-emerald-100 underline"
              >
                View →
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// ─── Generate Section ─────────────────────────────────────────────────────────

type GenerateState = "idle" | "generating" | "done" | "error";

function GenerateSection() {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [genState, setGenState] = useState<GenerateState>("idle");
  const [reportId, setReportId] = useState<string | null>(null);
  const [statusText, setStatusText] = useState("Ready.");
  const [errorText, setErrorText] = useState("");

  const handleGenerate = useCallback(async () => {
    setErrorText("");
    if (!dateFrom || !dateTo) {
      setErrorText("Please select a date range.");
      return;
    }
    setGenState("generating");
    setStatusText("Generating AI gap report…");
    try {
      const res = await fetch("/api/audit/gap-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ from: dateFrom, to: dateTo, scope: "audit" }),
      });
      if (res.ok) {
        const data = (await res.json()) as { id: string };
        setReportId(data.id);
        setStatusText(`Report generated: ${data.id}`);
        setGenState("done");
      } else {
        const payload = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        setErrorText(
          typeof payload.error === "string"
            ? payload.error
            : "Failed to generate report."
        );
        setStatusText("Generation failed.");
        setGenState("error");
      }
    } catch {
      setErrorText("Network error generating report.");
      setStatusText("Generation failed.");
      setGenState("error");
    }
  }, [dateFrom, dateTo]);

  const isGenerating = genState === "generating";

  return (
    <section className="futuristic-panel p-6 space-y-4">
      <h3 className="landing-mono text-lg text-blue-50">Generate AI Gap Report</h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-slate-300 mb-2">From Date</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            disabled={isGenerating}
            className="form-control"
          />
        </div>
        <div>
          <label className="block text-xs text-slate-300 mb-2">To Date</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            disabled={isGenerating}
            className="form-control"
          />
        </div>
      </div>

      <button
        onClick={handleGenerate}
        disabled={isGenerating}
        className="mt-2 px-6 py-2 rounded-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white text-sm font-semibold transition"
      >
        {isGenerating ? "Generating…" : "Generate AI Gap Report"}
      </button>

      <div className="mt-3 text-xs text-slate-300">
        <span className="font-semibold">Status:</span> {statusText}
      </div>

      {errorText && (
        <div className="rounded border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-200">
          {errorText}
        </div>
      )}

      {genState === "done" && reportId && (
        <div className="p-4 bg-emerald-900/20 border border-emerald-500/50 rounded">
          <p className="text-emerald-100 text-sm">
            Report generated:{" "}
            <code className="text-emerald-300">{reportId}</code>
          </p>
          <Link
            href={`/audit-reports/${reportId}`}
            className="inline-block mt-2 text-emerald-300 hover:text-emerald-100 text-xs font-semibold underline"
          >
            View Report →
          </Link>
        </div>
      )}
    </section>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AuditEnginePage() {
  return (
    <main className="mx-auto max-w-7xl px-6 pt-10 pb-16 space-y-8">
      <section className="futuristic-panel p-8 sm:p-10">
        <p className="landing-mono text-xs text-blue-200">Audit Analytics</p>
        <h2 className="landing-mono mt-3 text-[clamp(2rem,5vw,3.4rem)] text-blue-50">
          Audit Engine
        </h2>
        <p className="text-muted mt-4 max-w-3xl text-sm sm:text-base">
          KPI-driven audit analytics with AI-powered gap analysis and recommendations.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            href="/"
            className="rounded-full border border-cyan-300/45 bg-cyan-400/20 px-4 py-2 text-xs font-semibold text-cyan-50 hover:bg-cyan-400/30 transition"
          >
            Back to Home
          </Link>
          <Link
            href="/audit-explorer"
            className="rounded-full border border-emerald-300/45 bg-emerald-400/20 px-4 py-2 text-xs font-semibold text-emerald-50 hover:bg-emerald-400/30 transition"
          >
            Audit Explorer
          </Link>
        </div>
      </section>

      <KpiSection />
      <RecentReportsSection />
      <GenerateSection />
    </main>
  );
}
