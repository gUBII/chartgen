"use client";

import { useState } from "react";
import Link from "next/link";

export default function AuditEnginePage() {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [reportId, setReportId] = useState<string | null>(null);

  const handleGenerateReport = async () => {
    if (!dateFrom || !dateTo) {
      alert("Please select date range");
      return;
    }

    setIsGenerating(true);
    try {
      const response = await fetch("/api/audit/gap-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          from: dateFrom,
          to: dateTo,
          scope: "audit",
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setReportId(data.id);
      } else {
        alert("Failed to generate report");
      }
    } catch (error) {
      console.error("Error:", error);
      alert("Error generating report");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <main className="mx-auto max-w-7xl px-6 pt-10 pb-16 space-y-8">
      <section className="futuristic-panel p-8 sm:p-10">
        <p className="landing-mono text-xs text-blue-200">Audit Analytics</p>
        <h2 className="landing-mono mt-3 text-[clamp(2rem,5vw,3.4rem)] text-blue-50">Audit Engine</h2>
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

      <section className="futuristic-panel p-6 space-y-4">
        <h3 className="landing-mono text-lg text-blue-50">Generate AI Gap Report</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-slate-300 mb-2">From Date</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full px-3 py-2 rounded border border-slate-600 bg-slate-900 text-slate-100 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-300 mb-2">To Date</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full px-3 py-2 rounded border border-slate-600 bg-slate-900 text-slate-100 text-sm"
            />
          </div>
        </div>
        <button
          onClick={handleGenerateReport}
          disabled={isGenerating}
          className="mt-4 px-6 py-2 rounded-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white text-sm font-semibold transition"
        >
          {isGenerating ? "Generating..." : "Generate AI Gap Report"}
        </button>

        {reportId && (
          <div className="mt-4 p-4 bg-emerald-900/20 border border-emerald-500/50 rounded">
            <p className="text-emerald-100 text-sm">
              Report generated: <code className="text-emerald-300">{reportId}</code>
            </p>
            <Link
              href={`/audit-reports/${reportId}`}
              className="inline-block mt-2 text-emerald-300 hover:text-emerald-100 text-xs underline"
            >
              View Report →
            </Link>
          </div>
        )}
      </section>

      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="futuristic-panel p-6">
          <div className="text-2xl font-bold text-emerald-400">87%</div>
          <p className="text-slate-300 text-xs mt-1">Avg Completion Rate</p>
        </div>
        <div className="futuristic-panel p-6">
          <div className="text-2xl font-bold text-cyan-400">2.3%</div>
          <p className="text-slate-300 text-xs mt-1">Error Rate</p>
        </div>
        <div className="futuristic-panel p-6">
          <div className="text-2xl font-bold text-orange-400">3.2s</div>
          <p className="text-slate-300 text-xs mt-1">Avg Processing Time</p>
        </div>
      </section>
    </main>
  );
}
