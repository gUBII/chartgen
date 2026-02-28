# Brainstormz Protocol

## Purpose

`brainstormz` is a shared, structured agent discussion protocol for fast decision-making on UI/UX, architecture, and release tradeoffs.

## Channel

- Shared discussion log: `/tmp/brainstormz_chat.log`
- Control channels:
  - Claude: `/tmp/codex_claude_handshake.log`
  - Gemini (canonical): `/Users/moofasa/chartgen/handoff/gemini_handshake.md`
  - Gemini (legacy mirror): `/tmp/codex_gemini_handshake.log`

## Participants

- `CODEX`: orchestrator and final decision authority
- `CLAUDE`: complex implementation and architecture tradeoffs
- `GEMINI`: independent validation and risk critique

## Message Format

All chat entries in `/tmp/brainstormz_chat.log` use:

```text
[BRAINSTORMZ][ISO8601][ROLE]
Question: <if replying to a prompt, quote it>
Thought: <clear reasoning in 1-4 bullets>
Proposal: <specific action(s)>
Risks: <key risk(s)>
Usage:
- Estimated tokens used:
- Estimated tokens remaining:
- Constraint risk: low|medium|high
```

## Speed Modes

- `FAST`:
  - max 3 thought bullets
  - one proposal only
  - one risk only
  - prefer this mode by default
- `DEEP`:
  - use only for architecture or migration decisions
  - requires Codex approval in prompt

## Round Structure

1. `CODEX` posts prompt and candidate options.
2. `CLAUDE` posts implementation-first answer.
3. `GEMINI` posts validation-first answer.
4. `CODEX` posts decision:
   - selected option
   - rejected options with reason
   - execution plan

## Decision Rules

- prioritize user impact on mobile first
- prioritize low-risk, high-impact fixes first
- no speculative future-state assumptions
- evidence from current code + live behavior only
- no placeholder text in decisions or recommendations
- prioritize smallest change that closes a blocker

## Output Requirement

Every brainstorm round must end with:

- one selected plan
- owners per task
- acceptance criteria
- rollback note (if applicable)

## Working Round — 2026-02-28

### Codex Findings — Orchestrator

- `docs/nextphase.md` was stale and contained already-shipped work in active backlog.
- Local worktree contains shell and UI kit implementations not yet merged.
- Primary active gap is admin dashboard + decomposition + module completion, not phase-E regression.

### Claude Findings — Schedule Resync (2026-02-28)

#### Schedule Truth Table

| Task ID | Description | Status | Evidence |
|---|---|---|---|
| UI-01 | Button, Badge, Panel, SectionHeading, EmptyState | DONE | `src/components/ui/{Button,Badge,Panel,SectionHeading,EmptyState}.tsx` |
| UI-02 | InlineAlert, Toast, ConfirmDialog | DONE | `src/components/ui/{InlineAlert,Toast,ConfirmDialog}.tsx` |
| UI-03 | DataTable, Tabs | DONE | `src/components/ui/{DataTable,Tabs}.tsx` — DataTable a11y patched by Codex |
| UI-04 | TextField, SelectField, DateField, TextArea | DONE | `src/components/ui/{TextField,SelectField,DateField,TextArea}.tsx` |
| SH-01 | SiteHeader extraction | DONE | `src/components/shell/SiteHeader.tsx` |
| SH-02 | PrimaryNav with auth gating | DONE | `src/components/shell/PrimaryNav.tsx` — 9 routes verified |
| SH-03 | SiteFooter | DONE | `src/components/shell/SiteFooter.tsx` — 3-col layout |
| SH-04 | AppLayout composition | DONE | `src/components/shell/AppLayout.tsx` + `layout.tsx` update |
| AD-01 | Admin dashboard MVP | INCOMPLETE | Route does not exist yet — implementing now |
| AD-02 | Admin create/edit forms | INCOMPLETE | Blocked on AD-01 |

#### JS Runtime Diagnostics

1. **React 19 ref-during-render**: CLEAR — all refs accessed in effects/handlers only.
2. **Route/auth edge cases**: CLEAR — all 9 PrimaryNav hrefs verified. restrictedView logic correct.
3. **Keyboard a11y**: CLEAR — Tabs ArrowLeft/Right/Home/End, ConfirmDialog focus trap, Escape-to-close on dropdowns.
4. **State management**: CLEAR — no stale closures. Proper effect cleanup in Toast, ConfirmDialog.
5. **TanStack compatibility**: INFORMATIONAL — incompatible-library lint warning (same as uat/page.tsx, not runtime).

#### Gap Analysis

- **Admin dashboard**: Missing entirely — no `/admin` route, no admin API. Implementing now.
- **Seed coverage**: Only Participant, Staff, and Blue Team QA seeded. Need per-chart-family UAT data.
- **Chart modules**: 3 of 6+ implemented (Sleep, BGL, BowelFluid). Hygiene/Community/Repositioning missing.
- **Landing decomposition**: 414-line monolith at `src/app/page.tsx` — not started.
- **Restoration decomposition**: 940-line monolith at `src/app/restoration/page.tsx` — not started.

### Gemini Findings — Verification Lane

- Pending response (`VER-LANE-RESYNC`).
- Fallback applied by Codex: README now includes Mermaid architecture/data-flow/auth/QA diagrams + verification checklist while awaiting Gemini payload.

### Codex Decision (Current)

- Deprecated production/main items from `nextphase` backlog.
- Kept local-complete items in a review gate state (`LOCAL_DONE_PENDING_REVIEW`).
- Blocked deployment decisions until verifier payloads arrive and local checks pass.
- Root-cause fixed for Gemini channel visibility: handshake rerouted to workspace path `handoff/gemini_handshake.md`.
