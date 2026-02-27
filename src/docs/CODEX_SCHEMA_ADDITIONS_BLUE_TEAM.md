# Schema Additions Required for Blue Team Anomaly Detector

**Target:** Codex must add these models to `prisma/schema.prisma` for the route
`src/app/api/qa/detect-anomalies/route.ts` to compile and function.

**Status:** Implementation is complete and waiting for schema. Route will fail to compile until
all five models and their enums are present.

---

## Required Enums

### BowelFluidType

Used by `BowelFluidLog.type` to distinguish fluid intake vs. output:

```prisma
enum BowelFluidType {
  BOWEL        // fecal output
  FLUID_IN     // fluid intake (REQUIRED for Silent Dehydration detector)
  FLUID_OUT    // fluid loss (vomit, wound drainage, etc.)
}
```

### ShiftNoteCategory

Used by `ShiftNote.category` to classify shift notes. The detector looks for `ESCALATION`:

```prisma
enum ShiftNoteCategory {
  ROUTINE              // routine observations
  ESCALATION           // REQUIRED for Silent Dehydration detector
  INCIDENT_FOLLOWUP    // follow-up to incidents
  CLINICAL_HANDOVER    // handover between shifts/teams
}
```

### RestrictivePracticeType

Used by `RestrictivePracticeEvent.type`:

```prisma
enum RestrictivePracticeType {
  CHEMICAL       // chemical restraint (e.g., sedation)
  PHYSICAL       // physical restraint
  MECHANICAL     // mechanical restraint (e.g., bed rails)
  ENVIRONMENTAL  // environmental restraint (e.g., locked doors)
}
```

---

## Required Models

### 1. SleepSettlingLog (for Ghost Shift detection)

Tracks sleep checks — the detector finds runs of exactly 60-minute intervals indicating falsification.

```prisma
model SleepSettlingLog {
  id              String   @id @default(uuid())
  participantId   String
  participant     Participant @relation(fields: [participantId], references: [id], onDelete: Restrict)

  loggedByStaffId String
  loggedByStaff   Staff    @relation(fields: [loggedByStaffId], references: [id], onDelete: Restrict)

  checkTime       DateTime // exact time of the check
  status          String?  // e.g., "ASLEEP", "AWAKE", "AGITATED" (optional for now)
  intervention    String?  // intervention applied, if any

  source          String   @default("LIVE") // LIVE | SYNTHETIC_QA | AUDIT_RECOVERY

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([participantId, checkTime])
  @@index([loggedByStaffId, checkTime])
  @@index([source])
}
```

### 2. BehaviourSupportPlan (for Unauthorised Restraint detection)

Defines the active window when restraint practices are authorized for a participant:

```prisma
model BehaviourSupportPlan {
  id            String   @id @default(uuid())
  participantId String
  participant   Participant @relation(fields: [participantId], references: [id], onDelete: Restrict)

  activeFrom    DateTime // start of authorization window
  activeTo      DateTime // end of authorization window

  version       Int      @default(1) // version number for tracking updates
  approvedBy    String?  // staff ID who approved (optional)
  notes         String?  // plan summary/notes

  source        String   @default("LIVE")
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  // Back-relation to RestrictivePracticeEvent
  restrictivePracticeEvents RestrictivePracticeEvent[]

  @@index([participantId, activeFrom, activeTo])
  @@index([createdAt])
}
```

### 3. RestrictivePracticeEvent (for Unauthorised Restraint detection)

Logs instances of restraint use. The detector flags events without a BSP or outside the BSP window:

```prisma
model RestrictivePracticeEvent {
  id              String   @id @default(uuid())
  participantId   String
  participant     Participant @relation(fields: [participantId], references: [id], onDelete: Restrict)

  loggedByStaffId String
  loggedByStaff   Staff    @relation(fields: [loggedByStaffId], references: [id], onDelete: Restrict)

  timestamp       DateTime // when the restraint occurred

  type            RestrictivePracticeType // CHEMICAL|PHYSICAL|MECHANICAL|ENVIRONMENTAL
  reason          String   // justification/reason for restraint
  durationMin     Int?     // duration in minutes (optional)

  // CRITICAL: Link to Behaviour Support Plan
  // NULL if no BSP on record — this is a compliance violation
  bspVersionId    String?
  behaviourSupportPlan BehaviourSupportPlan? @relation(fields: [bspVersionId], references: [id], onDelete: SetNull)

  incidentId      String?  // link to incident if applicable
  relatedMarLogId String?  // link to MAR log if applicable

  source          String   @default("LIVE")
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([participantId, timestamp])
  @@index([bspVersionId])
  @@index([timestamp])
  @@index([source])
}
```

**Critical:** The `bspVersionId` field must be a **nullable** FK to `BehaviourSupportPlan.id`.
The detector checks for NULL and for timestamp outside the BSP's activeFrom/activeTo window.

### 4. BowelFluidLog (for Silent Dehydration detection)

Tracks fluid intake/output. The detector sums `volumeMl` where `type = 'FLUID_IN'`:

```prisma
model BowelFluidLog {
  id              String   @id @default(uuid())
  participantId   String
  participant     Participant @relation(fields: [participantId], references: [id], onDelete: Restrict)

  loggedByStaffId String
  loggedByStaff   Staff    @relation(fields: [loggedByStaffId], references: [id], onDelete: Restrict)

  timestamp       DateTime

  type            BowelFluidType // BOWEL | FLUID_IN | FLUID_OUT

  // Volume in millilitres (nullable for observations without quantity)
  volumeMl        Int?

  // Bristol scale for bowel content (1-7 scale, optional)
  bristolScale    Int?

  notes           String?  // additional observations

  source          String   @default("LIVE")
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([participantId, timestamp])
  @@index([type, timestamp])
  @@index([source])
}
```

### 5. ShiftNote (for Silent Dehydration detection)

Shift notes logged by staff. The detector checks for `category = 'ESCALATION'` on days with low fluid intake:

```prisma
model ShiftNote {
  id              String   @id @default(uuid())
  participantId   String
  participant     Participant @relation(fields: [participantId], references: [id], onDelete: Restrict)

  authoredByStaffId String
  authoredByStaff Staff   @relation(fields: [authoredByStaffId], references: [id], onDelete: Restrict)

  category        ShiftNoteCategory // ROUTINE | ESCALATION | INCIDENT_FOLLOWUP | CLINICAL_HANDOVER

  note            String   // content of the note

  // Optional back-links to related records
  linkedPersonalCareLogId String?
  linkedIncidentId        String?
  linkedBglLogId          String?
  linkedBowelFluidLogId   String?

  source          String   @default("LIVE")
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([participantId, createdAt])
  @@index([category, createdAt])
  @@index([source])
}
```

---

## Required Relation Updates on Existing Models

### Participant

Add these relations to the existing `Participant` model:

```prisma
model Participant {
  // ... existing fields ...

  // NEW relations:
  sleepSettlingLogs      SleepSettlingLog[]
  behaviourSupportPlans  BehaviourSupportPlan[]
  restrictivePracticeEvents RestrictivePracticeEvent[]
  bowelFluidLogs         BowelFluidLog[]
  shiftNotes             ShiftNote[]
}
```

### Staff

Add these relations to the existing `Staff` model:

```prisma
model Staff {
  // ... existing fields ...

  // NEW relations:
  loggedSleepSettlingLogs   SleepSettlingLog[]        @relation("SleepSettlingLogsLoggedBy")
  loggedRestrictivePractices RestrictivePracticeEvent[] @relation("RestrictivePracticesLoggedBy")
  loggedBowelFluidLogs      BowelFluidLog[]            @relation("BowelFluidLogsLoggedBy")
  authoredShiftNotes        ShiftNote[]                @relation("ShiftNotesAuthoredBy")
}
```

**Note:** Rename the existing generic `relation` fields as needed to avoid conflicts if the
actual relation names differ.

---

## Migration Instructions

1. Add the three enums to the schema
2. Add the five new models in the order listed above (they have FK dependencies)
3. Update `Participant` and `Staff` models with back-relations
4. Run `npx prisma migrate dev --name add_blue_team_anomaly_models`
5. Confirm migration runs without errors: `npx prisma validate`
6. Regenerate Prisma Client: `npx prisma generate`
7. Trigger TypeScript check: `npm run build`

---

## Verification Checklist (Codex)

- [ ] All 3 enums defined in schema
- [ ] All 5 models defined with all required fields
- [ ] `RestrictivePracticeEvent.bspVersionId` is a nullable FK to `BehaviourSupportPlan.id`
- [ ] All new FK fields (participantId, loggedByStaffId, etc.) exist and link correctly
- [ ] `source` field on all new models defaults to "LIVE"
- [ ] Indexes are present for query performance
- [ ] Back-relations added to Participant and Staff
- [ ] Migration file generated and applied successfully
- [ ] `npx prisma validate` returns "The schema at ... is valid"
- [ ] `npx prisma generate` completes without errors
- [ ] `npm run build` compiles with no TypeScript errors in `detect-anomalies/route.ts`

---

## Codex → Claude Handoff

Once the schema changes land and migrations apply, the Blue Team Anomaly Detector route will:
1. Compile successfully
2. Be ready for integration testing with synthetic QA data
3. Support dynamic compliance breach detection across NDIS care domains

The implementation at `src/app/api/qa/detect-anomalies/route.ts` is feature-complete and waiting.
