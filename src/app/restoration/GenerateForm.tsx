import type { ParticipantOption, StaffOption } from "./types";

type GenerateFormProps = {
  participantId: string;
  setParticipantId: (v: string) => void;
  participants: ParticipantOption[];
  reviewerStaffId: string;
  setReviewerStaffId: (v: string) => void;
  defaultWorkerStaffId: string;
  setDefaultWorkerStaffId: (v: string) => void;
  workerScheduleByDow: Record<string, string>;
  setWorkerForDow: (dow: string, staffId: string) => void;
  staffOptions: StaffOption[];
  loadingOptions: boolean;
  startDate: string;
  setStartDate: (v: string) => void;
  startTime: string;
  setStartTime: (v: string) => void;
  endDate: string;
  setEndDate: (v: string) => void;
  endTime: string;
  setEndTime: (v: string) => void;
  loadingGenerate: boolean;
  onGenerate: () => void;
};

export function GenerateForm({
  participantId, setParticipantId,
  participants,
  reviewerStaffId, setReviewerStaffId,
  defaultWorkerStaffId, setDefaultWorkerStaffId,
  workerScheduleByDow, setWorkerForDow,
  staffOptions, loadingOptions,
  startDate, setStartDate,
  startTime, setStartTime,
  endDate, setEndDate,
  endTime, setEndTime,
  loadingGenerate, onGenerate,
}: GenerateFormProps) {
  const dayLabels: Array<{ key: string; label: string }> = [
    { key: "1", label: "Mon" },
    { key: "2", label: "Tue" },
    { key: "3", label: "Wed" },
    { key: "4", label: "Thu" },
    { key: "5", label: "Fri" },
    { key: "6", label: "Sat" },
    { key: "0", label: "Sun" },
  ];

  const renderStaffOptions = () =>
    staffOptions.map((staff) => (
      <option key={staff.id} value={staff.id}>
        {staff.displayName} ({staff.role})
      </option>
    ));

  return (
    <section className="mt-6 grid grid-cols-1 gap-4 rounded-lg border border-gray-200 p-4 min-[430px]:grid-cols-2 lg:grid-cols-8">
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">Client</span>
        <select
          className="rounded-md border border-gray-300 px-3 py-2"
          disabled={loadingOptions}
          value={participantId}
          onChange={(e) => setParticipantId(e.target.value)}
        >
          <option value="">Select client</option>
          {participants.map((participant) => (
            <option key={participant.id} value={participant.id}>
              {participant.fullName} ({participant.id.slice(0, 8)})
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">Requesting Staff</span>
        <select
          className="rounded-md border border-gray-300 px-3 py-2"
          disabled={loadingOptions}
          value={reviewerStaffId}
          onChange={(e) => setReviewerStaffId(e.target.value)}
        >
          <option value="">Auto-select</option>
          {renderStaffOptions()}
        </select>
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">Default Worker</span>
        <select
          className="rounded-md border border-gray-300 px-3 py-2"
          disabled={loadingOptions}
          value={defaultWorkerStaffId}
          onChange={(e) => setDefaultWorkerStaffId(e.target.value)}
        >
          <option value="">Select worker</option>
          {renderStaffOptions()}
        </select>
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">Start Date</span>
        <input
          className="rounded-md border border-gray-300 px-3 py-2"
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">Start Time</span>
        <input
          className="rounded-md border border-gray-300 px-3 py-2"
          type="time"
          value={startTime}
          onChange={(e) => setStartTime(e.target.value)}
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">End Date</span>
        <input
          className="rounded-md border border-gray-300 px-3 py-2"
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">End Time</span>
        <input
          className="rounded-md border border-gray-300 px-3 py-2"
          type="time"
          value={endTime}
          onChange={(e) => setEndTime(e.target.value)}
        />
      </label>

      <div className="flex items-end">
        <button
          type="button"
          onClick={onGenerate}
          disabled={loadingGenerate}
          className="w-full rounded-md bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
        >
          {loadingGenerate ? "Generating..." : "Generate"}
        </button>
      </div>

      <details className="lg:col-span-8 rounded-md border border-gray-200 bg-gray-50 p-3">
        <summary className="cursor-pointer text-sm font-medium text-gray-800">
          Worker schedule by weekday (optional)
        </summary>
        <p className="mt-2 text-xs text-gray-600">
          Assign specific workers for each weekday. Empty values fall back to the default worker.
        </p>
        <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
          {dayLabels.map((day) => (
            <label key={day.key} className="flex flex-col gap-1">
              <span className="text-xs font-medium text-gray-700">{day.label}</span>
              <select
                className="rounded-md border border-gray-300 px-2 py-2 text-sm"
                disabled={loadingOptions}
                value={workerScheduleByDow[day.key] ?? ""}
                onChange={(e) => setWorkerForDow(day.key, e.target.value)}
              >
                <option value="">Default</option>
                {renderStaffOptions()}
              </select>
            </label>
          ))}
        </div>
      </details>
    </section>
  );
}
