import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { getSessionCookie, verifySession } from "../../../../lib/session";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash";
const REPORTS_DIR = "/tmp/chartgen-ai-reports";

export const runtime = "nodejs";

interface GapReportRequest {
  from: string; // ISO date
  to: string; // ISO date
  scope?: "meal" | "mar" | "audit" | "batch";
}

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

    // Generate report ID
    const reportId = randomUUID();

    // Mock KPI metrics (in production, compute from actual data)
    const kpiMetrics = {
      completionRate: Math.random() * 0.2 + 0.8,
      errorRate: Math.random() * 0.1,
      avgProcessingTime: Math.random() * 5000 + 2000,
    };

    // Get AI summary from Gemini
    const aiSummary = await callGeminiGapReport(from, to, scope);

    const report: GapReportResult = {
      id: reportId,
      from,
      to,
      scope,
      kpiMetrics,
      aiSummary,
      recommendations: [
        "Review high-error audit batches",
        "Optimize processing workflow",
        "Increase supervisor oversight",
      ],
      generatedAt: new Date().toISOString(),
    };

    // Save report to disk
    await ensureReportsDir();
    const reportPath = path.join(REPORTS_DIR, `${reportId}.json`);
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));

    return NextResponse.json(report);
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

