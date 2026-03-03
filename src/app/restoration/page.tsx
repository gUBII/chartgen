"use client";

import { Suspense } from "react";
import { TAB_LABELS } from "./types";
import { useRestoration } from "./useRestoration";
import { GenerateForm } from "./GenerateForm";
import { StatusBar } from "./StatusBar";
import { MedicationTab } from "./MedicationTab";
import { NutritionTab } from "./NutritionTab";
import { NightTab } from "./NightTab";
import { HealthTab } from "./HealthTab";

function RestorationPageInner() {
  const state = useRestoration();

  return (
    <main className="mx-auto max-w-7xl p-6">
      <h1 className="text-3xl font-semibold">Restoration Dashboard</h1>
      <p className="mt-2 text-sm text-slate-300">
        Generate synthetic chart timelines, inspect defects, and commit grouped logs to the ledger.
      </p>

      <GenerateForm
        participantId={state.participantId} setParticipantId={state.setParticipantId}
        participants={state.participants}
        reviewerStaffId={state.reviewerStaffId} setReviewerStaffId={state.setReviewerStaffId}
        defaultWorkerStaffId={state.defaultWorkerStaffId} setDefaultWorkerStaffId={state.setDefaultWorkerStaffId}
        workerScheduleByDow={state.workerScheduleByDow} setWorkerForDow={state.setWorkerForDow}
        staffOptions={state.staffOptions}
        loadingOptions={state.loadingOptions}
        startDate={state.startDate} setStartDate={state.setStartDate}
        startTime={state.startTime} setStartTime={state.setStartTime}
        endDate={state.endDate} setEndDate={state.setEndDate}
        endTime={state.endTime} setEndTime={state.setEndTime}
        loadingGenerate={state.loadingGenerate} onGenerate={state.onGenerate}
      />

      <StatusBar
        batchId={state.batchId} statusText={state.statusText} errorText={state.errorText}
        marLogs={state.marLogs} mealLogs={state.mealLogs} rows={state.rows}
        sleepLogs={state.sleepLogs} bglLogs={state.bglLogs} bowelLogs={state.bowelLogs}
        hygieneLogs={state.hygieneLogs} communityLogs={state.communityLogs}
        repositionLogs={state.repositionLogs}
      />

      <section className="mt-6">
        <div className="mb-3 flex flex-wrap gap-2">
          {TAB_LABELS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => state.setActiveTab(tab.id)}
              className={`rounded-md border px-3 py-2 text-sm ${
                state.activeTab === tab.id
                  ? "border-blue-600 bg-blue-600 text-white"
                  : "border-gray-300 bg-white text-gray-900"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {state.activeTab === "medication" ? <MedicationTab marLogs={state.marLogs} /> : null}

        {state.activeTab === "nutrition" ? (
          <NutritionTab
            rows={state.rows} bowelLogs={state.bowelLogs}
            savingRowId={state.savingRowId} updateRow={state.updateRow}
            onSaveRow={state.onSaveRow}
          />
        ) : null}

        {state.activeTab === "night" ? <NightTab sleepLogs={state.sleepLogs} /> : null}

        {state.activeTab === "health" ? (
          <HealthTab
            bglLogs={state.bglLogs} hygieneLogs={state.hygieneLogs}
            repositionLogs={state.repositionLogs} communityLogs={state.communityLogs}
          />
        ) : null}

        {!state.hasPreviewData ? (
          <div className="mt-6 rounded-md border border-dashed border-gray-300 p-4 text-sm text-gray-500">
            No preview data yet. Click Generate to build a synthetic timeline.
          </div>
        ) : null}
      </section>

      <section className="mt-6 flex items-center justify-between">
        <div className="flex gap-2">
          <button
            type="button"
            className="rounded-md border border-slate-300 px-4 py-2 text-slate-100 disabled:opacity-50"
            onClick={state.onDownloadPdf}
            disabled={state.loadingPdf || state.rows.length === 0 || !state.batchId || state.hasDirtyRows}
            title={state.hasDirtyRows ? "Save edited rows before exporting PDF." : undefined}
          >
            {state.loadingPdf ? "Preparing PDF..." : "Download PDF"}
          </button>
          <button
            type="button"
            className="rounded-md border border-emerald-500 px-4 py-2 text-emerald-300 disabled:opacity-50"
            onClick={state.onDownloadXlsx}
            disabled={state.loadingXlsx || !state.hasPreviewData || !state.batchId}
          >
            {state.loadingXlsx ? "Preparing XLSX..." : "Download XLSX"}
          </button>
        </div>
        <button
          type="button"
          className="rounded-md bg-green-700 px-4 py-2 text-white disabled:opacity-50"
          onClick={state.onCommit}
          disabled={state.loadingCommit || !state.hasPreviewData}
        >
          {state.loadingCommit ? "Committing..." : "Commit Batch"}
        </button>
      </section>
    </main>
  );
}

export default function RestorationPage() {
  return (
    <Suspense>
      <RestorationPageInner />
    </Suspense>
  );
}
