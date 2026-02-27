import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { requireFullSession } from "../../../../lib/require-full-session";

export const runtime = "nodejs";

type Entity = "meal" | "mar" | "audit" | "batch";

function parseIntParam(raw: string | null, fallback: number): number {
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
}

function parseDate(raw: string | null): Date | null {
  if (!raw) return null;
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

export async function GET(request: NextRequest) {
  const authorized = await requireFullSession(request);
  if (!authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const entity = (request.nextUrl.searchParams.get("entity") ?? "meal") as Entity;
  const page = parseIntParam(request.nextUrl.searchParams.get("page"), 1);
  const pageSize = Math.min(100, parseIntParam(request.nextUrl.searchParams.get("pageSize"), 25));
  const skip = (page - 1) * pageSize;
  const participantId = request.nextUrl.searchParams.get("participantId") ?? undefined;
  const from = parseDate(request.nextUrl.searchParams.get("from"));
  const to = parseDate(request.nextUrl.searchParams.get("to"));

  const dateFilter = from || to ? { gte: from ?? undefined, lte: to ?? undefined } : undefined;

  if (entity === "meal") {
    const where = {
      source: "RESTORED_APPROVED" as const,
      participantId,
      ...(dateFilter ? { timestamp: dateFilter } : {}),
    };
    const [rows, total] = await Promise.all([
      prisma.mealLog.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { timestamp: "desc" },
        select: {
          id: true,
          timestamp: true,
          mealType: true,
          amountEaten: true,
          volumeMl: true,
          deviationReason: true,
          provenanceHash: true,
          participant: { select: { id: true, fullName: true, externalReference: true } },
          createdByStaff: { select: { id: true, displayName: true, role: true } },
          approvedByStaff: { select: { id: true, displayName: true, role: true } },
        },
      }),
      prisma.mealLog.count({ where }),
    ]);
    return NextResponse.json({ ok: true, data: { entity, page, pageSize, total, rows } });
  }

  if (entity === "mar") {
    const where = {
      source: "RESTORED_APPROVED" as const,
      participantId,
      ...(dateFilter ? { scheduledAdminTime: dateFilter } : {}),
    };
    const [rows, total] = await Promise.all([
      prisma.mARLog.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { scheduledAdminTime: "desc" },
        select: {
          id: true,
          scheduledAdminTime: true,
          actualAdminTime: true,
          medicationName: true,
          dosage: true,
          route: true,
          status: true,
          omissionReason: true,
          provenanceHash: true,
          participant: { select: { id: true, fullName: true, externalReference: true } },
          createdByStaff: { select: { id: true, displayName: true, role: true } },
          approvedByStaff: { select: { id: true, displayName: true, role: true } },
        },
      }),
      prisma.mARLog.count({ where }),
    ]);
    return NextResponse.json({ ok: true, data: { entity, page, pageSize, total, rows } });
  }

  if (entity === "audit") {
    const where = {
      participantId,
      ...(dateFilter ? { createdAt: dateFilter } : {}),
    };
    const [rows, total] = await Promise.all([
      prisma.auditEvent.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          action: true,
          entityType: true,
          entityId: true,
          payloadHash: true,
          previousHash: true,
          createdAt: true,
          participant: { select: { id: true, fullName: true, externalReference: true } },
          actorStaff: { select: { id: true, displayName: true, role: true } },
        },
      }),
      prisma.auditEvent.count({ where }),
    ]);
    return NextResponse.json({ ok: true, data: { entity, page, pageSize, total, rows } });
  }

  const where = {
    participantId,
    ...(dateFilter ? { createdAt: dateFilter } : {}),
  };
  const [rows, total] = await Promise.all([
    prisma.restorationBatch.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        reason: true,
        status: true,
        recoveryStart: true,
        recoveryEnd: true,
        createdAt: true,
        participant: { select: { id: true, fullName: true, externalReference: true } },
        requestedByStaff: { select: { id: true, displayName: true, role: true } },
        reviewedByStaff: { select: { id: true, displayName: true, role: true } },
      },
    }),
    prisma.restorationBatch.count({ where }),
  ]);
  return NextResponse.json({ ok: true, data: { entity: "batch", page, pageSize, total, rows } });
}
