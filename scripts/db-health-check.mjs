#!/usr/bin/env node

import "dotenv/config";
import fs from "node:fs/promises";
import process from "node:process";
import { PrismaClient } from "@prisma/client";

const DEFAULTS = {
  maxLatencyMs: 600,
  jsonOut: "",
};

function usage() {
  console.log(
    [
      "Usage: node scripts/db-health-check.mjs [options]",
      "",
      "Options:",
      "  --max-latency-ms <n>  Alert threshold in milliseconds (default: 600)",
      "  --json-out <path>     Write JSON report to file",
      "  --help                Show help",
      "",
      "Environment:",
      "  DATABASE_URL (pooled runtime URL)",
      "  DIRECT_URL   (direct migration URL)",
      "",
      "Example:",
      "  npm run db:health -- --max-latency-ms 500",
    ].join("\n"),
  );
}

function parseArgs(argv) {
  const opts = { ...DEFAULTS };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];

    if (arg === "--max-latency-ms" && next) {
      opts.maxLatencyMs = Number(next);
      i += 1;
      continue;
    }

    if (arg === "--json-out" && next) {
      opts.jsonOut = next;
      i += 1;
      continue;
    }

    if (arg === "--help") {
      usage();
      process.exit(0);
    }
  }

  if (!Number.isFinite(opts.maxLatencyMs) || opts.maxLatencyMs <= 0) {
    throw new Error("`--max-latency-ms` must be > 0");
  }

  return opts;
}

function describeTarget(url) {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    const db = parsed.pathname.replace("/", "") || "default";
    return `${parsed.hostname}${parsed.port ? `:${parsed.port}` : ""}/${db}`;
  } catch {
    return "invalid-connection-url";
  }
}

function normalizeError(error) {
  const code = error?.code || error?.name || "UNKNOWN_DB_ERROR";
  const message = error?.message || "Database probe failed";
  const lowerMessage = String(message).toLowerCase();

  if (lowerMessage.includes("can't reach database server") || lowerMessage.includes("timed out")) {
    return {
      code,
      message,
      probableCause: "Host unreachable from current runtime (DNS/egress/firewall).",
      remediation: [
        "Verify endpoint host and port in DATABASE_URL/DIRECT_URL.",
        "Confirm outbound network access to Neon endpoint.",
      ],
    };
  }

  if (code === "P1001") {
    return {
      code,
      message,
      probableCause: "Host unreachable from current runtime (DNS/egress/firewall).",
      remediation: [
        "Verify endpoint host and port in DATABASE_URL/DIRECT_URL.",
        "Confirm outbound network access to Neon endpoint.",
      ],
    };
  }

  if (code === "P1000") {
    return {
      code,
      message,
      probableCause: "Database authentication failed.",
      remediation: [
        "Reset DB credentials and update environment variables.",
        "URL-encode special characters in passwords.",
      ],
    };
  }

  if (code === "P1012") {
    return {
      code,
      message,
      probableCause: "Prisma env var configuration mismatch.",
      remediation: [
        "Set required DATABASE_URL and DIRECT_URL variables.",
        "Confirm datasource env names in prisma/schema.prisma.",
      ],
    };
  }

  return {
    code,
    message,
    probableCause: "Unhandled connectivity/runtime issue.",
    remediation: [
      "Inspect stack trace and database logs.",
      "Validate runtime network + credentials.",
    ],
  };
}

async function probe(name, url) {
  const checkedAt = new Date().toISOString();
  const target = describeTarget(url);

  if (!url) {
    return {
      name,
      ok: false,
      checkedAt,
      latencyMs: null,
      target,
      error: {
        code: "MISSING_ENV",
        message: `${name === "pooled" ? "DATABASE_URL" : "DIRECT_URL"} is not set`,
        probableCause: "Missing environment configuration.",
        remediation: [
          "Set missing DB env var locally and in deployment settings.",
        ],
      },
    };
  }

  const startedAt = Date.now();
  const client = new PrismaClient({
    datasources: { db: { url } },
    log: ["error"],
  });

  try {
    await client.$connect();
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
      error: normalizeError(error),
    };
  } finally {
    await client.$disconnect();
  }
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));

  const [pooled, direct] = await Promise.all([
    probe("pooled", process.env.DATABASE_URL),
    probe("direct", process.env.DIRECT_URL),
  ]);

  const alerts = [];
  if (!pooled.ok) {
    alerts.push({
      severity: "critical",
      code: "POOLED_UNAVAILABLE",
      message: "Pooled runtime connection failed.",
    });
  } else if (pooled.latencyMs > opts.maxLatencyMs) {
    alerts.push({
      severity: "warning",
      code: "POOLED_HIGH_LATENCY",
      message: `Pooled latency ${pooled.latencyMs}ms exceeds ${opts.maxLatencyMs}ms.`,
    });
  }

  if (!direct.ok) {
    alerts.push({
      severity: "critical",
      code: "DIRECT_UNAVAILABLE",
      message: "Direct migration connection failed.",
    });
  } else if (direct.latencyMs > opts.maxLatencyMs) {
    alerts.push({
      severity: "warning",
      code: "DIRECT_HIGH_LATENCY",
      message: `Direct latency ${direct.latencyMs}ms exceeds ${opts.maxLatencyMs}ms.`,
    });
  }

  const hasCritical = alerts.some((item) => item.severity === "critical");
  const status = hasCritical ? "degraded" : alerts.length > 0 ? "warning" : "healthy";

  const report = {
    checkedAt: new Date().toISOString(),
    status,
    thresholds: { maxLatencyMs: opts.maxLatencyMs },
    checks: { pooled, direct },
    alerts,
  };

  console.log(JSON.stringify(report, null, 2));

  if (opts.jsonOut) {
    await fs.writeFile(opts.jsonOut, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  }

  if (status !== "healthy") {
    process.exit(2);
  }
}

main().catch((error) => {
  console.error("[db:health] fatal error");
  console.error(error);
  process.exit(1);
});
