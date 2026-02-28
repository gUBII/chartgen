# Restoration Engine Notes

Last updated: 2026-02-28

## Objective

Generate clinically plausible reconstruction candidates for meal and medication charts while preserving strong provenance and review controls.

Primary implementation:

- `src/services/restoration/restorationEngine.ts`
- `src/services/restoration/temporalRealism.ts`

## 1) Realism Model (Current)

### Day-level coherence

The engine derives a day profile from:

- participant ID
- restoration batch ID
- local date key

Day classes:

- `CHALLENGING`
- `STABLE`
- `STRONG`

This drives per-day behavior so rows from the same day are correlated instead of fully independent random draws.

### Meal outcomes

Meal outcomes are generated with:

- meal-type specific success rates (breakfast/lunch/snack/dinner)
- day-class modifiers
- weighted variance scenarios (`LOW_APPETITE`, `PARTICIPANT_REFUSAL`, `SWALLOW_CONCERN`, `TEXTURE_SUBSTITUTION`)

### Amount-to-volume consistency

Volume is derived from `amountEaten` bands so records do not show contradictory combinations.

Examples:

- `REFUSED` -> `volumeMl = 0`
- `ZERO` -> `volumeMl = 0`
- higher intake bands map to higher volume multiplier ranges

### MAR outcomes

`MARStatus` enum now includes:

- `ADMINISTERED`
- `REFUSED`
- `HELD`
- `LATE`
- `NOT_ADMINISTERED`

Variance scenarios include:

- refusal
- clinical hold
- late administration

### Text variation

Deviation/omission/comment text uses phrase pools to reduce repetitive synthetic wording.

### Defect Highlighting

The engine can now inject `qaAnomalyFlag: true` and `qaMeta: { defect: '...' }` into generated candidates to simulate data defects. The UI uses this to render rows with an amber background for easy auditing.

## 2) Temporal Realism

`generateTemporalRealism` uses triangular sampling with configurable:

- max early/late windows
- late bias
- rounding granularity

Engine behavior now mixes rounding to 1-minute and 5-minute buckets to avoid over-regular patterns.

## 3) Deterministic Generation (v3.4+)

The preview generation routes (`/api/engine/preview`, `/api/engine/mar-preview`) now accept optional `seed` and `profile` parameters for deterministic stochastic modifiers.

- `seed`: A string or number to seed the random number generator.
- `profile`: 'balanced' | 'strict' - to influence generation behavior.

This allows for reproducible test snapshots.

## 4) Provenance Fields on Generated Candidates

Each generated candidate includes:

- `restorationBatchId`
- `generatedByStaffId`
- `generatedAt`
- `provenanceHash`
- `source`: `SYNTHETIC_QA` or `AUDIT_RECOVERY` based on context.

## 5) Review and Promotion Constraints

Engine output is staging data only.

Promotion to production ledger requires:

1. candidate approval (`approveAll`)
2. commit role validation
3. commit-time provenance hash verification
4. transactional write of logs + audit event

## 6) Current Limitations

- Personalization loop from participant historical baselines is not implemented yet.
- `reviewWorkflow.ts` exists but API routes currently enforce governance inline.
