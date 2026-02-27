import { execSync } from "node:child_process";

const BASE_URL = "http://localhost:3000";

const PROTECTED_ENDPOINTS = [
  {
    method: "GET",
    path: "/api/audit/kpi",
    name: "GET /api/audit/kpi",
  },
  {
    method: "GET",
    path: "/api/audit/explorer",
    name: "GET /api/audit/explorer",
  },
  {
    method: "POST",
    path: "/api/audit/gap-report",
    name: "POST /api/audit/gap-report",
    body: {
      from: "2026-02-01",
      to: "2026-02-27",
      scope: "audit",
    },
  },
  {
    method: "GET",
    path: "/api/ops/db-health",
    name: "GET /api/ops/db-health",
  },
];

async function testEndpoint(endpoint) {
  try {
    const options = {
      method: endpoint.method,
      headers: {
        "Content-Type": "application/json",
      },
    };

    if (endpoint.body) {
      options.body = JSON.stringify(endpoint.body);
    }

    const response = await fetch(`${BASE_URL}${endpoint.path}`, options);

    if (response.status === 401) {
      console.log(`✅ ${endpoint.name}: Returns 401 (Unauthorized) without session`);
      return true;
    } else {
      console.log(
        `❌ ${endpoint.name}: Expected 401, got ${response.status}`
      );
      return false;
    }
  } catch (error) {
    console.error(`❌ ${endpoint.name}: Error - ${error.message}`);
    return false;
  }
}

async function main() {
  console.log("🔐 Testing Protected Endpoints (should return 401 without session)\n");
  console.log("Note: Requires local dev server on port 3000\n");

  const results = [];

  for (const endpoint of PROTECTED_ENDPOINTS) {
    const result = await testEndpoint(endpoint);
    results.push(result);
  }

  console.log(`\n📊 Summary: ${results.filter((r) => r).length}/${results.length} passed`);

  const allPass = results.every((r) => r === true);
  console.log(`${allPass ? "✅ All endpoints correctly protected" : "❌ Some endpoints may be missing auth"}`);

  process.exit(allPass ? 0 : 1);
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
