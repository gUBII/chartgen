# MISSION BLUEPRINT: PHASE 4 - THE COMPLETE CLINICAL ECOSYSTEM & STOCHASTIC ENGINE

**TO:** Lead AI Agents (Claude & Codex)
**CONTEXT:** We are expanding the `chartgen` platform into a full-spectrum NDIS compliance and clinical documentation system. We are integrating 6 new Daily Routine Charts and 5 Exception/Compliance Modules.
**OBJECTIVE:** Wire the entire database schema so that Routine Charts organically trigger Exception Modules via our Stochastic Synthetic QA Engine. All synthetic records must carry `source: "SYNTHETIC_QA"`.

---

## PART 1: DATABASE BLUEPRINT (THE SCHEMA)

**Codex:** Update `schema.audit-ready.prisma`. Enforce strict relational integrity linking everything back to `Participant` and `Staff`.

### A. The Routine Layer (Daily Charts)
These are high-frequency logs.
1.  **BglLog (Blood Glucose):** `reading` (Float), `fasting` (Boolean), `actionTaken` (String). *Links to MARLog if insulin is given.*
2.  **SleepSettlingLog:** `checkTime`, `status` (Enum: Asleep, Awake, Agitated), `intervention`.
3.  **BowelFluidLog:** `type` (Enum: Bowel, FluidIn, FluidOut), `bristolScale` (Int 1-7), `volumeMl` (Int).
4.  **PersonalCareLog:** `shower` (Bool), `oralCare` (Bool), `skinIntegrity` (Enum: Intact, Redness, Broken).
5.  **CommunityAccessLog:** `destination`, `purpose`, `durationMin`, `odometerStart`, `odometerEnd`.
6.  **RepositioningLog:** `position` (Enum: Left, Right, Supine, Seated), `skinCheckOutcome`.

### B. The Exception & Compliance Layer (The Escalations)
These are triggered by anomalies in the Routine Layer.
1.  **Incident Management:** `Incident`, `IncidentNotification`. (Triggered by injuries, severe agitation, or missing staff training).
2.  **Restrictive Practices (BSP):** `RestrictivePracticeEvent`, `MonthlyReport`. (Triggered by chemical restraint PRNs in MAR or physical interventions).
3.  **High Intensity (HIDPA):** `HighIntensityEventLog`, `TrainingRecord`. (Complex bowel care, enteral feeding).
4.  **Seizure/Epilepsy:** `SeizureEvent`. (Triggered by Midazolam administration in MAR).
5.  **Progress Notes:** `ShiftNote`, `GoalProgress`. (The narrative glue explaining deviations in the daily charts).
6.  **Audit Ledger:** `AuditEvent`, `RecordCorrection`. (Immutable append-only tracking).

---

## PART 2: STOCHASTIC ENGINE EXPANSION

**Codex:** Update `src/services/restoration/stochasticEngine.ts`. The engine must now simulate a fully interconnected 24-hour shift.

1.  **Expanded Task Matrix:** Update `TaskKind = "MAR" | "MEAL" | "BGL" | "SLEEP" | "BOWEL" | "HYGIENE" | "COMMUNITY" | "REPOSITION" | "INCIDENT" | "PRN"`.
2.  **Markov Chain Interoperability:** * State `Baseline`: Generates standard Sleep, Meal, and Bowel logs with normal Gaussian time variance.
    * State `Agitated` or `Verbal_Escalation`: Suppresses normal Sleep logs. Generates "Refused" Personal Care logs. Triggers PRN MAR logs.
    * State `Restrictive_Practice`: Automatically generates a `RestrictivePracticeEvent` and applies the **Cascade Delay Algorithm** to push back all subsequent routine tasks (Meals, Hygiene, BGL) for that `workerId` by 45-90 minutes.
3.  **Clinical Domino Algorithms:**
    * *Dehydration Logic:* If the engine generates a low `volumeMl` across 3 consecutive `MealLog` or `BowelFluidLog` entries, it must force a `ShiftNote` detailing a clinical escalation.
    * *Diabetic Logic:* If a `BglLog` is synthetically generated < 4.0, it must immediately generate an unscheduled `MealLog` (fast-acting carbs) and a `ShiftNote`.

---

## PART 3: AGENT EXECUTION DIRECTIVES

**FOR CODEX (Implementation Engineer):**
1.  Output the complete Prisma schema additions for both the Routine Layer and the Exception Layer.
2.  Update the `realizeTimelineWithCascade` function to accept the new `TaskKind` array and implement the "Clinical Domino" logic.

**FOR CLAUDE (Systems Architect):**
1.  Review the schema interdependencies. Ensure that a "Refused" status in a `PersonalCareLog` has a valid pathway to generate a justifying `ShiftNote`.
2.  Architect the logic for the Blue Team Anomaly Detector: Define the exact SQL/Prisma queries that will flag a `BowelFluidLog` if no bowel movement is recorded for 72 hours, or flag a `SleepSettlingLog` if the entries have zero time variance (indicating synthetic batch-filling).