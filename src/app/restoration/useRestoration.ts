import { useEffect, useMemo, useState } from "react";
import type { AmountEaten } from "@prisma/client";
import type { CandidateRow, ChartLog, ActiveTab, ParticipantOption, StaffOption } from "./types";
import {
  toDateInput,
  toLocalDateTimeInput,
  toIsoFromLocalDateTime,
  getErrorMessage,
  getFilenameFromDisposition,
  asArray,
  splitMixedEntries,
  mapRowsToMealLogs,
} from "./utils";

export function useRestoration() {
  const today = useMemo(() => new Date(), []);
  const nextWeek = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 6);
    return d;
  }, []);

  const [participantId, setParticipantId] = useState("");
  const [reviewerStaffId, setReviewerStaffId] = useState("");
  const [defaultWorkerStaffId, setDefaultWorkerStaffId] = useState("");
  const [workerScheduleByDow, setWorkerScheduleByDow] = useState<Record<string, string>>({});
  const [participants, setParticipants] = useState<ParticipantOption[]>([]);
  const [staffOptions, setStaffOptions] = useState<StaffOption[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [startDate, setStartDate] = useState(toDateInput(today));
  const [startTime, setStartTime] = useState("00:00");
  const [endDate, setEndDate] = useState(toDateInput(nextWeek));
  const [endTime, setEndTime] = useState("23:59");
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

  const parseApiPayload = async (response: Response): Promise<any> => {
    try {
      return await response.json();
    } catch {
      const text = await response.text().catch(() => "");
      return {
        ok: false,
        error: {
          code: "INVALID_RESPONSE",
          message: text ? `Non-JSON response: ${text.slice(0, 140)}` : "Unexpected API response format.",
        },
      };
    }
  };

  const chooseReviewer = (staffList: StaffOption[]): string => {
    const elevated = staffList.find((s) => s.role === "SUPERVISOR" || s.role === "CLINICAL_LEAD");
    return elevated?.id ?? staffList[0]?.id ?? "";
  };

  const chooseDefaultWorker = (staffList: StaffOption[]): string => {
    const support = staffList.find((s) => s.role === "SUPPORT_WORKER");
    return support?.id ?? staffList[0]?.id ?? "";
  };

  useEffect(() => {
    let cancelled = false;
    const loadOptions = async () => {
      setLoadingOptions(true);
      try {
        const [participantsRes, staffRes] = await Promise.all([
          fetch("/api/admin/participants"),
          fetch("/api/admin/staff"),
        ]);
        const participantsPayload = await parseApiPayload(participantsRes);
        const staffPayload = await parseApiPayload(staffRes);

        if (!participantsRes.ok || !participantsPayload?.ok) {
          throw new Error(getErrorMessage(participantsPayload?.error));
        }
        if (!staffRes.ok || !staffPayload?.ok) {
          throw new Error(getErrorMessage(staffPayload?.error));
        }

        const participantRows: ParticipantOption[] = asArray(participantsPayload.data).map((row) => ({
          id: String(row.id),
          fullName: String(row.fullName ?? row.id),
        }));
        const staffRows: StaffOption[] = asArray(staffPayload.data).map((row) => ({
          id: String(row.id),
          displayName: String(row.displayName ?? row.id),
          role: String(row.role ?? "SUPPORT_WORKER"),
        }));

        if (cancelled) return;

        setParticipants(participantRows);
        setStaffOptions(staffRows);

        if (!participantId && participantRows.length > 0) {
          setParticipantId(participantRows[0].id);
        }
        if (!reviewerStaffId && staffRows.length > 0) {
          setReviewerStaffId(chooseReviewer(staffRows));
        }
        if (!defaultWorkerStaffId && staffRows.length > 0) {
          setDefaultWorkerStaffId(chooseDefaultWorker(staffRows));
        }
      } catch (error) {
        if (cancelled) return;
        setErrorText(error instanceof Error ? error.message : "Failed to load clients/workers.");
      } finally {
        if (!cancelled) {
          setLoadingOptions(false);
        }
      }
    };

    loadOptions();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setWorkerForDow = (dow: string, staffId: string) => {
    setWorkerScheduleByDow((current) => ({
      ...current,
      [dow]: staffId,
    }));
  };

  const onGenerate = async () => {
    if (!participantId.trim()) {
      setErrorText("Select a client before generating.");
      return;
    }
    if (!defaultWorkerStaffId.trim()) {
      setErrorText("Select a default worker before generating.");
      return;
    }

    const validStaffIds = new Set(staffOptions.map((s) => s.id));
    const invalidDows = Object.entries(workerScheduleByDow)
      .filter(([, staffId]) => staffId && !validStaffIds.has(staffId))
      .map(([dow]) => dow);
    if (invalidDows.length > 0) {
      setErrorText(`Weekday worker assignment has invalid staff for day(s): ${invalidDows.join(", ")}. Please re-select.`);
      return;
    }

    setErrorText("");
    setStatusText("Generating preview batch...");
    setLoadingGenerate(true);

    try {
      const schedulePayload = Object.fromEntries(
        Object.entries(workerScheduleByDow).filter(([, staffId]) => String(staffId).trim().length > 0)
      );
      const response = await fetch("/api/engine/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          participantId,
          startDate,
          startTime,
          endDate,
          endTime,
          generatedByStaffId: reviewerStaffId || defaultWorkerStaffId,
          defaultWorkerStaffId,
          workerScheduleByDow: schedulePayload,
        }),
      });

      const payload = await parseApiPayload(response);
      if (!response.ok || !payload?.ok) {
        throw new Error(getErrorMessage(payload?.error));
      }

      const data = payload.data ?? {};
      setBatchId(String(data.batchId ?? ""));

      const candidateRows = asArray(data.candidates).map((candidate) => ({
        id: String(candidate.id),
        timestamp: toLocalDateTimeInput(String(candidate.timestamp)),
        generatedByStaffId: String(candidate.generatedByStaffId ?? defaultWorkerStaffId ?? reviewerStaffId ?? ""),
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

      const explicitMarLogs = asArray(data.marLogs).length ? asArray(data.marLogs) : asArray(data.marCandidates);
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
                createdByStaffId: defaultWorkerStaffId || reviewerStaffId,
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
      const payload = await parseApiPayload(response);
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
    const effectiveWorkerId = defaultWorkerStaffId || reviewerStaffId;
    if (!effectiveWorkerId.trim()) {
      setErrorText("Select a worker before commit.");
      return;
    }

    const editableMealLogs = rows.length > 0 ? mapRowsToMealLogs(rows, participantId, effectiveWorkerId) : [];
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
      const commitPayload = await parseApiPayload(commitResponse);
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
        const payload = (await response.json()) as { error?: import("./types").ApiError };
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

  return {
    // Form state
    participantId, setParticipantId,
    participants,
    reviewerStaffId, setReviewerStaffId,
    defaultWorkerStaffId, setDefaultWorkerStaffId,
    workerScheduleByDow, setWorkerForDow,
    staffOptions,
    loadingOptions,
    startDate, setStartDate,
    startTime, setStartTime,
    endDate, setEndDate,
    endTime, setEndTime,
    // Data state
    batchId, rows, activeTab, setActiveTab,
    marLogs, mealLogs, sleepLogs, bglLogs,
    bowelLogs, hygieneLogs, communityLogs, repositionLogs,
    // UI state
    statusText, errorText,
    loadingGenerate, loadingPdf, loadingCommit, savingRowId,
    hasDirtyRows, hasPreviewData,
    // Actions
    onGenerate, updateRow, onSaveRow, onCommit, onDownloadPdf,
  };
}
