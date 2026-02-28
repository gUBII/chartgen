import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "../../../../lib/prisma";
import { requireFullSession } from "../../../../lib/require-full-session";

export const runtime = "nodejs";

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

type AdminListItem = {
  id: string;
  family: ChartFamily;
  participantId: string;
  staffId: string;
  recordedAt: Date;
  source: string;
};

const CHART_FAMILIES: ReadonlySet<ChartFamily> = new Set([
  "meal",
  "mar",
  "sleep",
  "bgl",
  "bowel",
  "hygiene",
  "community",
  "repositioning",
  "restrictive",
  "shiftNote",
]);

const sha256 = (payload: unknown): string =>
  createHash("sha256").update(JSON.stringify(payload)).digest("hex");

function toISO(value: unknown): string {
  const d = new Date(String(value));
  if (isNaN(d.getTime())) throw new Error(`Invalid date: ${value}`);
  return d.toISOString();
}

function toLimit(value: string | null): number {
  const parsed = Number(value ?? 20);
  if (!Number.isFinite(parsed) || parsed <= 0) return 20;
  return Math.min(100, Math.floor(parsed));
}

export async function GET(request: NextRequest) {
  const authorized = await requireFullSession(request);
  if (!authorized) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const familyParam = searchParams.get("family");
    const limit = toLimit(searchParams.get("limit"));

    if (!familyParam || !CHART_FAMILIES.has(familyParam as ChartFamily)) {
      return NextResponse.json(
        { ok: false, error: "Invalid or missing family query param" },
        { status: 400 },
      );
    }

    const family = familyParam as ChartFamily;
    const items = await listEntries(family, limit);
    return NextResponse.json({ ok: true, data: items });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Admin list error:", message);
    return NextResponse.json({ ok: false, error: message }, { status: 422 });
  }
}

export async function POST(request: NextRequest) {
  const authorized = await requireFullSession(request);
  if (!authorized) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { family, entry } = body as { family: ChartFamily; entry: Record<string, unknown> };

    if (!family || !entry) {
      return NextResponse.json({ ok: false, error: "Missing family or entry" }, { status: 400 });
    }

    const result = await createEntry(family, entry);
    return NextResponse.json({ ok: true, data: result });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Admin entry error:", message);
    return NextResponse.json({ ok: false, error: message }, { status: 422 });
  }
}

async function listEntries(family: ChartFamily, limit: number): Promise<AdminListItem[]> {
  switch (family) {
    case "meal": {
      const rows = await prisma.mealLog.findMany({
        orderBy: { timestamp: "desc" },
        take: limit,
        select: { id: true, participantId: true, createdByStaffId: true, timestamp: true, source: true },
      });
      return rows.map((row) => ({
        id: row.id,
        family,
        participantId: row.participantId,
        staffId: row.createdByStaffId,
        recordedAt: row.timestamp,
        source: row.source,
      }));
    }
    case "mar": {
      const rows = await prisma.mARLog.findMany({
        orderBy: { actualAdminTime: "desc" },
        take: limit,
        select: { id: true, participantId: true, createdByStaffId: true, actualAdminTime: true, source: true },
      });
      return rows.map((row) => ({
        id: row.id,
        family,
        participantId: row.participantId,
        staffId: row.createdByStaffId,
        recordedAt: row.actualAdminTime,
        source: row.source,
      }));
    }
    case "sleep": {
      const rows = await prisma.sleepSettlingLog.findMany({
        orderBy: { checkTime: "desc" },
        take: limit,
        select: { id: true, participantId: true, loggedByStaffId: true, checkTime: true, source: true },
      });
      return rows.map((row) => ({
        id: row.id,
        family,
        participantId: row.participantId,
        staffId: row.loggedByStaffId,
        recordedAt: row.checkTime,
        source: row.source,
      }));
    }
    case "bgl": {
      const rows = await prisma.bglDiabetesLog.findMany({
        orderBy: { loggedAt: "desc" },
        take: limit,
        select: { id: true, participantId: true, staffId: true, loggedAt: true, source: true },
      });
      return rows.map((row) => ({
        id: row.id,
        family,
        participantId: row.participantId,
        staffId: row.staffId,
        recordedAt: row.loggedAt,
        source: row.source,
      }));
    }
    case "bowel": {
      const rows = await prisma.bowelFluidLog.findMany({
        orderBy: { timestamp: "desc" },
        take: limit,
        select: { id: true, participantId: true, loggedByStaffId: true, timestamp: true, source: true },
      });
      return rows.map((row) => ({
        id: row.id,
        family,
        participantId: row.participantId,
        staffId: row.loggedByStaffId,
        recordedAt: row.timestamp,
        source: row.source,
      }));
    }
    case "hygiene": {
      const rows = await prisma.hygieneLog.findMany({
        orderBy: { loggedAt: "desc" },
        take: limit,
        select: { id: true, participantId: true, staffId: true, loggedAt: true, source: true },
      });
      return rows.map((row) => ({
        id: row.id,
        family,
        participantId: row.participantId,
        staffId: row.staffId,
        recordedAt: row.loggedAt,
        source: row.source,
      }));
    }
    case "community": {
      const rows = await prisma.communityAccessQaLog.findMany({
        orderBy: { departedAt: "desc" },
        take: limit,
        select: { id: true, participantId: true, staffId: true, departedAt: true, source: true },
      });
      return rows.map((row) => ({
        id: row.id,
        family,
        participantId: row.participantId,
        staffId: row.staffId,
        recordedAt: row.departedAt,
        source: row.source,
      }));
    }
    case "repositioning": {
      const rows = await prisma.repositioningQaLog.findMany({
        orderBy: { turnedAt: "desc" },
        take: limit,
        select: { id: true, participantId: true, staffId: true, turnedAt: true, source: true },
      });
      return rows.map((row) => ({
        id: row.id,
        family,
        participantId: row.participantId,
        staffId: row.staffId,
        recordedAt: row.turnedAt,
        source: row.source,
      }));
    }
    case "restrictive": {
      const rows = await prisma.restrictivePracticeEvent.findMany({
        orderBy: { timestamp: "desc" },
        take: limit,
        select: { id: true, participantId: true, loggedByStaffId: true, timestamp: true, source: true },
      });
      return rows.map((row) => ({
        id: row.id,
        family,
        participantId: row.participantId,
        staffId: row.loggedByStaffId,
        recordedAt: row.timestamp,
        source: row.source,
      }));
    }
    case "shiftNote": {
      const rows = await prisma.shiftNote.findMany({
        orderBy: { createdAt: "desc" },
        take: limit,
        select: { id: true, participantId: true, authoredByStaffId: true, createdAt: true, source: true },
      });
      return rows.map((row) => ({
        id: row.id,
        family,
        participantId: row.participantId,
        staffId: row.authoredByStaffId,
        recordedAt: row.createdAt,
        source: row.source,
      }));
    }
    default:
      return [];
  }
}

async function createEntry(family: ChartFamily, entry: Record<string, unknown>) {
  switch (family) {
    case "meal": {
      const data: Prisma.MealLogUncheckedCreateInput = {
        participantId: String(entry.participantId),
        createdByStaffId: String(entry.staffId),
        source: "LIVE",
        timestamp: toISO(entry.timestamp),
        mealType: String(entry.mealType) as Prisma.MealLogUncheckedCreateInput["mealType"],
        foodTexture: Number(entry.foodTexture),
        fluidThickness: Number(entry.fluidThickness),
        volumeMl: Number(entry.volumeMl),
        amountEaten: String(entry.amountEaten) as Prisma.MealLogUncheckedCreateInput["amountEaten"],
        swallowingObservations: ((entry.swallowingObservations as string[]) ?? ["NONE"]) as Prisma.MealLogUncheckedCreateInput["swallowingObservations"],
        deviationReason: (entry.deviationReason as string) || null,
        provenanceHash: "",
      };
      data.provenanceHash = sha256(data);
      return prisma.mealLog.create({ data });
    }

    case "mar": {
      const data: Prisma.MARLogUncheckedCreateInput = {
        participantId: String(entry.participantId),
        createdByStaffId: String(entry.staffId),
        source: "LIVE",
        scheduledAdminTime: toISO(entry.scheduledAdminTime),
        actualAdminTime: toISO(entry.actualAdminTime),
        medicationName: String(entry.medicationName),
        dosage: String(entry.dosage),
        route: String(entry.route),
        status: String(entry.status) as Prisma.MARLogUncheckedCreateInput["status"],
        omissionReason: (entry.omissionReason as string) || null,
        provenanceHash: "",
      };
      data.provenanceHash = sha256(data);
      return prisma.mARLog.create({ data });
    }

    case "sleep": {
      const data: Prisma.SleepSettlingLogUncheckedCreateInput = {
        participantId: String(entry.participantId),
        loggedByStaffId: String(entry.staffId),
        checkTime: toISO(entry.checkTime),
        status: entry.status ? (String(entry.status) as Prisma.SleepSettlingLogUncheckedCreateInput["status"]) : null,
        intervention: (entry.intervention as string) || null,
        source: "LIVE",
      };
      return prisma.sleepSettlingLog.create({ data });
    }

    case "bgl": {
      const ts = toISO(entry.loggedAt);
      const data: Prisma.BglDiabetesLogUncheckedCreateInput = {
        source: "PRODUCTION",
        participantId: String(entry.participantId),
        staffId: String(entry.staffId),
        localDate: ts.slice(0, 10),
        loggedAt: ts,
        bglReadingMmolL: entry.bglReadingMmolL != null ? Number(entry.bglReadingMmolL) : null,
        fastingStatus: (String(entry.fastingStatus ?? "UNKNOWN")) as Prisma.BglDiabetesLogUncheckedCreateInput["fastingStatus"],
        insulinAdministered: Boolean(entry.insulinAdministered),
        actionTaken: (entry.actionTaken as string) || null,
      };
      return prisma.bglDiabetesLog.create({ data });
    }

    case "bowel": {
      const data: Prisma.BowelFluidLogUncheckedCreateInput = {
        participantId: String(entry.participantId),
        loggedByStaffId: String(entry.staffId),
        timestamp: toISO(entry.timestamp),
        type: String(entry.type) as Prisma.BowelFluidLogUncheckedCreateInput["type"],
        volumeMl: entry.volumeMl != null ? Number(entry.volumeMl) : null,
        bristolScale: entry.bristolScale != null ? Number(entry.bristolScale) : null,
        notes: (entry.notes as string) || null,
        source: "LIVE",
      };
      return prisma.bowelFluidLog.create({ data });
    }

    case "hygiene": {
      const ts = toISO(entry.loggedAt);
      const data: Prisma.HygieneLogUncheckedCreateInput = {
        source: "PRODUCTION",
        participantId: String(entry.participantId),
        staffId: String(entry.staffId),
        localDate: ts.slice(0, 10),
        loggedAt: ts,
        showerStatus: String(entry.showerStatus ?? "UNKNOWN") as Prisma.HygieneLogUncheckedCreateInput["showerStatus"],
        oralCareStatus: String(entry.oralCareStatus ?? "UNKNOWN") as Prisma.HygieneLogUncheckedCreateInput["oralCareStatus"],
        groomingStatus: String(entry.groomingStatus ?? "UNKNOWN") as Prisma.HygieneLogUncheckedCreateInput["groomingStatus"],
        continenceCareStatus: String(entry.continenceCareStatus ?? "UNKNOWN") as Prisma.HygieneLogUncheckedCreateInput["continenceCareStatus"],
        skinIntegrityChecked: String(entry.skinIntegrityChecked ?? "UNKNOWN") as Prisma.HygieneLogUncheckedCreateInput["skinIntegrityChecked"],
      };
      return prisma.hygieneLog.create({ data });
    }

    case "community": {
      const departed = toISO(entry.departedAt);
      const data: Prisma.CommunityAccessQaLogUncheckedCreateInput = {
        source: "PRODUCTION",
        participantId: String(entry.participantId),
        staffId: String(entry.staffId),
        localDate: departed.slice(0, 10),
        departedAt: departed,
        returnedAt: entry.returnedAt ? toISO(entry.returnedAt) : null,
        destination: String(entry.destination),
        purpose: String(entry.purpose) as Prisma.CommunityAccessQaLogUncheckedCreateInput["purpose"],
        transportMethod: String(entry.transportMethod) as Prisma.CommunityAccessQaLogUncheckedCreateInput["transportMethod"],
      };
      return prisma.communityAccessQaLog.create({ data });
    }

    case "repositioning": {
      const ts = toISO(entry.turnedAt);
      const data: Prisma.RepositioningQaLogUncheckedCreateInput = {
        source: "PRODUCTION",
        participantId: String(entry.participantId),
        staffId: String(entry.staffId),
        localDate: ts.slice(0, 10),
        turnedAt: ts,
        position: String(entry.position) as Prisma.RepositioningQaLogUncheckedCreateInput["position"],
        skinCheckOutcome: String(entry.skinCheckOutcome ?? "UNKNOWN") as Prisma.RepositioningQaLogUncheckedCreateInput["skinCheckOutcome"],
        planIntervalMin: entry.planIntervalMin != null ? Number(entry.planIntervalMin) : null,
      };
      return prisma.repositioningQaLog.create({ data });
    }

    case "restrictive": {
      const data: Prisma.RestrictivePracticeEventUncheckedCreateInput = {
        participantId: String(entry.participantId),
        loggedByStaffId: String(entry.staffId),
        timestamp: toISO(entry.timestamp),
        type: String(entry.type) as Prisma.RestrictivePracticeEventUncheckedCreateInput["type"],
        reason: String(entry.reason),
        durationMin: entry.durationMin != null ? Number(entry.durationMin) : null,
        source: "LIVE",
      };
      return prisma.restrictivePracticeEvent.create({ data });
    }

    case "shiftNote": {
      const data: Prisma.ShiftNoteUncheckedCreateInput = {
        participantId: String(entry.participantId),
        authoredByStaffId: String(entry.staffId),
        category: String(entry.category) as Prisma.ShiftNoteUncheckedCreateInput["category"],
        note: String(entry.note),
        source: "LIVE",
      };
      return prisma.shiftNote.create({ data });
    }

    default:
      throw new Error(`Unknown chart family: ${family}`);
  }
}
