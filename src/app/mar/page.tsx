"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import * as XLSX from "xlsx";

/* ── Types ────────────────────────────────────────────────── */

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

type ParticipantOption = {
  id: string;
  fullName: string;
  externalReference: string | null;
};

type StaffOption = {
  id: string;
  workerNumber: string;
  displayName: string;
  role: string;
};

type TemplateScheduleItem = { hour: number; minute: number };

type TemplateItem = {
  name: string;
  dosage: string;
  route: string;
  schedule: TemplateScheduleItem[];
  instructions?: string;
  isPRN?: boolean;
  prnRule?: string;
};

type TemplateRow = {
  id: string;
  templateKey: string;
  templateName: string;
  version: number;
  isActive: boolean;
  scope: "GLOBAL" | "PARTICIPANT";
  participantId: string | null;
  defaultRangePreset: "day" | "week_plus" | "month_plus";
  items: TemplateItem[];
};

/* ── Tabs ─────────────────────────────────────────────────── */

const TAB_KEYS = ["setup", "medications", "preview", "review", "commit", "export"] as const;
type TabKey = (typeof TAB_KEYS)[number];

const TAB_LABELS: Record<TabKey, string> = {
  setup: "Setup",
  medications: "Medications",
  preview: "Preview",
  review: "Review",
  commit: "Commit",
  export: "Export",
};

/* ── Constants ────────────────────────────────────────────── */

const MAR_STATUS_OPTIONS: MARStatus[] = ["ADMINISTERED", "REFUSED", "HELD"];

/* ── Helpers ──────────────────────────────────────────────── */

const toDateInput = (date: Date): string => {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

const addDays = (dateStr: string, days: number): string => {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + days);
  return toDateInput(d);
};

const toLocalDateTimeInput = (value: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
};

const toIsoFromLocalDateTime = (value: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error("Invalid datetime input.");
  return date.toISOString();
};

const getErrorMessage = (error?: ApiError): string => {
  if (!error) return "Unexpected API error.";
  return `${error.code}: ${error.message}`;
};

const getFilenameFromDisposition = (disposition: string | null, fallback: string): string => {
  if (!disposition) return fallback;
  const filenameStarMatch = disposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (filenameStarMatch?.[1]) {
    try { return decodeURIComponent(filenameStarMatch[1]); } catch { return fallback; }
  }
  const filenameMatch = disposition.match(/filename="?([^"]+)"?/i);
  return filenameMatch?.[1] ?? fallback;
};

const emptyMedication = (): MedicationInput => ({ name: "", dosage: "", route: "", hour: 8, minute: 0 });

const getDirtyCount = (rows: CandidateRow[]): number => rows.filter((r) => r.dirty).length;

const getStatusCounts = (rows: CandidateRow[]) => ({
  approved: rows.filter((r) => r.statusReview === "APPROVED").length,
  pending: rows.filter((r) => r.statusReview === "PENDING").length,
  refused: rows.filter((r) => r.status === "REFUSED").length,
  held: rows.filter((r) => r.status === "HELD").length,
});

/* ── Main Component ───────────────────────────────────────── */

function MARPageInner() {
  const searchParams = useSearchParams();
  const injectedParticipantId = searchParams.get("participantId") ?? "";
  const injectedStaffId = searchParams.get("staffId") ?? "";
  const injectedDate = searchParams.get("date") ?? "";

  const today = useMemo(() => new Date(), []);
  const nextWeek = useMemo(() => { const d = new Date(); d.setDate(d.getDate() + 6); return d; }, []);

  // Tab state
  const [activeTab, setActiveTab] = useState<TabKey>("setup");

  // Dropdown data
  const [participants, setParticipants] = useState<ParticipantOption[]>([]);
  const [staffList, setStaffList] = useState<StaffOption[]>([]);
  const [templates, setTemplates] = useState<TemplateRow[]>([]);

  // Selection state
  const [selectedParticipantId, setSelectedParticipantId] = useState(injectedParticipantId);
  const [selectedStaffId, setSelectedStaffId] = useState(injectedStaffId);
  const [participantUuidOverride, setParticipantUuidOverride] = useState("");
  const [staffUuidOverride, setStaffUuidOverride] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState("");

  // Form state
  const [startDate, setStartDate] = useState(injectedDate || toDateInput(today));
  const [startTime, setStartTime] = useState("00:00");
  const [endDate, setEndDate] = useState(injectedDate || toDateInput(nextWeek));
  const [endTime, setEndTime] = useState("23:59");
  const [dateManuallyChanged, setDateManuallyChanged] = useState(false);
  const [medications, setMedications] = useState<MedicationInput[]>([emptyMedication()]);
  const [templateBanner, setTemplateBanner] = useState("");

  // Batch / preview state
  const [batchId, setBatchId] = useState("");
  const [rows, setRows] = useState<CandidateRow[]>([]);
  const [statusText, setStatusText] = useState("Ready.");
  const [errorText, setErrorText] = useState("");
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [loadingGenerate, setLoadingGenerate] = useState(false);
  const [loadingCommit, setLoadingCommit] = useState(false);
  const [loadingPdf, setLoadingPdf] = useState(false);
  const [loadingXlsx, setLoadingXlsx] = useState(false);
  const [savingRowId, setSavingRowId] = useState<string | null>(null);

  // Derived IDs
  const resolvedParticipantId = participantUuidOverride.trim() || selectedParticipantId;
  const resolvedStaffId = staffUuidOverride.trim() || selectedStaffId;

  // Filtered templates: GLOBAL + matching participant
  const filteredTemplates = useMemo(() => {
    return templates.filter(
      (t) => t.scope === "GLOBAL" || t.participantId === resolvedParticipantId
    );
  }, [templates, resolvedParticipantId]);

  /* ── Fetch dropdown data on mount ────────────────────────── */

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [pRes, sRes, tRes] = await Promise.all([
          fetch("/api/admin/participants"),
          fetch("/api/admin/staff?role=SUPPORT_WORKER"),
          fetch("/api/admin/mar-templates?activeOnly=true"),
        ]);
        const pData = await pRes.json();
        const sData = await sRes.json();
        const tData = await tRes.json();
        if (pData?.ok) setParticipants(pData.data ?? []);
        if (sData?.ok) setStaffList(sData.data ?? []);
        if (tData?.ok) setTemplates(tData.data ?? []);
      } catch {
        // Silently fail — dropdowns will be empty but manual UUID entry still works
      }
    };
    fetchAll();
  }, []);

  /* ── Template load ───────────────────────────────────────── */

  const onLoadTemplate = useCallback(() => {
    const tpl = templates.find((t) => t.id === selectedTemplateId);
    if (!tpl) return;

    const loaded: MedicationInput[] = [];
    let prnCount = 0;
    for (const item of tpl.items) {
      if (item.isPRN) {
        prnCount++;
        loaded.push({
          name: `${item.name} (PRN)`,
          dosage: item.dosage,
          route: item.route,
          hour: 0,
          minute: 0,
        });
      } else {
        for (const s of item.schedule) {
          loaded.push({
            name: item.name,
            dosage: item.dosage,
            route: item.route,
            hour: s.hour,
            minute: s.minute,
          });
        }
      }
    }

    setMedications(loaded.length > 0 ? loaded : [emptyMedication()]);
    setTemplateBanner(`Loaded ${loaded.length} medication entries from "${tpl.templateName}".${prnCount > 0 ? ` Includes ${prnCount} PRN medication(s).` : ""} You can edit below.`);

    // Apply defaultRangePreset if user hasn't manually changed dates
    if (!dateManuallyChanged) {
      switch (tpl.defaultRangePreset) {
        case "day":
          setEndDate(startDate);
          break;
        case "week_plus":
          setEndDate(addDays(startDate, 6));
          break;
        case "month_plus":
          setEndDate(addDays(startDate, 29));
          break;
      }
    }
  }, [templates, selectedTemplateId, dateManuallyChanged, startDate]);

  /* ── Validation ──────────────────────────────────────────── */

  const validate = (): boolean => {
    const errs: string[] = [];
    if (!resolvedParticipantId) errs.push("Participant is required.");
    if (!resolvedStaffId) errs.push("Support Worker is required.");
    if (medications.length === 0) errs.push("At least 1 medication is required.");
    for (let i = 0; i < medications.length; i++) {
      const m = medications[i];
      if (!m.name.trim()) errs.push(`Medication ${i + 1}: name is required.`);
      if (!m.dosage.trim()) errs.push(`Medication ${i + 1}: dosage is required.`);
      if (!m.route.trim()) errs.push(`Medication ${i + 1}: route is required.`);
    }
    setValidationErrors(errs);
    return errs.length === 0;
  };

  /* ── Keyboard shortcut: Ctrl+S ──────────────────────────── */

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        const dirtyRow = rows.find((r) => r.dirty);
        if (dirtyRow && !savingRowId) onSaveRow(dirtyRow);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [rows, savingRowId]);

  /* ── Actions (mostly unchanged from original) ───────────── */

  const copyBatchId = async () => {
    if (!batchId) return;
    try {
      await navigator.clipboard.writeText(batchId);
      setStatusText("Batch ID copied to clipboard.");
    } catch { setErrorText("Failed to copy batch ID."); }
  };

  const onGenerateMAR = async () => {
    if (!validate()) return;
    setErrorText("");
    setStatusText("Generating MAR preview batch...");
    setLoadingGenerate(true);
    try {
      const response = await fetch("/api/engine/mar-preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          participantId: resolvedParticipantId,
          startDate, startTime, endDate, endTime,
          generatedByStaffId: resolvedStaffId || undefined,
          medications,
        }),
      });
      const payload = await response.json();
      if (!response.ok || !payload?.ok) throw new Error(getErrorMessage(payload?.error));
      setBatchId(payload.data.batchId);
      setRows(
        (payload.data.candidates as CandidateRow[]).map((c) => ({
          ...c,
          scheduledAdminTime: toLocalDateTimeInput(String(c.scheduledAdminTime)),
          actualAdminTime: toLocalDateTimeInput(String(c.actualAdminTime)),
          dirty: false,
        }))
      );
      setStatusText(`MAR preview generated. Batch ${payload.data.batchId} with ${payload.data.candidateCount} rows.`);
      setActiveTab("preview");
    } catch (error) {
      setErrorText(error instanceof Error ? error.message : "Failed to generate MAR preview.");
      setStatusText("MAR preview generation failed.");
    } finally { setLoadingGenerate(false); }
  };

  const updateRow = (rowId: string, patch: Partial<CandidateRow>) => {
    setRows((current) =>
      current.map((row) => row.id !== rowId ? row : { ...row, ...patch, dirty: true })
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
      if (!response.ok || !payload?.ok) throw new Error(getErrorMessage(payload?.error));
      setRows((current) =>
        current.map((existing) =>
          existing.id !== row.id ? existing : {
            ...existing, ...payload.data,
            scheduledAdminTime: toLocalDateTimeInput(String(payload.data.scheduledAdminTime)),
            actualAdminTime: toLocalDateTimeInput(String(payload.data.actualAdminTime)),
            dirty: false,
          }
        )
      );
      setStatusText(`Saved candidate ${row.id}.`);
    } catch (error) {
      setErrorText(error instanceof Error ? error.message : "Failed to save candidate.");
    } finally { setSavingRowId(null); }
  };

  const onCommit = async () => {
    if (!batchId) { setErrorText("No batch to commit. Generate MAR preview first."); return; }
    if (!resolvedStaffId.trim()) { setErrorText("Support Worker ID is required to commit."); return; }
    setErrorText("");
    setStatusText("Approving rows and committing batch...");
    setLoadingCommit(true);
    try {
      const approveResponse = await fetch("/api/engine/mar-preview", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approveAll: true, batchId, actorStaffId: resolvedStaffId }),
      });
      const approvePayload = await approveResponse.json();
      if (!approveResponse.ok || !approvePayload?.ok) throw new Error(getErrorMessage(approvePayload?.error));
      const commitResponse = await fetch("/api/engine/commit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ batchId, actorStaffId: resolvedStaffId }),
      });
      const commitPayload = await commitResponse.json();
      if (!commitResponse.ok || !commitPayload?.ok) throw new Error(getErrorMessage(commitPayload?.error));
      setStatusText(`Committed batch ${commitPayload.data.batchId}. MAR rows: ${commitPayload.data.marCommitted}.`);
      setRows((current) => current.map((row) => ({ ...row, statusReview: "APPROVED", dirty: false })));
    } catch (error) {
      setErrorText(error instanceof Error ? error.message : "Failed to commit batch.");
      setStatusText("Commit failed.");
    } finally { setLoadingCommit(false); }
  };

  const onDownloadXlsx = () => {
    if (!batchId) { setErrorText("No batch to export. Generate MAR preview first."); return; }
    setErrorText("");
    setStatusText("Generating XLSX...");
    setLoadingXlsx(true);
    try {
      const wb = XLSX.utils.book_new();
      const marData = rows.map((r) => ({
        "Scheduled Time": r.scheduledAdminTime, "Actual Time": r.actualAdminTime,
        Medication: r.medicationName, Dosage: r.dosage, Route: r.route,
        Status: r.status, "Omission Reason": r.omissionReason ?? "",
        "Status Comment": r.statusComment ?? "", "Status Review": r.statusReview,
      }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(marData), "MAR Candidates");
      const filename = `mar-batch-${batchId}.xlsx`;
      XLSX.writeFile(wb, filename);
      setStatusText(`XLSX downloaded: ${filename}`);
    } catch (error) {
      setErrorText(error instanceof Error ? error.message : "Failed to generate XLSX.");
    } finally { setLoadingXlsx(false); }
  };

  const onDownloadPDF = async () => {
    if (!batchId) { setErrorText("No batch to download. Generate MAR preview first."); return; }
    setErrorText("");
    setStatusText("Downloading PDF...");
    setLoadingPdf(true);
    try {
      const response = await fetch("/api/engine/export-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ batchId, chartType: "MAR" }),
      });
      if (!response.ok) {
        const errorPayload = await response.json().catch(() => ({}));
        throw new Error(getErrorMessage(errorPayload?.error));
      }
      const blob = await response.blob();
      const filename = getFilenameFromDisposition(response.headers.get("content-disposition"), `mar-batch-${batchId}.pdf`);
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
    } finally { setLoadingPdf(false); }
  };

  const addMedication = () => setMedications([...medications, emptyMedication()]);
  const removeMedication = (index: number) => setMedications(medications.filter((_, i) => i !== index));
  const updateMedication = (index: number, patch: Partial<MedicationInput>) => {
    setMedications(medications.map((med, i) => (i === index ? { ...med, ...patch } : med)));
  };

  /* ── Render helpers ─────────────────────────────────────── */

  const selectedParticipantLabel = participants.find((p) => p.id === selectedParticipantId)?.fullName ?? "";
  const selectedStaffLabel = staffList.find((s) => s.id === selectedStaffId)?.displayName ?? "";

  /* ── Tab: Setup ─────────────────────────────────────────── */

  const renderSetup = () => (
    <section className="space-y-6">
      {/* Participant */}
      <div className="rounded-lg border border-gray-200 p-4">
        <h3 className="text-sm font-semibold mb-3">Participant</h3>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">Select Participant</span>
            <select
              className="form-control"
              value={selectedParticipantId}
              onChange={(e) => {
                setSelectedParticipantId(e.target.value);
                setParticipantUuidOverride("");
                setSelectedTemplateId("");
              }}
            >
              <option value="">— Select —</option>
              {participants.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.fullName}{p.externalReference ? ` (${p.externalReference})` : ""}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">UUID Override (advanced)</span>
            <input
              className="form-control font-mono text-xs"
              value={participantUuidOverride}
              onChange={(e) => setParticipantUuidOverride(e.target.value)}
              placeholder="paste UUID to override dropdown"
            />
          </label>
        </div>
        {resolvedParticipantId && (
          <div className="mt-2 text-xs text-gray-400">
            Resolved ID: <code className="font-mono bg-gray-800 px-1 rounded">{resolvedParticipantId}</code>
            {selectedParticipantLabel && !participantUuidOverride && <span className="ml-2">({selectedParticipantLabel})</span>}
          </div>
        )}
      </div>

      {/* Support Worker */}
      <div className="rounded-lg border border-gray-200 p-4">
        <h3 className="text-sm font-semibold mb-3">Support Worker</h3>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">Select Support Worker</span>
            <select
              className="form-control"
              value={selectedStaffId}
              onChange={(e) => {
                setSelectedStaffId(e.target.value);
                setStaffUuidOverride("");
              }}
            >
              <option value="">— Select —</option>
              {staffList.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.displayName} ({s.workerNumber})
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">UUID Override (advanced)</span>
            <input
              className="form-control font-mono text-xs"
              value={staffUuidOverride}
              onChange={(e) => setStaffUuidOverride(e.target.value)}
              placeholder="paste UUID to override dropdown"
            />
          </label>
        </div>
        {resolvedStaffId && (
          <div className="mt-2 text-xs text-gray-400">
            Resolved ID: <code className="font-mono bg-gray-800 px-1 rounded">{resolvedStaffId}</code>
            {selectedStaffLabel && !staffUuidOverride && <span className="ml-2">({selectedStaffLabel})</span>}
          </div>
        )}
      </div>

      {/* Date Range */}
      <div className="rounded-lg border border-gray-200 p-4">
        <h3 className="text-sm font-semibold mb-3">Date Range</h3>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">Start Date</span>
            <input className="form-control" type="date" value={startDate}
              onChange={(e) => { setStartDate(e.target.value); setDateManuallyChanged(true); }} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">Start Time</span>
            <input className="form-control" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">End Date</span>
            <input className="form-control" type="date" value={endDate}
              onChange={(e) => { setEndDate(e.target.value); setDateManuallyChanged(true); }} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">End Time</span>
            <input className="form-control" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
          </label>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="text-xs font-medium text-gray-500">Quick:</span>
          {[
            { label: "Today", fn: () => { setStartDate(toDateInput(today)); setEndDate(toDateInput(today)); } },
            { label: "7 days", fn: () => { setStartDate(toDateInput(today)); setEndDate(addDays(toDateInput(today), 6)); } },
            { label: "30 days", fn: () => { setStartDate(toDateInput(today)); setEndDate(addDays(toDateInput(today), 29)); } },
          ].map((p) => (
            <button key={p.label} type="button" onClick={() => { p.fn(); setDateManuallyChanged(true); }}
              className="rounded-sm border border-gray-600 px-2 py-1 text-xs hover:bg-gray-700">{p.label}</button>
          ))}
        </div>
      </div>
    </section>
  );

  /* ── Tab: Medications ───────────────────────────────────── */

  const renderMedications = () => (
    <section className="space-y-6">
      {/* Template loader */}
      <div className="rounded-lg border border-gray-200 p-4">
        <h3 className="text-sm font-semibold mb-3">Medication Template</h3>
        <div className="flex gap-3 items-end">
          <label className="flex flex-col gap-1 flex-1">
            <span className="text-sm font-medium">Template</span>
            <select className="form-control" value={selectedTemplateId}
              onChange={(e) => setSelectedTemplateId(e.target.value)}>
              <option value="">— Select template —</option>
              {filteredTemplates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.templateName} (v{t.version}){t.scope === "PARTICIPANT" ? " [participant]" : " [global]"}
                </option>
              ))}
            </select>
          </label>
          <button type="button" onClick={onLoadTemplate} disabled={!selectedTemplateId}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white disabled:opacity-50">
            Load Template
          </button>
        </div>
        {templateBanner && (
          <div className="mt-3 rounded-md bg-green-900/40 border border-green-700 px-3 py-2 text-sm text-green-300">
            {templateBanner}
          </div>
        )}
        {medications.some((m) => m.name.includes("(PRN)")) && (
          <div className="mt-3 rounded-md bg-amber-900/40 border border-amber-700 px-3 py-2 text-sm text-amber-300">
            PRN medications are included. Verify dosing rules before preview.
          </div>
        )}
      </div>

      {/* Medication rows */}
      <div className="rounded-lg border border-gray-200 p-4">
        <h3 className="text-sm font-semibold mb-3">Medications ({medications.length} entries)</h3>
        <div className="space-y-3">
          {medications.map((med, idx) => (
            <div key={idx} className="grid grid-cols-1 gap-3 md:grid-cols-6 items-end">
              <label className="flex flex-col gap-1">
                <span className="text-sm font-medium">Name</span>
                <input className="form-control" value={med.name}
                  onChange={(e) => updateMedication(idx, { name: e.target.value })} placeholder="e.g., Aspirin" />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-sm font-medium">Dosage</span>
                <input className="form-control" value={med.dosage}
                  onChange={(e) => updateMedication(idx, { dosage: e.target.value })} placeholder="e.g., 100mg" />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-sm font-medium">Route</span>
                <input className="form-control" value={med.route}
                  onChange={(e) => updateMedication(idx, { route: e.target.value })} placeholder="e.g., Oral" />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-sm font-medium">Hour</span>
                <input className="form-control" type="number" min="0" max="23" value={med.hour}
                  onChange={(e) => updateMedication(idx, { hour: parseInt(e.target.value) || 0 })} />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-sm font-medium">Minute</span>
                <input className="form-control" type="number" min="0" max="59" value={med.minute}
                  onChange={(e) => updateMedication(idx, { minute: parseInt(e.target.value) || 0 })} />
              </label>
              <button type="button" onClick={() => removeMedication(idx)} disabled={medications.length === 1}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm text-red-400 disabled:opacity-50">
                Remove
              </button>
            </div>
          ))}
        </div>
        <button type="button" onClick={addMedication}
          className="mt-4 rounded-md border border-gray-300 px-4 py-2 text-sm text-blue-400 hover:bg-blue-900/20">
          + Add Medication
        </button>
      </div>
    </section>
  );

  /* ── Tab: Preview ───────────────────────────────────────── */

  const renderPreview = () => (
    <section className="space-y-4">
      {/* Validation errors */}
      {validationErrors.length > 0 && (
        <div className="rounded-md bg-red-900/40 border border-red-700 px-3 py-2 text-sm text-red-300">
          <p className="font-semibold mb-1">Cannot generate preview:</p>
          <ul className="list-disc list-inside space-y-0.5">
            {validationErrors.map((e, i) => <li key={i}>{e}</li>)}
          </ul>
        </div>
      )}

      <div className="flex items-center gap-3">
        <button type="button" onClick={onGenerateMAR}
          disabled={loadingGenerate}
          className="rounded-md bg-blue-600 px-6 py-2 text-white disabled:opacity-50">
          {loadingGenerate ? "Generating..." : "Generate Preview"}
        </button>
        <span className="text-xs text-gray-400">
          {resolvedParticipantId ? `Participant: ${selectedParticipantLabel || resolvedParticipantId}` : "No participant selected"}
          {" | "}
          {medications.length} medication(s)
        </span>
      </div>

      {/* Preview table */}
      <div className="overflow-x-auto rounded-lg border border-gray-200">
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
              <tr><td className="px-3 py-6 text-center text-gray-500" colSpan={8}>No preview data yet. Generate a preview first.</td></tr>
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
                    <input className="form-control w-44 text-xs" type="datetime-local" value={row.actualAdminTime}
                      onChange={(e) => updateRow(row.id, { actualAdminTime: e.target.value })} />
                  </td>
                  <td className="border-b px-3 py-2">
                    <select className="form-control text-xs" value={row.status}
                      onChange={(e) => updateRow(row.id, { status: e.target.value as MARStatus })}>
                      {MAR_STATUS_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </td>
                  <td className="border-b px-3 py-2 text-xs">{row.statusReview}</td>
                  <td className="border-b px-3 py-2">
                    <button type="button" className="rounded-md border border-gray-300 px-2 py-1 text-xs disabled:opacity-50"
                      onClick={() => onSaveRow(row)} disabled={!row.dirty || savingRowId === row.id}>
                      {savingRowId === row.id ? "Saving..." : "Save"}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );

  /* ── Tab: Review ────────────────────────────────────────── */

  const renderReview = () => {
    const counts = getStatusCounts(rows);
    return (
      <section className="space-y-4">
        {rows.length === 0 ? (
          <p className="text-gray-500">No preview data to review. Generate a preview first.</p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
              <div className="rounded-lg border border-gray-200 p-3 text-center">
                <div className="text-2xl font-bold">{rows.length}</div>
                <div className="text-xs text-gray-500">Total Rows</div>
              </div>
              <div className="rounded-lg border border-green-700 p-3 text-center">
                <div className="text-2xl font-bold text-green-400">{counts.approved}</div>
                <div className="text-xs text-gray-500">Approved</div>
              </div>
              <div className="rounded-lg border border-yellow-700 p-3 text-center">
                <div className="text-2xl font-bold text-yellow-400">{counts.pending}</div>
                <div className="text-xs text-gray-500">Pending</div>
              </div>
              <div className="rounded-lg border border-orange-700 p-3 text-center">
                <div className="text-2xl font-bold text-orange-400">{counts.refused}</div>
                <div className="text-xs text-gray-500">Refused</div>
              </div>
              <div className="rounded-lg border border-purple-700 p-3 text-center">
                <div className="text-2xl font-bold text-purple-400">{counts.held}</div>
                <div className="text-xs text-gray-500">Held</div>
              </div>
            </div>
            {getDirtyCount(rows) > 0 && (
              <div className="rounded-md bg-blue-900/40 border border-blue-700 px-3 py-2 text-sm text-blue-300">
                {getDirtyCount(rows)} row(s) have unsaved changes. Save them before committing.
              </div>
            )}
          </>
        )}
      </section>
    );
  };

  /* ── Tab: Commit ────────────────────────────────────────── */

  const renderCommit = () => (
    <section className="space-y-4">
      {rows.length === 0 ? (
        <p className="text-gray-500">No batch to commit. Generate and review a preview first.</p>
      ) : (
        <>
          <div className="rounded-lg border border-gray-200 p-4">
            <h3 className="text-sm font-semibold mb-2">Commit Summary</h3>
            <div className="text-sm space-y-1">
              <div><span className="text-gray-500">Batch:</span> <code className="font-mono text-xs bg-gray-800 px-1 rounded">{batchId}</code></div>
              <div><span className="text-gray-500">Rows:</span> {rows.length}</div>
              <div><span className="text-gray-500">Participant:</span> {selectedParticipantLabel || resolvedParticipantId}</div>
              <div><span className="text-gray-500">Support Worker:</span> {selectedStaffLabel || resolvedStaffId}</div>
            </div>
          </div>
          <button type="button" onClick={onCommit} disabled={loadingCommit || rows.length === 0}
            className="rounded-md bg-green-700 px-6 py-2 text-white disabled:opacity-50">
            {loadingCommit ? "Committing..." : "Commit Batch"}
          </button>
        </>
      )}
    </section>
  );

  /* ── Tab: Export ────────────────────────────────────────── */

  const renderExport = () => (
    <section className="space-y-4">
      {rows.length === 0 ? (
        <p className="text-gray-500">No batch to export. Generate a preview first.</p>
      ) : (
        <div className="flex gap-3">
          <button type="button" onClick={onDownloadPDF} disabled={loadingPdf || !batchId}
            className="rounded-md bg-blue-600 px-4 py-2 text-white disabled:opacity-50">
            {loadingPdf ? "Downloading..." : "Download PDF"}
          </button>
          <button type="button" onClick={onDownloadXlsx} disabled={loadingXlsx || !batchId}
            className="rounded-md border border-emerald-500 px-4 py-2 text-emerald-300 disabled:opacity-50">
            {loadingXlsx ? "Preparing XLSX..." : "Download XLSX"}
          </button>
        </div>
      )}
    </section>
  );

  /* ── Tab content map ────────────────────────────────────── */

  const tabContent: Record<TabKey, () => React.ReactNode> = {
    setup: renderSetup,
    medications: renderMedications,
    preview: renderPreview,
    review: renderReview,
    commit: renderCommit,
    export: renderExport,
  };

  /* ── Page layout ────────────────────────────────────────── */

  return (
    <main className="mx-auto max-w-7xl p-6">
      <h1 className="text-3xl font-semibold">Medical Chart Commission (MAR)</h1>
      <p className="mt-2 text-sm text-slate-300">
        Generate preview records, edit fields, and then commit approved entries to the ledger.
      </p>

      {/* Status bar */}
      <section className="mt-4 rounded-md border border-gray-200 bg-gray-50 p-3 text-sm text-gray-900">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium">Batch:</span>
              <code className="rounded bg-gray-200 px-2 py-1 font-mono text-xs">{batchId || "---"}</code>
              {batchId && (
                <button type="button" onClick={copyBatchId} className="text-xs text-blue-600 hover:underline" title="Copy batch ID">
                  copy
                </button>
              )}
            </div>
            <div className="mt-1"><span className="font-medium">Status:</span> {statusText}</div>
          </div>
          {rows.length > 0 && (
            <div className="flex gap-4 text-xs">
              <div className="text-center"><div className="font-semibold text-green-600">{getStatusCounts(rows).approved}</div><div className="text-gray-600">Approved</div></div>
              <div className="text-center"><div className="font-semibold text-yellow-600">{getStatusCounts(rows).pending}</div><div className="text-gray-600">Pending</div></div>
              <div className="text-center"><div className="font-semibold text-orange-600">{getStatusCounts(rows).refused}</div><div className="text-gray-600">Refused</div></div>
              <div className="text-center"><div className="font-semibold text-purple-600">{getStatusCounts(rows).held}</div><div className="text-gray-600">Held</div></div>
            </div>
          )}
        </div>
        {errorText && <div className="mt-2 text-red-700">{errorText}</div>}
      </section>

      {/* Tabs */}
      <nav className="mt-6 flex border-b border-gray-200">
        {TAB_KEYS.map((key) => (
          <button key={key} type="button" onClick={() => setActiveTab(key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === key
                ? "border-blue-500 text-blue-400"
                : "border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500"
            }`}>
            {TAB_LABELS[key]}
          </button>
        ))}
      </nav>

      {/* Tab content */}
      <div className="mt-6">
        {tabContent[activeTab]()}
      </div>
    </main>
  );
}

export default function MARPage() {
  return (
    <Suspense>
      <MARPageInner />
    </Suspense>
  );
}
