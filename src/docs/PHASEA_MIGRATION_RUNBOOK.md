# Phase A Migration Runbook (Safety-First)

## Objective
Integrate `docs/nextphase.md` schema intent without breaking existing Phase 4 runtime models and API routes.

## What Was Implemented (Non-Breaking)
A modular merge path was applied to both Prisma schemas:
- Added new Phase A supporting enums with distinct names (`QaSleepStatus`, etc.).
- Added new Phase A models using `Qa` suffix where collisions existed:
  - `BglDiabetesLog`
  - `SleepSettlingQaLog`
  - `BowelFluidQaLog`
  - `HygieneLog`
  - `CommunityAccessQaLog`
  - `RepositioningQaLog`
- Added inverse relations on `Participant` and `Staff` for all new models.
- Did **not** overwrite or rename existing runtime models (`SleepSettlingLog`, `BowelFluidLog`, etc.).

## Validation Status
- `npx prisma validate --schema prisma/schema.prisma` -> PASS
- `npx prisma validate --schema prisma/schema.audit-ready.prisma` -> PASS
- `npx prisma generate` -> PASS
- `npm run build` -> PASS
- `npm run schema:check:collision` -> FAIL (expected for overwrite path), modular merge required

## Why This Path
`append-as-is` or `cp prisma/schema.audit-ready.prisma prisma/schema.prisma` was high-risk due name/shape collisions and would risk breaking:
- Blue Team detector route
- Existing relations and field names used by current APIs

## No-Go Conditions
Do **not** run migration if any is true:
1. `DATABASE_URL` target is unknown.
2. Production and staging DB target are not clearly separated.
3. `prisma migrate diff` preview was not reviewed.
4. Build is failing.
5. `npm run schema:check:collision` reports `collisions>0` and proposed action is overwrite/append-as-is.

## Safe Migration Sequence
1. Confirm target DB environment (`dev` vs `staging` vs `production`).
2. Run schema collision gate:
   - `npm run schema:check:collision`
   - if output includes `cp_safe_now=no` or `collisions>0`, block overwrite path and use modular merge only.
3. Create migration SQL only:
   - `npx prisma migrate dev --name phasea_modular_qa --create-only`
4. Review generated migration SQL for:
   - Only `CREATE TABLE`, `CREATE TYPE`, `CREATE INDEX`
   - No `DROP`, no destructive `ALTER TYPE` rewrites
5. Apply on non-production first:
   - `npx prisma migrate deploy`
6. Run smoke checks:
   - `npx prisma validate`
   - `npm run build`
   - Auth + key API routes
7. Promote to production using `migrate deploy` only.

## Rollback
If migration must be reverted:
1. Stop deployment rollout.
2. Restore from DB snapshot/point-in-time backup.
3. Revert app commit containing schema updates.
4. Regenerate client and redeploy previous stable commit.

## Future Consolidation (Optional)
After data matures, we can consolidate old and `Qa` models into unified tables using explicit backfill scripts and API cutover gates.
