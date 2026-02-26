/**
 * API Tests for approveAll Governance Controls
 *
 * Tests enforce:
 * 1. Reviewer role validation (SUPERVISOR|CLINICAL_LEAD only)
 * 2. Segregation of duties (generator ≠ reviewer)
 *
 * These tests assume a running Next.js dev server on http://localhost:3000
 * Run: npm test (after jest/vitest is configured)
 */

import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";

const API_BASE = "http://localhost:3000/api/engine";

// Test setup: Create staff members with different roles
async function setupTestData() {
  // This would use prisma to create test staff and participants
  // For now, these are placeholders - integrate with your test database
  return {
    supervisorId: "supervisor-uuid-1",
    clinicalLeadId: "clinical-lead-uuid-1",
    supportWorkerId: "support-worker-uuid-1",
    generatorStaffId: "generator-uuid-1",
    participantId: "participant-uuid-1",
  };
}

describe("approveAll Governance Controls", () => {
  let testData: Awaited<ReturnType<typeof setupTestData>>;

  beforeAll(async () => {
    testData = await setupTestData();
  });

  describe("Reviewer Role Enforcement", () => {
    it("should reject approval from staff with SUPPORT_WORKER role", async () => {
      const response = await fetch(`${API_BASE}/preview`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          approveAll: true,
          batchId: "batch-1",
          actorStaffId: testData.supportWorkerId, // SUPPORT_WORKER role
        }),
      });

      expect(response.status).toBe(403);
      const json = await response.json();
      expect(json.error.code).toBe("FORBIDDEN_ROLE");
    });

    it("should accept approval from SUPERVISOR", async () => {
      // Create a batch first (POST /api/engine/preview)
      // Then approve it with SUPERVISOR role
      // This test assumes a valid batch exists
      // Status should be 200 with approvedCount > 0
      // (Implementation depends on test database setup)
    });

    it("should accept approval from CLINICAL_LEAD", async () => {
      // Similar to above but with CLINICAL_LEAD role
    });
  });

  describe("Segregation of Duties (Generator ≠ Reviewer)", () => {
    it("should reject self-approval by batch generator", async () => {
      // Create a batch with generatorStaffId
      // Attempt approval with same generatorStaffId as actorStaffId
      const response = await fetch(`${API_BASE}/preview`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          approveAll: true,
          batchId: "batch-1",
          actorStaffId: testData.generatorStaffId, // Same as batch generator
        }),
      });

      expect(response.status).toBe(403);
      const json = await response.json();
      expect(json.error.code).toBe("SELF_APPROVAL_FORBIDDEN");
    });

    it("should allow approval by different reviewer than generator", async () => {
      // Create batch with generatorStaffId
      // Approve with different supervisorId
      // Should return 200 with approvedCount > 0
    });
  });

  describe("Missing Required Fields", () => {
    it("should reject approveAll without actorStaffId", async () => {
      const response = await fetch(`${API_BASE}/preview`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          approveAll: true,
          batchId: "batch-1",
          // actorStaffId missing
        }),
      });

      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.error.code).toBe("MISSING_FIELD");
    });

    it("should reject approveAll without batchId", async () => {
      const response = await fetch(`${API_BASE}/preview`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          approveAll: true,
          actorStaffId: testData.supervisorId,
          // batchId missing
        }),
      });

      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.error.code).toBe("MISSING_FIELD");
    });

    it("should reject with non-existent actorStaffId", async () => {
      const response = await fetch(`${API_BASE}/preview`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          approveAll: true,
          batchId: "batch-1",
          actorStaffId: "non-existent-staff-id",
        }),
      });

      expect(response.status).toBe(404);
      const json = await response.json();
      expect(json.error.code).toBe("ACTOR_NOT_FOUND");
    });
  });

  describe("MAR Preview Route (mar-preview) - Same Governance", () => {
    it("should reject MAR approval from SUPPORT_WORKER role", async () => {
      const response = await fetch(`${API_BASE}/mar-preview`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          approveAll: true,
          batchId: "mar-batch-1",
          actorStaffId: testData.supportWorkerId,
        }),
      });

      expect(response.status).toBe(403);
      const json = await response.json();
      expect(json.error.code).toBe("FORBIDDEN_ROLE");
    });

    it("should reject MAR self-approval by generator", async () => {
      const response = await fetch(`${API_BASE}/mar-preview`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          approveAll: true,
          batchId: "mar-batch-1",
          actorStaffId: testData.generatorStaffId,
        }),
      });

      expect(response.status).toBe(403);
      const json = await response.json();
      expect(json.error.code).toBe("SELF_APPROVAL_FORBIDDEN");
    });
  });
});
