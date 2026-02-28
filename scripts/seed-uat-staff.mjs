#!/usr/bin/env node

/**
 * UAT Staff Seeder
 *
 * Creates test staff records for restoration dashboard UAT.
 * No database cleanup — adds to existing data.
 *
 * Usage:
 *   node scripts/seed-uat-staff.mjs
 *
 * Env:
 *   DATABASE_URL (required) — PostgreSQL connection string
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function seedStaff() {
  try {
    console.log("🌱 Creating UAT Staff Records\n");

    const staffToCreate = [
      {
        workerNumber: "UAT-SUPPORT-001",
        displayName: "UAT Support Worker",
        role: "SUPPORT_WORKER",
      },
      {
        workerNumber: "UAT-SUPERVISOR-001",
        displayName: "UAT Supervisor",
        role: "SUPERVISOR",
      },
      {
        workerNumber: "UAT-CLINICAL-001",
        displayName: "UAT Clinical Lead",
        role: "CLINICAL_LEAD",
      },
    ];

    for (const staffData of staffToCreate) {
      const existing = await prisma.staff.findUnique({
        where: { workerNumber: staffData.workerNumber },
      });

      if (existing) {
        console.log(`✅ Staff already exists: ${staffData.displayName} (${existing.id})`);
        console.log(`   Worker #: ${staffData.workerNumber}\n`);
      } else {
        const created = await prisma.staff.create({
          data: staffData,
        });
        console.log(`✅ Created staff: ${staffData.displayName}`);
        console.log(`   ID: ${created.id}`);
        console.log(`   Worker #: ${staffData.workerNumber}`);
        console.log(`   Role: ${staffData.role}\n`);
      }
    }

    console.log("✨ UAT staff seeding complete!\n");
    console.log("For restoration dashboard preview generation, use:");
    console.log("  generatedByStaffId: (any staff ID above)\n");
    console.log("For commit operations, use:");
    console.log("  actorStaffId: UAT-SUPERVISOR-001 or UAT-CLINICAL-001\n");
  } catch (error) {
    console.error("❌ Seeding failed:", error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

seedStaff();
