# Testing Guide

This document describes how to run tests for the authentication system and login-to-nav state transitions.

## Test Suites

### 1. Auth Reactivity Tests

**File:** `scripts/test-auth-reactivity.mjs`

Tests the core authentication endpoints and session creation:

```bash
node scripts/test-auth-reactivity.mjs
```

**Coverage:**
- Full access login (password-based)
- Guest access login
- Session cookie creation and verification
- Auth check endpoint

**Expected output:** 4/4 tests pass ✅

### 2. Auth Hardening Tests

**File:** `scripts/test-auth-hardening.mjs`

Tests the Phase 1 auth hardening implementation (identity-aware login):

```bash
node scripts/test-auth-hardening.mjs
```

**Coverage:**
- Legacy SITE_PASSWORD backward compatibility
- Username + password authentication (identity-based)
- Invalid credentials rejection
- Guest access (unchanged)
- Session payload verification

**Expected output:** All tests pass ✅

### 3. Login-to-Nav State Transition Tests

**File:** `scripts/test-login-nav-transitions.mjs`

Integration tests for auth state synchronization with UI components:

```bash
node scripts/test-login-nav-transitions.mjs
```

**Coverage:**
- Full login updates role state
- Guest login enforces restrictions
- Logout resets session
- Auth state consistency across rapid transitions
- Protected endpoint access control

**Expected output:** 12/12 tests pass ✨

## Running All Tests

```bash
# Run all test suites in sequence
npm run test:all
```

Or run individually:

```bash
node scripts/test-auth-reactivity.mjs && \
node scripts/test-auth-hardening.mjs && \
node scripts/test-login-nav-transitions.mjs
```

## Test Environment

Tests require:
- Development server running on `http://localhost:3000` (default)
- Environment variables configured (`.env` file)
  - `SITE_PASSWORD=free` (for legacy password tests)
  - `SESSION_SECRET=...` (for session signing)

Override the base URL:

```bash
BASE_URL=http://localhost:3001 node scripts/test-auth-reactivity.mjs
```

## What These Tests Verify

### Auth Reactivity Tests
Verify that:
- Authentication endpoints are functional
- Session cookies are created and validated
- Both full and guest roles work correctly

### Auth Hardening Tests
Verify that:
- Legacy password authentication still works (backward compatibility)
- New identity-based login works (when configured)
- Invalid credentials are properly rejected
- Session payload includes optional identity field

### Login-to-Nav Transition Tests
Verify that:
- Role state updates immediately after login (no page reload needed)
- UI restrictions (gating) match the authenticated role
- Full users can access protected endpoints
- Guest users are denied access to restricted endpoints
- Session state persists across multiple requests
- Logout endpoint executes successfully

## Debugging Failed Tests

### Test fails at "Login endpoint"
**Cause:** Development server not running

**Solution:**
```bash
npm run dev
```

### Test fails at "Auth check"
**Cause:** Session cookie not set correctly

**Solution:**
- Verify `SESSION_SECRET` is set in `.env`
- Check that middleware is not blocking auth endpoints
- Verify `/api/auth/check` route exists

### Test fails at "Guest user denied access"
**Cause:** Protected endpoints not enforcing authorization

**Solution:**
- Verify middleware checks for valid session
- Check that guest role is properly identified in session
- Verify `/api/ops/db-health` requires full role

## Test Philosophy

These tests are **integration tests**, not unit tests. They verify:

1. **End-to-end flows** - Complete login→auth→gating→logout journeys
2. **State synchronization** - Auth state persists and updates correctly
3. **Access control** - Role-based restrictions are enforced
4. **API contracts** - Endpoints return expected status codes and payloads

They are **lightweight**:
- No external dependencies (Jest, Vitest, etc.)
- Use native Node.js fetch API
- Run in under 30 seconds
- No database setup required

## Future Test Expansion

Planned additions:
- Unit tests for credential parsing logic
- Performance benchmarks for session token generation
- Stress tests with concurrent login attempts
- End-to-end tests with browser automation (Playwright/Cypress)

## Test Results Format

Each test suite returns:
- Exit code 0 if all tests pass
- Exit code 1 if any test fails
- Console output with pass/fail indicators

Example:
```
✅ 1.1 Full login returns correct role
✅ 1.2 Role persists across multiple checks
❌ 1.3 Full user can access protected endpoints
   Error: DB health check failed: 503
```
