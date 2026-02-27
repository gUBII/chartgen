"use client";

import { useState } from "react";
import Link from "next/link";

type EntityType = "meal" | "mar" | "audit" | "batch";

export default function AuditExplorerPage() {
  const [entityType, setEntityType] = useState<EntityType>("audit");
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);

  // Mock data for demonstration
  const mockEntities: Record<EntityType, Array<{ id: string; name: string; date: string; status: string }>> = {
    meal: [
      { id: "m1", name: "Morning Meal Log", date: "2026-02-27", status: "approved" },
      { id: "m2", name: "Evening Meal Log", date: "2026-02-27", status: "pending" },
    ],
    mar: [
      { id: "r1", name: "Patient A MAR", date: "2026-02-27", status: "administered" },
      { id: "r2", name: "Patient B MAR", date: "2026-02-26", status: "held" },
    ],
    audit: [
      { id: "a1", name: "Weekly Audit", date: "2026-02-27", status: "completed" },
      { id: "a2", name: "Compliance Check", date: "2026-02-26", status: "in_progress" },
    ],
    batch: [
      { id: "b1", name: "Batch 001", date: "2026-02-27", status: "processed" },
      { id: "b2", name: "Batch 002", date: "2026-02-26", status: "processing" },
    ],
  };

  const entities = mockEntities[entityType];
  const filtered = entities.filter(
    (e) =>
      e.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <main className="mx-auto max-w-7xl px-6 pt-10 pb-16 space-y-8">
      <section className="futuristic-panel p-8 sm:p-10">
        <p className="landing-mono text-xs text-blue-200">Data Explorer</p>
        <h2 className="landing-mono mt-3 text-[clamp(2rem,5vw,3.4rem)] text-blue-50">Audit Explorer</h2>
        <p className="text-muted mt-4 max-w-3xl text-sm sm:text-base">
          Browse and filter audit data: meals, medications, audit events, and batch operations.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            href="/"
            className="rounded-full border border-cyan-300/45 bg-cyan-400/20 px-4 py-2 text-xs font-semibold text-cyan-50 hover:bg-cyan-400/30 transition"
          >
            Back to Home
          </Link>
          <Link
            href="/audit-engine"
            className="rounded-full border border-emerald-300/45 bg-emerald-400/20 px-4 py-2 text-xs font-semibold text-emerald-50 hover:bg-emerald-400/30 transition"
          >
            Audit Engine
          </Link>
        </div>
      </section>

      <section className="futuristic-panel p-6 space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-xs text-slate-300 mb-2">Entity Type</label>
            <select
              value={entityType}
              onChange={(e) => {
                setEntityType(e.target.value as EntityType);
                setPage(1);
                setSearchTerm("");
              }}
              className="w-full px-3 py-2 rounded border border-slate-600 bg-slate-900 text-slate-100 text-sm"
            >
              <option value="meal">Meals</option>
              <option value="mar">Medications (MAR)</option>
              <option value="audit">Audit Events</option>
              <option value="batch">Batches</option>
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-xs text-slate-300 mb-2">Search</label>
            <input
              type="text"
              placeholder="ID or name..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 rounded border border-slate-600 bg-slate-900 text-slate-100 text-sm"
            />
          </div>
        </div>
      </section>

      <section className="futuristic-panel p-6">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-600">
                <th className="px-4 py-2 text-left text-slate-300 font-semibold">ID</th>
                <th className="px-4 py-2 text-left text-slate-300 font-semibold">Name</th>
                <th className="px-4 py-2 text-left text-slate-300 font-semibold">Date</th>
                <th className="px-4 py-2 text-left text-slate-300 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length > 0 ? (
                filtered.map((entity) => (
                  <tr key={entity.id} className="border-b border-slate-700 hover:bg-slate-900/50">
                    <td className="px-4 py-2 text-slate-300 font-mono text-xs">{entity.id}</td>
                    <td className="px-4 py-2 text-slate-100">{entity.name}</td>
                    <td className="px-4 py-2 text-slate-400">{entity.date}</td>
                    <td className="px-4 py-2">
                      <span className="inline-block px-2 py-1 rounded text-xs bg-emerald-900/30 text-emerald-300 border border-emerald-500/30">
                        {entity.status}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-4 py-4 text-center text-slate-400">
                    No results found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex justify-between items-center">
          <p className="text-xs text-slate-400">
            Showing {filtered.length} of {entities.length} items
          </p>
          <div className="flex gap-2">
            <button
              disabled={page === 1}
              className="px-3 py-1 rounded border border-slate-600 text-slate-300 hover:text-slate-100 disabled:opacity-50 text-xs"
            >
              ← Previous
            </button>
            <button className="px-3 py-1 rounded border border-slate-600 text-slate-300 hover:text-slate-100 text-xs">
              Next →
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
