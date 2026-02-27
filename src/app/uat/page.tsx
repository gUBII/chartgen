"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ColumnDef,
  SortingState,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";

type UatTrack = "Database" | "API" | "UI" | "Security";
type UatPriority = "P0" | "P1" | "P2";
type UatStatus = "Ready" | "Planned" | "Blocked";

type UatCase = {
  id: string;
  track: UatTrack;
  title: string;
  priority: UatPriority;
  owner: "Codex" | "Claude" | "Joint";
  status: UatStatus;
};

const UAT_CASES: UatCase[] = [
  {
    id: "UAT-001",
    track: "Database",
    title: "Read stress baseline on Neon",
    priority: "P0",
    owner: "Joint",
    status: "Ready",
  },
  {
    id: "UAT-002",
    track: "Database",
    title: "Dry-run cleanup against target participant",
    priority: "P0",
    owner: "Codex",
    status: "Ready",
  },
  {
    id: "UAT-003",
    track: "API",
    title: "Meal preview -> approve -> commit smoke",
    priority: "P1",
    owner: "Claude",
    status: "Planned",
  },
  {
    id: "UAT-004",
    track: "UI",
    title: "PDF export and route walkthrough",
    priority: "P1",
    owner: "Claude",
    status: "Planned",
  },
  {
    id: "UAT-005",
    track: "Security",
    title: "Auth migration plan and threat checklist",
    priority: "P2",
    owner: "Joint",
    status: "Planned",
  },
];

function priorityRank(priority: UatPriority) {
  if (priority === "P0") return 0;
  if (priority === "P1") return 1;
  return 2;
}

export default function UatPage() {
  const [sorting, setSorting] = useState<SortingState>([
    { id: "priority", desc: false },
  ]);
  const [copyState, setCopyState] = useState("");
  const [concurrency, setConcurrency] = useState(30);
  const [durationSec, setDurationSec] = useState(90);
  const [mode, setMode] = useState<"simple" | "realistic">("realistic");
  const [maxErrorRate, setMaxErrorRate] = useState(0.02);
  const [maxP95Ms, setMaxP95Ms] = useState(350);
  const [participantKey, setParticipantKey] = useState("112334");
  const [olderThanDays, setOlderThanDays] = useState(2);
  const [includeLive, setIncludeLive] = useState(false);

  const stressCommand = useMemo(
    () =>
      [
        "npm run db:stress --",
        `--concurrency ${concurrency}`,
        `--duration-sec ${durationSec}`,
        `--mode ${mode}`,
        `--max-error-rate ${maxErrorRate}`,
        `--max-p95-ms ${maxP95Ms}`,
      ].join(" "),
    [concurrency, durationSec, mode, maxErrorRate, maxP95Ms],
  );

  const cleanupDryRunCommand = useMemo(() => {
    const includeLiveFlag = includeLive ? " --include-live" : "";
    return `npm run db:cleanup:uat -- --participant-key ${participantKey} --older-than-days ${olderThanDays}${includeLiveFlag}`;
  }, [participantKey, olderThanDays, includeLive]);

  const cleanupApplyCommand = useMemo(
    () => `CONFIRM_UAT_CLEANUP=YES ${cleanupDryRunCommand} --apply`,
    [cleanupDryRunCommand],
  );

  const columns = useMemo<ColumnDef<UatCase>[]>(
    () => [
      { accessorKey: "id", header: "ID" },
      { accessorKey: "track", header: "Track" },
      { accessorKey: "title", header: "Test Case" },
      {
        accessorKey: "priority",
        header: "Priority",
        sortingFn: (a, b) =>
          priorityRank(a.original.priority) - priorityRank(b.original.priority),
      },
      { accessorKey: "owner", header: "Owner" },
      { accessorKey: "status", header: "Status" },
    ],
    [],
  );

  const table = useReactTable({
    data: UAT_CASES,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  async function copy(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopyState(`${label} copied`);
      setTimeout(() => setCopyState(""), 1600);
    } catch {
      setCopyState("Clipboard unavailable");
      setTimeout(() => setCopyState(""), 1600);
    }
  }

  return (
    <main className="mx-auto max-w-7xl px-6 pt-10 pb-16 space-y-6">
      <section className="futuristic-panel futuristic-grid p-8 sm:p-10">
        <p className="landing-mono text-xs text-cyan-100/80">UAT Command Deck</p>
        <h2 className="landing-mono mt-3 text-4xl text-cyan-50 sm:text-5xl">
          Online UAT Control Center
        </h2>
        <p className="text-muted mt-4 max-w-3xl text-sm">
          Coordinate Neon database checks, stress runs, cleanup operations, and
          release-readiness tracks. This page is optimized for fast execution and
          sortable visibility.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/mar"
            className="landing-mono rounded-full border border-cyan-200/50 bg-cyan-300/15 px-4 py-2 text-xs text-cyan-50 hover:bg-cyan-300/25 transition"
          >
            Back to MAR
          </Link>
          <a
            href="https://app.netlify.com/projects/chartgen-gubii"
            target="_blank"
            rel="noopener noreferrer"
            className="landing-mono rounded-full border border-emerald-200/50 bg-emerald-300/15 px-4 py-2 text-xs text-emerald-50 hover:bg-emerald-300/25 transition"
          >
            Open Netlify
          </a>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="futuristic-panel p-6 border-cyan-500/30">
          <p className="landing-mono text-xs text-cyan-200">DB Stress Composer</p>
          <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
            <label className="flex flex-col gap-1">
              <span className="text-cyan-100/80">Concurrency</span>
              <input
                type="number"
                min={1}
                value={concurrency}
                onChange={(e) => setConcurrency(Number(e.target.value || 1))}
                className="rounded-md border border-cyan-400/30 bg-slate-900/70 px-2 py-1 text-cyan-50"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-cyan-100/80">Duration sec</span>
              <input
                type="number"
                min={1}
                value={durationSec}
                onChange={(e) => setDurationSec(Number(e.target.value || 1))}
                className="rounded-md border border-cyan-400/30 bg-slate-900/70 px-2 py-1 text-cyan-50"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-cyan-100/80">Mode</span>
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value as "simple" | "realistic")}
                className="rounded-md border border-cyan-400/30 bg-slate-900/70 px-2 py-1 text-cyan-50"
              >
                <option value="simple">simple</option>
                <option value="realistic">realistic</option>
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-cyan-100/80">Max error rate</span>
              <input
                type="number"
                min={0}
                max={1}
                step={0.01}
                value={maxErrorRate}
                onChange={(e) => setMaxErrorRate(Number(e.target.value || 0))}
                className="rounded-md border border-cyan-400/30 bg-slate-900/70 px-2 py-1 text-cyan-50"
              />
            </label>
            <label className="col-span-2 flex flex-col gap-1">
              <span className="text-cyan-100/80">Max p95 (ms)</span>
              <input
                type="number"
                min={1}
                value={maxP95Ms}
                onChange={(e) => setMaxP95Ms(Number(e.target.value || 1))}
                className="rounded-md border border-cyan-400/30 bg-slate-900/70 px-2 py-1 text-cyan-50"
              />
            </label>
          </div>
          <pre className="mt-4 rounded-lg border border-cyan-400/20 bg-slate-950/70 p-3 text-[11px] text-cyan-100 overflow-x-auto">
            {stressCommand}
          </pre>
          <button
            type="button"
            onClick={() => copy(stressCommand, "Stress command")}
            className="mt-3 rounded-full border border-cyan-300/50 bg-cyan-400/20 px-4 py-2 text-xs font-semibold text-cyan-50 hover:bg-cyan-400/30 transition"
          >
            Copy Stress Command
          </button>
        </div>

        <div className="futuristic-panel p-6 border-emerald-500/30">
          <p className="landing-mono text-xs text-emerald-200">UAT Cleanup Composer</p>
          <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
            <label className="col-span-2 flex flex-col gap-1">
              <span className="text-emerald-100/80">Participant Key</span>
              <input
                type="text"
                value={participantKey}
                onChange={(e) => setParticipantKey(e.target.value)}
                className="rounded-md border border-emerald-400/30 bg-slate-900/70 px-2 py-1 text-emerald-50"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-emerald-100/80">Older than days</span>
              <input
                type="number"
                min={0}
                value={olderThanDays}
                onChange={(e) => setOlderThanDays(Number(e.target.value || 0))}
                className="rounded-md border border-emerald-400/30 bg-slate-900/70 px-2 py-1 text-emerald-50"
              />
            </label>
            <label className="flex items-end gap-2 text-emerald-100/80">
              <input
                type="checkbox"
                checked={includeLive}
                onChange={(e) => setIncludeLive(e.target.checked)}
              />
              include LIVE logs
            </label>
          </div>
          <pre className="mt-4 rounded-lg border border-emerald-400/20 bg-slate-950/70 p-3 text-[11px] text-emerald-100 overflow-x-auto">
            {cleanupDryRunCommand}
          </pre>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => copy(cleanupDryRunCommand, "Cleanup dry-run command")}
              className="rounded-full border border-emerald-300/50 bg-emerald-400/20 px-4 py-2 text-xs font-semibold text-emerald-50 hover:bg-emerald-400/30 transition"
            >
              Copy Dry-Run Command
            </button>
            <button
              type="button"
              onClick={() => copy(cleanupApplyCommand, "Cleanup apply command")}
              className="rounded-full border border-amber-300/50 bg-amber-400/20 px-4 py-2 text-xs font-semibold text-amber-50 hover:bg-amber-400/30 transition"
            >
              Copy Apply Command
            </button>
          </div>
        </div>
      </section>

      <section className="futuristic-panel p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="landing-mono text-xs text-cyan-100/80">
            Sortable UAT Backlog (TanStack Table)
          </p>
          {copyState ? (
            <span className="text-xs text-emerald-300">{copyState}</span>
          ) : null}
        </div>
        <div className="mt-4 overflow-x-auto rounded-xl border border-cyan-500/20">
          <table className="min-w-full text-left text-xs">
            <thead className="bg-slate-900/70">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      className="px-3 py-2 text-cyan-100/80 landing-mono tracking-wider"
                    >
                      {header.isPlaceholder ? null : (
                        <button
                          type="button"
                          onClick={header.column.getToggleSortingHandler()}
                          className="inline-flex items-center gap-1 hover:text-cyan-50 transition"
                        >
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                          <span className="text-[10px] opacity-70">
                            {header.column.getIsSorted() === "asc"
                              ? "ASC"
                              : header.column.getIsSorted() === "desc"
                                ? "DESC"
                                : "SORT"}
                          </span>
                        </button>
                      )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="border-t border-cyan-500/10">
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-3 py-2 text-slate-100">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
