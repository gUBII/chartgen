import type { ChartLog } from "./types";
import { rowClassName, display } from "./utils";

type MedicationTabProps = {
  marLogs: ChartLog[];
};

export function MedicationTab({ marLogs }: MedicationTabProps) {
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="min-w-full border-collapse text-sm text-gray-900">
        <thead className="bg-gray-100">
          <tr>
            <th className="border-b px-3 py-2 text-left">Time</th>
            <th className="border-b px-3 py-2 text-left">Medication</th>
            <th className="border-b px-3 py-2 text-left">Dose</th>
            <th className="border-b px-3 py-2 text-left">Route</th>
            <th className="border-b px-3 py-2 text-left">Status</th>
          </tr>
        </thead>
        <tbody>
          {marLogs.length === 0 ? (
            <tr>
              <td className="px-3 py-6 text-center text-gray-500" colSpan={5}>No MAR logs generated yet.</td>
            </tr>
          ) : (
            marLogs.map((log, idx) => (
              <tr key={`mar-${idx}`} className={rowClassName(log)}>
                <td className="border-b px-3 py-2">{display(log.actualAdminTime ?? log.scheduledAdminTime ?? log.loggedAt)}</td>
                <td className="border-b px-3 py-2">{display(log.medicationName)}</td>
                <td className="border-b px-3 py-2">{display(log.dosage)}</td>
                <td className="border-b px-3 py-2">{display(log.route)}</td>
                <td className="border-b px-3 py-2">{display(log.status)}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
