import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { prisma } from "../../../../lib/prisma";
import { verifySession, getSessionCookie } from "../../../../lib/session";

export const runtime = "nodejs";

type ProbeName = "pooled" | "direct";

type ProbeError = {
  code: string;
  message: string;
  probableCause: string;
  remediation: string[];
};

type ProbeResult = {
  name: ProbeName;
  ok: boolean;
  checkedAt: string;
  latencyMs: number | null;
  target: string | null;
  error: ProbeError | null;
};

type HealthAlert = {
  severity: "warning" | "critical";
  code: string;
  message: string;
};

const DEFAULT_MAX_LATENCY_MS = 600;

function getMaxLatencyMs(): number {
  const raw = Number(process.env.DB_HEALTH_MAX_LATENCY_MS ?? DEFAULT_MAX_LATENCY_MS);
  if (!Number.isFinite(raw) || raw <= 0) return DEFAULT_MAX_LATENCY_MS;
  return raw;
}

function describeConnectionTarget(url: string | undefined): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    const db = parsed.pathname.replace("/", "") || "default";
    return `${parsed.hostname}${parsed.port ? `:${parsed.port}` : ""}/${db}`;
  } catch {
    return "invalid-connection-url";
  }
}

function normalizeDbError(error: unknown): ProbeError {
  const anyErr = error as { code?: string; message?: string; name?: string };
  const code = anyErr?.code ?? anyErr?.name ?? "UNKNOWN_DB_ERROR";
  const message = anyErr?.message ?? "Database probe failed.";
  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes("can't reach database server") || lowerMessage.includes("timed out")) {
    return {
      code,
      message,
      probableCause: "Database host is unreachable from this runtime (DNS, egress, or firewall rules).",
      remediation: [
        "Verify host and port in DATABASE_URL/DIRECT_URL.",
        "Confirm outbound access from runtime to Neon endpoint.",
        "Test connectivity with `npm run db:health` locally and in deployment shell.",
      ],
    };
  }

  if (code === "P1001") {
    return {
      code,
      message,
      probableCause: "Database host is unreachable from this runtime (DNS, egress, or firewall rules).",
      remediation: [
        "Verify host and port in DATABASE_URL/DIRECT_URL.",
        "Confirm outbound access from runtime to Neon endpoint.",
        "Test connectivity with `npm run db:health` locally and in deployment shell.",
      ],
    };
  }

  if (code === "P1000") {
    return {
      code,
      message,
      probableCause: "Database authentication failed (user/password mismatch).",
      remediation: [
        "Reset database credentials and update DATABASE_URL/DIRECT_URL.",
        "URL-encode password characters if needed.",
      ],
    };
  }

  if (code === "P1012") {
    return {
      code,
      message,
      probableCause: "Required environment variables are missing or invalid.",
      remediation: [
        "Set DATABASE_URL and DIRECT_URL in runtime environment.",
        "Confirm schema datasource env names match current configuration.",
      ],
    };
  }

  return {
    code,
    message,
    probableCause: "Unknown runtime or configuration failure.",
    remediation: [
      "Check Prisma error details and recent deploy logs.",
      "Validate credentials, network egress, and endpoint health.",
    ],
  };
}

async function requireFullSession(request: NextRequest): Promise<boolean> {
  const sessionCookie = getSessionCookie(request.cookies);
  if (!sessionCookie?.value) return false;
  const session = await verifySession(sessionCookie.value);
  return session?.role === "full";
}

async function probeDatasource(name: ProbeName, url: string | undefined): Promise<ProbeResult> {
  const checkedAt = new Date().toISOString();
  const target = describeConnectionTarget(url);

  if (!url) {
    return {
      name,
      ok: false,
      checkedAt,
      latencyMs: null,
      target,
      error: {
        code: "MISSING_ENV",
        message: `${name === "pooled" ? "DATABASE_URL" : "DIRECT_URL"} is not configured.`,
        probableCause: "Runtime environment variable is missing.",
        remediation: [
          "Set required DB environment variable in Netlify and local .env.",
          "Redeploy after updating environment settings.",
        ],
      },
    };
  }

  const startedAt = Date.now();

  let dedicatedClient: PrismaClient | null = null;
  const client =
    name === "pooled"
      ? prisma
      : (() => {
          dedicatedClient = new PrismaClient({
            datasources: { db: { url } },
            log: ["error"],
          });
          return dedicatedClient;
        })();

  try {
    await client.$queryRaw`SELECT 1`;
    return {
      name,
      ok: true,
      checkedAt,
      latencyMs: Date.now() - startedAt,
      target,
      error: null,
    };
  } catch (error) {
    return {
      name,
      ok: false,
      checkedAt,
      latencyMs: Date.now() - startedAt,
      target,
      error: normalizeDbError(error),
    };
  } finally {
    if (dedicatedClient) {
      await dedicatedClient.$disconnect();
    }
  }
}

export async function GET(request: NextRequest) {
  const hasFullSession = await requireFullSession(request);
  if (!hasFullSession) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const maxLatencyMs = getMaxLatencyMs();
  const [pooled, direct] = await Promise.all([
    probeDatasource("pooled", process.env.DATABASE_URL),
    probeDatasource("direct", process.env.DIRECT_URL),
  ]);

  const alerts: HealthAlert[] = [];

  if (!pooled.ok) {
    alerts.push({
      severity: "critical",
      code: "POOLED_UNAVAILABLE",
      message: "Primary pooled runtime database connection is unavailable.",
    });
  } else if ((pooled.latencyMs ?? 0) > maxLatencyMs) {
    alerts.push({
      severity: "warning",
      code: "POOLED_HIGH_LATENCY",
      message: `Pooled database latency (${pooled.latencyMs}ms) exceeds threshold (${maxLatencyMs}ms).`,
    });
  }

  if (!direct.ok) {
    alerts.push({
      severity: "critical",
      code: "DIRECT_UNAVAILABLE",
      message: "Direct migration database connection is unavailable.",
    });
  } else if ((direct.latencyMs ?? 0) > maxLatencyMs) {
    alerts.push({
      severity: "warning",
      code: "DIRECT_HIGH_LATENCY",
      message: `Direct database latency (${direct.latencyMs}ms) exceeds threshold (${maxLatencyMs}ms).`,
    });
  }

  const hasCritical = alerts.some((alert) => alert.severity === "critical");
  const status = hasCritical ? "degraded" : alerts.length > 0 ? "warning" : "healthy";

  return NextResponse.json({
    status,
    checkedAt: new Date().toISOString(),
    thresholds: { maxLatencyMs },
    checks: { pooled, direct },
    alerts,
  });
}
