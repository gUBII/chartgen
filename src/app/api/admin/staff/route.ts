import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "../../../../lib/prisma";
import { requireFullSession } from "../../../../lib/require-full-session";

export const runtime = "nodejs";

const VALID_ROLES = new Set(["SUPPORT_WORKER", "SUPERVISOR", "CLINICAL_LEAD"]);

export async function GET(request: NextRequest) {
  const authorized = await requireFullSession(request);
  if (!authorized) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const url = new URL(request.url);
    const roleParam = url.searchParams.get("role")?.toUpperCase();
    const where: Record<string, unknown> = {};
    if (roleParam && VALID_ROLES.has(roleParam)) {
      where.role = roleParam;
    }

    const rows = await prisma.staff.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        workerNumber: true,
        displayName: true,
        role: true,
        createdAt: true,
      },
    });
    return NextResponse.json({ ok: true, data: rows });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const authorized = await requireFullSession(request);
  if (!authorized) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const workerNumber = String(body.workerNumber ?? "").trim();
    const displayName = String(body.displayName ?? "").trim();
    const role = String(body.role ?? "").trim();

    if (!workerNumber) {
      return NextResponse.json({ ok: false, error: "workerNumber is required" }, { status: 400 });
    }
    if (!displayName) {
      return NextResponse.json({ ok: false, error: "displayName is required" }, { status: 400 });
    }
    if (!VALID_ROLES.has(role)) {
      return NextResponse.json(
        { ok: false, error: "role must be SUPPORT_WORKER, SUPERVISOR, or CLINICAL_LEAD" },
        { status: 400 },
      );
    }

    const data: Prisma.StaffUncheckedCreateInput = {
      workerNumber,
      displayName,
      role: role as Prisma.StaffUncheckedCreateInput["role"],
    };

    const created = await prisma.staff.create({
      data,
      select: {
        id: true,
        workerNumber: true,
        displayName: true,
        role: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ ok: true, data: created }, { status: 201 });
  } catch (err: unknown) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return NextResponse.json({ ok: false, error: "workerNumber already exists" }, { status: 409 });
    }
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
