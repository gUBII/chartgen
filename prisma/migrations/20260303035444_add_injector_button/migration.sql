-- CreateEnum
CREATE TYPE "RangePreset" AS ENUM ('day', 'week_plus', 'month_plus');

-- CreateTable
CREATE TABLE "InjectorButton" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "rangePreset" "RangePreset" NOT NULL DEFAULT 'day',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InjectorButton_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InjectorButton_enabled_sortOrder_idx" ON "InjectorButton"("enabled", "sortOrder");

-- AddForeignKey
ALTER TABLE "InjectorButton" ADD CONSTRAINT "InjectorButton_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "Participant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InjectorButton" ADD CONSTRAINT "InjectorButton_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
