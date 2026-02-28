import type { ChartLog, CandidateRow } from "./types";

type StatusBarProps = {
  batchId: string;
  statusText: string;
  errorText: string;
  marLogs: ChartLog[];
  mealLogs: ChartLog[];
  rows: CandidateRow[];
  sleepLogs: ChartLog[];
  bglLogs: ChartLog[];
  bowelLogs: ChartLog[];
  hygieneLogs: ChartLog[];
  communityLogs: ChartLog[];
  repositionLogs: ChartLog[];
};

export function StatusBar({
  batchId, statusText, errorText,
  marLogs, mealLogs, rows, sleepLogs, bglLogs,
  bowelLogs, hygieneLogs, communityLogs, repositionLogs,
}: StatusBarProps) {
  return (
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
  );
}
