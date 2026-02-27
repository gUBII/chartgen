import { NextRequest, NextResponse } from "next/server";
import { computeAuditKpi } from "../../../../lib/audit-kpi";
import { requireFullSession } from "../../../../lib/require-full-session";

export const runtime = "nodejs";

function parseRange(request: NextRequest): { from: Date; to: Date } {
  const fromRaw = request.nextUrl.searchParams.get("from");
  const toRaw = request.nextUrl.searchParams.get("to");

  const to = toRaw ? new Date(toRaw) : new Date();
  const from = fromRaw ? new Date(fromRaw) : new Date(to.getTime() - 14 * 24 * 60 * 60 * 1000);

  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    throw new Error("Invalid date range.");
  }
  if (from.getTime() > to.getTime()) {
    throw new Error("from must be <= to.");
  }
  return { from, to };
}

export async function GET(request: NextRequest) {
  const authorized = await requireFullSession(request);
  if (!authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { from, to } = parseRange(request);
    const data = await computeAuditKpi(from, to);
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Failed to compute KPI." },
      { status: 400 },
    );
  }
}
