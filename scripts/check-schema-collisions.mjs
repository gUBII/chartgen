#!/usr/bin/env node

import fs from "node:fs/promises";
import process from "node:process";

const DEFAULT_LEFT = "prisma/schema.prisma";
const DEFAULT_RIGHT = "prisma/schema.audit-ready.prisma";

function normalizeLine(line) {
  return line.replace(/\s+/g, " ").trim();
}

function parseModels(schemaText) {
  const lines = schemaText.split(/\r?\n/);
  const models = new Map();

  for (let i = 0; i < lines.length; i += 1) {
    const modelMatch = lines[i].match(/^\s*model\s+([A-Za-z_]\w*)\s*\{/);
    if (!modelMatch) continue;

    const modelName = modelMatch[1];
    const fields = new Map();
    const indexes = [];
    i += 1;

    while (i < lines.length && !/^\s*}\s*$/.test(lines[i])) {
      const raw = lines[i].trim();
      if (!raw || raw.startsWith("//")) {
        i += 1;
        continue;
      }

      if (raw.startsWith("@@index")) {
        indexes.push(normalizeLine(raw));
        i += 1;
        continue;
      }

      if (raw.startsWith("@@")) {
        i += 1;
        continue;
      }

      const fieldMatch = raw.match(/^([A-Za-z_]\w*)\s+(.+)$/);
      if (!fieldMatch) {
        i += 1;
        continue;
      }

      const fieldName = fieldMatch[1];
      const relationMatch = raw.match(/@relation\("([^"]+)"/);
      fields.set(fieldName, {
        signature: normalizeLine(raw),
        relationName: relationMatch ? relationMatch[1] : null,
      });
      i += 1;
    }

    indexes.sort();
    models.set(modelName, { fields, indexes });
  }

  return models;
}

function compareModelShape(modelName, leftModel, rightModel) {
  const collisions = [];

  const allFieldNames = new Set([
    ...leftModel.fields.keys(),
    ...rightModel.fields.keys(),
  ]);

  for (const fieldName of [...allFieldNames].sort()) {
    const leftField = leftModel.fields.get(fieldName);
    const rightField = rightModel.fields.get(fieldName);

    if (!leftField) {
      collisions.push({
        model: modelName,
        kind: "field_missing_left",
        detail: fieldName,
      });
      continue;
    }

    if (!rightField) {
      collisions.push({
        model: modelName,
        kind: "field_missing_right",
        detail: fieldName,
      });
      continue;
    }

    if (leftField.signature !== rightField.signature) {
      collisions.push({
        model: modelName,
        kind: "field_signature_mismatch",
        detail: fieldName,
      });
    }

    if (leftField.relationName !== rightField.relationName) {
      collisions.push({
        model: modelName,
        kind: "relation_name_mismatch",
        detail: fieldName,
      });
    }
  }

  const leftIndexes = JSON.stringify(leftModel.indexes);
  const rightIndexes = JSON.stringify(rightModel.indexes);
  if (leftIndexes !== rightIndexes) {
    collisions.push({
      model: modelName,
      kind: "index_mismatch",
      detail: "model indexes differ",
    });
  }

  return collisions;
}

async function main() {
  const leftPath = process.argv[2] ?? DEFAULT_LEFT;
  const rightPath = process.argv[3] ?? DEFAULT_RIGHT;

  const [leftSchema, rightSchema] = await Promise.all([
    fs.readFile(leftPath, "utf8"),
    fs.readFile(rightPath, "utf8"),
  ]);

  const leftModels = parseModels(leftSchema);
  const rightModels = parseModels(rightSchema);
  const sharedModels = [...leftModels.keys()]
    .filter((name) => rightModels.has(name))
    .sort();

  const collisions = [];
  for (const modelName of sharedModels) {
    const modelCollisions = compareModelShape(
      modelName,
      leftModels.get(modelName),
      rightModels.get(modelName)
    );
    collisions.push(...modelCollisions);
  }

  if (collisions.length === 0) {
    console.log(
      `RESULT schema_collision_check PASS cp_safe_now=yes collisions=0 shared_models=${sharedModels.length}`
    );
    process.exit(0);
  }

  console.log(
    `RESULT schema_collision_check FAIL cp_safe_now=no collisions=${collisions.length} shared_models=${sharedModels.length}`
  );

  const byModel = new Map();
  for (const collision of collisions) {
    const key = collision.model;
    const list = byModel.get(key) ?? [];
    list.push(collision);
    byModel.set(key, list);
  }

  for (const [modelName, modelCollisions] of byModel) {
    const kinds = modelCollisions.map((entry) => entry.kind).join(",");
    console.log(`- ${modelName}: ${kinds}`);
  }

  process.exit(1);
}

main().catch((error) => {
  console.error(
    `RESULT schema_collision_check FAIL cp_safe_now=unknown collisions=unknown error=${error.message}`
  );
  process.exit(2);
});
