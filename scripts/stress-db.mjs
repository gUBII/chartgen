#!/usr/bin/env node

import "dotenv/config";
import fs from "node:fs/promises";
import process from "node:process";
import { PrismaClient } from "@prisma/client";

const DEFAULTS = {
  concurrency: 20,
  durationSec: 45,
  mode: "simple",
  maxErrorRate: 0.02,
  maxP95Ms: 350,
  jsonOut: "",
};

function parseArgs(argv) {
  const opts = { ...DEFAULTS };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];

    if (arg === "--concurrency" && next) {
      opts.concurrency = Number(next);
      i += 1;
      continue;
    }
    if (arg === "--duration-sec" && next) {
      opts.durationSec = Number(next);
      i += 1;
      continue;
    }
    if (arg === "--mode" && next) {
      opts.mode = next;
      i += 1;
      continue;
    }
    if (arg === "--max-error-rate" && next) {
      opts.maxErrorRate = Number(next);
      i += 1;
      continue;
    }
    if (arg === "--max-p95-ms" && next) {
      opts.maxP95Ms = Number(next);
      i += 1;
      continue;
    }
    if (arg === "--json-out" && next) {
      opts.jsonOut = next;
      i += 1;
      continue;
    }
    if (arg === "--help") {
      printUsage();
      process.exit(0);
    }
  }

  if (!Number.isFinite(opts.concurrency) || opts.concurrency < 1) {
    throw new Error("`--concurrency` must be >= 1");
  }
  if (!Number.isFinite(opts.durationSec) || opts.durationSec < 1) {
    throw new Error("`--duration-sec` must be >= 1");
  }
  if (!["simple", "realistic"].includes(opts.mode)) {
    throw new Error("`--mode` must be `simple` or `realistic`");
  }
  if (opts.maxErrorRate < 0 || opts.maxErrorRate > 1) {
    throw new Error("`--max-error-rate` must be between 0 and 1");
  }
  if (!Number.isFinite(opts.maxP95Ms) || opts.maxP95Ms <= 0) {
    throw new Error("`--max-p95-ms` must be > 0");
  }

  return opts;
}

function printUsage() {
  console.log(
    [
      "Usage: node scripts/stress-db.mjs [options]",
      "",
      "Options:",
      "  --concurrency <n>     Number of parallel workers (default: 20)",
      "  --duration-sec <n>    Test duration in seconds (default: 45)",
      "  --mode <simple|realistic>",
      "                        Query profile (default: simple)",
      "  --max-error-rate <n>  Pass threshold (0-1, default: 0.02)",
      "  --max-p95-ms <n>      Pass threshold in ms (default: 350)",
      "  --json-out <path>     Write JSON summary to file",
      "  --help                Show this help",
      "",
      "Examples:",
      "  npm run db:stress",
      "  npm run db:stress -- --concurrency 40 --duration-sec 90 --mode realistic",
    ].join("\n"),
  );
}

function percentile(values, p) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil((p / 100) * sorted.length) - 1),
  );
  return sorted[idx];
}

function avg(values) {
  if (values.length === 0) return 0;
  return values.reduce((sum, n) => sum + n, 0) / values.length;
}

function round(n) {
  return Math.round(n * 100) / 100;
}

async function runQuery(prisma, mode) {
  if (mode === "simple") {
    await prisma.$queryRaw`SELECT 1`;
    return;
  }

  await prisma.$transaction(
    [
      prisma.$queryRaw`SELECT COUNT(*)::int AS count FROM "RestorationBatch"`,
      prisma.$queryRaw`SELECT COUNT(*)::int AS count FROM "RestoredMealCandidate"`,
      prisma.$queryRaw`SELECT COUNT(*)::int AS count FROM "RestoredMARCandidate"`,
    ],
    { timeout: 15000 },
  );
}

function normalizeError(err) {
  if (!err || typeof err !== "object") return "UNKNOWN_ERROR";
  const anyErr = err;
  if (typeof anyErr.code === "string") return anyErr.code;
  if (typeof anyErr.name === "string") return anyErr.name;
  if (typeof anyErr.message === "string") return anyErr.message.slice(0, 120);
  return "UNKNOWN_ERROR";
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const prisma = new PrismaClient({
    log: ["error"],
  });

  const latenciesMs = [];
  let successCount = 0;
  let failureCount = 0;
  const errors = new Map();

  const startedAt = Date.now();
  const stopAt = startedAt + opts.durationSec * 1000;

  async function workerLoop() {
    while (Date.now() < stopAt) {
      const t0 = process.hrtime.bigint();
      try {
        await runQuery(prisma, opts.mode);
        successCount += 1;
      } catch (err) {
        failureCount += 1;
        const key = normalizeError(err);
        errors.set(key, (errors.get(key) ?? 0) + 1);
      } finally {
        const elapsedMs = Number(process.hrtime.bigint() - t0) / 1_000_000;
        latenciesMs.push(elapsedMs);
      }
    }
  }

  console.log(
    `[db:stress] starting mode=${opts.mode} concurrency=${opts.concurrency} duration=${opts.durationSec}s`,
  );

  try {
    await prisma.$connect();
    await Promise.all(
      Array.from({ length: opts.concurrency }, () => workerLoop()),
    );
  } finally {
    await prisma.$disconnect();
  }

  const elapsedSec = (Date.now() - startedAt) / 1000;
  const total = successCount + failureCount;
  const errorRate = total > 0 ? failureCount / total : 1;
  const p50 = percentile(latenciesMs, 50);
  const p95 = percentile(latenciesMs, 95);
  const p99 = percentile(latenciesMs, 99);
  const max = latenciesMs.length ? Math.max(...latenciesMs) : 0;
  const min = latenciesMs.length ? Math.min(...latenciesMs) : 0;

  const summary = {
    startedAt: new Date(startedAt).toISOString(),
    elapsedSec: round(elapsedSec),
    mode: opts.mode,
    concurrency: opts.concurrency,
    requests: {
      total,
      success: successCount,
      failed: failureCount,
      perSecond: round(total / Math.max(elapsedSec, 1)),
      errorRate: round(errorRate),
    },
    latencyMs: {
      min: round(min),
      avg: round(avg(latenciesMs)),
      p50: round(p50),
      p95: round(p95),
      p99: round(p99),
      max: round(max),
    },
    thresholds: {
      maxErrorRate: opts.maxErrorRate,
      maxP95Ms: opts.maxP95Ms,
    },
    pass:
      errorRate <= opts.maxErrorRate &&
      p95 <= opts.maxP95Ms &&
      successCount > 0,
    errors: Object.fromEntries(errors),
  };

  console.log(JSON.stringify(summary, null, 2));

  if (opts.jsonOut) {
    await fs.writeFile(opts.jsonOut, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
    console.log(`[db:stress] wrote summary to ${opts.jsonOut}`);
  }

  if (!summary.pass) {
    process.exit(2);
  }
}

main().catch((err) => {
  console.error("[db:stress] fatal error");
  console.error(err);
  process.exit(1);
});
