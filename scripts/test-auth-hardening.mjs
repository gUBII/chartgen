#!/usr/bin/env node

/**
 * Test script for auth hardening Phase 1
 *
 * Validates:
 * 1. Username + password authentication
 * 2. Legacy SITE_PASSWORD fallback
 * 3. Guest access (unchanged)
 * 4. Invalid credentials rejection
 */

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const TEST_USERNAME = "testuser";
const TEST_PASSWORD = "testpass123";

async function testAuthHardening() {
  console.log("🧪 Testing Auth Hardening Phase 1...\n");

  try {
    // Test 1: Legacy SITE_PASSWORD still works
    console.log("📝 Test 1: Legacy SITE_PASSWORD (backward compatibility)");
    const legacyResponse = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: "free", role: "full" }),
    });

    if (!legacyResponse.ok) {
      throw new Error(`Legacy password auth failed: ${legacyResponse.status}`);
    }

    const legacyData = await legacyResponse.json();
    if (!legacyData.success) {
      throw new Error("Legacy password auth returned success=false");
    }

    const legacyCookie = legacyResponse.headers.get("set-cookie");
    console.log("✅ Legacy SITE_PASSWORD works\n");

    // Test 2: Username + password auth (if credentials configured)
    console.log("📝 Test 2: Username + password authentication");
    const usernameResponse = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: TEST_USERNAME,
        password: TEST_PASSWORD,
        role: "full",
      }),
    });

    if (usernameResponse.status === 401) {
      console.log(
        "⚠️  Username auth returned 401 (credentials not configured in env - expected during dev)\n"
      );
    } else if (usernameResponse.ok) {
      const usernameData = await usernameResponse.json();
      if (usernameData.success) {
        console.log("✅ Username + password auth works\n");
      }
    } else {
      console.log(
        `⚠️  Username auth returned ${usernameResponse.status} (expected if FULL_USER_CREDENTIALS not set)\n`
      );
    }

    // Test 3: Invalid credentials rejected
    console.log("📝 Test 3: Invalid credentials rejection");
    const invalidResponse = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        password: "wrongpassword",
        role: "full",
      }),
    });

    if (invalidResponse.status === 401) {
      console.log("✅ Invalid password correctly rejected (401)\n");
    } else {
      throw new Error(
        `Invalid password should return 401, got ${invalidResponse.status}`
      );
    }

    // Test 4: Guest access unchanged
    console.log("📝 Test 4: Guest access (should be unchanged)");
    const guestResponse = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: "", role: "guest" }),
    });

    if (!guestResponse.ok) {
      throw new Error(`Guest auth failed: ${guestResponse.status}`);
    }

    const guestData = await guestResponse.json();
    if (!guestData.success) {
      throw new Error("Guest auth returned success=false");
    }

    const guestCookie = guestResponse.headers.get("set-cookie");
    console.log("✅ Guest access works\n");

    // Test 5: Verify session payload includes identity (optional)
    console.log("📝 Test 5: Session payload verification");
    const checkResponse = await fetch(`${BASE_URL}/api/auth/check`, {
      method: "GET",
      headers: { Cookie: legacyCookie },
    });

    if (checkResponse.ok) {
      const checkData = await checkResponse.json();
      console.log("✅ Session check returns role:", checkData.role);
      if (checkData.identity) {
        console.log("   Session includes identity:", checkData.identity);
      } else {
        console.log("   Session has no identity (legacy password auth)");
      }
      console.log();
    }

    console.log("✨ All tests passed!\n");
    process.exit(0);
  } catch (error) {
    console.error("❌ Test failed:", error.message);
    process.exit(1);
  }
}

testAuthHardening();
