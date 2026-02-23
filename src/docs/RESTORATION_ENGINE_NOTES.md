# Restoration Engine Notes (Phase 1)

## Objective

Generate clinically plausible restoration candidates for disaster recovery workflows while enforcing strict audit controls.

## Distribution Model

1. Outcome band
- 90% `SUCCESS`
- 10% `VARIANCE`

2. Meal outcomes
- Success band is weighted toward `ONE_HUNDRED` and `SEVENTY_FIVE`.
- Variance band introduces controlled cases such as refusal, low appetite, or swallowing concern.

3. Medication outcomes
- Success band defaults to `ADMINISTERED`.
- Variance band includes refusal/clinical hold and occasional delayed administration notes.

## Safety Controls

1. Every record from the engine is labeled `RESTORED_CANDIDATE`.
2. Every record is created with `PENDING_SUPERVISOR_REVIEW`.
3. Every record includes `restorationBatchId`, generator staff id, timestamp, and `provenanceHash`.
4. Promotion to production ledger should be blocked unless review status is `APPROVED`.

## Implementation

- `/Users/moofasa/chartgen/src/services/restoration/temporalRealism.ts`
- `/Users/moofasa/chartgen/src/services/restoration/restorationEngine.ts`
- `/Users/moofasa/chartgen/src/services/restoration/reviewWorkflow.ts`
