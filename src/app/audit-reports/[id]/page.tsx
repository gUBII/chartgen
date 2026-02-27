"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

interface GapReportResult {
  id: string;
  from: string;
  to: string;
  scope?: string;
  kpiMetrics: {
    completionRate: number;
    errorRate: number;
    avgProcessingTime: number;
  };
  aiSummary: string;
  recommendations: string[];
  generatedAt: string;
}

export default function AuditReportPage() {
  const params = useParams();
  const id = params.id as string;
  const [report, setReport] = useState<GapReportResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchReport = async () => {
      try {
        const response = await fetch(`/api/audit/gap-report/${id}`);
        if (!response.ok) {
          setError("Report not found");
          return;
        }
        const data = await response.json();
        setReport(data);
      } catch (err) {
        console.error("Error fetching report:", err);
        setError("Failed to load report");
      } finally {
        setLoading(false);
      }
    };

    fetchReport();
  }, [id]);

  if (loading) {
    return (
      <main className="mx-auto max-w-7xl px-6 pt-10 pb-16">
        <p className="text-slate-400">Loading report...</p>
      </main>
    );
  }

  if (error || !report) {
    return (
      <main className="mx-auto max-w-7xl px-6 pt-10 pb-16">
        <p className="text-red-400">{error || "Report not found"}</p>
        <Link href="/audit-engine" className="text-cyan-300 hover:text-cyan-100 mt-4 inline-block">
          ← Back to Audit Engine
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl px-6 pt-10 pb-16 space-y-8">
      <section className="futuristic-panel p-8 sm:p-10">
        <p className="landing-mono text-xs text-blue-200">Gap Analysis Report</p>
        <h2 className="landing-mono mt-3 text-[clamp(2rem,5vw,3.4rem)] text-blue-50">
          Report {report.id.slice(0, 8)}
        </h2>
        <p className="text-muted mt-4 text-sm sm:text-base">
          Generated {new Date(report.generatedAt).toLocaleString()} • {report.from} to {report.to}
          {report.scope && ` • Scope: ${report.scope}`}
        </p>
        <Link href="/audit-engine" className="text-cyan-300 hover:text-cyan-100 text-xs mt-5 inline-block">
          ← Back to Audit Engine
        </Link>
      </section>

      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="futuristic-panel p-6">
          <div className="text-2xl font-bold text-emerald-400">
            {(report.kpiMetrics.completionRate * 100).toFixed(1)}%
          </div>
          <p className="text-slate-300 text-xs mt-1">Completion Rate</p>
        </div>
        <div className="futuristic-panel p-6">
          <div className="text-2xl font-bold text-cyan-400">
            {(report.kpiMetrics.errorRate * 100).toFixed(2)}%
          </div>
          <p className="text-slate-300 text-xs mt-1">Error Rate</p>
        </div>
        <div className="futuristic-panel p-6">
          <div className="text-2xl font-bold text-orange-400">
            {(report.kpiMetrics.avgProcessingTime / 1000).toFixed(1)}s
          </div>
          <p className="text-slate-300 text-xs mt-1">Avg Processing Time</p>
        </div>
      </section>

      <section className="futuristic-panel p-6 space-y-4">
        <h3 className="landing-mono text-lg text-blue-50">AI Analysis Summary</h3>
        <p className="text-slate-200 text-sm leading-relaxed">{report.aiSummary}</p>
      </section>

      <section className="futuristic-panel p-6 space-y-4">
        <h3 className="landing-mono text-lg text-blue-50">Recommendations</h3>
        <ul className="space-y-2">
          {report.recommendations.map((rec, i) => (
            <li key={i} className="flex gap-3 text-sm text-slate-200">
              <span className="text-emerald-400 font-bold">{i + 1}.</span>
              <span>{rec}</span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
