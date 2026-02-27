import { NextRequest, NextResponse } from "next/server";
import { getSessionTokenFromRequest, verifySession } from "../../../../../lib/session";
import { prisma } from "../../../../../lib/prisma";
import fs from "node:fs/promises";
import path from "node:path";

const REPORTS_DIR = "/tmp/chartgen-ai-reports";

export const runtime = "nodejs";

interface GapReportResult {
  id: string;
  from: string;
  to: string;
  scope?: string;
  kpiMetrics: {
    completionRate: number;
    errorRate: number;
    avgProcessingTime: number;
  };
  aiSummary: string;
  recommendations: string[];
  generatedAt: string;
}

async function requireFullSession(request: NextRequest): Promise<void> {
  const sessionToken = getSessionTokenFromRequest(request);
  if (!sessionToken) {
    throw new Error("UNAUTHORIZED");
  }

  const session = await verifySession(sessionToken);
  if (!session || session.role !== "full") {
    throw new Error("UNAUTHORIZED");
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireFullSession(request);

    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: "Missing report ID" }, { status: 400 });
    }

    // Try database first (source of truth)
    try {
      const report = await prisma.gapReport.findUnique({
        where: { id },
      });

      if (report) {
        return NextResponse.json({
          id: report.id,
          from: report.from.toISOString(),
          to: report.to.toISOString(),
          scope: report.scope,
          kpiMetrics: report.kpiMetrics,
          aiSummary: report.aiSummary,
          recommendations: report.recommendations,
          generatedAt: report.createdAt.toISOString(),
        });
      }
    } catch (dbError) {
      console.warn("Database lookup failed:", dbError);
      // Fall through to /tmp fallback
    }

    // Fallback to disk artifact if DB record not found
    try {
      const reportPath = path.join(REPORTS_DIR, `${id}.json`);
      const content = await fs.readFile(reportPath, "utf-8");
      const report = JSON.parse(content) as GapReportResult;
      return NextResponse.json(report);
    } catch {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.error("Report fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
