import type { AmountEaten } from "@prisma/client";
import type { CandidateRow, ChartLog } from "./types";
import { AMOUNT_EATEN_OPTIONS } from "./types";
import { rowClassName, display } from "./utils";

type NutritionTabProps = {
  rows: CandidateRow[];
  bowelLogs: ChartLog[];
  savingRowId: string | null;
  updateRow: (rowId: string, patch: Partial<CandidateRow>) => void;
  onSaveRow: (row: CandidateRow) => void;
};

export function NutritionTab({ rows, bowelLogs, savingRowId, updateRow, onSaveRow }: NutritionTabProps) {
  return (
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
  );
}
