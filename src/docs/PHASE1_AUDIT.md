# Phase 1 Audit (NDIS-Focused)

Date: 2026-02-23

## Scope

- `/Users/moofasa/chartgen/prisma/schema.prisma`
- `/Users/moofasa/chartgen/src/lib/validation/mealValidation.ts`
- `/Users/moofasa/chartgen/src/services/restoration/temporalRealism.ts`
- Supplied Gemini session logs (shell/tool failures and manual file writes)

## Safety Boundary

This system must not be used to fabricate or conceal clinical events. Restored data must remain clearly marked as reconstruction candidates and must not be posted to the production ledger without supervisor review, approval, and provenance evidence.

## Immediate Red Flags

1. Critical: Missing Staff entity and signature relation in schema
Evidence: `workerSignatureId` is a plain string in `schema.prisma` with no foreign key to staff.
Risk: weak non-repudiation and unverifiable attribution during audit.

2. Critical: No review-gating layer between restoration output and live ledger
Evidence: current schema has only `MealLog` and `MARLog`, no candidate/staging model.
Risk: reconstructed data can be mixed with live records without approval trace.

3. High: IDDSI plan-deviation reason not enforced in validation
Evidence: prior `mealValidation.ts` checked numeric ranges only.
Risk: non-compliant mealtime deviations can be undocumented.

4. High: Temporal algorithm used uniform `Math.random()` distribution
Evidence: prior `temporalRealism.ts` generated flat +/-15 minute variance.
Risk: synthetic-looking patterns and weak reproducibility controls.

5. High: MAR refusal controls incomplete
Evidence: schema has optional `omissionReason`, but no rule to require it when refused.
Risk: incomplete medication refusal records.

6. Medium: Query-performance indexes are missing
Evidence: no composite indexes such as participant/time on meal and MAR logs.
Risk: slower reports and higher latency under audit/reporting loads.

7. Medium: No provenance hash or immutable event linkage
Evidence: no hash/checksum fields or append-only ledger model.
Risk: difficult tamper detection and weak forensic confidence.

8. Medium: Environment bootstrap is incomplete for a runnable app
Evidence: repository currently lacks `package.json`, Next.js runtime files, and migration artifacts.
Risk: deployment and verification are blocked.

## spawn bash ENOENT Diagnosis

From the supplied logs, the failure was in the automation runtime, not in Prisma:

- `npm install prisma --save-dev` failed with `spawn bash ENOENT`
- `npx prisma init` failed with the same error

Most probable causes:

1. Tool runner attempted to launch `bash` from an unavailable path.
2. Tool runner had an invalid working directory during process spawn.
3. Interactive prompts from `create-next-app` left the automation in a bad shell state.

## Workflow Fix (5 Steps in VS Code Terminal)

1. Validate shell/runtime and force npm to use zsh.

```bash
cd /Users/moofasa/chartgen
pwd
which zsh
which bash
node -v
npm -v
npm config set script-shell "/bin/zsh"
```

If `node -v` is outside active LTS, switch before installing dependencies:

```bash
nvm install 20
nvm use 20
```

2. Initialize Node project and install runtime/tooling.

```bash
[ -f package.json ] || npm init -y
npm install next react react-dom @prisma/client@6.17.1
npm install -D typescript @types/node @types/react @types/react-dom prisma@6.17.1 eslint eslint-config-next
npm pkg set scripts.dev="next dev" scripts.build="next build" scripts.start="next start" scripts.lint="next lint"
```

3. If Next.js scaffold files are missing, bootstrap app shell files.

```bash
mkdir -p src/app
cat > src/app/layout.tsx <<'EOF'
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
EOF

cat > src/app/page.tsx <<'EOF'
export default function HomePage() {
  return <main>ChartGen Phase 1 bootstrap complete.</main>;
}
EOF
```

4. Configure database env and synchronize Prisma.

```bash
cat > .env <<'EOF'
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/chartgen?schema=public"
EOF

npx prisma format
npx prisma validate
npx prisma migrate dev --name phase1_init
npx prisma generate
```

5. Run and verify.

```bash
npm run dev
```

Expected: app loads locally and Prisma client is generated under `node_modules/.prisma`.

Note: Prisma CLI v7 changes datasource configuration and will fail against the current schema format unless you migrate to `prisma.config.ts`. Pinning Prisma v6 for Phase 1 avoids that blocker.

## Compliance Gap Notes (NDIS)

- NDIS Practice Standards require safe, effective support delivery and documented policies for medication and mealtime management.
- Information management expectations require complete and accurate records.
- Incident and risk events require explicit handling and escalation pathways.

Reference links:

- https://www.ndiscommission.gov.au/providers/registered-ndis-providers/provider-obligations-and-requirements/ndis-practice-standards-and-quality-indicators
- https://www.ndiscommission.gov.au/providers/registered-ndis-providers/provider-obligations-and-requirements/core-module
- https://www.ndiscommission.gov.au/providers/registered-ndis-providers/provider-obligations-and-requirements/module-1-high-intensity-daily-personal-activities
- https://www.ndiscommission.gov.au/providers/registered-ndis-providers/provider-obligations-and-requirements/code-conduct

## Review and Verify Layer (Recommended)

1. Restoration output writes only to candidate records, never directly to production logs.
2. Candidate records carry `source`, `restorationBatchId`, `generatedBy`, and `provenanceHash`.
3. Supervisor approval is mandatory before promotion to live ledger.
4. Rejections remain immutable with reasons captured.
5. Every promotion/rejection writes an append-only audit event.
