import { NextRequest, NextResponse } from "next/server";
import { requireFullSession } from "../../../../lib/require-full-session";
import { prisma } from "../../../../lib/prisma";

export const runtime = "nodejs";

/**
 * Blue Team Anomaly Detector
 *
 * Flags NDIS compliance breaches in synthetic QA data:
 * 1. Ghost Shift: Sleep logs with exact 60-min intervals (falsification)
 * 2. Constipation Gap: No bowel movement logged in 72-hour rolling window
 * 3. Unauthorised Restraint: Restraint events with NULL bspVersionId
 */

interface ComplianceBreach {
  breachType: "GHOST_SHIFT" | "CONSTIPATION_GAP" | "UNAUTHORISED_RESTRAINT";
  severity: "HIGH" | "CRITICAL";
  participantId: string;
  participantName: string;
  detail: Record<string, unknown>;
  detectedAt: string;
}

export async function GET(request: NextRequest) {
  try {
    // Auth check
    const authorized = await requireFullSession(request);
    if (!authorized) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    // Parse date range
    const { searchParams } = new URL(request.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    if (!from || !to) {
      return NextResponse.json(
        { ok: false, error: "Missing required params: from, to" },
        { status: 400 }
      );
    }

    const fromDate = new Date(from);
    const toDate = new Date(to);

    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
      return NextResponse.json(
        { ok: false, error: "Invalid date format (use ISO format)" },
        { status: 400 }
      );
    }

    // Run all three detectors in parallel
    const [ghostShiftBreaches, constipationBreaches, restraintBreaches] = await Promise.all([
      detectGhostShift(fromDate, toDate),
      detectConstipationGap(fromDate, toDate),
      detectUnauthorisedRestraint(fromDate, toDate),
    ]);

    const allBreaches: ComplianceBreach[] = [
      ...ghostShiftBreaches,
      ...constipationBreaches,
      ...restraintBreaches,
    ].sort((a, b) => (a.severity === "CRITICAL" ? -1 : 1));

    return NextResponse.json({
      ok: true,
      data: {
        window: { from, to },
        breaches: allBreaches,
        summary: {
          total: allBreaches.length,
          byType: {
            GHOST_SHIFT: ghostShiftBreaches.length,
            CONSTIPATION_GAP: constipationBreaches.length,
            UNAUTHORISED_RESTRAINT: restraintBreaches.length,
          },
        },
        detectedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Anomaly detection error:", error);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}

/**
 * DETECTOR 1: Ghost Shift
 *
 * Flags sleep logs with exactly 60-minute intervals for 4+ consecutive entries.
 * Signature of falsified logs (copy-pasted check times).
 */
async function detectGhostShift(fromDate: Date, toDate: Date): Promise<ComplianceBreach[]> {
  const breaches: ComplianceBreach[] = [];

  try {
    // Fetch all sleep logs in window, sorted by participant and time
    const sleepLogs = await prisma.sleepSettlingLog.findMany({
      where: {
        checkTime: { gte: fromDate, lte: toDate },
      },
      include: { participant: true },
      orderBy: [{ participantId: "asc" }, { checkTime: "asc" }],
    });

    // Group by participant and find runs of exact 60-minute intervals
    const logsByParticipant = new Map<string, typeof sleepLogs>();
    for (const log of sleepLogs) {
      if (!logsByParticipant.has(log.participantId)) {
        logsByParticipant.set(log.participantId, []);
      }
      logsByParticipant.get(log.participantId)!.push(log);
    }

    // Detect 60-minute interval runs
    for (const [participantId, logs] of logsByParticipant) {
      if (logs.length < 4) continue; // Need at least 4 entries

      let runStart = 0;
      let currentRunLength = 1;

      for (let i = 1; i < logs.length; i++) {
        const prevTime = logs[i - 1].checkTime.getTime();
        const currTime = logs[i].checkTime.getTime();
        const diffMinutes = (currTime - prevTime) / (60 * 1000);

        if (Math.abs(diffMinutes - 60) < 0.1) {
          // Exact 60-minute interval (within 6 seconds tolerance)
          currentRunLength++;
        } else {
          // Run broken
          if (currentRunLength >= 4) {
            // Report breach
            const runEndLog = logs[i - 1];
            breaches.push({
              breachType: "GHOST_SHIFT",
              severity: "CRITICAL",
              participantId,
              participantName: logs[0].participant.fullName,
              detail: {
                runLength: currentRunLength,
                intervalMinutes: 60,
                runStart: logs[runStart].checkTime.toISOString(),
                runEnd: runEndLog.checkTime.toISOString(),
                hoursSpanned: ((currentRunLength - 1) * 60) / 60,
              },
              detectedAt: new Date().toISOString(),
            });
          }
          runStart = i;
          currentRunLength = 1;
        }
      }

      // Check final run
      if (currentRunLength >= 4) {
        breaches.push({
          breachType: "GHOST_SHIFT",
          severity: "CRITICAL",
          participantId,
          participantName: logs[0].participant.fullName,
          detail: {
            runLength: currentRunLength,
            intervalMinutes: 60,
            runStart: logs[runStart].checkTime.toISOString(),
            runEnd: logs[logs.length - 1].checkTime.toISOString(),
            hoursSpanned: ((currentRunLength - 1) * 60) / 60,
          },
          detectedAt: new Date().toISOString(),
        });
      }
    }
  } catch (error) {
    console.warn("Ghost shift detection error:", error);
  }

  return breaches;
}

/**
 * DETECTOR 2: Constipation Gap
 *
 * Flags participants with no bowel movement logged in any 72-hour rolling window
 * within the date range. Indicates potential care quality issue.
 */
async function detectConstipationGap(fromDate: Date, toDate: Date): Promise<ComplianceBreach[]> {
  const breaches: ComplianceBreach[] = [];

  try {
    // Get all bowel fluid logs in window
    const bowelLogs = await prisma.bowelFluidLog.findMany({
      where: {
        timestamp: { gte: fromDate, lte: toDate },
      },
      include: { participant: true },
      orderBy: [{ participantId: "asc" }, { timestamp: "asc" }],
    });

    // Get all participants in system
    const allParticipants = await prisma.participant.findMany();

    // For each participant, check for 72-hour gaps without bowel movement
    for (const participant of allParticipants) {
      const participantBowelLogs = bowelLogs.filter((log) => log.participantId === participant.id);

      // If no bowel logs at all in window, flag
      if (participantBowelLogs.length === 0) {
        // Check if participant has ANY logs in window (to avoid flagging inactive participants)
        const hasOtherLogs = await prisma.sleepSettlingLog.findFirst({
          where: {
            participantId: participant.id,
            checkTime: { gte: fromDate, lte: toDate },
          },
        });

        if (hasOtherLogs) {
          breaches.push({
            breachType: "CONSTIPATION_GAP",
            severity: "HIGH",
            participantId: participant.id,
            participantName: participant.fullName,
            detail: {
              gapType: "NO_BOWEL_LOGS",
              windowStart: fromDate.toISOString(),
              windowEnd: toDate.toISOString(),
              daysSinceLastEntry: "unknown",
              riskLevel: "CARE_GAP",
            },
            detectedAt: new Date().toISOString(),
          });
          continue;
        }
      }

      // Check for 72-hour gaps between consecutive bowel logs
      if (participantBowelLogs.length >= 2) {
        for (let i = 1; i < participantBowelLogs.length; i++) {
          const prevLog = participantBowelLogs[i - 1];
          const currLog = participantBowelLogs[i];
          const gapHours = (currLog.timestamp.getTime() - prevLog.timestamp.getTime()) / (1000 * 60 * 60);

          if (gapHours > 72) {
            breaches.push({
              breachType: "CONSTIPATION_GAP",
              severity: "HIGH",
              participantId: participant.id,
              participantName: participant.fullName,
              detail: {
                gapType: "EXTENDED_GAP",
                lastBowelLog: prevLog.timestamp.toISOString(),
                nextBowelLog: currLog.timestamp.toISOString(),
                gapHours: Math.round(gapHours),
                riskLevel: "POTENTIAL_CONSTIPATION",
              },
              detectedAt: new Date().toISOString(),
            });
          }
        }
      }

      // Also check gap from end of window to last log
      if (participantBowelLogs.length > 0) {
        const lastLog = participantBowelLogs[participantBowelLogs.length - 1];
        const gapToEnd = (toDate.getTime() - lastLog.timestamp.getTime()) / (1000 * 60 * 60);

        if (gapToEnd > 72) {
          breaches.push({
            breachType: "CONSTIPATION_GAP",
            severity: "HIGH",
            participantId: participant.id,
            participantName: participant.fullName,
            detail: {
              gapType: "TRAILING_GAP",
              lastBowelLog: lastLog.timestamp.toISOString(),
              windowEnd: toDate.toISOString(),
              gapHours: Math.round(gapToEnd),
              riskLevel: "ONGOING_GAP",
            },
            detectedAt: new Date().toISOString(),
          });
        }
      }
    }
  } catch (error) {
    console.warn("Constipation gap detection error:", error);
  }

  return breaches;
}

/**
 * DETECTOR 3: Unauthorised Restraint
 *
 * Flags any restraint practice event where bspVersionId is NULL,
 * indicating the restraint was applied without a Behaviour Support Plan.
 */
async function detectUnauthorisedRestraint(
  fromDate: Date,
  toDate: Date
): Promise<ComplianceBreach[]> {
  const breaches: ComplianceBreach[] = [];

  try {
    const unauthorisedEvents = await prisma.restrictivePracticeEvent.findMany({
      where: {
        timestamp: { gte: fromDate, lte: toDate },
        bspVersionId: null, // No BSP on record
      },
      include: { participant: true },
    });

    for (const event of unauthorisedEvents) {
      breaches.push({
        breachType: "UNAUTHORISED_RESTRAINT",
        severity: "CRITICAL",
        participantId: event.participantId,
        participantName: event.participant.fullName,
        detail: {
          reason: "NO_BEHAVIOUR_SUPPORT_PLAN",
          practiceType: event.type,
          timestamp: event.timestamp.toISOString(),
          durationMin: event.durationMin,
          justification: event.reason,
          bspRequired: true,
          bspPresent: false,
        },
        detectedAt: new Date().toISOString(),
      });
    }
  } catch (error) {
    console.warn("Unauthorised restraint detection error:", error);
  }

  return breaches;
}
