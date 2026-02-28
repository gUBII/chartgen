"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../../components/AuthProvider";
import { useRouter } from "next/navigation";

type ChartFamily =
  | "meal"
  | "mar"
  | "sleep"
  | "bgl"
  | "bowel"
  | "hygiene"
  | "community"
  | "repositioning"
  | "restrictive"
  | "shiftNote";

type FormField = {
  name: string;
  label: string;
  type: "text" | "number" | "datetime-local" | "select" | "textarea" | "checkbox";
  required?: boolean;
  options?: { value: string; label: string }[];
  placeholder?: string;
  defaultValue?: string | number | boolean;
};

type AdminListItem = {
  id: string;
  family: ChartFamily;
  participantId: string;
  staffId: string;
  recordedAt: string;
  source: string;
};

const FAMILIES: { id: ChartFamily; label: string; fields: FormField[] }[] = [
  {
    id: "meal",
    label: "Meal Log",
    fields: [
      { name: "participantId", label: "Participant ID", type: "text", required: true },
      { name: "staffId", label: "Staff ID", type: "text", required: true },
      { name: "timestamp", label: "Timestamp", type: "datetime-local", required: true },
      {
        name: "mealType",
        label: "Meal Type",
        type: "select",
        required: true,
        options: [
          { value: "BREAKFAST", label: "Breakfast" },
          { value: "LUNCH", label: "Lunch" },
          { value: "DINNER", label: "Dinner" },
          { value: "SNACK", label: "Snack" },
        ],
      },
      { name: "foodTexture", label: "Food Texture (1-7)", type: "number", required: true, defaultValue: 5 },
      { name: "fluidThickness", label: "Fluid Thickness (0-4)", type: "number", required: true, defaultValue: 2 },
      { name: "volumeMl", label: "Volume (ml)", type: "number", required: true, defaultValue: 250 },
      {
        name: "amountEaten",
        label: "Amount Eaten",
        type: "select",
        required: true,
        options: [
          { value: "ZERO", label: "0%" },
          { value: "TWENTY_FIVE", label: "25%" },
          { value: "FIFTY", label: "50%" },
          { value: "SEVENTY_FIVE", label: "75%" },
          { value: "ONE_HUNDRED", label: "100%" },
          { value: "REFUSED", label: "Refused" },
        ],
      },
    ],
  },
  {
    id: "mar",
    label: "MAR Log",
    fields: [
      { name: "participantId", label: "Participant ID", type: "text", required: true },
      { name: "staffId", label: "Staff ID", type: "text", required: true },
      { name: "scheduledAdminTime", label: "Scheduled Time", type: "datetime-local", required: true },
      { name: "actualAdminTime", label: "Actual Time", type: "datetime-local", required: true },
      { name: "medicationName", label: "Medication Name", type: "text", required: true, placeholder: "e.g. Paracetamol" },
      { name: "dosage", label: "Dosage", type: "text", required: true, placeholder: "e.g. 500mg" },
      { name: "route", label: "Route", type: "text", required: true, defaultValue: "Oral" },
      {
        name: "status",
        label: "Status",
        type: "select",
        required: true,
        options: [
          { value: "ADMINISTERED", label: "Administered" },
          { value: "REFUSED", label: "Refused" },
          { value: "HELD", label: "Held" },
          { value: "LATE", label: "Late" },
          { value: "NOT_ADMINISTERED", label: "Not Administered" },
        ],
      },
      { name: "omissionReason", label: "Omission Reason", type: "text", placeholder: "If not administered" },
    ],
  },
  {
    id: "sleep",
    label: "Sleep / Settling",
    fields: [
      { name: "participantId", label: "Participant ID", type: "text", required: true },
      { name: "staffId", label: "Staff ID", type: "text", required: true },
      { name: "checkTime", label: "Check Time", type: "datetime-local", required: true },
      {
        name: "status",
        label: "Status",
        type: "select",
        required: true,
        options: [
          { value: "ASLEEP", label: "Asleep" },
          { value: "AWAKE", label: "Awake" },
          { value: "AGITATED", label: "Agitated" },
        ],
      },
      { name: "intervention", label: "Intervention", type: "text", placeholder: "Optional" },
    ],
  },
  {
    id: "bgl",
    label: "BGL / Diabetes",
    fields: [
      { name: "participantId", label: "Participant ID", type: "text", required: true },
      { name: "staffId", label: "Staff ID", type: "text", required: true },
      { name: "loggedAt", label: "Logged At", type: "datetime-local", required: true },
      { name: "bglReadingMmolL", label: "BGL Reading (mmol/L)", type: "number", required: true, placeholder: "e.g. 5.5" },
      {
        name: "fastingStatus",
        label: "Fasting Status",
        type: "select",
        required: true,
        options: [
          { value: "FASTING", label: "Fasting" },
          { value: "NON_FASTING", label: "Non-Fasting" },
          { value: "UNKNOWN", label: "Unknown" },
        ],
      },
      { name: "insulinAdministered", label: "Insulin Administered", type: "checkbox" },
      { name: "actionTaken", label: "Action Taken", type: "text", placeholder: "Optional" },
    ],
  },
  {
    id: "bowel",
    label: "Bowel / Fluid",
    fields: [
      { name: "participantId", label: "Participant ID", type: "text", required: true },
      { name: "staffId", label: "Staff ID", type: "text", required: true },
      { name: "timestamp", label: "Timestamp", type: "datetime-local", required: true },
      {
        name: "type",
        label: "Type",
        type: "select",
        required: true,
        options: [
          { value: "BOWEL", label: "Bowel Motion" },
          { value: "FLUID_IN", label: "Fluid Intake" },
          { value: "FLUID_OUT", label: "Fluid Output" },
        ],
      },
      { name: "volumeMl", label: "Volume (ml)", type: "number", placeholder: "For fluid entries" },
      { name: "bristolScale", label: "Bristol Scale (1-7)", type: "number", placeholder: "For bowel entries" },
      { name: "notes", label: "Notes", type: "textarea" },
    ],
  },
  {
    id: "hygiene",
    label: "Hygiene",
    fields: [
      { name: "participantId", label: "Participant ID", type: "text", required: true },
      { name: "staffId", label: "Staff ID", type: "text", required: true },
      { name: "loggedAt", label: "Logged At", type: "datetime-local", required: true },
      ...["showerStatus", "oralCareStatus", "groomingStatus", "continenceCareStatus", "skinIntegrityChecked"].map(
        (name) => ({
          name,
          label: name.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase()),
          type: "select" as const,
          options: [
            { value: "COMPLETED", label: "Completed" },
            { value: "PARTIAL", label: "Partial" },
            { value: "REFUSED", label: "Refused" },
            { value: "NOT_APPLICABLE", label: "N/A" },
            { value: "UNKNOWN", label: "Unknown" },
          ],
        })
      ),
    ],
  },
  {
    id: "community",
    label: "Community Access",
    fields: [
      { name: "participantId", label: "Participant ID", type: "text", required: true },
      { name: "staffId", label: "Staff ID", type: "text", required: true },
      { name: "departedAt", label: "Departed At", type: "datetime-local", required: true },
      { name: "returnedAt", label: "Returned At", type: "datetime-local" },
      { name: "destination", label: "Destination", type: "text", required: true },
      {
        name: "purpose",
        label: "Purpose",
        type: "select",
        required: true,
        options: [
          { value: "SOCIAL", label: "Social" },
          { value: "MEDICAL", label: "Medical" },
          { value: "CAPACITY_BUILDING", label: "Capacity Building" },
          { value: "OTHER", label: "Other" },
        ],
      },
      {
        name: "transportMethod",
        label: "Transport",
        type: "select",
        required: true,
        options: [
          { value: "WALK", label: "Walk" },
          { value: "PUBLIC_TRANSPORT", label: "Public Transport" },
          { value: "TAXI_RIDESHARE", label: "Taxi / Rideshare" },
          { value: "PROVIDER_VEHICLE", label: "Provider Vehicle" },
          { value: "PRIVATE_VEHICLE", label: "Private Vehicle" },
          { value: "OTHER", label: "Other" },
        ],
      },
    ],
  },
  {
    id: "repositioning",
    label: "Repositioning",
    fields: [
      { name: "participantId", label: "Participant ID", type: "text", required: true },
      { name: "staffId", label: "Staff ID", type: "text", required: true },
      { name: "turnedAt", label: "Turned At", type: "datetime-local", required: true },
      {
        name: "position",
        label: "Position",
        type: "select",
        required: true,
        options: [
          { value: "LEFT_SIDE", label: "Left Side" },
          { value: "RIGHT_SIDE", label: "Right Side" },
          { value: "SUPINE", label: "Supine" },
          { value: "PRONE", label: "Prone" },
          { value: "SEATED", label: "Seated" },
          { value: "TILT_IN_SPACE", label: "Tilt in Space" },
          { value: "OTHER", label: "Other" },
        ],
      },
      {
        name: "skinCheckOutcome",
        label: "Skin Check",
        type: "select",
        options: [
          { value: "INTACT", label: "Intact" },
          { value: "REDNESS", label: "Redness" },
          { value: "BREAKDOWN", label: "Breakdown" },
          { value: "PAIN", label: "Pain" },
          { value: "UNKNOWN", label: "Unknown" },
        ],
      },
      { name: "planIntervalMin", label: "Plan Interval (min)", type: "number", defaultValue: 120 },
    ],
  },
  {
    id: "restrictive",
    label: "Restrictive Practice",
    fields: [
      { name: "participantId", label: "Participant ID", type: "text", required: true },
      { name: "staffId", label: "Staff ID", type: "text", required: true },
      { name: "timestamp", label: "Timestamp", type: "datetime-local", required: true },
      {
        name: "type",
        label: "Type",
        type: "select",
        required: true,
        options: [
          { value: "CHEMICAL", label: "Chemical" },
          { value: "PHYSICAL", label: "Physical" },
          { value: "MECHANICAL", label: "Mechanical" },
          { value: "ENVIRONMENTAL", label: "Environmental" },
        ],
      },
      { name: "reason", label: "Reason", type: "textarea", required: true },
      { name: "durationMin", label: "Duration (min)", type: "number" },
    ],
  },
  {
    id: "shiftNote",
    label: "Shift Note",
    fields: [
      { name: "participantId", label: "Participant ID", type: "text", required: true },
      { name: "staffId", label: "Staff ID", type: "text", required: true },
      {
        name: "category",
        label: "Category",
        type: "select",
        required: true,
        options: [
          { value: "ROUTINE", label: "Routine" },
          { value: "ESCALATION", label: "Escalation" },
          { value: "INCIDENT_FOLLOWUP", label: "Incident Follow-up" },
          { value: "CLINICAL_HANDOVER", label: "Clinical Handover" },
        ],
      },
      { name: "note", label: "Note", type: "textarea", required: true },
    ],
  },
];

function getDefaultFormData(fields: FormField[]): Record<string, string | number | boolean> {
  const data: Record<string, string | number | boolean> = {};
  for (const f of fields) {
    if (f.defaultValue !== undefined) {
      data[f.name] = f.defaultValue;
    } else if (f.type === "checkbox") {
      data[f.name] = false;
    } else if (f.type === "number") {
      data[f.name] = "";
    } else if (f.type === "select" && f.options?.length) {
      data[f.name] = f.options[0].value;
    } else {
      data[f.name] = "";
    }
  }
  return data;
}

type AdminMode = "entries" | "participants" | "staff";

type ParticipantRecord = {
  id: string;
  fullName: string;
  externalReference: string | null;
  defaultFoodTexture: number;
  defaultFluidThickness: number;
  createdAt: string;
};

type StaffRecord = {
  id: string;
  workerNumber: string;
  displayName: string;
  role: string;
  createdAt: string;
};

const MODE_TABS: { id: AdminMode; label: string }[] = [
  { id: "entries", label: "Entries" },
  { id: "participants", label: "Participants" },
  { id: "staff", label: "Staff" },
];

export default function AdminPage() {
  const { role, isRoleResolved } = useAuth();
  const router = useRouter();
  const [mode, setMode] = useState<AdminMode>("entries");
  const [selectedFamily, setSelectedFamily] = useState<ChartFamily>("meal");
  const [formData, setFormData] = useState<Record<string, string | number | boolean>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [recentEntries, setRecentEntries] = useState<AdminListItem[]>([]);
  const [loadingRecent, setLoadingRecent] = useState(false);
  const [recentError, setRecentError] = useState<string | null>(null);

  // Participants state
  const [participants, setParticipants] = useState<ParticipantRecord[]>([]);
  const [loadingParticipants, setLoadingParticipants] = useState(false);
  const [pFullName, setPFullName] = useState("");
  const [pTexture, setPTexture] = useState("5");
  const [pThickness, setPThickness] = useState("2");
  const [pExtRef, setPExtRef] = useState("");
  const [pSubmitting, setPSubmitting] = useState(false);
  const [pResult, setPResult] = useState<{ ok: boolean; message: string } | null>(null);

  // Staff state
  const [staffList, setStaffList] = useState<StaffRecord[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [sWorkerNumber, setSWorkerNumber] = useState("");
  const [sDisplayName, setSDisplayName] = useState("");
  const [sRole, setSRole] = useState("SUPPORT_WORKER");
  const [sSubmitting, setSSubmitting] = useState(false);
  const [sResult, setSResult] = useState<{ ok: boolean; message: string } | null>(null);

  const family = FAMILIES.find((f) => f.id === selectedFamily)!;

  const loadRecentEntries = useCallback(async (familyId: ChartFamily) => {
    setLoadingRecent(true);
    setRecentError(null);
    try {
      const response = await fetch(`/api/admin/entries?family=${encodeURIComponent(familyId)}&limit=10`, {
        method: "GET",
        cache: "no-store",
      });
      const json = (await response.json()) as { ok?: boolean; data?: AdminListItem[]; error?: string };
      if (!response.ok || !json.ok) {
        throw new Error(json.error || "Failed to load recent entries");
      }
      setRecentEntries(Array.isArray(json.data) ? json.data : []);
    } catch (error) {
      setRecentEntries([]);
      setRecentError(error instanceof Error ? error.message : "Failed to load recent entries");
    } finally {
      setLoadingRecent(false);
    }
  }, []);

  const loadParticipants = useCallback(async () => {
    setLoadingParticipants(true);
    try {
      const res = await fetch("/api/admin/participants", { cache: "no-store" });
      const json = await res.json();
      if (json.ok) setParticipants(Array.isArray(json.data) ? json.data : []);
    } catch { /* ignore */ }
    finally { setLoadingParticipants(false); }
  }, []);

  const loadStaff = useCallback(async () => {
    setLoadingStaff(true);
    try {
      const res = await fetch("/api/admin/staff", { cache: "no-store" });
      const json = await res.json();
      if (json.ok) setStaffList(Array.isArray(json.data) ? json.data : []);
    } catch { /* ignore */ }
    finally { setLoadingStaff(false); }
  }, []);

  useEffect(() => {
    if (mode === "entries") {
      setFormData(getDefaultFormData(family.fields));
      setResult(null);
      void loadRecentEntries(selectedFamily);
    } else if (mode === "participants") {
      void loadParticipants();
    } else if (mode === "staff") {
      void loadStaff();
    }
  }, [selectedFamily, mode]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auth gate
  if (isRoleResolved && role !== "full") {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12 text-center">
        <h1 className="font-display text-2xl font-bold text-cyan-100 mb-4">Admin Dashboard</h1>
        <p className="text-slate-400 mb-6">Full authentication required to access admin functions.</p>
        <button
          onClick={() => router.push("/login")}
          className="rounded-full border border-cyan-300/40 bg-cyan-400/15 px-6 py-2 text-sm font-semibold text-cyan-100 hover:bg-cyan-400/25 transition"
        >
          Login
        </button>
      </div>
    );
  }

  const updateField = (name: string, value: string | number | boolean) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setResult(null);

    try {
      const entry: Record<string, unknown> = { ...formData };
      // Convert number fields
      for (const f of family.fields) {
        if (f.type === "number" && entry[f.name] !== "") {
          entry[f.name] = Number(entry[f.name]);
        }
        if (f.type === "datetime-local" && entry[f.name]) {
          entry[f.name] = new Date(String(entry[f.name])).toISOString();
        }
      }

      const res = await fetch("/api/admin/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ family: selectedFamily, entry }),
      });

      const json = await res.json();
      if (json.ok) {
        setResult({ ok: true, message: `${family.label} entry created (ID: ${json.data?.id?.slice(0, 8)}...)` });
        setFormData(getDefaultFormData(family.fields));
        void loadRecentEntries(selectedFamily);
      } else {
        setResult({ ok: false, message: json.error || "Failed to create entry" });
      }
    } catch (err) {
      setResult({ ok: false, message: err instanceof Error ? err.message : "Network error" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateParticipant = async (e: React.FormEvent) => {
    e.preventDefault();
    setPSubmitting(true);
    setPResult(null);
    try {
      const res = await fetch("/api/admin/participants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: pFullName,
          defaultFoodTexture: Number(pTexture),
          defaultFluidThickness: Number(pThickness),
          externalReference: pExtRef || undefined,
        }),
      });
      const json = await res.json();
      if (json.ok) {
        setPResult({ ok: true, message: `Participant created (ID: ${json.data?.id?.slice(0, 8)}...)` });
        setPFullName("");
        setPTexture("5");
        setPThickness("2");
        setPExtRef("");
        void loadParticipants();
      } else {
        setPResult({ ok: false, message: json.error || "Failed to create participant" });
      }
    } catch (err) {
      setPResult({ ok: false, message: err instanceof Error ? err.message : "Network error" });
    } finally {
      setPSubmitting(false);
    }
  };

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setSSubmitting(true);
    setSResult(null);
    try {
      const res = await fetch("/api/admin/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workerNumber: sWorkerNumber,
          displayName: sDisplayName,
          role: sRole,
        }),
      });
      const json = await res.json();
      if (json.ok) {
        setSResult({ ok: true, message: `Staff created (ID: ${json.data?.id?.slice(0, 8)}...)` });
        setSWorkerNumber("");
        setSDisplayName("");
        setSRole("SUPPORT_WORKER");
        void loadStaff();
      } else {
        setSResult({ ok: false, message: json.error || "Failed to create staff" });
      }
    } catch (err) {
      setSResult({ ok: false, message: err instanceof Error ? err.message : "Network error" });
    } finally {
      setSSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <div className="mb-8">
        <p className="landing-mono text-xs text-cyan-300/70 mb-1">Administration</p>
        <h1 className="font-display text-2xl font-bold text-cyan-100">Admin Dashboard</h1>
        <p className="text-sm text-slate-400 mt-1">Manage entries, participants, and staff.</p>
      </div>

      {/* Mode tabs */}
      <div className="mb-6 flex gap-2">
        {MODE_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => { setMode(tab.id); setResult(null); setPResult(null); setSResult(null); }}
            className={`rounded-full border px-4 py-2 text-xs font-semibold transition ${
              mode === tab.id
                ? "border-cyan-400/60 bg-cyan-400/20 text-cyan-100"
                : "border-slate-500/30 text-slate-400 hover:text-slate-200 hover:border-slate-400/40"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* === ENTRIES MODE === */}
      {mode === "entries" && (
        <>
          <div className="mb-6 flex flex-wrap gap-2">
            {FAMILIES.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setSelectedFamily(f.id)}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                  selectedFamily === f.id
                    ? "border-cyan-400/50 bg-cyan-400/15 text-cyan-100"
                    : "border-slate-500/30 text-slate-400 hover:text-slate-200 hover:border-slate-400/40"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="futuristic-panel p-6">
            <h2 className="font-display text-lg font-semibold text-cyan-100 mb-4">
              New {family.label}
            </h2>

            <div className="grid gap-4 sm:grid-cols-2">
              {family.fields.map((field) => (
                <div key={field.name} className={field.type === "textarea" ? "sm:col-span-2" : ""}>
                  <label htmlFor={`admin-${field.name}`} className="block text-xs font-medium text-slate-300 mb-1">
                    {field.label}
                    {field.required && <span className="text-amber-400 ml-0.5">*</span>}
                  </label>

                  {field.type === "select" ? (
                    <select
                      id={`admin-${field.name}`}
                      value={String(formData[field.name] ?? "")}
                      onChange={(e) => updateField(field.name, e.target.value)}
                      required={field.required}
                      className="w-full rounded-lg border border-cyan-400/25 bg-slate-900/60 px-3 py-2 text-xs text-slate-100 focus:border-cyan-400/50 focus:outline-none"
                    >
                      {field.options?.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  ) : field.type === "textarea" ? (
                    <textarea
                      id={`admin-${field.name}`}
                      value={String(formData[field.name] ?? "")}
                      onChange={(e) => updateField(field.name, e.target.value)}
                      required={field.required}
                      placeholder={field.placeholder}
                      rows={3}
                      className="w-full rounded-lg border border-cyan-400/25 bg-slate-900/60 px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:border-cyan-400/50 focus:outline-none"
                    />
                  ) : field.type === "checkbox" ? (
                    <div className="flex items-center gap-2 mt-1">
                      <input
                        id={`admin-${field.name}`}
                        type="checkbox"
                        checked={Boolean(formData[field.name])}
                        onChange={(e) => updateField(field.name, e.target.checked)}
                        className="rounded border-slate-500/40 bg-slate-900/60 text-cyan-400 focus:ring-cyan-400/30"
                      />
                      <span className="text-xs text-slate-400">Yes</span>
                    </div>
                  ) : (
                    <input
                      id={`admin-${field.name}`}
                      type={field.type}
                      value={String(formData[field.name] ?? "")}
                      onChange={(e) =>
                        updateField(
                          field.name,
                          field.type === "number" ? e.target.value : e.target.value
                        )
                      }
                      required={field.required}
                      placeholder={field.placeholder}
                      step={field.type === "number" ? "any" : undefined}
                      className="w-full rounded-lg border border-cyan-400/25 bg-slate-900/60 px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:border-cyan-400/50 focus:outline-none"
                    />
                  )}
                </div>
              ))}
            </div>

            {result && (
              <div
                role="alert"
                className={`mt-4 rounded-lg border px-4 py-3 text-xs ${
                  result.ok
                    ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200"
                    : "border-red-400/30 bg-red-400/10 text-red-200"
                }`}
              >
                {result.message}
              </div>
            )}

            <div className="mt-6 flex gap-3">
              <button
                type="submit"
                disabled={submitting}
                className="rounded-full border border-cyan-400/40 bg-cyan-400/15 px-6 py-2 text-xs font-semibold text-cyan-100 hover:bg-cyan-400/25 transition disabled:opacity-50"
              >
                {submitting ? "Saving..." : "Create Entry"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setFormData(getDefaultFormData(family.fields));
                  setResult(null);
                }}
                className="rounded-full border border-slate-500/30 px-4 py-2 text-xs text-slate-400 hover:text-slate-200 transition"
              >
                Reset
              </button>
            </div>
          </form>

          <section className="futuristic-panel mt-6 p-6">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="font-display text-sm font-semibold text-cyan-100">
                Recent {family.label} Entries
              </h3>
              <button
                type="button"
                onClick={() => void loadRecentEntries(selectedFamily)}
                disabled={loadingRecent}
                className="rounded-full border border-slate-500/30 px-3 py-1 text-[11px] text-slate-300 hover:text-slate-100 disabled:opacity-50"
              >
                {loadingRecent ? "Refreshing..." : "Refresh"}
              </button>
            </div>

            {recentError && (
              <div className="mb-3 rounded-lg border border-red-400/30 bg-red-400/10 px-3 py-2 text-xs text-red-200">
                {recentError}
              </div>
            )}

            <div className="overflow-x-auto rounded-xl border border-cyan-400/15">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-cyan-400/15">
                    <th className="px-3 py-2 text-left text-cyan-200/80">ID</th>
                    <th className="px-3 py-2 text-left text-cyan-200/80">Participant</th>
                    <th className="px-3 py-2 text-left text-cyan-200/80">Staff</th>
                    <th className="px-3 py-2 text-left text-cyan-200/80">Recorded At</th>
                    <th className="px-3 py-2 text-left text-cyan-200/80">Source</th>
                  </tr>
                </thead>
                <tbody>
                  {recentEntries.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-3 py-6 text-center text-slate-400">
                        {loadingRecent ? "Loading entries..." : "No entries found for this chart family."}
                      </td>
                    </tr>
                  ) : (
                    recentEntries.map((entry) => (
                      <tr key={entry.id} className="border-b border-cyan-400/8">
                        <td className="px-3 py-2 text-slate-300">{entry.id.slice(0, 8)}...</td>
                        <td className="px-3 py-2 text-slate-200">{entry.participantId}</td>
                        <td className="px-3 py-2 text-slate-200">{entry.staffId}</td>
                        <td className="px-3 py-2 text-slate-300">
                          {new Date(entry.recordedAt).toLocaleString()}
                        </td>
                        <td className="px-3 py-2 text-slate-300">{entry.source}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      {/* === PARTICIPANTS MODE === */}
      {mode === "participants" && (
        <>
          <form onSubmit={handleCreateParticipant} className="futuristic-panel p-6">
            <h2 className="font-display text-lg font-semibold text-cyan-100 mb-4">New Participant</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="p-fullName" className="block text-xs font-medium text-slate-300 mb-1">
                  Full Name <span className="text-amber-400 ml-0.5">*</span>
                </label>
                <input
                  id="p-fullName"
                  type="text"
                  value={pFullName}
                  onChange={(e) => setPFullName(e.target.value)}
                  required
                  className="w-full rounded-lg border border-cyan-400/25 bg-slate-900/60 px-3 py-2 text-xs text-slate-100 focus:border-cyan-400/50 focus:outline-none"
                />
              </div>
              <div>
                <label htmlFor="p-extRef" className="block text-xs font-medium text-slate-300 mb-1">
                  External Reference
                </label>
                <input
                  id="p-extRef"
                  type="text"
                  value={pExtRef}
                  onChange={(e) => setPExtRef(e.target.value)}
                  placeholder="Optional NDIS/MRN"
                  className="w-full rounded-lg border border-cyan-400/25 bg-slate-900/60 px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:border-cyan-400/50 focus:outline-none"
                />
              </div>
              <div>
                <label htmlFor="p-texture" className="block text-xs font-medium text-slate-300 mb-1">
                  Food Texture (1-7)
                </label>
                <input
                  id="p-texture"
                  type="number"
                  min={1}
                  max={7}
                  value={pTexture}
                  onChange={(e) => setPTexture(e.target.value)}
                  className="w-full rounded-lg border border-cyan-400/25 bg-slate-900/60 px-3 py-2 text-xs text-slate-100 focus:border-cyan-400/50 focus:outline-none"
                />
              </div>
              <div>
                <label htmlFor="p-thickness" className="block text-xs font-medium text-slate-300 mb-1">
                  Fluid Thickness (0-4)
                </label>
                <input
                  id="p-thickness"
                  type="number"
                  min={0}
                  max={4}
                  value={pThickness}
                  onChange={(e) => setPThickness(e.target.value)}
                  className="w-full rounded-lg border border-cyan-400/25 bg-slate-900/60 px-3 py-2 text-xs text-slate-100 focus:border-cyan-400/50 focus:outline-none"
                />
              </div>
            </div>
            {pResult && (
              <div
                role="alert"
                className={`mt-4 rounded-lg border px-4 py-3 text-xs ${
                  pResult.ok
                    ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200"
                    : "border-red-400/30 bg-red-400/10 text-red-200"
                }`}
              >
                {pResult.message}
              </div>
            )}
            <div className="mt-6">
              <button
                type="submit"
                disabled={pSubmitting}
                className="rounded-full border border-cyan-400/40 bg-cyan-400/15 px-6 py-2 text-xs font-semibold text-cyan-100 hover:bg-cyan-400/25 transition disabled:opacity-50"
              >
                {pSubmitting ? "Creating..." : "Create Participant"}
              </button>
            </div>
          </form>

          <section className="futuristic-panel mt-6 p-6">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="font-display text-sm font-semibold text-cyan-100">Participants</h3>
              <button
                type="button"
                onClick={() => void loadParticipants()}
                disabled={loadingParticipants}
                className="rounded-full border border-slate-500/30 px-3 py-1 text-[11px] text-slate-300 hover:text-slate-100 disabled:opacity-50"
              >
                {loadingParticipants ? "Refreshing..." : "Refresh"}
              </button>
            </div>
            <div className="overflow-x-auto rounded-xl border border-cyan-400/15">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-cyan-400/15">
                    <th className="px-3 py-2 text-left text-cyan-200/80">ID</th>
                    <th className="px-3 py-2 text-left text-cyan-200/80">Full Name</th>
                    <th className="px-3 py-2 text-left text-cyan-200/80">Ext Ref</th>
                    <th className="px-3 py-2 text-left text-cyan-200/80">Texture</th>
                    <th className="px-3 py-2 text-left text-cyan-200/80">Thickness</th>
                    <th className="px-3 py-2 text-left text-cyan-200/80">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {participants.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-3 py-6 text-center text-slate-400">
                        {loadingParticipants ? "Loading..." : "No participants found."}
                      </td>
                    </tr>
                  ) : (
                    participants.map((p) => (
                      <tr key={p.id} className="border-b border-cyan-400/8">
                        <td className="px-3 py-2 text-slate-300">{p.id.slice(0, 8)}...</td>
                        <td className="px-3 py-2 text-slate-200">{p.fullName}</td>
                        <td className="px-3 py-2 text-slate-300">{p.externalReference ?? "-"}</td>
                        <td className="px-3 py-2 text-slate-300">{p.defaultFoodTexture}</td>
                        <td className="px-3 py-2 text-slate-300">{p.defaultFluidThickness}</td>
                        <td className="px-3 py-2 text-slate-300">{new Date(p.createdAt).toLocaleDateString()}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      {/* === STAFF MODE === */}
      {mode === "staff" && (
        <>
          <form onSubmit={handleCreateStaff} className="futuristic-panel p-6">
            <h2 className="font-display text-lg font-semibold text-cyan-100 mb-4">New Staff Member</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="s-workerNumber" className="block text-xs font-medium text-slate-300 mb-1">
                  Worker Number <span className="text-amber-400 ml-0.5">*</span>
                </label>
                <input
                  id="s-workerNumber"
                  type="text"
                  value={sWorkerNumber}
                  onChange={(e) => setSWorkerNumber(e.target.value)}
                  required
                  placeholder="e.g. SW-001"
                  className="w-full rounded-lg border border-cyan-400/25 bg-slate-900/60 px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:border-cyan-400/50 focus:outline-none"
                />
              </div>
              <div>
                <label htmlFor="s-displayName" className="block text-xs font-medium text-slate-300 mb-1">
                  Display Name <span className="text-amber-400 ml-0.5">*</span>
                </label>
                <input
                  id="s-displayName"
                  type="text"
                  value={sDisplayName}
                  onChange={(e) => setSDisplayName(e.target.value)}
                  required
                  className="w-full rounded-lg border border-cyan-400/25 bg-slate-900/60 px-3 py-2 text-xs text-slate-100 focus:border-cyan-400/50 focus:outline-none"
                />
              </div>
              <div>
                <label htmlFor="s-role" className="block text-xs font-medium text-slate-300 mb-1">
                  Role <span className="text-amber-400 ml-0.5">*</span>
                </label>
                <select
                  id="s-role"
                  value={sRole}
                  onChange={(e) => setSRole(e.target.value)}
                  className="w-full rounded-lg border border-cyan-400/25 bg-slate-900/60 px-3 py-2 text-xs text-slate-100 focus:border-cyan-400/50 focus:outline-none"
                >
                  <option value="SUPPORT_WORKER">Support Worker</option>
                  <option value="SUPERVISOR">Supervisor</option>
                  <option value="CLINICAL_LEAD">Clinical Lead</option>
                </select>
              </div>
            </div>
            {sResult && (
              <div
                role="alert"
                className={`mt-4 rounded-lg border px-4 py-3 text-xs ${
                  sResult.ok
                    ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200"
                    : "border-red-400/30 bg-red-400/10 text-red-200"
                }`}
              >
                {sResult.message}
              </div>
            )}
            <div className="mt-6">
              <button
                type="submit"
                disabled={sSubmitting}
                className="rounded-full border border-cyan-400/40 bg-cyan-400/15 px-6 py-2 text-xs font-semibold text-cyan-100 hover:bg-cyan-400/25 transition disabled:opacity-50"
              >
                {sSubmitting ? "Creating..." : "Create Staff"}
              </button>
            </div>
          </form>

          <section className="futuristic-panel mt-6 p-6">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="font-display text-sm font-semibold text-cyan-100">Staff Members</h3>
              <button
                type="button"
                onClick={() => void loadStaff()}
                disabled={loadingStaff}
                className="rounded-full border border-slate-500/30 px-3 py-1 text-[11px] text-slate-300 hover:text-slate-100 disabled:opacity-50"
              >
                {loadingStaff ? "Refreshing..." : "Refresh"}
              </button>
            </div>
            <div className="overflow-x-auto rounded-xl border border-cyan-400/15">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-cyan-400/15">
                    <th className="px-3 py-2 text-left text-cyan-200/80">ID</th>
                    <th className="px-3 py-2 text-left text-cyan-200/80">Worker #</th>
                    <th className="px-3 py-2 text-left text-cyan-200/80">Name</th>
                    <th className="px-3 py-2 text-left text-cyan-200/80">Role</th>
                    <th className="px-3 py-2 text-left text-cyan-200/80">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {staffList.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-3 py-6 text-center text-slate-400">
                        {loadingStaff ? "Loading..." : "No staff found."}
                      </td>
                    </tr>
                  ) : (
                    staffList.map((s) => (
                      <tr key={s.id} className="border-b border-cyan-400/8">
                        <td className="px-3 py-2 text-slate-300">{s.id.slice(0, 8)}...</td>
                        <td className="px-3 py-2 text-slate-200">{s.workerNumber}</td>
                        <td className="px-3 py-2 text-slate-200">{s.displayName}</td>
                        <td className="px-3 py-2 text-slate-300">{s.role}</td>
                        <td className="px-3 py-2 text-slate-300">{new Date(s.createdAt).toLocaleDateString()}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
