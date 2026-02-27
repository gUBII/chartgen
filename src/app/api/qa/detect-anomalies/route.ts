import { NextRequest, NextResponse } from "next/server";
import { requireFullSession } from "../../../../lib/require-full-session";
import { prisma } from "../../../../lib/prisma";

export const runtime = "nodejs";

/**
 * Anomaly detection flags for NDIS compliance violations:
 * - GHOST_SHIFT: Sleep logs with exact 60-min intervals (falsification signature)
 * - UNAUTHORISED_RESTRAINT: Restraint events without BSP or outside BSP window
 * - SILENT_DEHYDRATION: Low fluid intake (<800ml/24h) with no escalation note
 */

interface AnomalyFlag {
  flagType: "GHOST_SHIFT" | "UNAUTHORISED_RESTRAINT" | "SILENT_DEHYDRATION";
  severity: "HIGH" | "CRITICAL";
  participantId: string;
  participantName: string;
  staffId: string;
  staffName: string;
  detail: Record<string, unknown>;
}

interface GhostShiftRow {
  participantId: string;
  loggedByStaffId: string;
  run_length: number;
  run_start: Date;
  run_end: Date;
  participant_name: string;
  staff_name: string;
}

interface DehydrationRow {
  participant_id: string;
  day: Date;
  total_ml: number;
  participant_name: string;
}

export async function GET(request: NextRequest) {
  try {
    // Auth check
    const authorized = await requireFullSession(request);
    if (!authorized) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    // Parse and validate date params
    const { searchParams } = new URL(request.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    if (!from || !to) {
      return NextResponse.json({ ok: false, error: "Missing required params: from, to" }, { status: 400 });
    }

    const fromDate = new Date(from);
    const toDate = new Date(to);

    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
      return NextResponse.json({ ok: false, error: "Invalid date format (use ISO format)" }, { status: 400 });
    }

    // Run all three detectors concurrently
    const [ghostFlags, restraintFlags, dehydrationFlags] = await Promise.all([
      detectGhostShifts(fromDate, toDate),
      detectUnauthorisedRestraints(fromDate, toDate),
      detectSilentDehydration(fromDate, toDate),
    ]);

    // Merge and sort by severity (CRITICAL first)
    const anomalies: AnomalyFlag[] = [...ghostFlags, ...restraintFlags, ...dehydrationFlags].sort(
      (a, b) => (a.severity === "CRITICAL" ? -1 : b.severity === "CRITICAL" ? 1 : 0)
    );

    return NextResponse.json({
      ok: true,
      data: {
        window: { from, to },
        anomalies,
        summary: {
          total: anomalies.length,
          byType: {
            GHOST_SHIFT: ghostFlags.length,
            UNAUTHORISED_RESTRAINT: restraintFlags.length,
            SILENT_DEHYDRATION: dehydrationFlags.length,
          },
        },
        ranAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Anomaly detection error:", error);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}

/**
 * DETECTOR 1: Ghost Shift Flag
 *
 * Find sleep settling logs with exactly 60-minute intervals (zero variance) for 4+ consecutive entries.
 * This is the classic falsification signature — workers copy-pasting the same check time repeatedly.
 */
async function detectGhostShifts(fromDate: Date, toDate: Date): Promise<AnomalyFlag[]> {
  const flags: AnomalyFlag[] = [];

  try {
    const result = await prisma.$queryRaw<GhostShiftRow[]>`
      WITH ranked AS (
        SELECT
          id,
          "participantId",
          "loggedByStaffId",
          "checkTime",
          EXTRACT(EPOCH FROM (
            "checkTime"
            - LAG("checkTime") OVER (
                PARTITION BY "participantId", "loggedByStaffId"
                ORDER BY "checkTime"
              )
          )) / 60.0 AS interval_min
        FROM "SleepSettlingLog"
        WHERE "checkTime" BETWEEN ${fromDate} AND ${toDate}
      ),
      flagged AS (
        SELECT *,
          SUM(CASE WHEN interval_min IS NULL OR interval_min <> 60 THEN 1 ELSE 0 END)
            OVER (PARTITION BY "participantId", "loggedByStaffId" ORDER BY "checkTime")
          AS run_group
        FROM ranked
      ),
      runs AS (
        SELECT
          "participantId",
          "loggedByStaffId",
          run_group,
          COUNT(*) AS run_length,
          MIN("checkTime") AS run_start,
          MAX("checkTime") AS run_end
        FROM flagged
        WHERE interval_min = 60
        GROUP BY "participantId", "loggedByStaffId", run_group
        HAVING COUNT(*) >= 4
      )
      SELECT
        r."participantId",
        r."loggedByStaffId",
        r.run_length,
        r.run_start,
        r.run_end,
        p."fullName" AS participant_name,
        s."displayName" AS staff_name
      FROM runs r
      JOIN "Participant" p ON p.id = r."participantId"
      JOIN "Staff" s ON s.id = r."loggedByStaffId"
    `;

    flags.push(
      ...result.map((row) => ({
        flagType: "GHOST_SHIFT" as const,
        severity: "CRITICAL" as const,
        participantId: row.participantId,
        participantName: row.participant_name,
        staffId: row.loggedByStaffId,
        staffName: row.staff_name,
        detail: {
          runLengthChecks: row.run_length,
          runStart: row.run_start.toISOString(),
          runEnd: row.run_end.toISOString(),
          intervalMinutes: 60,
          signature: "EXACT_60MIN_INTERVALS",
        },
      }))
    );
  } catch (error) {
    console.warn("Ghost shift detection error:", error);
  }

  return flags;
}

/**
 * DETECTOR 2: Unauthorised Restraint Flag
 *
 * Find RestrictivePracticeEvent entries where:
 * - bspVersionId is NULL (no Behaviour Support Plan on record), OR
 * - timestamp falls outside the BSP's activeFrom–activeTo window
 */
async function detectUnauthorisedRestraints(fromDate: Date, toDate: Date): Promise<AnomalyFlag[]> {
  const flags: AnomalyFlag[] = [];

  try {
    // Pass A: Null BSP version ID
    const nullBspEvents = await prisma.restrictivePracticeEvent.findMany({
      where: {
        timestamp: { gte: fromDate, lte: toDate },
        bspVersionId: null,
      },
      include: {
        participant: true,
        loggedByStaff: true,
      },
    });

    flags.push(
      ...nullBspEvents.map((event) => ({
        flagType: "UNAUTHORISED_RESTRAINT" as const,
        severity: "CRITICAL" as const,
        participantId: event.participantId,
        participantName: event.participant.fullName,
        staffId: event.loggedByStaffId,
        staffName: event.loggedByStaff.displayName,
        detail: {
          reason: "NO_BSP_ON_RECORD",
          bspVersionId: null,
          eventTimestamp: event.timestamp.toISOString(),
          practiceType: event.type,
          durationMin: event.durationMin,
        },
      }))
    );

    // Pass B: Has BSP but event timestamp falls outside active window
    const linkedEvents = await prisma.restrictivePracticeEvent.findMany({
      where: {
        timestamp: { gte: fromDate, lte: toDate },
        bspVersionId: { not: null },
      },
      include: {
        behaviourSupportPlan: true,
        participant: true,
        loggedByStaff: true,
      },
    });

    const outsideWindow = linkedEvents.filter(
      (event) =>
        event.behaviourSupportPlan &&
        (event.timestamp < event.behaviourSupportPlan.activeFrom ||
          event.timestamp > event.behaviourSupportPlan.activeTo)
    );

    flags.push(
      ...outsideWindow.map((event) => ({
        flagType: "UNAUTHORISED_RESTRAINT" as const,
        severity: "CRITICAL" as const,
        participantId: event.participantId,
        participantName: event.participant.fullName,
        staffId: event.loggedByStaffId,
        staffName: event.loggedByStaff.displayName,
        detail: {
          reason: "OUTSIDE_BSP_ACTIVE_WINDOW",
          bspVersionId: event.bspVersionId,
          bspActiveFrom: event.behaviourSupportPlan?.activeFrom.toISOString(),
          bspActiveTo: event.behaviourSupportPlan?.activeTo.toISOString(),
          eventTimestamp: event.timestamp.toISOString(),
          practiceType: event.type,
        },
      }))
    );
  } catch (error) {
    console.warn("Unauthorised restraint detection error:", error);
  }

  return flags;
}

/**
 * DETECTOR 3: Silent Dehydration Flag
 *
 * Find participants where cumulative fluid intake over a 24-hour period is < 800ml
 * AND there is no corresponding ShiftNote with category='ESCALATION' logged that day.
 *
 * Fluid intake = MealLog.volumeMl + BowelFluidLog.volumeMl (FLUID_IN type only)
 */
async function detectSilentDehydration(fromDate: Date, toDate: Date): Promise<AnomalyFlag[]> {
  const flags: AnomalyFlag[] = [];

  try {
    const result = await prisma.$queryRaw<DehydrationRow[]>`
      WITH meal_fluids AS (
        SELECT
          "participantId",
          DATE("timestamp" AT TIME ZONE 'UTC') AS day,
          SUM("volumeMl") AS meal_ml
        FROM "MealLog"
        WHERE "timestamp" BETWEEN ${fromDate} AND ${toDate}
        GROUP BY "participantId", DATE("timestamp" AT TIME ZONE 'UTC')
      ),
      bowel_fluids AS (
        SELECT
          "participantId",
          DATE("timestamp" AT TIME ZONE 'UTC') AS day,
          SUM("volumeMl") AS fluid_ml
        FROM "BowelFluidLog"
        WHERE type = 'FLUID_IN'
          AND "volumeMl" IS NOT NULL
          AND "timestamp" BETWEEN ${fromDate} AND ${toDate}
        GROUP BY "participantId", DATE("timestamp" AT TIME ZONE 'UTC')
      ),
      daily_totals AS (
        SELECT
          COALESCE(m."participantId", b."participantId") AS participant_id,
          COALESCE(m.day, b.day) AS day,
          COALESCE(m.meal_ml, 0) + COALESCE(b.fluid_ml, 0) AS total_ml
        FROM meal_fluids m
        FULL OUTER JOIN bowel_fluids b
          ON m."participantId" = b."participantId" AND m.day = b.day
      ),
      escalations AS (
        SELECT "participantId", DATE("createdAt" AT TIME ZONE 'UTC') AS day
        FROM "ShiftNote"
        WHERE category = 'ESCALATION'
          AND "createdAt" BETWEEN ${fromDate} AND ${toDate}
        GROUP BY "participantId", DATE("createdAt" AT TIME ZONE 'UTC')
      )
      SELECT
        dt.participant_id,
        dt.day,
        dt.total_ml,
        p."fullName" AS participant_name
      FROM daily_totals dt
      JOIN "Participant" p ON p.id = dt.participant_id
      LEFT JOIN escalations e
        ON dt.participant_id = e."participantId" AND dt.day = e.day
      WHERE dt.total_ml < 800
        AND e."participantId" IS NULL
      ORDER BY dt.day ASC, dt.total_ml ASC
    `;

    flags.push(
      ...result.map((row) => ({
        flagType: "SILENT_DEHYDRATION" as const,
        severity: "HIGH" as const,
        participantId: row.participant_id,
        participantName: row.participant_name,
        staffId: "UNASSIGNED",
        staffName: "No escalation recorded",
        detail: {
          day: new Date(row.day).toISOString().split("T")[0],
          totalMl: row.total_ml,
          thresholdMl: 800,
          deficitMl: 800 - row.total_ml,
          escalationLogged: false,
        },
      }))
    );
  } catch (error) {
    console.warn("Silent dehydration detection error:", error);
  }

  return flags;
}
