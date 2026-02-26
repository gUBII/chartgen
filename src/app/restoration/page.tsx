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

      setBatchId(payload.data.batchId);
      setRows(
        (payload.data.candidates as CandidateRow[]).map((candidate) => ({
          ...candidate,
          timestamp: toLocalDateTimeInput(String(candidate.timestamp)),
          dirty: false,
        }))
      );
      setStatusText(`Preview generated. Batch ${payload.data.batchId} with ${payload.data.candidateCount} rows.`);
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
    if (!batchId) {
      setErrorText("No batch to commit. Generate preview first.");
      return;
    }
    if (!actorStaffId.trim()) {
      setErrorText("Supervisor/Clinical Lead Staff ID is required to commit.");
      return;
    }

    setErrorText("");
    setStatusText("Approving rows and committing batch...");
    setLoadingCommit(true);

    try {
      const approveResponse = await fetch("/api/engine/preview", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          approveAll: true,
          batchId,
          actorStaffId,
        }),
      });
      const approvePayload = await approveResponse.json();
      if (!approveResponse.ok || !approvePayload?.ok) {
        throw new Error(getErrorMessage(approvePayload?.error));
      }

      const commitResponse = await fetch("/api/engine/commit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          batchId,
          actorStaffId,
        }),
      });
      const commitPayload = await commitResponse.json();
      if (!commitResponse.ok || !commitPayload?.ok) {
        throw new Error(getErrorMessage(commitPayload?.error));
      }

      setStatusText(
        `Committed batch ${commitPayload.data.batchId}. Meal rows: ${commitPayload.data.mealCommitted}.`
      );
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

  return (
    <main className="mx-auto max-w-7xl p-6">
      <h1 className="text-3xl font-semibold">Mealtime Chartgen</h1>
      <p className="mt-2 text-sm text-slate-300">
        Generate mealtime preview candidates, review deviations, edit fields, then commit to the ledger.
      </p>

      <section className="mt-6 grid grid-cols-1 gap-4 rounded-lg border border-gray-200 p-4 md:grid-cols-5">
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
        {errorText ? <div className="mt-2 text-red-700">{errorText}</div> : null}
      </section>

      <section className="mt-6 overflow-x-auto rounded-lg border border-gray-200">
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
                  No preview data yet.
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
          disabled={loadingCommit || rows.length === 0}
        >
          {loadingCommit ? "Committing..." : "Commit Batch"}
        </button>
      </section>
    </main>
  );
}
