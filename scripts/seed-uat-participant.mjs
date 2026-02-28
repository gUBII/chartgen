#!/usr/bin/env node

/**
 * UAT Participant Seeder
 *
 * Creates test participant records for restoration dashboard UAT.
 *
 * Usage:
 *   node scripts/seed-uat-participant.mjs
 *
 * Env:
 *   DATABASE_URL (required) — PostgreSQL connection string
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function seedParticipant() {
  try {
    console.log("🌱 Creating UAT Participant Records\n");

    const participantsToCreate = [
      {
        fullName: "UAT Test Participant 1",
        externalReference: "UAT-PART-001",
        defaultFoodTexture: 1,
        defaultFluidThickness: 1,
      },
      {
        fullName: "UAT Test Participant 2",
        externalReference: "UAT-PART-002",
        defaultFoodTexture: 1,
        defaultFluidThickness: 1,
      },
    ];

    for (const participantData of participantsToCreate) {
      const existing = await prisma.participant.findFirst({
        where: { fullName: participantData.fullName },
      });

      if (existing) {
        console.log(`✅ Participant already exists: ${participantData.fullName}`);
        console.log(`   ID: ${existing.id}`);
        console.log(`   Ref: ${participantData.externalReference}\n`);
      } else {
        const created = await prisma.participant.create({
          data: participantData,
        });
        console.log(`✅ Created participant: ${participantData.fullName}`);
        console.log(`   ID: ${created.id}`);
        console.log(`   Ref: ${participantData.externalReference}\n`);
      }
    }

    console.log("✨ UAT participant seeding complete!\n");
  } catch (error) {
    console.error("❌ Seeding failed:", error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

seedParticipant();
