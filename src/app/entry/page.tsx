"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Participant {
  id: string;
  fullName: string;
}

interface Staff {
  id: string;
  displayName: string;
  role: string;
}

type RouteTarget = "restoration" | "mar" | null;

export default function EntryPage() {
  const router = useRouter();

  const [participants, setParticipants] = useState<Participant[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(true);

  const [participantId, setParticipantId] = useState("");
  const [staffId, setStaffId] = useState("");
  const [date, setDate] = useState("");

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [routeTarget, setRouteTarget] = useState<RouteTarget>(null);

  useEffect(() => {
    async function loadOptions() {
      try {
        const [pRes, sRes] = await Promise.all([
          fetch("/api/admin/participants"),
          fetch("/api/admin/staff"),
        ]);

        const pPayload = (await pRes.json().catch(() => ({}))) as {
          ok?: boolean;
          data?: Participant[];
        };
        const sPayload = (await sRes.json().catch(() => ({}))) as {
          ok?: boolean;
          data?: Staff[];
        };

        if (pRes.ok && pPayload.ok && Array.isArray(pPayload.data)) {
          setParticipants(pPayload.data);
        }
        if (sRes.ok && sPayload.ok && Array.isArray(sPayload.data)) {
          setStaff(sPayload.data);
        }
      } catch {
        // non-fatal
      } finally {
        setLoadingOptions(false);
      }
    }
    void loadOptions();
  }, []);

  function validate(): boolean {
    const next: Record<string, string> = {};
    if (!participantId) next.participantId = "Select a participant.";
    if (!staffId) next.staffId = "Select a staff member.";
    if (!date) next.date = "Select a date.";
    else {
      const d = new Date(date);
      if (isNaN(d.getTime())) next.date = "Invalid date.";
      else if (d > new Date()) next.date = "Date cannot be in the future.";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleRoute(target: RouteTarget) {
    if (!validate()) return;
    setRouteTarget(target);
    const params = new URLSearchParams({ participantId, staffId, date });
    router.push(`/${target}?${params.toString()}`);
  }

  return (
    <main className="mx-auto max-w-3xl px-6 pt-10 pb-16 space-y-8">
      <section className="futuristic-panel p-8 sm:p-10">
        <p className="landing-mono text-xs text-blue-200">Chart Entry</p>
        <h2 className="landing-mono mt-3 text-[clamp(2rem,5vw,3.4rem)] text-blue-50">
          Preflight
        </h2>
        <p className="text-muted mt-4 text-sm sm:text-base">
          Validate participant, staff, and date before entering a chart workflow.
        </p>
        <div className="mt-5">
          <Link
            href="/"
            className="rounded-full border border-cyan-300/45 bg-cyan-400/20 px-4 py-2 text-xs font-semibold text-cyan-50 hover:bg-cyan-400/30 transition"
          >
            Back to Home
          </Link>
        </div>
      </section>

      <section className="futuristic-panel p-6 space-y-5">
        <h3 className="landing-mono text-lg text-blue-50">Select Context</h3>

        {loadingOptions ? (
          <p className="text-xs text-slate-400">Loading options…</p>
        ) : (
          <>
            <div>
              <label className="block text-xs text-slate-300 mb-2">
                Participant
              </label>
              <select
                value={participantId}
                onChange={(e) => {
                  setParticipantId(e.target.value);
                  setErrors((prev) => ({ ...prev, participantId: "" }));
                }}
                className="form-control"
              >
                <option value="">— select participant —</option>
                {participants.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.fullName}
                  </option>
                ))}
              </select>
              {errors.participantId && (
                <p className="mt-1 text-xs text-red-400">{errors.participantId}</p>
              )}
            </div>

            <div>
              <label className="block text-xs text-slate-300 mb-2">
                Staff Member
              </label>
              <select
                value={staffId}
                onChange={(e) => {
                  setStaffId(e.target.value);
                  setErrors((prev) => ({ ...prev, staffId: "" }));
                }}
                className="form-control"
              >
                <option value="">— select staff —</option>
                {staff.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.displayName} ({s.role})
                  </option>
                ))}
              </select>
              {errors.staffId && (
                <p className="mt-1 text-xs text-red-400">{errors.staffId}</p>
              )}
            </div>

            <div>
              <label className="block text-xs text-slate-300 mb-2">Date</label>
              <input
                type="date"
                value={date}
                max={new Date().toISOString().slice(0, 10)}
                onChange={(e) => {
                  setDate(e.target.value);
                  setErrors((prev) => ({ ...prev, date: "" }));
                }}
                className="form-control"
              />
              {errors.date && (
                <p className="mt-1 text-xs text-red-400">{errors.date}</p>
              )}
            </div>
          </>
        )}

        <div className="pt-2 flex flex-wrap gap-3">
          <button
            onClick={() => handleRoute("restoration")}
            disabled={loadingOptions || routeTarget !== null}
            className="px-5 py-2 rounded-full bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 text-white text-sm font-semibold transition"
          >
            {routeTarget === "restoration" ? "Routing…" : "Meal Chart"}
          </button>
          <button
            onClick={() => handleRoute("mar")}
            disabled={loadingOptions || routeTarget !== null}
            className="px-5 py-2 rounded-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-semibold transition"
          >
            {routeTarget === "mar" ? "Routing…" : "Medical Chart (MAR)"}
          </button>
        </div>
      </section>
    </main>
  );
}
