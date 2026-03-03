import { NextRequest, NextResponse } from "next/server";
import { RangePreset } from "@prisma/client";
import { prisma } from "../../../../lib/prisma";
import { verifySession, getSessionTokenFromRequest } from "../../../../lib/session";

export const runtime = "nodejs";

async function requireSession(request: NextRequest) {
  const token = getSessionTokenFromRequest(request);
  const session = token ? await verifySession(token) : null;
  if (!session) {
    throw { status: 401, code: "UNAUTHORIZED", message: "Authentication required." };
  }
}

function errorResponse(status: number, code: string, message: string) {
  return NextResponse.json({ error: message, code }, { status });
}

export async function GET(request: NextRequest) {
  try {
    await requireSession(request);
    const buttons = await prisma.injectorButton.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      include: {
        participant: { select: { id: true, fullName: true } },
        staff: { select: { id: true, displayName: true } },
      },
    });
    return NextResponse.json({ buttons });
  } catch (e: unknown) {
    if (e && typeof e === "object" && "status" in e) {
      const err = e as { status: number; code: string; message: string };
      return errorResponse(err.status, err.code, err.message);
    }
    return errorResponse(500, "UNEXPECTED_ERROR", String(e));
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireSession(request);
    const body = await request.json().catch(() => null);
    if (!body) return errorResponse(400, "INVALID_JSON", "Request body must be valid JSON.");

    const { label, participantId, staffId, enabled, rangePreset, sortOrder } = body;
    if (!label || !participantId || !staffId) {
      return errorResponse(400, "MISSING_FIELDS", "label, participantId, staffId are required.");
    }

    const validPresets: RangePreset[] = ["day", "week_plus", "month_plus"];
    const preset: RangePreset = validPresets.includes(rangePreset) ? rangePreset : "day";

    const button = await prisma.injectorButton.create({
      data: {
        label: String(label),
        participantId: String(participantId),
        staffId: String(staffId),
        enabled: enabled !== false,
        rangePreset: preset,
        sortOrder: typeof sortOrder === "number" ? sortOrder : 0,
      },
      include: {
        participant: { select: { id: true, fullName: true } },
        staff: { select: { id: true, displayName: true } },
      },
    });
    return NextResponse.json({ button }, { status: 201 });
  } catch (e: unknown) {
    if (e && typeof e === "object" && "status" in e) {
      const err = e as { status: number; code: string; message: string };
      return errorResponse(err.status, err.code, err.message);
    }
    return errorResponse(500, "UNEXPECTED_ERROR", String(e));
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await requireSession(request);
    const body = await request.json().catch(() => null);
    if (!body) return errorResponse(400, "INVALID_JSON", "Request body must be valid JSON.");

    const { id, label, participantId, staffId, enabled, rangePreset, sortOrder } = body;
    if (!id) return errorResponse(400, "MISSING_ID", "id is required.");

    const validPresets: RangePreset[] = ["day", "week_plus", "month_plus"];

    const button = await prisma.injectorButton.update({
      where: { id: String(id) },
      data: {
        ...(label !== undefined && { label: String(label) }),
        ...(participantId !== undefined && { participantId: String(participantId) }),
        ...(staffId !== undefined && { staffId: String(staffId) }),
        ...(enabled !== undefined && { enabled: Boolean(enabled) }),
        ...(rangePreset !== undefined && validPresets.includes(rangePreset) && { rangePreset }),
        ...(sortOrder !== undefined && { sortOrder: Number(sortOrder) }),
      },
      include: {
        participant: { select: { id: true, fullName: true } },
        staff: { select: { id: true, displayName: true } },
      },
    });
    return NextResponse.json({ button });
  } catch (e: unknown) {
    if (e && typeof e === "object" && "status" in e) {
      const err = e as { status: number; code: string; message: string };
      return errorResponse(err.status, err.code, err.message);
    }
    return errorResponse(500, "UNEXPECTED_ERROR", String(e));
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await requireSession(request);
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return errorResponse(400, "MISSING_ID", "id query param is required.");

    await prisma.injectorButton.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    if (e && typeof e === "object" && "status" in e) {
      const err = e as { status: number; code: string; message: string };
      return errorResponse(err.status, err.code, err.message);
    }
    return errorResponse(500, "UNEXPECTED_ERROR", String(e));
  }
}
