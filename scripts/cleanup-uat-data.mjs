#!/usr/bin/env node

import "dotenv/config";
import process from "node:process";
import { EntrySource, PrismaClient } from "@prisma/client";

function usage() {
  console.log(
    [
      "Usage: node scripts/cleanup-uat-data.mjs [options]",
      "",
      "Options:",
      "  --participant-key <value>  Participant id OR externalReference (required)",
      "  --older-than-days <n>      Only remove rows older than n days (default: 2)",
      "  --include-live             Also delete LIVE source logs (default: false)",
      "  --apply                    Apply deletion (default: dry-run)",
      "  --help                     Show this help",
      "",
      "Safety:",
      "  Apply mode requires env var CONFIRM_UAT_CLEANUP=YES",
      "",
      "Examples:",
      "  npm run db:cleanup:uat -- --participant-key 112334",
      "  CONFIRM_UAT_CLEANUP=YES npm run db:cleanup:uat -- --participant-key 112334 --apply",
    ].join("\n"),
  );
}

function parseArgs(argv) {
  const opts = {
    participantKey: process.env.CLEAN_PARTICIPANT_KEY ?? "",
    olderThanDays: 2,
    includeLive: false,
    apply: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];

    if (arg === "--participant-key" && next) {
      opts.participantKey = next;
      i += 1;
      continue;
    }
    if (arg === "--older-than-days" && next) {
      opts.olderThanDays = Number(next);
      i += 1;
      continue;
    }
    if (arg === "--include-live") {
      opts.includeLive = true;
      continue;
    }
    if (arg === "--apply") {
      opts.apply = true;
      continue;
    }
    if (arg === "--help") {
      usage();
      process.exit(0);
    }
  }

  if (!opts.participantKey) {
    throw new Error("Missing required `--participant-key`");
  }
  if (!Number.isFinite(opts.olderThanDays) || opts.olderThanDays < 0) {
    throw new Error("`--older-than-days` must be >= 0");
  }

  return opts;
}

function buildCreatedAtFilter(days) {
  if (days <= 0) return undefined;
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  return { lt: cutoff };
}

function countFilter(baseFilter, createdAt) {
  return createdAt ? { ...baseFilter, createdAt } : baseFilter;
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const createdAt = buildCreatedAtFilter(opts.olderThanDays);
  const prisma = new PrismaClient({ log: ["error"] });

  try {
    const marLogModel = prisma.mARLog ?? prisma.marLog;
    if (!marLogModel) {
      throw new Error("Prisma MARLog model is unavailable on this client version.");
    }

    const participant = await prisma.participant.findFirst({
      where: {
        OR: [
          { id: opts.participantKey },
          { externalReference: opts.participantKey },
        ],
      },
      select: {
        id: true,
        externalReference: true,
        fullName: true,
      },
    });

    if (!participant) {
      throw new Error(
        `Participant not found for key "${opts.participantKey}" (id or externalReference)`,
      );
    }

    const logSourceFilter = opts.includeLive
      ? undefined
      : { in: [EntrySource.RESTORED_APPROVED, EntrySource.AUDIT_RECOVERY] };

    const baseParticipantFilter = { participantId: participant.id };
    const mealLogFilter = countFilter(
      logSourceFilter
        ? { ...baseParticipantFilter, source: logSourceFilter }
        : baseParticipantFilter,
      createdAt,
    );
    const marLogFilter = countFilter(
      logSourceFilter
        ? { ...baseParticipantFilter, source: logSourceFilter }
        : baseParticipantFilter,
      createdAt,
    );

    const counts = {
      restorationBatch: await prisma.restorationBatch.count({
        where: countFilter(baseParticipantFilter, createdAt),
      }),
      restoredMealCandidate: await prisma.restoredMealCandidate.count({
        where: countFilter(baseParticipantFilter, createdAt),
      }),
      restoredMARCandidate: await prisma.restoredMARCandidate.count({
        where: countFilter(baseParticipantFilter, createdAt),
      }),
      mealLog: await prisma.mealLog.count({ where: mealLogFilter }),
      marLog: await marLogModel.count({ where: marLogFilter }),
      auditEvent: await prisma.auditEvent.count({
        where: countFilter(baseParticipantFilter, createdAt),
      }),
    };

    const preview = {
      mode: opts.apply ? "APPLY" : "DRY_RUN",
      participant,
      olderThanDays: opts.olderThanDays,
      includeLive: opts.includeLive,
      counts,
    };

    console.log(JSON.stringify(preview, null, 2));

    if (!opts.apply) {
      console.log(
        "[db:cleanup:uat] dry-run only. Re-run with --apply and CONFIRM_UAT_CLEANUP=YES",
      );
      return;
    }

    if (process.env.CONFIRM_UAT_CLEANUP !== "YES") {
      throw new Error(
        "Apply mode requires CONFIRM_UAT_CLEANUP=YES to prevent accidental deletion.",
      );
    }

    const [auditEvent, restoredMealCandidate, restoredMARCandidate, mealLog, marLog, restorationBatch] =
      await prisma.$transaction([
        prisma.auditEvent.deleteMany({
          where: countFilter(baseParticipantFilter, createdAt),
        }),
        prisma.restoredMealCandidate.deleteMany({
          where: countFilter(baseParticipantFilter, createdAt),
        }),
        prisma.restoredMARCandidate.deleteMany({
          where: countFilter(baseParticipantFilter, createdAt),
        }),
        prisma.mealLog.deleteMany({ where: mealLogFilter }),
        marLogModel.deleteMany({ where: marLogFilter }),
        prisma.restorationBatch.deleteMany({
          where: countFilter(baseParticipantFilter, createdAt),
        }),
      ]);

    console.log(
      JSON.stringify(
        {
          deleted: {
            auditEvent: auditEvent.count,
            restoredMealCandidate: restoredMealCandidate.count,
            restoredMARCandidate: restoredMARCandidate.count,
            mealLog: mealLog.count,
            marLog: marLog.count,
            restorationBatch: restorationBatch.count,
          },
        },
        null,
        2,
      ),
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error("[db:cleanup:uat] fatal error");
  console.error(err);
  process.exit(1);
});
