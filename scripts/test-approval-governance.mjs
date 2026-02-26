#!/usr/bin/env node

import { PrismaClient, StaffRole } from "@prisma/client";

const prisma = new PrismaClient();

const API_BASE = (process.env.API_BASE_URL ?? "http://localhost:3000").replace(/\/+$/, "");
const PARTICIPANT_ID = process.env.GOVERNANCE_PARTICIPANT_ID ?? "112334";
const GENERATOR_STAFF_ID = process.env.GOVERNANCE_GENERATOR_STAFF_ID ?? "32213";

const SUPPORT_WORKER_NUMBER = "SW-GOV-001";
const CLINICAL_LEAD_NUMBER = "CL-GOV-001";

const SUPPORT_WORKER_CREATE_ID = "gov_sw_001";
const CLINICAL_LEAD_CREATE_ID = "gov_cl_001";

const MEAL_START_DATE = "2026-11-01";
const MEAL_END_DATE = "2026-11-02";
const MAR_START_DATE = "2026-11-01";
const MAR_END_DATE = "2026-11-02";

const results = [];

const addResult = (name, ok, detail) => {
  results.push({ name, ok, detail });
};

const fail = (message) => {
  throw new Error(message);
};

const prettyJson = (value) => {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
};

const apiCall = async (method, path, body) => {
  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (error) {
    fail(`Request failed (${method} ${path}): ${error instanceof Error ? error.message : String(error)}`);
  }

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  return { status: response.status, payload };
};

const expectError = async (name, request, expectedStatus, expectedCode) => {
  const { status, payload } = await apiCall(request.method, request.path, request.body);
  if (status !== expectedStatus) {
    fail(`${name}: expected status ${expectedStatus}, got ${status}. payload=${prettyJson(payload)}`);
  }
  const actualCode = payload?.error?.code;
  if (actualCode !== expectedCode) {
    fail(`${name}: expected error code ${expectedCode}, got ${actualCode}. payload=${prettyJson(payload)}`);
  }
  addResult(name, true, `${status}/${actualCode}`);
};

const expectSuccess = async (name, request, validator) => {
  const { status, payload } = await apiCall(request.method, request.path, request.body);
  if (status !== 200) {
    fail(`${name}: expected status 200, got ${status}. payload=${prettyJson(payload)}`);
  }
  if (!payload?.ok) {
    fail(`${name}: expected ok=true. payload=${prettyJson(payload)}`);
  }
  if (validator) {
    validator(payload);
  }
  addResult(name, true, "200/ok");
  return payload;
};

const requireBaselineRecords = async () => {
  const [participant, generator] = await Promise.all([
    prisma.participant.findUnique({ where: { id: PARTICIPANT_ID }, select: { id: true } }),
    prisma.staff.findUnique({ where: { id: GENERATOR_STAFF_ID }, select: { id: true, role: true } }),
  ]);

  if (!participant) {
    fail(
      `Missing participant ${PARTICIPANT_ID}. Set GOVERNANCE_PARTICIPANT_ID or run seed via: npx prisma db seed`
    );
  }

  if (!generator) {
    fail(
      `Missing generator staff ${GENERATOR_STAFF_ID}. Set GOVERNANCE_GENERATOR_STAFF_ID or run seed via: npx prisma db seed`
    );
  }

  return { generatorRole: String(generator.role) };
};

const ensureReviewerStaff = async () => {
  const supportWorker = await prisma.staff.upsert({
    where: { workerNumber: SUPPORT_WORKER_NUMBER },
    update: {
      displayName: "Governance Support Worker",
      role: StaffRole.SUPPORT_WORKER,
    },
    create: {
      id: SUPPORT_WORKER_CREATE_ID,
      workerNumber: SUPPORT_WORKER_NUMBER,
      displayName: "Governance Support Worker",
      role: StaffRole.SUPPORT_WORKER,
    },
    select: { id: true, role: true },
  });

  const clinicalLead = await prisma.staff.upsert({
    where: { workerNumber: CLINICAL_LEAD_NUMBER },
    update: {
      displayName: "Governance Clinical Lead",
      role: StaffRole.CLINICAL_LEAD,
    },
    create: {
      id: CLINICAL_LEAD_CREATE_ID,
      workerNumber: CLINICAL_LEAD_NUMBER,
      displayName: "Governance Clinical Lead",
      role: StaffRole.CLINICAL_LEAD,
    },
    select: { id: true, role: true },
  });

  return {
    supportWorkerId: supportWorker.id,
    clinicalLeadId: clinicalLead.id,
  };
};

const runMealGovernanceSuite = async ({ supportWorkerId, clinicalLeadId }) => {
  const preview = await expectSuccess(
    "meal.preview.create",
    {
      method: "POST",
      path: "/api/engine/preview",
      body: {
        participantId: PARTICIPANT_ID,
        generatedByStaffId: GENERATOR_STAFF_ID,
        startDate: MEAL_START_DATE,
        endDate: MEAL_END_DATE,
      },
    },
    (payload) => {
      if (!payload?.data?.batchId) {
        fail(`meal.preview.create: missing batchId in payload=${prettyJson(payload)}`);
      }
      if (!Number.isInteger(payload?.data?.candidateCount) || payload.data.candidateCount <= 0) {
        fail(`meal.preview.create: expected positive candidateCount. payload=${prettyJson(payload)}`);
      }
    }
  );

  const batchId = preview.data.batchId;

  await expectError(
    "meal.approve.missing_actor",
    {
      method: "PATCH",
      path: "/api/engine/preview",
      body: {
        approveAll: true,
        batchId,
      },
    },
    400,
    "MISSING_FIELD"
  );

  await expectError(
    "meal.approve.forbidden_role",
    {
      method: "PATCH",
      path: "/api/engine/preview",
      body: {
        approveAll: true,
        batchId,
        actorStaffId: supportWorkerId,
      },
    },
    403,
    "FORBIDDEN_ROLE"
  );

  await expectError(
    "meal.approve.self_approval",
    {
      method: "PATCH",
      path: "/api/engine/preview",
      body: {
        approveAll: true,
        batchId,
        actorStaffId: GENERATOR_STAFF_ID,
      },
    },
    403,
    "SELF_APPROVAL_FORBIDDEN"
  );

  await expectSuccess(
    "meal.approve.success",
    {
      method: "PATCH",
      path: "/api/engine/preview",
      body: {
        approveAll: true,
        batchId,
        actorStaffId: clinicalLeadId,
      },
    },
    (payload) => {
      if (!Number.isInteger(payload?.data?.approvedCount) || payload.data.approvedCount <= 0) {
        fail(`meal.approve.success: expected approvedCount > 0. payload=${prettyJson(payload)}`);
      }
    }
  );
};

const runMarGovernanceSuite = async ({ supportWorkerId, clinicalLeadId }) => {
  const preview = await expectSuccess(
    "mar.preview.create",
    {
      method: "POST",
      path: "/api/engine/mar-preview",
      body: {
        participantId: PARTICIPANT_ID,
        generatedByStaffId: GENERATOR_STAFF_ID,
        startDate: MAR_START_DATE,
        endDate: MAR_END_DATE,
        medications: [
          { name: "Aspirin", dosage: "100mg", route: "PO", hour: 8, minute: 0 },
          { name: "Metformin", dosage: "500mg", route: "PO", hour: 20, minute: 0 },
        ],
      },
    },
    (payload) => {
      if (!payload?.data?.batchId) {
        fail(`mar.preview.create: missing batchId in payload=${prettyJson(payload)}`);
      }
      if (!Number.isInteger(payload?.data?.candidateCount) || payload.data.candidateCount <= 0) {
        fail(`mar.preview.create: expected positive candidateCount. payload=${prettyJson(payload)}`);
      }
    }
  );

  const batchId = preview.data.batchId;

  await expectError(
    "mar.approve.missing_actor",
    {
      method: "PATCH",
      path: "/api/engine/mar-preview",
      body: {
        approveAll: true,
        batchId,
      },
    },
    400,
    "MISSING_FIELD"
  );

  await expectError(
    "mar.approve.forbidden_role",
    {
      method: "PATCH",
      path: "/api/engine/mar-preview",
      body: {
        approveAll: true,
        batchId,
        actorStaffId: supportWorkerId,
      },
    },
    403,
    "FORBIDDEN_ROLE"
  );

  await expectError(
    "mar.approve.self_approval",
    {
      method: "PATCH",
      path: "/api/engine/mar-preview",
      body: {
        approveAll: true,
        batchId,
        actorStaffId: GENERATOR_STAFF_ID,
      },
    },
    403,
    "SELF_APPROVAL_FORBIDDEN"
  );

  await expectSuccess(
    "mar.approve.success",
    {
      method: "PATCH",
      path: "/api/engine/mar-preview",
      body: {
        approveAll: true,
        batchId,
        actorStaffId: clinicalLeadId,
      },
    },
    (payload) => {
      if (!Number.isInteger(payload?.data?.approvedCount) || payload.data.approvedCount <= 0) {
        fail(`mar.approve.success: expected approvedCount > 0. payload=${prettyJson(payload)}`);
      }
    }
  );
};

const main = async () => {
  console.log(`Running governance integration checks against ${API_BASE}`);

  const baseline = await requireBaselineRecords();
  const reviewerStaff = await ensureReviewerStaff();

  addResult("baseline.records", true, `generatorRole=${baseline.generatorRole}`);
  addResult(
    "baseline.reviewers",
    true,
    `supportWorkerId=${reviewerStaff.supportWorkerId}, clinicalLeadId=${reviewerStaff.clinicalLeadId}`
  );

  await runMealGovernanceSuite(reviewerStaff);
  await runMarGovernanceSuite(reviewerStaff);

  console.log("\nGovernance check results:");
  for (const result of results) {
    console.log(`${result.ok ? "PASS" : "FAIL"}  ${result.name}  ${result.detail ? `(${result.detail})` : ""}`);
  }

  const failed = results.filter((entry) => !entry.ok);
  if (failed.length > 0) {
    process.exitCode = 1;
    return;
  }

  console.log(`\nAll ${results.length} governance checks passed.`);
};

main()
  .catch((error) => {
    addResult("fatal", false, error instanceof Error ? error.message : String(error));
    console.log("\nGovernance check results:");
    for (const result of results) {
      console.log(`${result.ok ? "PASS" : "FAIL"}  ${result.name}  ${result.detail ? `(${result.detail})` : ""}`);
    }
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
