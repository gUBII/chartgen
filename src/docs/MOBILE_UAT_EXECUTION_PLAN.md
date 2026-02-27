# Mobile UAT Execution Plan

Last updated: 2026-02-27
Owner: Codex

## 1) Scope Source

This plan executes the mobile UAT findings delivered on 2026-02-27 with focus on:

1. `/kpigen` blank placeholder removal.
2. Header/navigation consistency for guest/full states.
3. Narrow-screen toolbar crowding.
4. Long command/copy readability on mobile.
5. Root typography scaling and touch-target improvements.

## 2) Same-Day Patch Set (Set A)

Status: implemented locally, validated with `npm run build`.

### A. Route credibility

- File: `src/app/kpigen/page.tsx`
- Change: replaced blank placeholder with governance signal MVP content and action links.

### B. Navigation actionability and auth clarity

- File: `src/components/TabNav.tsx`
- Changes:
  - Restricted module chips now route non-full users to `/login`.
  - Restricted chips visibly show `(login required)`.
  - MAR/Mealtime chips show `(preview)` for non-full users.
  - Header controls are mobile-safe (`flex-col` on small screens).
  - Login/Logout controls now meet 44px touch target.

### C. Typography and interaction baseline

- File: `src/app/globals.css`
- Changes:
  - Root scaling: `html { font-size: clamp(15px, 1.55vw, 17px); }`
  - Body readability: `line-height: 1.55`
  - Tab chip touch targets raised (`min-height: 44px`).

### D. Hero and copy quality

- Files:
  - `src/app/page.tsx`
  - `src/app/login/page.tsx`
  - `src/app/mar/page.tsx`
  - `src/app/restoration/page.tsx`
- Changes:
  - Home hero size uses clamp to prevent hierarchy crush.
  - Access-control copy reduced for mobile scan speed.
  - MAR/Mealtime lead copy shortened and action-oriented.

### E. Narrow-screen form and command handling

- Files:
  - `src/app/mar/page.tsx`
  - `src/app/restoration/page.tsx`
  - `src/app/uat/page.tsx`
- Changes:
  - Dense input toolbars now stack safely (`grid-cols-1`, then 2+ at >=430px).
  - Command deck `<pre>` blocks now wrap (`whitespace-pre-wrap break-words`).

## 3) Verification Snapshot

### Local verification

- `npm run build`: PASS
- `npm run lint`: FAIL (pre-existing debt outside this patch lane remains)

### Lint debt context (known, pre-existing)

- `@typescript-eslint/no-explicit-any` in API/service routes.
- React hooks lint rule on `AuthProvider` effect pattern.
- These are tracked separately from mobile UAT remediation.

## 4) Agent Workflow (Brainstormz + Execution)

### Protocol

- Spec: `/Users/moofasa/chartgen/brainstormz.md`
- Shared chat: `/tmp/brainstormz_chat.log`

### Roles

1. Codex: implementation + final decision.
2. Claude: complex review and runtime/mobile validation support.
3. Gemini: contradiction checks and risk-focused verification.

### Current round status

1. Decision: Set A selected.
2. Implemented by Codex.
3. Gemini diff verification returned PASS with residual risk notes.
4. Claude follow-up verification instruction issued and pending.

## 5) Exit Criteria for This Stage

All required:

1. `/kpigen` is no longer blank.
2. Non-full users get clear login-required navigation behavior.
3. No forced horizontal scroll from command strings on 375px.
4. Dense toolbars do not overlap/collapse on narrow devices.
5. Build succeeds.

## 6) Next Stage Queue (after merge)

1. Run live browser UAT on device matrix (375/768/1280) and capture screenshots.
2. Close remaining lint debt lane with explicit policy:
   - either fix errors, or split `lint:report` vs `lint:strict`.
3. Implement KPIgen live metrics wiring (replace static signal cards with API data).
