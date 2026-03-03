"use client";

import { Suspense } from "react";
import { TAB_LABELS, RANGE_PRESET_LABELS } from "./types";
import type { InjectorButton } from "./types";
import { useRestoration } from "./useRestoration";
import { GenerateForm } from "./GenerateForm";
import { StatusBar } from "./StatusBar";
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

      {/* Injector Buttons Panel */}
      <section className="mt-4 rounded-md border border-slate-600 p-4">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h2 className="text-sm font-semibold text-slate-200">Injector Shortcuts</h2>
          <button
            type="button"
            className="rounded border border-blue-500 px-3 py-1 text-xs text-blue-300 hover:bg-blue-900/30"
            onClick={() =>
              state.setInjectorForm({
                label: "",
                participantId: state.participants[0]?.id ?? "",
                staffId: state.staffOptions[0]?.id ?? "",
                enabled: true,
                rangePreset: "day",
                sortOrder: 0,
              })
            }
          >
            + Add Button
          </button>
        </div>

        {state.injectorError ? (
          <p className="mt-1 text-xs text-red-400">{state.injectorError}</p>
        ) : null}

        <div className="mt-3 flex flex-wrap gap-2">
          {state.injectorButtons.filter((b: InjectorButton) => b.enabled).map((btn: InjectorButton) => (
            <div key={btn.id} className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => state.applyInjectorButton(btn)}
                className="rounded-md border border-slate-500 bg-slate-800 px-3 py-1.5 text-xs text-slate-100 hover:bg-slate-700"
                title={`${btn.participant.fullName} / ${btn.staff.displayName} / ${RANGE_PRESET_LABELS[btn.rangePreset]}`}
              >
                {btn.label}
                <span className="ml-1 text-slate-400">({RANGE_PRESET_LABELS[btn.rangePreset]})</span>
              </button>
              <button
                type="button"
                onClick={() =>
                  state.setInjectorForm({
                    id: btn.id,
                    label: btn.label,
                    participantId: btn.participantId,
                    staffId: btn.staffId,
                    enabled: btn.enabled,
                    rangePreset: btn.rangePreset,
                    sortOrder: btn.sortOrder,
                  })
                }
                className="text-slate-500 hover:text-slate-300 text-xs px-1"
                title="Edit"
              >
                ✎
              </button>
              <button
                type="button"
                onClick={() => state.deleteInjectorButton(btn.id)}
                className="text-slate-500 hover:text-red-400 text-xs px-1"
                title="Delete"
              >
                ✕
              </button>
            </div>
          ))}
          {state.injectorButtons.length === 0 && !state.loadingInjectors ? (
            <p className="text-xs text-slate-500">No injector buttons yet. Add one above.</p>
          ) : null}
        </div>

        {/* Create / Edit form */}
        {state.injectorForm ? (
          <div className="mt-4 rounded border border-slate-600 bg-slate-900 p-3 text-xs space-y-2">
            <p className="font-semibold text-slate-200">{state.injectorForm.id ? "Edit Button" : "New Button"}</p>
            <div className="flex flex-wrap gap-2">
              <input
                type="text"
                placeholder="Label"
                value={state.injectorForm.label}
                onChange={(e) => state.setInjectorForm({ ...state.injectorForm!, label: e.target.value })}
                className="rounded border border-slate-600 bg-slate-800 px-2 py-1 text-slate-100 w-36"
              />
              <select
                value={state.injectorForm.participantId}
                onChange={(e) => state.setInjectorForm({ ...state.injectorForm!, participantId: e.target.value })}
                className="rounded border border-slate-600 bg-slate-800 px-2 py-1 text-slate-100"
              >
                {state.participants.map((p) => (
                  <option key={p.id} value={p.id}>{p.fullName}</option>
                ))}
              </select>
              <select
                value={state.injectorForm.staffId}
                onChange={(e) => state.setInjectorForm({ ...state.injectorForm!, staffId: e.target.value })}
                className="rounded border border-slate-600 bg-slate-800 px-2 py-1 text-slate-100"
              >
                {state.staffOptions.map((s) => (
                  <option key={s.id} value={s.id}>{s.displayName}</option>
                ))}
              </select>
              <select
                value={state.injectorForm.rangePreset}
                onChange={(e) =>
                  state.setInjectorForm({
                    ...state.injectorForm!,
                    rangePreset: e.target.value as "day" | "week_plus" | "month_plus",
                  })
                }
                className="rounded border border-slate-600 bg-slate-800 px-2 py-1 text-slate-100"
              >
                <option value="day">Day</option>
                <option value="week_plus">Week+</option>
                <option value="month_plus">Month+</option>
              </select>
              <label className="flex items-center gap-1 text-slate-300">
                <input
                  type="checkbox"
                  checked={state.injectorForm.enabled}
                  onChange={(e) => state.setInjectorForm({ ...state.injectorForm!, enabled: e.target.checked })}
                />
                Enabled
              </label>
            </div>
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={state.saveInjectorForm}
                disabled={state.loadingInjectors || !state.injectorForm.label}
                className="rounded border border-emerald-500 px-3 py-1 text-emerald-300 disabled:opacity-50"
              >
                {state.loadingInjectors ? "Saving..." : "Save"}
              </button>
              <button
                type="button"
                onClick={() => state.setInjectorForm(null)}
                className="rounded border border-slate-500 px-3 py-1 text-slate-300"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : null}
      </section>

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
          className="rounded-md border border-red-600 px-4 py-2 text-red-300 disabled:opacity-50"
          onClick={state.onDiscardBatch}
          disabled={state.loadingDiscard || state.loadingCommit || !state.batchId}
        >
          {state.loadingDiscard ? "Discarding..." : "Discard Batch"}
        </button>
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
