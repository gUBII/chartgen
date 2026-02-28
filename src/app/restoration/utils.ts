import type { ApiError, ChartLog, CandidateRow } from "./types";

export const toDateInput = (date: Date): string => {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

export const toLocalDateTimeInput = (value: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
};

export const toIsoFromLocalDateTime = (value: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error("Invalid datetime input.");
  }
  return date.toISOString();
};

export const getErrorMessage = (error?: ApiError | string | unknown): string => {
  if (!error) {
    return "Unexpected API error.";
  }

  if (typeof error === "string") {
    return error;
  }

  if (typeof error === "object") {
    const maybe = error as Partial<ApiError> & { error?: unknown; message?: unknown };
    if (typeof maybe.code === "string" && typeof maybe.message === "string") {
      return `${maybe.code}: ${maybe.message}`;
    }
    if (typeof maybe.message === "string") {
      return maybe.message;
    }
    if (typeof maybe.error === "string") {
      return maybe.error;
    }
  }

  return "Unexpected API error.";
};

export const getFilenameFromDisposition = (disposition: string | null, fallback: string): string => {
  if (!disposition) {
    return fallback;
  }
  const filenameStarMatch = disposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (filenameStarMatch?.[1]) {
    try {
      return decodeURIComponent(filenameStarMatch[1]);
    } catch {
      return fallback;
    }
  }
  const filenameMatch = disposition.match(/filename="?([^"]+)"?/i);
  return filenameMatch?.[1] ?? fallback;
};

export const asArray = (value: unknown): ChartLog[] => (Array.isArray(value) ? (value as ChartLog[]) : []);

export const hasDefect = (row: ChartLog): boolean => {
  if (row.qaAnomalyFlag === true) return true;
  if (row.qaMeta && typeof row.qaMeta === "object") {
    return "defect" in (row.qaMeta as Record<string, unknown>);
  }
  return false;
};

export const rowClassName = (row: ChartLog): string => {
  return hasDefect(row) ? "bg-amber-100" : "bg-white";
};

export const display = (value: unknown): string => {
  if (value === null || value === undefined || value === "") return "-";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
};


export const mapRowsToMealLogs = (rows: CandidateRow[], participantId: string, fallbackStaffId: string): ChartLog[] => {
  return rows.map((row) => ({
    participantId,
    createdByStaffId: row.generatedByStaffId || fallbackStaffId,
    source: "LIVE",
    timestamp: toIsoFromLocalDateTime(row.timestamp),
    mealType: row.mealType,
    foodTexture: row.foodTexture,
    fluidThickness: row.fluidThickness,
    volumeMl: row.volumeMl,
    amountEaten: row.amountEaten,
    swallowingObservations: [],
    deviationReason: row.deviationReason,
    provenanceHash: row.provenanceHash,
  }));
};
