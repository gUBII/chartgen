import { exec } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(exec);

const TEST_CONFIG = {
  seed: 42,
  profile: "balanced",
  startDate: "2026-02-27",
  endDate: "2026-02-27",
  participantId: "P001",
  generatedByStaffId: "S001",
};

async function testMealSeedStability() {
  console.log("\n🔬 Testing Meal Preview Seed Stability...");

  const payload = JSON.stringify({
    ...TEST_CONFIG,
    seed: 42,
    profile: "balanced",
  });

  try {
    // Run 1
    const response1 = await fetch("http://localhost:3000/api/engine/preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
    });

    if (!response1.ok) {
      console.error("❌ Run 1 failed:", response1.status);
      return false;
    }

    const data1 = await response1.json();
    const json1 = JSON.stringify(data1);

    // Run 2
    const response2 = await fetch("http://localhost:3000/api/engine/preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
    });

    const data2 = await response2.json();
    const json2 = JSON.stringify(data2);

    // Compare
    if (json1 === json2) {
      console.log("✅ Meal seed stability: PASS (identical outputs with seed=42)");
      return true;
    } else {
      console.log("❌ Meal seed stability: FAIL (outputs differ with same seed)");
      console.log("  Run 1 candidate count:", data1.candidates?.length);
      console.log("  Run 2 candidate count:", data2.candidates?.length);
      return false;
    }
  } catch (error) {
    console.error("❌ Meal test error:", error.message);
    return false;
  }
}

async function testMarSeedStability() {
  console.log("\n🔬 Testing MAR Preview Seed Stability...");

  const payload = JSON.stringify({
    participantId: TEST_CONFIG.participantId,
    startDate: TEST_CONFIG.startDate,
    endDate: TEST_CONFIG.endDate,
    generatedByStaffId: TEST_CONFIG.generatedByStaffId,
    seed: 42,
    profile: "balanced",
    medications: [
      {
        name: "Aspirin",
        dosage: "500mg",
        route: "PO",
        hour: 9,
        minute: 0,
      },
    ],
  });

  try {
    // Run 1
    const response1 = await fetch("http://localhost:3000/api/engine/mar-preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
    });

    if (!response1.ok) {
      console.error("❌ Run 1 failed:", response1.status);
      return false;
    }

    const data1 = await response1.json();
    const json1 = JSON.stringify(data1);

    // Run 2
    const response2 = await fetch("http://localhost:3000/api/engine/mar-preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
    });

    const data2 = await response2.json();
    const json2 = JSON.stringify(data2);

    // Compare
    if (json1 === json2) {
      console.log("✅ MAR seed stability: PASS (identical outputs with seed=42)");
      return true;
    } else {
      console.log("❌ MAR seed stability: FAIL (outputs differ with same seed)");
      console.log("  Run 1 candidate count:", data1.candidates?.length);
      console.log("  Run 2 candidate count:", data2.candidates?.length);
      return false;
    }
  } catch (error) {
    console.error("❌ MAR test error:", error.message);
    return false;
  }
}

async function testBackwardCompatibility() {
  console.log("\n🔬 Testing Backward Compatibility (no seed/profile)...");

  const payloadNoSeed = JSON.stringify({
    participantId: TEST_CONFIG.participantId,
    startDate: TEST_CONFIG.startDate,
    endDate: TEST_CONFIG.endDate,
    generatedByStaffId: TEST_CONFIG.generatedByStaffId,
  });

  try {
    const response = await fetch("http://localhost:3000/api/engine/preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payloadNoSeed,
    });

    if (response.ok) {
      const data = await response.json();
      if (data.candidates && Array.isArray(data.candidates)) {
        console.log("✅ Backward compatibility: PASS (works without seed/profile)");
        return true;
      }
    }

    console.log("❌ Backward compatibility: FAIL");
    return false;
  } catch (error) {
    console.error("❌ Backward compatibility test error:", error.message);
    return false;
  }
}

async function main() {
  console.log("🚀 Starting Seed Stability Test Suite\n");
  console.log("Note: This test requires local dev server running on port 3000");
  console.log("Run: npm run dev\n");

  const results = {
    mealStability: await testMealSeedStability(),
    marStability: await testMarSeedStability(),
    backwardCompat: await testBackwardCompatibility(),
  };

  console.log("\n📊 Summary:");
  console.log(`  Meal seed stability: ${results.mealStability ? "✅" : "❌"}`);
  console.log(`  MAR seed stability: ${results.marStability ? "✅" : "❌"}`);
  console.log(`  Backward compatibility: ${results.backwardCompat ? "✅" : "❌"}`);

  const allPass = Object.values(results).every((r) => r === true);
  console.log(`\n${allPass ? "✅ All tests PASSED" : "❌ Some tests FAILED"}`);

  process.exit(allPass ? 0 : 1);
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
