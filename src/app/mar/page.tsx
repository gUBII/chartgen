"use client";

import { useEffect, useMemo, useState } from "react";

type MARStatus = "ADMINISTERED" | "REFUSED" | "HELD";

type CandidateRow = {
  id: string;
  scheduledAdminTime: string;
  actualAdminTime: string;
  medicationName: string;
  dosage: string;
  route: string;
  status: MARStatus;
  omissionReason: string | null;
  statusComment: string | null;
  statusReview: string;
  provenanceHash: string;
  dirty?: boolean;
};

type MedicationInput = {
  name: string;
  dosage: string;
  route: string;
  hour: number;
  minute: number;
};

type ApiError = {
  code: string;
  message: string;
  details?: unknown;
};

const MAR_STATUS_OPTIONS: MARStatus[] = ["ADMINISTERED", "REFUSED", "HELD"];

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

const emptyMedication = (): MedicationInput => ({
  name: "",
  dosage: "",
  route: "",
  hour: 8,
  minute: 0,
});

const getDirtyCount = (rows: CandidateRow[]): number => {
  return rows.filter((r) => r.dirty).length;
};

const getStatusCounts = (rows: CandidateRow[]): { approved: number; pending: number; refused: number; held: number } => {
  return {
    approved: rows.filter((r) => r.statusReview === "APPROVED").length,
    pending: rows.filter((r) => r.statusReview === "PENDING").length,
    refused: rows.filter((r) => r.status === "REFUSED").length,
    held: rows.filter((r) => r.status === "HELD").length,
  };
};

export default function MARPage() {
  const today = useMemo(() => new Date(), []);
  const nextWeek = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 6);
    return d;
  }, []);

  const [participantId, setParticipantId] = useState("");
  const [actorStaffId, setActorStaffId] = useState("");
  const [startDate, setStartDate] = useState(toDateInput(today));
  const [startTime, setStartTime] = useState("00:00");
  const [endDate, setEndDate] = useState(toDateInput(nextWeek));
  const [endTime, setEndTime] = useState("23:59");
  const [medications, setMedications] = useState<MedicationInput[]>([emptyMedication()]);
  const [batchId, setBatchId] = useState("");
  const [rows, setRows] = useState<CandidateRow[]>([]);
  const [statusText, setStatusText] = useState("Ready.");
  const [errorText, setErrorText] = useState("");
  const [loadingGenerate, setLoadingGenerate] = useState(false);
  const [loadingCommit, setLoadingCommit] = useState(false);
  const [loadingPdf, setLoadingPdf] = useState(false);
  const [savingRowId, setSavingRowId] = useState<string | null>(null);

  const copyBatchId = async () => {
    if (!batchId) return;
    try {
      await navigator.clipboard.writeText(batchId);
      setStatusText("Batch ID copied to clipboard.");
    } catch {
      setErrorText("Failed to copy batch ID.");
    }
  };

  // Keyboard shortcut: Ctrl+S to save first dirty row
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        const dirtyRow = rows.find((r) => r.dirty);
        if (dirtyRow && !savingRowId) {
          onSaveRow(dirtyRow);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [rows, savingRowId]);

  const onGenerateMAR = async () => {
    setErrorText("");
    setStatusText("Generating MAR preview batch...");
    setLoadingGenerate(true);

    try {
      const response = await fetch("/api/engine/mar-preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          participantId,
          startDate,
          startTime,
          endDate,
          endTime,
          generatedByStaffId: actorStaffId || undefined,
          medications,
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
          scheduledAdminTime: toLocalDateTimeInput(String(candidate.scheduledAdminTime)),
          actualAdminTime: toLocalDateTimeInput(String(candidate.actualAdminTime)),
          dirty: false,
        }))
      );
      setStatusText(`MAR preview generated. Batch ${payload.data.batchId} with ${payload.data.candidateCount} rows.`);
    } catch (error) {
      setErrorText(error instanceof Error ? error.message : "Failed to generate MAR preview.");
      setStatusText("MAR preview generation failed.");
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
      const response = await fetch("/api/engine/mar-preview", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidateId: row.id,
          status: row.status,
          actualAdminTime: toIsoFromLocalDateTime(row.actualAdminTime),
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
            scheduledAdminTime: toLocalDateTimeInput(String(payload.data.scheduledAdminTime)),
            actualAdminTime: toLocalDateTimeInput(String(payload.data.actualAdminTime)),
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
      setErrorText("No batch to commit. Generate MAR preview first.");
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
      const approveResponse = await fetch("/api/engine/mar-preview", {
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
        `Committed batch ${commitPayload.data.batchId}. MAR rows: ${commitPayload.data.marCommitted}.`
      );
      setRows((current) => current.map((row) => ({ ...row, statusReview: "APPROVED", dirty: false })));
    } catch (error) {
      setErrorText(error instanceof Error ? error.message : "Failed to commit batch.");
      setStatusText("Commit failed.");
    } finally {
      setLoadingCommit(false);
    }
  };

  const onDownloadPDF = async () => {
    if (!batchId) {
      setErrorText("No batch to download. Generate MAR preview first.");
      return;
    }

    setErrorText("");
    setStatusText("Downloading PDF...");
    setLoadingPdf(true);

    try {
      const response = await fetch("/api/engine/export-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          batchId,
          chartType: "MAR",
        }),
      });

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => ({}));
        throw new Error(getErrorMessage(errorPayload?.error));
      }

      const blob = await response.blob();
      const filename = getFilenameFromDisposition(
        response.headers.get("content-disposition"),
        `mar-batch-${batchId}.pdf`
      );

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      setStatusText(`PDF downloaded: ${filename}`);
    } catch (error) {
      setErrorText(error instanceof Error ? error.message : "Failed to download PDF.");
      setStatusText("PDF download failed.");
    } finally {
      setLoadingPdf(false);
    }
  };

  const addMedication = () => {
    setMedications([...medications, emptyMedication()]);
  };

  const removeMedication = (index: number) => {
    setMedications(medications.filter((_, i) => i !== index));
  };

  const updateMedication = (index: number, patch: Partial<MedicationInput>) => {
    setMedications(
      medications.map((med, i) => (i === index ? { ...med, ...patch } : med))
    );
  };

  return (
    <main className="mx-auto max-w-7xl p-6">
      <h1 className="text-3xl font-semibold">Medical Chart Commission (MAR)</h1>
      <p className="mt-2 text-sm text-slate-300">
        Generate preview records, edit fields, and then commit approved entries to the ledger.
      </p>

      <section className="mt-6 rounded-lg border border-gray-200 p-4">
        <h2 className="text-lg font-medium mb-4">Participant & Date Range</h2>
        <div className="grid grid-cols-1 gap-4 min-[430px]:grid-cols-2 lg:grid-cols-7">
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">Participant ID</span>
            <input
              className="form-control"
              value={participantId}
              onChange={(e) => setParticipantId(e.target.value)}
              placeholder="participant uuid"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">Supervisor Staff ID</span>
            <input
              className="form-control"
              value={actorStaffId}
              onChange={(e) => setActorStaffId(e.target.value)}
              placeholder="staff uuid"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">Start Date</span>
            <input
              className="form-control"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">Start Time</span>
            <input
              className="form-control"
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">End Date</span>
            <input
              className="form-control"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">End Time</span>
            <input
              className="form-control"
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
            />
          </label>

          <div className="flex items-end">
            <button
              type="button"
              onClick={onGenerateMAR}
              disabled={loadingGenerate || !participantId.trim()}
              className="w-full rounded-md bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
            >
              {loadingGenerate ? "Generating..." : "Generate"}
            </button>
          </div>
        </div>

        {/* Quick date presets */}
        <div className="mt-4 flex flex-wrap gap-2">
          <span className="text-xs font-medium text-gray-600">Quick presets:</span>
          <button
            type="button"
            onClick={() => {
              setStartDate(toDateInput(today));
              setEndDate(toDateInput(today));
            }}
            className="rounded-sm border border-gray-300 px-2 py-1 text-xs hover:bg-gray-100"
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => {
              setStartDate(toDateInput(new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)));
              setEndDate(toDateInput(today));
            }}
            className="rounded-sm border border-gray-300 px-2 py-1 text-xs hover:bg-gray-100"
          >
            Last 7 days
          </button>
          <button
            type="button"
            onClick={() => {
              setStartDate(toDateInput(new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)));
              setEndDate(toDateInput(today));
            }}
            className="rounded-sm border border-gray-300 px-2 py-1 text-xs hover:bg-gray-100"
          >
            Last 30 days
          </button>
        </div>
      </section>

      <section className="mt-6 rounded-lg border border-gray-200 p-4">
        <h2 className="text-lg font-medium mb-4">Medications</h2>
        <div className="space-y-3">
          {medications.map((med, idx) => (
            <div key={idx} className="grid grid-cols-1 gap-3 md:grid-cols-6 items-end">
              <label className="flex flex-col gap-1">
                <span className="text-sm font-medium">Name</span>
                <input
                  className="form-control"
                  value={med.name}
                  onChange={(e) => updateMedication(idx, { name: e.target.value })}
                  placeholder="e.g., Aspirin"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-sm font-medium">Dosage</span>
                <input
                  className="form-control"
                  value={med.dosage}
                  onChange={(e) => updateMedication(idx, { dosage: e.target.value })}
                  placeholder="e.g., 100mg"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-sm font-medium">Route</span>
                <input
                  className="form-control"
                  value={med.route}
                  onChange={(e) => updateMedication(idx, { route: e.target.value })}
                  placeholder="e.g., PO"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-sm font-medium">Hour</span>
                <input
                  className="form-control"
                  type="number"
                  min="0"
                  max="23"
                  value={med.hour}
                  onChange={(e) => updateMedication(idx, { hour: parseInt(e.target.value) || 0 })}
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-sm font-medium">Minute</span>
                <input
                  className="form-control"
                  type="number"
                  min="0"
                  max="59"
                  value={med.minute}
                  onChange={(e) => updateMedication(idx, { minute: parseInt(e.target.value) || 0 })}
                />
              </label>
              <button
                type="button"
                onClick={() => removeMedication(idx)}
                disabled={medications.length === 1}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm text-red-600 disabled:opacity-50"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addMedication}
          className="mt-4 rounded-md border border-gray-300 px-4 py-2 text-sm text-blue-600 hover:bg-blue-50"
        >
          + Add Medication
        </button>
      </section>

      <section className="mt-4 rounded-md border border-gray-200 bg-gray-50 p-4 text-sm text-gray-900">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium">Batch:</span>
              <code className="rounded bg-gray-200 px-2 py-1 font-mono text-xs">{batchId || "—"}</code>
              {batchId && (
                <button
                  type="button"
                  onClick={copyBatchId}
                  className="text-xs text-blue-600 hover:underline"
                  title="Copy batch ID"
                >
                  📋
                </button>
              )}
            </div>
            <div className="mt-1">
              <span className="font-medium">Status:</span> {statusText}
            </div>
          </div>

          {/* Summary stats */}
          {rows.length > 0 && (
            <div className="flex gap-4 text-xs">
              <div className="text-center">
                <div className="font-semibold text-green-600">{getStatusCounts(rows).approved}</div>
                <div className="text-gray-600">Approved</div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-yellow-600">{getStatusCounts(rows).pending}</div>
                <div className="text-gray-600">Pending</div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-orange-600">{getStatusCounts(rows).refused}</div>
                <div className="text-gray-600">Refused</div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-purple-600">{getStatusCounts(rows).held}</div>
                <div className="text-gray-600">Held</div>
              </div>
              {getDirtyCount(rows) > 0 && (
                <div className="text-center">
                  <div className="font-semibold text-blue-600">{getDirtyCount(rows)}</div>
                  <div className="text-gray-600">Unsaved</div>
                </div>
              )}
            </div>
          )}
        </div>
        {errorText ? <div className="mt-2 text-red-700">{errorText}</div> : null}
      </section>

      <section className="mt-6 overflow-x-auto rounded-lg border border-gray-200">
        <table className="min-w-full border-collapse text-sm text-gray-900">
          <thead className="bg-gray-100">
            <tr>
              <th className="border-b px-3 py-2 text-left">Scheduled Time</th>
              <th className="border-b px-3 py-2 text-left">Medication</th>
              <th className="border-b px-3 py-2 text-left">Dosage</th>
              <th className="border-b px-3 py-2 text-left">Route</th>
              <th className="border-b px-3 py-2 text-left">Actual Time</th>
              <th className="border-b px-3 py-2 text-left">Status</th>
              <th className="border-b px-3 py-2 text-left">Review Status</th>
              <th className="border-b px-3 py-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td className="px-3 py-6 text-center text-gray-500" colSpan={8}>
                  No preview data yet.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className={["REFUSED", "HELD"].includes(row.status) ? "bg-yellow-100" : row.dirty ? "bg-blue-50" : "bg-white"}>
                  <td className="border-b px-3 py-2 text-xs">
                    {toLocalDateTimeInput(row.scheduledAdminTime).split("T")[0]}{" "}
                    {toLocalDateTimeInput(row.scheduledAdminTime).split("T")[1]}
                  </td>
                  <td className="border-b px-3 py-2">
                    {row.medicationName}
                    {row.dirty && <span className="ml-1 inline-block h-2 w-2 rounded-full bg-blue-600" title="Unsaved changes" />}
                  </td>
                  <td className="border-b px-3 py-2">{row.dosage}</td>
                  <td className="border-b px-3 py-2">{row.route}</td>
                  <td className="border-b px-3 py-2">
                    <input
                      className="form-control w-44 text-xs"
                      type="datetime-local"
                      value={row.actualAdminTime}
                      onChange={(e) => updateRow(row.id, { actualAdminTime: e.target.value })}
                    />
                  </td>
                  <td className="border-b px-3 py-2">
                    <select
                      className="form-control text-xs"
                      value={row.status}
                      onChange={(e) => updateRow(row.id, { status: e.target.value as MARStatus })}
                    >
                      {MAR_STATUS_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="border-b px-3 py-2 text-xs">{row.statusReview}</td>
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

      <section className="mt-6 flex justify-end gap-2">
        <button
          type="button"
          className="rounded-md bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
          onClick={onDownloadPDF}
          disabled={loadingPdf || !batchId || rows.length === 0}
        >
          {loadingPdf ? "Downloading..." : "Download PDF"}
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
