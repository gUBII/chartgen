#!/usr/bin/env node
/**
 * Seed medication templates — idempotent (upsert by templateKey).
 * Usage: node scripts/seed-mar-templates.mjs
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const GLOBAL_TEMPLATES = [
  {
    templateKey: "tpl_diabetes_bd_metformin_v1",
    templateName: "Diabetes BD — Metformin",
    scope: "GLOBAL",
    defaultRangePreset: "week_plus",
    items: [
      { name: "Metformin", dosage: "500mg", route: "Oral", schedule: [{ hour: 8, minute: 0 }, { hour: 20, minute: 0 }], instructions: "After food" },
    ],
  },
];

const RENATO_ITEMS = [
  { name: "Citalopram", dosage: "20mg (1 tab)", route: "Oral", schedule: [{ hour: 8, minute: 0 }], instructions: "Morning only" },
  { name: "Sodium Valproate (Epilim)", dosage: "700mg (500mg + 200mg)", route: "Oral", schedule: [{ hour: 8, minute: 0 }, { hour: 20, minute: 0 }], instructions: "BD — twice daily" },
  { name: "Thiamine", dosage: "100mg (1 tab)", route: "Oral", schedule: [{ hour: 8, minute: 0 }], instructions: "Morning only" },
  { name: "Paracetamol MR (Panadol Osteo)", dosage: "665mg x2 tabs", route: "Oral", schedule: [{ hour: 8, minute: 0 }, { hour: 14, minute: 0 }, { hour: 20, minute: 0 }], instructions: "TDS at 8am/2pm/8pm" },
  { name: "Gabapentin", dosage: "300mg (1 cap)", route: "Oral", schedule: [{ hour: 8, minute: 0 }, { hour: 14, minute: 0 }, { hour: 20, minute: 0 }], instructions: "TDS" },
  { name: "Metformin", dosage: "500mg (1 tab)", route: "Oral", schedule: [{ hour: 8, minute: 0 }, { hour: 20, minute: 0 }], instructions: "BD — after food" },
  { name: "Magnesium Aspartate", dosage: "2 tabs (1g)", route: "Oral", schedule: [{ hour: 8, minute: 0 }, { hour: 20, minute: 0 }], instructions: "BD" },
  { name: "Colecalciferol (Vit D)", dosage: "25mcg (1 tab)", route: "Oral", schedule: [{ hour: 8, minute: 0 }], instructions: "Morning only" },
  { name: "Tapentadol SR (Palexia SR)", dosage: "50mg (1 tab)", route: "Oral", schedule: [{ hour: 8, minute: 0 }], instructions: "Daily — confirm exact time on MAR" },
  { name: "Telmisartan", dosage: "40mg (1 tab)", route: "Oral", schedule: [{ hour: 20, minute: 0 }], instructions: "Night only" },
  { name: "Atorvastatin", dosage: "80mg (1 tab)", route: "Oral", schedule: [{ hour: 20, minute: 0 }], instructions: "Night only" },
  { name: "Docusate (Coloxyl)", dosage: "120mg (1 tab)", route: "Oral", schedule: [{ hour: 20, minute: 0 }], instructions: "Night only" },
  { name: "Nicotine Patch", dosage: "14mg/24hr (1 patch)", route: "Transdermal", schedule: [{ hour: 8, minute: 0 }], instructions: "Apply each morning — rotate sites" },
  { name: "Melatonin", dosage: "10mg", route: "Oral", schedule: [{ hour: 20, minute: 0 }], instructions: "Nightly" },
  { name: "CBD Oil", dosage: "0.25–0.5 mL", route: "Sublingual", schedule: [{ hour: 8, minute: 0 }, { hour: 14, minute: 0 }, { hour: 20, minute: 0 }], instructions: "Frequency per MAR — use MAR as source of truth" },
  { name: "Olanzapine", dosage: "2.5mg (1 tab)", route: "Oral", schedule: [], isPRN: true, prnRule: "Every 4 hours when required — document reason + effect" },
  { name: "Nicotine Gum", dosage: "4mg", route: "Oral", schedule: [], isPRN: true, prnRule: "As requested — minimum 1 hour apart — record each use" },
  { name: "Temazepam", dosage: "10mg", route: "Oral", schedule: [], isPRN: true, prnRule: "Night PRN — when required for sleep" },
];

async function upsertTemplate(data) {
  const existing = await prisma.medicationTemplate.findUnique({
    where: { templateKey: data.templateKey },
  });
  if (existing) {
    console.log(`  SKIP (exists): ${data.templateKey}`);
    return;
  }
  await prisma.medicationTemplate.create({ data });
  console.log(`  CREATED: ${data.templateKey}`);
}

async function main() {
  console.log("=== Seeding medication templates ===\n");

  // Global templates
  for (const tpl of GLOBAL_TEMPLATES) {
    await upsertTemplate({
      templateKey: tpl.templateKey,
      templateName: tpl.templateName,
      version: 1,
      isActive: true,
      scope: tpl.scope,
      participantId: null,
      defaultRangePreset: tpl.defaultRangePreset,
      items: tpl.items,
    });
  }

  // Renato Gentili — participant-scoped
  const renato = await prisma.participant.findFirst({
    where: { fullName: { contains: "Renato", mode: "insensitive" } },
  });

  if (!renato) {
    console.log("\n  WARNING: Participant 'Renato Gentili' not found — skipping participant-scoped template.");
    console.log("  Seed participants first (scripts/seed-uat-participant.mjs), then re-run.\n");
  } else {
    console.log(`\n  Found participant: ${renato.fullName} (${renato.id})`);
    await upsertTemplate({
      templateKey: "tpl_renato_gentili_full_v1",
      templateName: "Renato Gentili — Full MAR",
      version: 1,
      isActive: true,
      scope: "PARTICIPANT",
      participantId: renato.id,
      defaultRangePreset: "week_plus",
      items: RENATO_ITEMS,
    });
  }

  console.log("\n=== Done ===");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
