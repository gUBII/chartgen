"use client";

import { useMemo, useState } from "react";
import type { AmountEaten } from "@prisma/client";

type CandidateRow = {
  id: string;
  timestamp: string;
  mealType: string;
  foodTexture: number;
  fluidThickness: number;
  volumeMl: number;
  amountEaten: AmountEaten;
  deviationReason: string | null;
  status: string;
  provenanceHash: string;
  dirty?: boolean;
};

type ApiError = {
  code: string;
  message: string;
  details?: unknown;
};

type ChartLog = Record<string, unknown>;
type ActiveTab = "medication" | "nutrition" | "night" | "health";

const AMOUNT_EATEN_OPTIONS: AmountEaten[] = [
  "ZERO",
  "TWENTY_FIVE",
  "FIFTY",
  "SEVENTY_FIVE",
  "ONE_HUNDRED",
  "REFUSED",
];

const toDateInput = (date: Date): string => {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

const toLocalDateTimeInput = (value: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
};

const toIsoFromLocalDateTime = (value: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error("Invalid datetime input.");
  }
  return date.toISOString();
};

const getErrorMessage = (error?: ApiError): string => {
  if (!error) {
    return "Unexpected API error.";
  }
  return `${error.code}: ${error.message}`;
};

const getFilenameFromDisposition = (disposition: string | null, fallback: string): string => {
  if (!disposition) {
    return fallback;
  }
  const filenameStarMatch = disposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (filenameStarMatch?.[1]) {
    try {
      return decodeURIComponent(filenameStarMatch[1]);
    } catch {
      return fallback;
    }
  }
  const filenameMatch = disposition.match(/filename="?([^"]+)"?/i);
  return filenameMatch?.[1] ?? fallback;
};

const asArray = (value: unknown): ChartLog[] => (Array.isArray(value) ? (value as ChartLog[]) : []);

const hasDefect = (row: ChartLog): boolean => {
  if (row.qaAnomalyFlag === true) return true;
  if (row.qaMeta && typeof row.qaMeta === "object") {
    return "defect" in (row.qaMeta as Record<string, unknown>);
  }
  return false;
};

const rowClassName = (row: ChartLog): string => {
  return hasDefect(row) ? "bg-amber-100" : "bg-white";
};

const display = (value: unknown): string => {
  if (value === null || value === undefined || value === "") return "-";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
};

const splitMixedEntries = (entries: ChartLog[]) => {
  const marLogs: ChartLog[] = [];
  const mealLogs: ChartLog[] = [];
  const sleepLogs: ChartLog[] = [];
  const bglLogs: ChartLog[] = [];
  const bowelLogs: ChartLog[] = [];
  const hygieneLogs: ChartLog[] = [];
  const communityLogs: ChartLog[] = [];
  const repositionLogs: ChartLog[] = [];

  for (const entry of entries) {
    const kind = String(entry.kind ?? entry.type ?? "").toUpperCase();

    if (kind === "MAR" || kind === "PRN") {
      marLogs.push(entry);
      continue;
    }
    if (kind === "MEAL" || "mealType" in entry || "amountEaten" in entry) {
      mealLogs.push(entry);
      continue;
    }
    if (kind === "SLEEP" || "checkedAt" in entry || "checkTime" in entry) {
      sleepLogs.push(entry);
      continue;
    }
    if (kind === "BGL" || "bglReadingMmolL" in entry || "reading" in entry) {
      bglLogs.push(entry);
      continue;
    }
    if (kind === "BOWEL" || "hadBowelMotion" in entry || "fluidIntakeDeltaMl" in entry || "type" in entry) {
      bowelLogs.push(entry);
      continue;
    }
    if (kind === "HYGIENE" || "showerStatus" in entry || "oralCareStatus" in entry) {
      hygieneLogs.push(entry);
      continue;
    }
    if (kind === "COMMUNITY" || "destination" in entry || "departedAt" in entry) {
      communityLogs.push(entry);
      continue;
    }
    if (kind === "REPOSITION" || "position" in entry || "turnedAt" in entry) {
      repositionLogs.push(entry);
    }
  }

  return {
    marLogs,
    mealLogs,
    sleepLogs,
    bglLogs,
    bowelLogs,
    hygieneLogs,
    communityLogs,
    repositionLogs,
  };
};

const mapRowsToMealLogs = (rows: CandidateRow[], participantId: string, actorStaffId: string): ChartLog[] => {
  return rows.map((row) => ({
    participantId,
    createdByStaffId: actorStaffId,
    source: "LIVE",
    timestamp: toIsoFromLocalDateTime(row.timestamp),
    mealType: row.mealType,
    foodTexture: row.foodTexture,
    fluidThickness: row.fluidThickness,
    volumeMl: row.volumeMl,
    amountEaten: row.amountEaten,
    swallowingObservations: [],
    deviationReason: row.deviationReason,
    provenanceHash: row.provenanceHash,
  }));
};

const TAB_LABELS: Array<{ id: ActiveTab; label: string }> = [
  { id: "medication", label: "Medication (MAR)" },
  { id: "nutrition", label: "Nutrition & Bowel" },
  { id: "night", label: "Night Routine" },
  { id: "health", label: "Health & Vitals" },
];

export default function RestorationPage() {
  const today = useMemo(() => new Date(), []);
  const nextWeek = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 6);
    return d;
  }, []);

  const [participantId, setParticipantId] = useState("");
  const [actorStaffId, setActorStaffId] = useState("");
  const [startDate, setStartDate] = useState(toDateInput(today));
  const [endDate, setEndDate] = useState(toDateInput(nextWeek));
  const [batchId, setBatchId] = useState("");
  const [rows, setRows] = useState<CandidateRow[]>([]);

  const [marLogs, setMarLogs] = useState<ChartLog[]>([]);
  const [mealLogs, setMealLogs] = useState<ChartLog[]>([]);
  const [sleepLogs, setSleepLogs] = useState<ChartLog[]>([]);
  const [bglLogs, setBglLogs] = useState<ChartLog[]>([]);
  const [bowelLogs, setBowelLogs] = useState<ChartLog[]>([]);
  const [hygieneLogs, setHygieneLogs] = useState<ChartLog[]>([]);
  const [communityLogs, setCommunityLogs] = useState<ChartLog[]>([]);
  const [repositionLogs, setRepositionLogs] = useState<ChartLog[]>([]);
  const [activeTab, setActiveTab] = useState<ActiveTab>("medication");

  const [statusText, setStatusText] = useState("Ready.");
  const [errorText, setErrorText] = useState("");
  const [loadingGenerate, setLoadingGenerate] = useState(false);
  const [loadingPdf, setLoadingPdf] = useState(false);
  const [loadingCommit, setLoadingCommit] = useState(false);
  const [savingRowId, setSavingRowId] = useState<string | null>(null);

  const onGenerate = async () => {
    setErrorText("");
    setStatusText("Generating preview batch...");
    setLoadingGenerate(true);

    try {
      const response = await fetch("/api/engine/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          participantId,
          startDate,
          endDate,
          generatedByStaffId: actorStaffId || undefined,
        }),
      });

      const payload = await response.json();
      if (!response.ok || !payload?.ok) {
        throw new Error(getErrorMessage(payload?.error));
      }

      const data = payload.data ?? {};
      setBatchId(String(data.batchId ?? ""));

      const candidateRows = asArray(data.candidates).map((candidate) => ({
        id: String(candidate.id),
        timestamp: toLocalDateTimeInput(String(candidate.timestamp)),
        mealType: String(candidate.mealType),
        foodTexture: Number(candidate.foodTexture),
        fluidThickness: Number(candidate.fluidThickness),
        volumeMl: Number(candidate.volumeMl),
        amountEaten: String(candidate.amountEaten) as AmountEaten,
        deviationReason: (candidate.deviationReason as string | null) ?? null,
        status: String(candidate.status ?? "PENDING"),
        provenanceHash: String(candidate.provenanceHash ?? ""),
        dirty: false,
      }));
      setRows(candidateRows);

      const mixedEntries = asArray(data.records).length
        ? asArray(data.records)
        : asArray(data.entries).length
          ? asArray(data.entries)
          : asArray(data.timeline).length
            ? asArray(data.timeline)
            : asArray(data.generatedRecords);
      const mixedSplit = splitMixedEntries(mixedEntries);

      const explicitMarLogs = asArray(data.marLogs);
      const explicitMealLogs = asArray(data.mealLogs);
      const explicitSleepLogs = asArray(data.sleepLogs);
      const explicitBglLogs = asArray(data.bglLogs);
      const explicitBowelLogs = asArray(data.bowelLogs);
      const explicitHygieneLogs = asArray(data.hygieneLogs);
      const explicitCommunityLogs = asArray(data.communityLogs);
      const explicitRepositionLogs = asArray(data.repositionLogs);

      setMarLogs(explicitMarLogs.length ? explicitMarLogs : mixedSplit.marLogs);
      setMealLogs(
        explicitMealLogs.length
          ? explicitMealLogs
          : mixedSplit.mealLogs.length
            ? mixedSplit.mealLogs
            : candidateRows.map((row) => ({
                participantId,
                createdByStaffId: actorStaffId,
                timestamp: toIsoFromLocalDateTime(row.timestamp),
                mealType: row.mealType,
                foodTexture: row.foodTexture,
                fluidThickness: row.fluidThickness,
                volumeMl: row.volumeMl,
                amountEaten: row.amountEaten,
                deviationReason: row.deviationReason,
                status: row.status,
                provenanceHash: row.provenanceHash,
              }))
      );
      setSleepLogs(explicitSleepLogs.length ? explicitSleepLogs : mixedSplit.sleepLogs);
      setBglLogs(explicitBglLogs.length ? explicitBglLogs : mixedSplit.bglLogs);
      setBowelLogs(explicitBowelLogs.length ? explicitBowelLogs : mixedSplit.bowelLogs);
      setHygieneLogs(explicitHygieneLogs.length ? explicitHygieneLogs : mixedSplit.hygieneLogs);
      setCommunityLogs(explicitCommunityLogs.length ? explicitCommunityLogs : mixedSplit.communityLogs);
      setRepositionLogs(explicitRepositionLogs.length ? explicitRepositionLogs : mixedSplit.repositionLogs);

      const totalLogs =
        (explicitMarLogs.length || mixedSplit.marLogs.length) +
        (explicitMealLogs.length || mixedSplit.mealLogs.length || candidateRows.length) +
        (explicitSleepLogs.length || mixedSplit.sleepLogs.length) +
        (explicitBglLogs.length || mixedSplit.bglLogs.length) +
        (explicitBowelLogs.length || mixedSplit.bowelLogs.length) +
        (explicitHygieneLogs.length || mixedSplit.hygieneLogs.length) +
        (explicitCommunityLogs.length || mixedSplit.communityLogs.length) +
        (explicitRepositionLogs.length || mixedSplit.repositionLogs.length);

      setStatusText(`Preview generated. Batch ${data.batchId ?? "N/A"}. Parsed ${totalLogs} records.`);
    } catch (error) {
      setErrorText(error instanceof Error ? error.message : "Failed to generate preview.");
      setStatusText("Preview generation failed.");
    } finally {
      setLoadingGenerate(false);
    }
  };

  const updateRow = (rowId: string, patch: Partial<CandidateRow>) => {
    setRows((current) =>
      current.map((row) => {
        if (row.id !== rowId) {
          return row;
        }
        return { ...row, ...patch, dirty: true };
      })
    );
  };

  const onSaveRow = async (row: CandidateRow) => {
    setErrorText("");
    setSavingRowId(row.id);
    try {
      const response = await fetch("/api/engine/preview", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidateId: row.id,
          amountEaten: row.amountEaten,
          timestamp: toIsoFromLocalDateTime(row.timestamp),
        }),
      });
      const payload = await response.json();
      if (!response.ok || !payload?.ok) {
        throw new Error(getErrorMessage(payload?.error));
      }

      setRows((current) =>
        current.map((existing) => {
          if (existing.id !== row.id) {
            return existing;
          }
          return {
            ...existing,
            ...payload.data,
            timestamp: toLocalDateTimeInput(String(payload.data.timestamp)),
            dirty: false,
          };
        })
      );
      setStatusText(`Saved candidate ${row.id}.`);
    } catch (error) {
      setErrorText(error instanceof Error ? error.message : "Failed to save candidate.");
    } finally {
      setSavingRowId(null);
    }
  };

  const onCommit = async () => {
    if (!actorStaffId.trim()) {
      setErrorText("Supervisor/Clinical Lead Staff ID is required to commit.");
      return;
    }

    const editableMealLogs = rows.length > 0 ? mapRowsToMealLogs(rows, participantId, actorStaffId) : [];
    const commitMealLogs = mealLogs.length > 0 ? mealLogs : editableMealLogs;

    const payload = {
      marLogs,
      mealLogs: commitMealLogs,
      sleepLogs,
      bglLogs,
      bowelLogs,
      hygieneLogs,
      communityLogs,
      repositionLogs,
    };

    const totalPayloadRows =
      payload.marLogs.length +
      payload.mealLogs.length +
      payload.sleepLogs.length +
      payload.bglLogs.length +
      payload.bowelLogs.length +
      payload.hygieneLogs.length +
      payload.communityLogs.length +
      payload.repositionLogs.length;

    if (totalPayloadRows === 0) {
      setErrorText("No generated logs to commit. Generate preview first.");
      return;
    }

    setErrorText("");
    setStatusText("Committing grouped chart payload...");
    setLoadingCommit(true);

    try {
      const commitResponse = await fetch("/api/engine/commit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const commitPayload = await commitResponse.json();
      if (!commitResponse.ok || !commitPayload?.ok) {
        throw new Error(getErrorMessage(commitPayload?.error));
      }

      setStatusText(`Committed ${commitPayload.data.totalCommitted ?? totalPayloadRows} logs across all modules.`);
      setRows((current) => current.map((row) => ({ ...row, status: "APPROVED", dirty: false })));
    } catch (error) {
      setErrorText(error instanceof Error ? error.message : "Failed to commit batch.");
      setStatusText("Commit failed.");
    } finally {
      setLoadingCommit(false);
    }
  };

  const onDownloadPdf = async () => {
    if (!batchId) {
      setErrorText("No batch to export. Generate preview first.");
      return;
    }

    setErrorText("");
    setStatusText("Generating PDF...");
    setLoadingPdf(true);

    try {
      const response = await fetch("/api/engine/export-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          batchId,
          chartType: "MEAL",
        }),
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: ApiError };
        throw new Error(getErrorMessage(payload.error));
      }

      const blob = await response.blob();
      const fallbackName = `meal-batch-${batchId}.pdf`;
      const filename = getFilenameFromDisposition(response.headers.get("content-disposition"), fallbackName);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);

      setStatusText(`PDF downloaded: ${filename}`);
    } catch (error) {
      setErrorText(error instanceof Error ? error.message : "Failed to download PDF.");
      setStatusText("PDF export failed.");
    } finally {
      setLoadingPdf(false);
    }
  };

  const hasDirtyRows = rows.some((row) => row.dirty);
  const hasPreviewData =
    rows.length > 0 ||
    marLogs.length > 0 ||
    mealLogs.length > 0 ||
    sleepLogs.length > 0 ||
    bglLogs.length > 0 ||
    bowelLogs.length > 0 ||
    hygieneLogs.length > 0 ||
    communityLogs.length > 0 ||
    repositionLogs.length > 0;

  return (
    <main className="mx-auto max-w-7xl p-6">
      <h1 className="text-3xl font-semibold">Restoration Dashboard</h1>
      <p className="mt-2 text-sm text-slate-300">
        Generate synthetic chart timelines, inspect defects, and commit grouped logs to the ledger.
      </p>

      <section className="mt-6 grid grid-cols-1 gap-4 rounded-lg border border-gray-200 p-4 min-[430px]:grid-cols-2 lg:grid-cols-5">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Participant ID</span>
          <input
            className="rounded-md border border-gray-300 px-3 py-2"
            value={participantId}
            onChange={(e) => setParticipantId(e.target.value)}
            placeholder="participant uuid"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Supervisor Staff ID</span>
          <input
            className="rounded-md border border-gray-300 px-3 py-2"
            value={actorStaffId}
            onChange={(e) => setActorStaffId(e.target.value)}
            placeholder="staff uuid"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Start Date</span>
          <input
            className="rounded-md border border-gray-300 px-3 py-2"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">End Date</span>
          <input
            className="rounded-md border border-gray-300 px-3 py-2"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </label>

        <div className="flex items-end">
          <button
            type="button"
            onClick={onGenerate}
            disabled={loadingGenerate}
            className="w-full rounded-md bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
          >
            {loadingGenerate ? "Generating..." : "Generate"}
          </button>
        </div>
      </section>

      <section className="mt-4 rounded-md border border-gray-200 bg-gray-50 p-3 text-sm text-gray-900">
        <div>
          <span className="font-medium">Batch:</span> {batchId || "none"}
        </div>
        <div>
          <span className="font-medium">Status:</span> {statusText}
        </div>
        <div>
          <span className="font-medium">Counts:</span>{" "}
          MAR {marLogs.length} | Meals {Math.max(mealLogs.length, rows.length)} | Sleep {sleepLogs.length} | BGL {bglLogs.length} | Bowel {bowelLogs.length} | Hygiene {hygieneLogs.length} | Community {communityLogs.length} | Reposition {repositionLogs.length}
        </div>
        {errorText ? <div className="mt-2 text-red-700">{errorText}</div> : null}
      </section>

      <section className="mt-6">
        <div className="mb-3 flex flex-wrap gap-2">
          {TAB_LABELS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-md border px-3 py-2 text-sm ${
                activeTab === tab.id
                  ? "border-blue-600 bg-blue-600 text-white"
                  : "border-gray-300 bg-white text-gray-900"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "medication" ? (
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="min-w-full border-collapse text-sm text-gray-900">
              <thead className="bg-gray-100">
                <tr>
                  <th className="border-b px-3 py-2 text-left">Time</th>
                  <th className="border-b px-3 py-2 text-left">Medication</th>
                  <th className="border-b px-3 py-2 text-left">Dose</th>
                  <th className="border-b px-3 py-2 text-left">Route</th>
                  <th className="border-b px-3 py-2 text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {marLogs.length === 0 ? (
                  <tr>
                    <td className="px-3 py-6 text-center text-gray-500" colSpan={5}>No MAR logs generated yet.</td>
                  </tr>
                ) : (
                  marLogs.map((log, idx) => (
                    <tr key={`mar-${idx}`} className={rowClassName(log)}>
                      <td className="border-b px-3 py-2">{display(log.actualAdminTime ?? log.scheduledAdminTime ?? log.loggedAt)}</td>
                      <td className="border-b px-3 py-2">{display(log.medicationName)}</td>
                      <td className="border-b px-3 py-2">{display(log.dosage)}</td>
                      <td className="border-b px-3 py-2">{display(log.route)}</td>
                      <td className="border-b px-3 py-2">{display(log.status)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : null}

        {activeTab === "nutrition" ? (
          <div className="space-y-6">
            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="min-w-full border-collapse text-sm text-gray-900">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="border-b px-3 py-2 text-left">Date/Time</th>
                    <th className="border-b px-3 py-2 text-left">Meal</th>
                    <th className="border-b px-3 py-2 text-left">Texture</th>
                    <th className="border-b px-3 py-2 text-left">Thickness</th>
                    <th className="border-b px-3 py-2 text-left">Amount Eaten</th>
                    <th className="border-b px-3 py-2 text-left">Status</th>
                    <th className="border-b px-3 py-2 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 ? (
                    <tr>
                      <td className="px-3 py-6 text-center text-gray-500" colSpan={7}>
                        No editable meal candidates yet.
                      </td>
                    </tr>
                  ) : (
                    rows.map((row) => (
                      <tr key={row.id} className={row.deviationReason ? "bg-yellow-100" : "bg-white"}>
                        <td className="border-b px-3 py-2">
                          <input
                            className="w-52 rounded-md border border-gray-300 px-2 py-1"
                            type="datetime-local"
                            value={row.timestamp}
                            onChange={(e) => updateRow(row.id, { timestamp: e.target.value })}
                          />
                        </td>
                        <td className="border-b px-3 py-2">{row.mealType}</td>
                        <td className="border-b px-3 py-2">{row.foodTexture}</td>
                        <td className="border-b px-3 py-2">{row.fluidThickness}</td>
                        <td className="border-b px-3 py-2">
                          <select
                            className="rounded-md border border-gray-300 px-2 py-1"
                            value={row.amountEaten}
                            onChange={(e) => updateRow(row.id, { amountEaten: e.target.value as AmountEaten })}
                          >
                            {AMOUNT_EATEN_OPTIONS.map((option) => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="border-b px-3 py-2">{row.status}</td>
                        <td className="border-b px-3 py-2">
                          <button
                            type="button"
                            className="rounded-md border border-gray-300 px-2 py-1 text-xs disabled:opacity-50"
                            onClick={() => onSaveRow(row)}
                            disabled={!row.dirty || savingRowId === row.id}
                          >
                            {savingRowId === row.id ? "Saving..." : "Save"}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="min-w-full border-collapse text-sm text-gray-900">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="border-b px-3 py-2 text-left">Time</th>
                    <th className="border-b px-3 py-2 text-left">Bowel Motion</th>
                    <th className="border-b px-3 py-2 text-left">Bristol</th>
                    <th className="border-b px-3 py-2 text-left">Intake Δ (ml)</th>
                    <th className="border-b px-3 py-2 text-left">Output Δ (ml)</th>
                    <th className="border-b px-3 py-2 text-left">Net (ml)</th>
                  </tr>
                </thead>
                <tbody>
                  {bowelLogs.length === 0 ? (
                    <tr>
                      <td className="px-3 py-6 text-center text-gray-500" colSpan={6}>No bowel/fluid logs generated yet.</td>
                    </tr>
                  ) : (
                    bowelLogs.map((log, idx) => (
                      <tr key={`bowel-${idx}`} className={rowClassName(log)}>
                        <td className="border-b px-3 py-2">{display(log.loggedAt ?? log.timestamp)}</td>
                        <td className="border-b px-3 py-2">{display(log.hadBowelMotion)}</td>
                        <td className="border-b px-3 py-2">{display(log.bristolScale)}</td>
                        <td className="border-b px-3 py-2">{display(log.fluidIntakeDeltaMl)}</td>
                        <td className="border-b px-3 py-2">{display(log.fluidOutputDeltaMl)}</td>
                        <td className="border-b px-3 py-2">{display(log.netBalanceMl)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}

        {activeTab === "night" ? (
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="min-w-full border-collapse text-sm text-gray-900">
              <thead className="bg-gray-100">
                <tr>
                  <th className="border-b px-3 py-2 text-left">Check Time</th>
                  <th className="border-b px-3 py-2 text-left">Status</th>
                  <th className="border-b px-3 py-2 text-left">Intervention</th>
                  <th className="border-b px-3 py-2 text-left">Notes</th>
                </tr>
              </thead>
              <tbody>
                {sleepLogs.length === 0 ? (
                  <tr>
                    <td className="px-3 py-6 text-center text-gray-500" colSpan={4}>No sleep logs generated yet.</td>
                  </tr>
                ) : (
                  sleepLogs.map((log, idx) => (
                    <tr key={`sleep-${idx}`} className={rowClassName(log)}>
                      <td className="border-b px-3 py-2">{display(log.checkedAt ?? log.checkTime)}</td>
                      <td className="border-b px-3 py-2">{display(log.status)}</td>
                      <td className="border-b px-3 py-2">{display(log.intervention)}</td>
                      <td className="border-b px-3 py-2">{display(log.notes)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : null}

        {activeTab === "health" ? (
          <div className="space-y-6">
            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="min-w-full border-collapse text-sm text-gray-900">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="border-b px-3 py-2 text-left">Time</th>
                    <th className="border-b px-3 py-2 text-left">Reading (mmol/L)</th>
                    <th className="border-b px-3 py-2 text-left">Fasting</th>
                    <th className="border-b px-3 py-2 text-left">Insulin</th>
                    <th className="border-b px-3 py-2 text-left">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {bglLogs.length === 0 ? (
                    <tr>
                      <td className="px-3 py-6 text-center text-gray-500" colSpan={5}>No BGL logs generated yet.</td>
                    </tr>
                  ) : (
                    bglLogs.map((log, idx) => (
                      <tr key={`bgl-${idx}`} className={rowClassName(log)}>
                        <td className="border-b px-3 py-2">{display(log.loggedAt)}</td>
                        <td className="border-b px-3 py-2">{display(log.bglReadingMmolL ?? log.reading)}</td>
                        <td className="border-b px-3 py-2">{display(log.fastingStatus)}</td>
                        <td className="border-b px-3 py-2">{display(log.insulinAdministered)}</td>
                        <td className="border-b px-3 py-2">{display(log.actionTaken)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="min-w-full border-collapse text-sm text-gray-900">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="border-b px-3 py-2 text-left">Time</th>
                    <th className="border-b px-3 py-2 text-left">Shower</th>
                    <th className="border-b px-3 py-2 text-left">Oral Care</th>
                    <th className="border-b px-3 py-2 text-left">Grooming</th>
                    <th className="border-b px-3 py-2 text-left">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {hygieneLogs.length === 0 ? (
                    <tr>
                      <td className="px-3 py-6 text-center text-gray-500" colSpan={5}>No hygiene logs generated yet.</td>
                    </tr>
                  ) : (
                    hygieneLogs.map((log, idx) => (
                      <tr key={`hyg-${idx}`} className={rowClassName(log)}>
                        <td className="border-b px-3 py-2">{display(log.loggedAt)}</td>
                        <td className="border-b px-3 py-2">{display(log.showerStatus)}</td>
                        <td className="border-b px-3 py-2">{display(log.oralCareStatus)}</td>
                        <td className="border-b px-3 py-2">{display(log.groomingStatus)}</td>
                        <td className="border-b px-3 py-2">{display(log.notes)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="min-w-full border-collapse text-sm text-gray-900">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="border-b px-3 py-2 text-left">Time</th>
                    <th className="border-b px-3 py-2 text-left">Position</th>
                    <th className="border-b px-3 py-2 text-left">Skin Check</th>
                    <th className="border-b px-3 py-2 text-left">Plan Interval</th>
                  </tr>
                </thead>
                <tbody>
                  {repositionLogs.length === 0 ? (
                    <tr>
                      <td className="px-3 py-6 text-center text-gray-500" colSpan={4}>No repositioning logs generated yet.</td>
                    </tr>
                  ) : (
                    repositionLogs.map((log, idx) => (
                      <tr key={`repo-${idx}`} className={rowClassName(log)}>
                        <td className="border-b px-3 py-2">{display(log.turnedAt ?? log.loggedAt)}</td>
                        <td className="border-b px-3 py-2">{display(log.position)}</td>
                        <td className="border-b px-3 py-2">{display(log.skinCheckOutcome)}</td>
                        <td className="border-b px-3 py-2">{display(log.planIntervalMin)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="min-w-full border-collapse text-sm text-gray-900">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="border-b px-3 py-2 text-left">Departed</th>
                    <th className="border-b px-3 py-2 text-left">Returned</th>
                    <th className="border-b px-3 py-2 text-left">Destination</th>
                    <th className="border-b px-3 py-2 text-left">Purpose</th>
                  </tr>
                </thead>
                <tbody>
                  {communityLogs.length === 0 ? (
                    <tr>
                      <td className="px-3 py-6 text-center text-gray-500" colSpan={4}>No community logs generated yet.</td>
                    </tr>
                  ) : (
                    communityLogs.map((log, idx) => (
                      <tr key={`comm-${idx}`} className={rowClassName(log)}>
                        <td className="border-b px-3 py-2">{display(log.departedAt)}</td>
                        <td className="border-b px-3 py-2">{display(log.returnedAt)}</td>
                        <td className="border-b px-3 py-2">{display(log.destination)}</td>
                        <td className="border-b px-3 py-2">{display(log.purpose)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}

        {!hasPreviewData ? (
          <div className="mt-6 rounded-md border border-dashed border-gray-300 p-4 text-sm text-gray-500">
            No preview data yet. Click Generate to build a synthetic timeline.
          </div>
        ) : null}
      </section>

      <section className="mt-6 flex items-center justify-between">
        <button
          type="button"
          className="rounded-md border border-slate-300 px-4 py-2 text-slate-100 disabled:opacity-50"
          onClick={onDownloadPdf}
          disabled={loadingPdf || rows.length === 0 || !batchId || hasDirtyRows}
          title={hasDirtyRows ? "Save edited rows before exporting PDF." : undefined}
        >
          {loadingPdf ? "Preparing PDF..." : "Download PDF"}
        </button>
        <button
          type="button"
          className="rounded-md bg-green-700 px-4 py-2 text-white disabled:opacity-50"
          onClick={onCommit}
          disabled={loadingCommit || !hasPreviewData}
        >
          {loadingCommit ? "Committing..." : "Commit Batch"}
        </button>
      </section>
    </main>
  );
}
