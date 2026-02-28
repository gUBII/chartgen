import type { ChartLog } from "./types";
import { rowClassName, display } from "./utils";

type HealthTabProps = {
  bglLogs: ChartLog[];
  hygieneLogs: ChartLog[];
  repositionLogs: ChartLog[];
  communityLogs: ChartLog[];
};

export function HealthTab({ bglLogs, hygieneLogs, repositionLogs, communityLogs }: HealthTabProps) {
  return (
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
  );
}
