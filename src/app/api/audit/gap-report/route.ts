import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import { getSessionCookie, verifySession } from "../../../../lib/session";
import { computeAuditKpi } from "../../../../lib/audit-kpi";
import { prisma } from "../../../../lib/prisma";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash";
const REPORTS_DIR = "/tmp/chartgen-ai-reports";

export const runtime = "nodejs";

interface GapReportRequest {
  from: string; // ISO date
  to: string; // ISO date
  scope?: "meal" | "mar" | "audit" | "batch";
}

// Ensure reports directory exists
async function ensureReportsDir() {
  try {
    await fs.mkdir(REPORTS_DIR, { recursive: true });
  } catch {
    // Directory may already exist
  }
}

// Verify full session
async function requireFullSession(request: NextRequest): Promise<void> {
  const sessionCookie = getSessionCookie(request.cookies);
  if (!sessionCookie?.value) {
    throw new Error("UNAUTHORIZED");
  }

  const session = await verifySession(sessionCookie.value);
  if (!session || session.role !== "full") {
    throw new Error("UNAUTHORIZED");
  }
}

// Call Gemini API for gap analysis
async function callGeminiGapReport(
  from: string,
  to: string,
  scope?: string
): Promise<string> {
  if (!GEMINI_API_KEY) {
    return `No AI service configured. Gap report for ${from} to ${to}${scope ? ` (${scope})` : ""} would be generated here.`;
  }

  const prompt = `Analyze this gap report for clinical audit data:
- Date range: ${from} to ${to}
- Scope: ${scope || "all"}
- Metrics: See KPI data above

Provide:
1. Key findings (2-3 sentences)
2. Risk areas (bullet list)
3. Actionable recommendations (3-5 items)`;

  try {
    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/" + GEMINI_MODEL + ":generateContent", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": GEMINI_API_KEY,
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt,
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      console.error("Gemini API error:", response.status);
      return "AI analysis unavailable.";
    }

    const data = await response.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "Analysis complete.";
    return text;
  } catch (error) {
    console.error("Gemini call error:", error);
    return "Error calling AI service.";
  }
}

export async function GET(request: NextRequest) {
  try {
    await requireFullSession(request);

    const { searchParams } = new URL(request.url);
    const limitParam = searchParams.get("limit");
    const limit = limitParam ? Math.min(parseInt(limitParam, 10), 100) : 10;

    const reports = await prisma.gapReport.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    const formattedReports = reports.map((report) => ({
      id: report.id,
      from: report.from.toISOString(),
      to: report.to.toISOString(),
      scope: report.scope,
      kpiMetrics: report.kpiMetrics,
      aiSummary: report.aiSummary,
      recommendations: report.recommendations,
      generatedAt: report.createdAt.toISOString(),
    }));

    return NextResponse.json(formattedReports);
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.error("Gap report listing error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireFullSession(request);

    const body = (await request.json()) as GapReportRequest;
    const { from, to, scope } = body;

    if (!from || !to) {
      return NextResponse.json(
        { error: "Missing required fields: from, to" },
        { status: 400 }
      );
    }

    // Compute KPI metrics from actual committed audit data
    const auditKpi = await computeAuditKpi(new Date(from), new Date(to));
    const kpiMetrics = {
      completionRate: auditKpi.readiness.overallScore / 100,
      errorRate: (auditKpi.gaps.missingEvidence + auditKpi.gaps.continuityIssues) /
                 (auditKpi.totals.auditEvents || 1),
      avgProcessingTime: 3200, // Default; would compute from audit timestamps in production
    };

    // Get AI summary from Gemini
    const aiSummary = await callGeminiGapReport(from, to, scope);

    const recommendations = [
      "Review high-error audit batches",
      "Optimize processing workflow",
      "Increase supervisor oversight",
    ];

    // Persist report to database (source of truth)
    const dbReport = await prisma.gapReport.create({
      data: {
        from: new Date(from),
        to: new Date(to),
        scope: scope || null,
        kpiMetrics: kpiMetrics as any,
        aiSummary,
        recommendations: recommendations as any,
        geminiModel: GEMINI_MODEL,
      },
    });

    // Optionally save to disk for debugging/ops
    try {
      await ensureReportsDir();
      const reportPath = path.join(REPORTS_DIR, `${dbReport.id}.json`);
      await fs.writeFile(
        reportPath,
        JSON.stringify(
          {
            id: dbReport.id,
            from,
            to,
            scope,
            kpiMetrics,
            aiSummary,
            recommendations,
            generatedAt: dbReport.createdAt.toISOString(),
          },
          null,
          2
        )
      );
    } catch (diskError) {
      console.warn("Failed to write disk artifact:", diskError);
      // Non-fatal - DB is source of truth
    }

    return NextResponse.json({
      id: dbReport.id,
      from,
      to,
      scope,
      kpiMetrics,
      aiSummary,
      recommendations,
      generatedAt: dbReport.createdAt.toISOString(),
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.error("Gap report error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

