#!/usr/bin/env node

import process from "node:process";

const REQUIRED_ENV = ["DATABASE_URL", "DIRECT_URL"];
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "0.0.0.0"]);

function parseHost(rawUrl, envName) {
  if (!rawUrl) {
    throw new Error(`${envName} is not set`);
  }

  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error(`${envName} is not a valid URL`);
  }

  const host = parsed.hostname.toLowerCase();
  if (LOCAL_HOSTS.has(host) || host.endsWith(".local")) {
    throw new Error(`${envName} points to local host (${host})`);
  }

  return host;
}

try {
  const hosts = REQUIRED_ENV.map((envName) => {
    const host = parseHost(process.env[envName], envName);
    return { envName, host };
  });

  for (const item of hosts) {
    console.log(`[remote-db-check] ${item.envName} -> ${item.host}`);
  }
  console.log("[remote-db-check] PASS");
} catch (error) {
  const message = error instanceof Error ? error.message : "unknown error";
  console.error(`[remote-db-check] FAIL: ${message}`);
  process.exit(1);
}
