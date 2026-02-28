import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "../../../../lib/prisma";
import { requireFullSession } from "../../../../lib/require-full-session";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const authorized = await requireFullSession(request);
  if (!authorized) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const rows = await prisma.participant.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        fullName: true,
        externalReference: true,
        defaultFoodTexture: true,
        defaultFluidThickness: true,
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
    const fullName = String(body.fullName ?? "").trim();
    if (!fullName) {
      return NextResponse.json({ ok: false, error: "fullName is required" }, { status: 400 });
    }

    const defaultFoodTexture = body.defaultFoodTexture != null ? Number(body.defaultFoodTexture) : 5;
    const defaultFluidThickness = body.defaultFluidThickness != null ? Number(body.defaultFluidThickness) : 2;

    if (defaultFoodTexture < 1 || defaultFoodTexture > 7) {
      return NextResponse.json({ ok: false, error: "defaultFoodTexture must be 1-7" }, { status: 400 });
    }
    if (defaultFluidThickness < 0 || defaultFluidThickness > 4) {
      return NextResponse.json({ ok: false, error: "defaultFluidThickness must be 0-4" }, { status: 400 });
    }

    const data: Prisma.ParticipantUncheckedCreateInput = {
      fullName,
      defaultFoodTexture,
      defaultFluidThickness,
      externalReference: body.externalReference ? String(body.externalReference).trim() : null,
    };

    const created = await prisma.participant.create({
      data,
      select: {
        id: true,
        fullName: true,
        externalReference: true,
        defaultFoodTexture: true,
        defaultFluidThickness: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ ok: true, data: created }, { status: 201 });
  } catch (err: unknown) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return NextResponse.json({ ok: false, error: "Duplicate externalReference" }, { status: 409 });
    }
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
