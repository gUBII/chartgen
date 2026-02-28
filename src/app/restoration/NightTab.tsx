import type { ChartLog } from "./types";
import { rowClassName, display } from "./utils";

type NightTabProps = {
  sleepLogs: ChartLog[];
};

export function NightTab({ sleepLogs }: NightTabProps) {
  return (
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
  );
}
