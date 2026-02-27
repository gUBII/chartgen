#!/usr/bin/env node

/**
 * Test script for auth role reactivity
 *
 * Verifies that:
 * 1. Login API correctly sets session cookie
 * 2. Auth check API returns correct role
 * 3. Guest and full access roles are distinguishable
 *
 * Run with: node scripts/test-auth-reactivity.mjs
 */

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";

async function testAuthReactivity() {
  console.log("🧪 Testing auth role reactivity...\n");

  try {
    // Test 1: Full access login
    console.log("📝 Test 1: Full access login");
    const loginResponse = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: "free", role: "full" }),
    });

    if (!loginResponse.ok) {
      throw new Error(`Login failed: ${loginResponse.status}`);
    }

    // Extract cookie from Set-Cookie header
    const setCookieHeader = loginResponse.headers.get("set-cookie");
    if (!setCookieHeader) {
      throw new Error("No session cookie set");
    }

    console.log("✅ Login successful, session cookie set\n");

    // Test 2: Check auth role immediately after login
    console.log("📝 Test 2: Check role immediately after login");
    const checkResponse = await fetch(`${BASE_URL}/api/auth/check`, {
      method: "GET",
      headers: {
        Cookie: setCookieHeader,
      },
    });

    if (!checkResponse.ok) {
      throw new Error(`Auth check failed: ${checkResponse.status}`);
    }

    const checkData = await checkResponse.json();
    if (checkData.role !== "full") {
      throw new Error(`Expected role 'full', got '${checkData.role}'`);
    }

    console.log(`✅ Auth check returned correct role: ${checkData.role}\n`);

    // Test 3: Guest access login
    console.log("📝 Test 3: Guest access login");
    const guestLoginResponse = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: "", role: "guest" }),
    });

    if (!guestLoginResponse.ok) {
      throw new Error(`Guest login failed: ${guestLoginResponse.status}`);
    }

    const guestSetCookieHeader = guestLoginResponse.headers.get("set-cookie");
    if (!guestSetCookieHeader) {
      throw new Error("No guest session cookie set");
    }

    console.log("✅ Guest login successful, session cookie set\n");

    // Test 4: Check guest auth role
    console.log("📝 Test 4: Check guest role");
    const guestCheckResponse = await fetch(`${BASE_URL}/api/auth/check`, {
      method: "GET",
      headers: {
        Cookie: guestSetCookieHeader,
      },
    });

    if (!guestCheckResponse.ok) {
      throw new Error(`Guest auth check failed: ${guestCheckResponse.status}`);
    }

    const guestCheckData = await guestCheckResponse.json();
    if (guestCheckData.role !== "guest") {
      throw new Error(`Expected role 'guest', got '${guestCheckData.role}'`);
    }

    console.log(`✅ Guest auth check returned correct role: ${guestCheckData.role}\n`);

    console.log("✨ All tests passed!\n");
    process.exit(0);
  } catch (error) {
    console.error("❌ Test failed:", error.message);
    process.exit(1);
  }
}

testAuthReactivity();
