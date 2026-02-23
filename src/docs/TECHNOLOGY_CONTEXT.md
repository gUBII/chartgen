# Technology Context (Phase 1)

## Core Stack

1. Next.js (App Router) with TypeScript
Purpose: fast UI development for support-worker workflows, typed server/client boundaries, and API route support.

2. Prisma ORM with PostgreSQL
Purpose: strongly typed database access, migration discipline, and relational modeling for participants, staff, meals, and MAR logs.

3. Validation Layer (`src/lib/validation`)
Purpose: enforce IDDSI ranges and clinical safety rules in code before persistence.

4. Restoration Services (`src/services/restoration`)
Purpose: generate provisional reconstruction candidates for disaster recovery only, with supervisor-gated promotion.

## Compliance-Driven Design Principles

1. Explicit provenance
Every reconstructed candidate must carry a source marker, batch id, generator identity, and hash.

2. Separation of duties
The person generating restored candidates should not be the final approver by default.

3. Immutable traceability
Promotions from candidate to production should emit append-only audit events.

4. Safety-first validation
Clinical edge cases (swallowing risk, refusals, omissions, deviations) should force structured reasons.

5. Data minimization and access control
Only authorized users should see participant data, and sensitive fields should be masked in non-clinical views/logs.

## Why This Matters for NDIS Audits

- Supports quality and safety expectations in provider obligations.
- Improves evidence quality during incident reviews and external audits.
- Reduces risk of undocumented deviations, unverified signatures, and unexplained restoration artifacts.
