"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type EntityType = "meal" | "mar" | "audit" | "batch";
type ExplorerRow = Record<string, unknown>;

type ExplorerResponse = {
  ok?: boolean;
  data?: {
    entity: EntityType;
    page: number;
    pageSize: number;
    total: number;
    rows: ExplorerRow[];
  };
  error?: string;
};

const PAGE_SIZE = 25;

const toDisplayDateTime = (value: unknown): string => {
  if (!value) return "-";
  const d = new Date(String(value));
  return Number.isNaN(d.getTime()) ? "-" : d.toLocaleString();
};

const extractParticipant = (row: ExplorerRow): string => {
  const participant = row.participant as { id?: string; fullName?: string } | undefined;
  if (participant?.fullName) {
    return participant.id
      ? `${participant.fullName} (${participant.id.slice(0, 8)})`
      : participant.fullName;
  }
  const participantId = row.participantId;
  return participantId ? String(participantId) : "-";
};

const extractActor = (row: ExplorerRow): string => {
  const actorCandidates = [
    row.actorStaff,
    row.createdByStaff,
    row.approvedByStaff,
    row.requestedByStaff,
    row.reviewedByStaff,
  ] as Array<{ displayName?: string; id?: string; role?: string } | undefined>;

  for (const actor of actorCandidates) {
    if (actor?.displayName) {
      return `${actor.displayName}${actor.role ? ` (${actor.role})` : ""}`;
    }
  }

  const fallbackStaffId = row.staffId ?? row.createdByStaffId ?? row.actorStaffId;
  return fallbackStaffId ? String(fallbackStaffId) : "-";
};

const extractWhen = (row: ExplorerRow): string => {
  const keys = [
    "timestamp",
    "scheduledAdminTime",
    "actualAdminTime",
    "createdAt",
    "recoveryStart",
    "recoveryEnd",
  ] as const;
  for (const key of keys) {
    if (row[key]) return toDisplayDateTime(row[key]);
  }
  return "-";
};

const extractState = (row: ExplorerRow): string => {
  if (row.statusReview) return String(row.statusReview);
  if (row.status) return String(row.status);
  if (row.action) return String(row.action);
  if (row.entityType) return String(row.entityType);
  return "-";
};

const extractSummary = (entity: EntityType, row: ExplorerRow): string => {
  if (entity === "meal") {
    return `${String(row.mealType ?? "-")} • ${String(row.amountEaten ?? "-")} • ${String(row.volumeMl ?? "-")}ml`;
  }
  if (entity === "mar") {
    return `${String(row.medicationName ?? "-")} ${String(row.dosage ?? "-")} • ${String(row.status ?? "-")}`;
  }
  if (entity === "audit") {
    return `${String(row.action ?? "-")} on ${String(row.entityType ?? "-")} (${String(row.entityId ?? "-")})`;
  }
  return String(row.reason ?? "Restoration batch");
};

export default function AuditExplorerPage() {
  const [entityType, setEntityType] = useState<EntityType>("audit");
  const [searchTerm, setSearchTerm] = useState("");
  const [participantId, setParticipantId] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<ExplorerRow[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [errorText, setErrorText] = useState("");
  const [statusText, setStatusText] = useState("Ready.");
  const [selectedRowId, setSelectedRowId] = useState<string>("");

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      setErrorText("");
      setStatusText("Loading explorer records...");
      try {
        const params = new URLSearchParams({
          entity: entityType,
          page: String(page),
          pageSize: String(PAGE_SIZE),
        });
        if (participantId.trim()) params.set("participantId", participantId.trim());
        if (fromDate) params.set("from", fromDate);
        if (toDate) params.set("to", toDate);

        const response = await fetch(`/api/audit/explorer?${params.toString()}`, {
          method: "GET",
        });
        const payload: ExplorerResponse = await response.json().catch(() => ({
          ok: false,
          error: "Invalid response from explorer API.",
        }));

        if (!response.ok || !payload.ok || !payload.data) {
          throw new Error(payload.error || "Failed to load explorer data.");
        }

        setRows(payload.data.rows);
        setTotal(payload.data.total);
        setStatusText(`Loaded ${payload.data.rows.length} rows (total ${payload.data.total}).`);
      } catch (error) {
        setRows([]);
        setTotal(0);
        setErrorText(error instanceof Error ? error.message : "Failed to load explorer data.");
        setStatusText("Explorer load failed.");
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [entityType, page, participantId, fromDate, toDate]);

  const filteredRows = useMemo(() => {
    if (!searchTerm.trim()) return rows;
    const query = searchTerm.toLowerCase();
    return rows.filter((row) => JSON.stringify(row).toLowerCase().includes(query));
  }, [rows, searchTerm]);

  const selectedRow = useMemo(() => {
    if (!selectedRowId) return null;
    return filteredRows.find((row) => String(row.id) === selectedRowId) ?? null;
  }, [filteredRows, selectedRowId]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <main className="mx-auto max-w-7xl px-6 pt-10 pb-16 space-y-8">
      <section className="futuristic-panel p-8 sm:p-10">
        <p className="landing-mono text-xs text-blue-200">Data Explorer</p>
        <h2 className="landing-mono mt-3 text-[clamp(2rem,5vw,3.4rem)] text-blue-50">Audit Explorer</h2>
        <p className="text-muted mt-4 max-w-3xl text-sm sm:text-base">
          API-backed explorer with filter and drill-down across meal, MAR, audit, and batch records.
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
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
          <div>
            <label className="block text-xs text-slate-300 mb-2">Entity Type</label>
            <select
              value={entityType}
              onChange={(e) => {
                setEntityType(e.target.value as EntityType);
                setPage(1);
                setSelectedRowId("");
              }}
              className="w-full px-3 py-2 rounded border border-slate-600 bg-slate-900 text-slate-100 text-sm"
            >
              <option value="meal">Meals</option>
              <option value="mar">Medications (MAR)</option>
              <option value="audit">Audit Events</option>
              <option value="batch">Batches</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-300 mb-2">Participant ID (optional)</label>
            <input
              type="text"
              value={participantId}
              onChange={(e) => {
                setParticipantId(e.target.value);
                setPage(1);
              }}
              placeholder="Filter by participant"
              className="w-full px-3 py-2 rounded border border-slate-600 bg-slate-900 text-slate-100 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-300 mb-2">From</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => {
                setFromDate(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 rounded border border-slate-600 bg-slate-900 text-slate-100 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-300 mb-2">To</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => {
                setToDate(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 rounded border border-slate-600 bg-slate-900 text-slate-100 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-300 mb-2">Search in current page</label>
            <input
              type="text"
              placeholder="ID, status, name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 rounded border border-slate-600 bg-slate-900 text-slate-100 text-sm"
            />
          </div>
        </div>
        <div className="text-xs text-slate-300">
          <span className="font-semibold">Status:</span> {statusText}
        </div>
        {errorText ? (
          <div className="rounded border border-red-500/50 bg-red-500/10 px-3 py-2 text-xs text-red-200">
            {errorText}
          </div>
        ) : null}
      </section>

      <section className="futuristic-panel p-6">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-600">
                <th className="px-3 py-2 text-left text-slate-300 font-semibold">ID</th>
                <th className="px-3 py-2 text-left text-slate-300 font-semibold">Participant</th>
                <th className="px-3 py-2 text-left text-slate-300 font-semibold">Actor</th>
                <th className="px-3 py-2 text-left text-slate-300 font-semibold">When</th>
                <th className="px-3 py-2 text-left text-slate-300 font-semibold">Summary</th>
                <th className="px-3 py-2 text-left text-slate-300 font-semibold">State</th>
              </tr>
            </thead>
            <tbody>
              {!isLoading && filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-4 text-center text-slate-400">
                    No results found
                  </td>
                </tr>
              ) : (
                filteredRows.map((row) => {
                  const rowId = String(row.id ?? "");
                  const isSelected = selectedRowId === rowId;
                  return (
                    <tr
                      key={rowId}
                      className={`border-b border-slate-700 hover:bg-slate-900/50 cursor-pointer ${isSelected ? "bg-blue-900/20" : ""}`}
                      onClick={() => setSelectedRowId(rowId)}
                    >
                      <td className="px-3 py-2 text-slate-300 font-mono text-xs">{rowId || "-"}</td>
                      <td className="px-3 py-2 text-slate-100">{extractParticipant(row)}</td>
                      <td className="px-3 py-2 text-slate-300">{extractActor(row)}</td>
                      <td className="px-3 py-2 text-slate-300">{extractWhen(row)}</td>
                      <td className="px-3 py-2 text-slate-100">{extractSummary(entityType, row)}</td>
                      <td className="px-3 py-2 text-slate-300">{extractState(row)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-slate-400">
            Page {page} of {totalPages} • server total {total} • showing {filteredRows.length} rows after local search
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-3 py-1 rounded border border-slate-600 text-slate-300 hover:text-slate-100 disabled:opacity-50 text-xs"
            >
              ← Previous
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="px-3 py-1 rounded border border-slate-600 text-slate-300 hover:text-slate-100 disabled:opacity-50 text-xs"
            >
              Next →
            </button>
          </div>
        </div>
      </section>

      {selectedRow ? (
        <section className="futuristic-panel p-6">
          <h3 className="landing-mono text-lg text-blue-50">Row Drill-Down</h3>
          <p className="mt-2 text-xs text-slate-300">
            Selected ID: <span className="font-mono">{String(selectedRow.id)}</span>
          </p>
          <pre className="mt-3 overflow-x-auto rounded-lg border border-slate-700 bg-slate-950/70 p-3 text-xs text-slate-200">
            {JSON.stringify(selectedRow, null, 2)}
          </pre>
        </section>
      ) : null}
    </main>
  );
}
