#!/usr/bin/env node

import process from "node:process";
import { setTimeout as sleep } from "node:timers/promises";

const DEFAULTS = {
  samples: 5,
  intervalSec: 10,
  timeoutMs: 15000,
  cookie: "",
};

function usage() {
  console.log(
    [
      "Usage: node scripts/db-health-trend.mjs --url <base-url> [options]",
      "",
      "Options:",
      "  --url <base-url>   Required base URL (example: https://chartgen-gubii.netlify.app)",
      "  --samples <n>      Number of samples to capture (default: 5)",
      "  --interval <sec>   Delay between samples in seconds (default: 10)",
      "  --cookie <value>   Optional Cookie header value (example: gwc_session=<token>)",
      "  --timeout-ms <n>   Per-request timeout in milliseconds (default: 15000)",
      "  --help             Show help",
      "",
      "Example:",
      '  npm run db:health:trend -- --url https://chartgen-gubii.netlify.app --samples 3 --interval 1 --cookie "gwc_session=<token>"',
    ].join("\n"),
  );
}

function parseArgs(argv) {
  const opts = { ...DEFAULTS, url: "" };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];

    if (arg === "--url") {
      if (next === undefined) throw new Error("`--url` requires a value.");
      opts.url = next;
      i += 1;
      continue;
    }

    if (arg === "--samples") {
      if (next === undefined) throw new Error("`--samples` requires a value.");
      opts.samples = Number.parseInt(next, 10);
      i += 1;
      continue;
    }

    if (arg === "--interval") {
      if (next === undefined) throw new Error("`--interval` requires a value.");
      opts.intervalSec = Number.parseInt(next, 10);
      i += 1;
      continue;
    }

    if (arg === "--cookie") {
      if (next === undefined) throw new Error("`--cookie` requires a value (use empty string if needed).");
      opts.cookie = next;
      i += 1;
      continue;
    }

    if (arg === "--timeout-ms") {
      if (next === undefined) throw new Error("`--timeout-ms` requires a value.");
      opts.timeoutMs = Number.parseInt(next, 10);
      i += 1;
      continue;
    }

    if (arg === "--help") {
      usage();
      process.exit(0);
    }
  }

  if (!opts.url) {
    throw new Error("`--url` is required.");
  }

  try {
    const parsed = new URL(opts.url);
    opts.url = `${parsed.origin}${parsed.pathname}`.replace(/\/+$/, "");
  } catch {
    throw new Error("`--url` must be a valid absolute URL.");
  }

  if (!Number.isInteger(opts.samples) || opts.samples <= 0) {
    throw new Error("`--samples` must be a positive integer.");
  }

  if (!Number.isInteger(opts.intervalSec) || opts.intervalSec < 0) {
    throw new Error("`--interval` must be an integer >= 0.");
  }

  if (!Number.isInteger(opts.timeoutMs) || opts.timeoutMs <= 0) {
    throw new Error("`--timeout-ms` must be a positive integer.");
  }

  return opts;
}

function toLatency(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function maxOrNull(values) {
  return values.length ? Math.max(...values) : null;
}

async function probeOnce(endpoint, cookieHeader, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const headers = {};
    if (cookieHeader) {
      headers.Cookie = cookieHeader;
    }

    const response = await fetch(endpoint, {
      method: "GET",
      headers,
      signal: controller.signal,
      cache: "no-store",
    });

    let payload = null;
    const text = await response.text();
    if (text) {
      try {
        payload = JSON.parse(text);
      } catch {
        payload = null;
      }
    }

    const status =
      payload?.status === "healthy" || payload?.status === "warning" || payload?.status === "degraded"
        ? payload.status
        : response.ok
          ? "degraded"
          : "degraded";

    return {
      status,
      pooledMs: toLatency(payload?.checks?.pooled?.latencyMs),
      directMs: toLatency(payload?.checks?.direct?.latencyMs),
      httpStatus: response.status,
    };
  } catch {
    return {
      status: "degraded",
      pooledMs: null,
      directMs: null,
      httpStatus: null,
    };
  } finally {
    clearTimeout(timer);
  }
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const endpoint = `${opts.url}/api/ops/db-health`;
  const samples = [];

  for (let i = 0; i < opts.samples; i += 1) {
    // Sequential sampling reflects live runtime trend over time windows.
    const sample = await probeOnce(endpoint, opts.cookie, opts.timeoutMs);
    samples.push(sample);

    if (i < opts.samples - 1 && opts.intervalSec > 0) {
      await sleep(opts.intervalSec * 1000);
    }
  }

  const warningCount = samples.filter((item) => item.status === "warning").length;
  const degradedCount = samples.filter((item) => item.status === "degraded").length;
  const pooledValues = samples.map((item) => item.pooledMs).filter((value) => value !== null);
  const directValues = samples.map((item) => item.directMs).filter((value) => value !== null);
  const finalStatus = samples[samples.length - 1]?.status ?? "degraded";

  const summary = {
    samples: samples.length,
    warning_count: warningCount,
    degraded_count: degradedCount,
    pooled_max_ms: maxOrNull(pooledValues),
    direct_max_ms: maxOrNull(directValues),
    final_status: finalStatus,
  };

  console.log(JSON.stringify(summary));
  process.exit(degradedCount > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error(`[db:health:trend] ${error?.message || "Unknown error"}`);
  process.exit(1);
});
