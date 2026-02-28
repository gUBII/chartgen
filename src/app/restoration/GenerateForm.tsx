type GenerateFormProps = {
  participantId: string;
  setParticipantId: (v: string) => void;
  actorStaffId: string;
  setActorStaffId: (v: string) => void;
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
  actorStaffId, setActorStaffId,
  startDate, setStartDate,
  startTime, setStartTime,
  endDate, setEndDate,
  endTime, setEndTime,
  loadingGenerate, onGenerate,
}: GenerateFormProps) {
  return (
    <section className="mt-6 grid grid-cols-1 gap-4 rounded-lg border border-gray-200 p-4 min-[430px]:grid-cols-2 lg:grid-cols-7">
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">Participant ID</span>
        <input
          className="rounded-md border border-gray-300 px-3 py-2"
          value={participantId}
          onChange={(e) => setParticipantId(e.target.value)}
          placeholder="participant uuid"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">Supervisor Staff ID</span>
        <input
          className="rounded-md border border-gray-300 px-3 py-2"
          value={actorStaffId}
          onChange={(e) => setActorStaffId(e.target.value)}
          placeholder="staff uuid"
        />
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
    </section>
  );
}
