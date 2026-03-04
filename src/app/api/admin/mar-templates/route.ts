import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { requireFullSession } from "../../../../lib/require-full-session";
import type { MedicationTemplateItem } from "./types";

export const runtime = "nodejs";

const VALID_SCOPES = new Set(["GLOBAL", "PARTICIPANT"]);
const VALID_RANGE_PRESETS = new Set(["day", "week_plus", "month_plus"]);

function err(status: number, code: string, message: string, details?: unknown) {
  return NextResponse.json({ ok: false, error: message, code, details: details ?? null }, { status });
}

function validateItems(items: unknown): { valid: MedicationTemplateItem[]; error?: string } {
  if (!Array.isArray(items) || items.length === 0) {
    return { valid: [], error: "items must be a non-empty array." };
  }

  const seen = new Set<string>();
  const validated: MedicationTemplateItem[] = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const name = typeof item?.name === "string" ? item.name.trim() : "";
    const dosage = typeof item?.dosage === "string" ? item.dosage.trim() : "";
    const route = typeof item?.route === "string" ? item.route.trim() : "";
    const isPRN = item?.isPRN === true;
    const prnRule = typeof item?.prnRule === "string" ? item.prnRule.trim() : undefined;
    const instructions = typeof item?.instructions === "string" ? item.instructions.trim() : undefined;

    if (!name || !dosage || !route) {
      return { valid: [], error: `Item ${i}: name, dosage, and route are required.` };
    }

    const dedupKey = `${name}|${dosage}|${route}`.toLowerCase();
    if (seen.has(dedupKey)) {
      return { valid: [], error: `Item ${i}: duplicate medication (${name} / ${dosage} / ${route}).` };
    }
    seen.add(dedupKey);

    const schedule: { hour: number; minute: number }[] = [];
    if (Array.isArray(item?.schedule)) {
      for (let j = 0; j < item.schedule.length; j++) {
        const s = item.schedule[j];
        const h = typeof s?.hour === "number" ? s.hour : -1;
        const m = typeof s?.minute === "number" ? s.minute : -1;
        if (h < 0 || h > 23 || m < 0 || m > 59) {
          return { valid: [], error: `Item ${i}, schedule ${j}: hour must be 0–23, minute 0–59.` };
        }
        schedule.push({ hour: h, minute: m });
      }
    }

    if (!isPRN && schedule.length === 0) {
      return { valid: [], error: `Item ${i}: non-PRN medication must have at least 1 schedule entry.` };
    }

    validated.push({
      name,
      dosage,
      route,
      schedule,
      ...(instructions ? { instructions } : {}),
      ...(isPRN ? { isPRN: true } : {}),
      ...(prnRule ? { prnRule } : {}),
    });
  }

  return { valid: validated };
}

export async function GET(request: NextRequest) {
  const authorized = await requireFullSession(request);
  if (!authorized) {
    return err(401, "UNAUTHORIZED", "Authentication required.");
  }

  const url = new URL(request.url);
  const scopeParam = url.searchParams.get("scope")?.toUpperCase();
  const participantIdParam = url.searchParams.get("participantId");
  const activeOnly = url.searchParams.get("activeOnly") !== "false";

  const where: Record<string, unknown> = {};
  if (activeOnly) where.isActive = true;
  if (scopeParam && VALID_SCOPES.has(scopeParam)) where.scope = scopeParam;
  if (participantIdParam) where.participantId = participantIdParam;

  try {
    const rows = await prisma.medicationTemplate.findMany({
      where,
      orderBy: [{ templateName: "asc" }, { version: "desc" }],
    });
    return NextResponse.json({ ok: true, data: rows });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return err(500, "INTERNAL_ERROR", msg);
  }
}

export async function POST(request: NextRequest) {
  const authorized = await requireFullSession(request);
  if (!authorized) {
    return err(401, "UNAUTHORIZED", "Authentication required.");
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return err(400, "INVALID_JSON", "Request body must be valid JSON.");
  }

  const templateKey = typeof body.templateKey === "string" ? body.templateKey.trim() : "";
  const templateName = typeof body.templateName === "string" ? body.templateName.trim() : "";
  const scope = typeof body.scope === "string" ? body.scope.toUpperCase() : "GLOBAL";
  const participantId = typeof body.participantId === "string" ? body.participantId.trim() : null;
  const defaultRangePreset = typeof body.defaultRangePreset === "string" ? body.defaultRangePreset : "week_plus";

  if (!templateKey) return err(400, "MISSING_FIELD", "templateKey is required.");
  if (!templateName) return err(400, "MISSING_FIELD", "templateName is required.");
  if (!VALID_SCOPES.has(scope)) return err(400, "INVALID_FIELD", "scope must be GLOBAL or PARTICIPANT.");
  if (!VALID_RANGE_PRESETS.has(defaultRangePreset)) {
    return err(400, "INVALID_FIELD", "defaultRangePreset must be day, week_plus, or month_plus.");
  }

  if (scope === "PARTICIPANT") {
    if (!participantId) {
      return err(400, "MISSING_FIELD", "participantId is required when scope is PARTICIPANT.");
    }
    const participant = await prisma.participant.findUnique({ where: { id: participantId } });
    if (!participant) {
      return err(400, "PARTICIPANT_NOT_FOUND", `Participant ${participantId} not found.`);
    }
  }

  const existing = await prisma.medicationTemplate.findUnique({ where: { templateKey } });
  if (existing) {
    return err(400, "DUPLICATE_KEY", `templateKey "${templateKey}" already exists.`);
  }

  const { valid, error: itemsError } = validateItems(body.items);
  if (itemsError) return err(400, "INVALID_FIELD", itemsError);

  try {
    const row = await prisma.medicationTemplate.create({
      data: {
        templateKey,
        templateName,
        version: 1,
        isActive: true,
        scope: scope as "GLOBAL" | "PARTICIPANT",
        participantId: scope === "PARTICIPANT" ? participantId : null,
        defaultRangePreset: defaultRangePreset as "day" | "week_plus" | "month_plus",
        items: JSON.parse(JSON.stringify(valid)),
      },
    });
    return NextResponse.json({ ok: true, data: row }, { status: 201 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return err(500, "INTERNAL_ERROR", msg);
  }
}

export async function PATCH(request: NextRequest) {
  const authorized = await requireFullSession(request);
  if (!authorized) {
    return err(401, "UNAUTHORIZED", "Authentication required.");
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return err(400, "INVALID_JSON", "Request body must be valid JSON.");
  }

  const id = typeof body.id === "string" ? body.id.trim() : "";
  if (!id) return err(400, "MISSING_FIELD", "id is required.");

  const existing = await prisma.medicationTemplate.findUnique({ where: { id } });
  if (!existing) return err(404, "NOT_FOUND", `Template ${id} not found.`);

  if (typeof body.isActive !== "boolean") {
    return err(400, "INVALID_FIELD", "isActive (boolean) is required.");
  }

  try {
    const row = await prisma.medicationTemplate.update({
      where: { id },
      data: { isActive: body.isActive },
    });
    return NextResponse.json({ ok: true, data: { id: row.id, isActive: row.isActive } });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return err(500, "INTERNAL_ERROR", msg);
  }
}

export async function DELETE(request: NextRequest) {
  const authorized = await requireFullSession(request);
  if (!authorized) {
    return err(401, "UNAUTHORIZED", "Authentication required.");
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return err(400, "INVALID_JSON", "Request body must be valid JSON.");
  }

  const id = typeof body.id === "string" ? body.id.trim() : "";
  if (!id) return err(400, "MISSING_FIELD", "id is required.");

  const existing = await prisma.medicationTemplate.findUnique({ where: { id } });
  if (!existing) return err(404, "NOT_FOUND", `Template ${id} not found.`);

  try {
    await prisma.medicationTemplate.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return err(500, "INTERNAL_ERROR", msg);
  }
}
