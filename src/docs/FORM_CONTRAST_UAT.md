# Form Contrast UAT Protocol

## Objective
Ensure that all form controls (select, input, buttons) maintain futuristic visual style without sacrificing readability or accessibility.

## Verification Gates

### 1. Automated Contrast Check
Run the provided UAT script to verify that core CSS variables meet WCAG 2.1 AA standards (4.5:1 ratio).

```bash
node scripts/check-form-controls-contrast.mjs
```

**Target Assertion:** Ratio >= 4.5:1.

### 2. Manual Visual Audit
Navigate to the following routes and confirm form accessibility:
- `/entry`: Verify participant/staff dropdown readability.
- `/restoration`: Verify batch generation form fields.
- `/mar`: Verify medication logs inputs.
- `/audit-explorer`: Verify filter controls.
- `/admin`: Verify CRUD form fields.

### 3. State Verification
Check contrast during interaction:
- **Focus:** Does the focus ring provide clear indication?
- **Disabled:** Are disabled states clearly distinguishable?
- **Dropdown Open:** Are `option` and `optgroup` elements readable on all browser engines (especially those that might default to system white backgrounds)?

## Current Baseline (2026-03-01)
- Background (`--bg-base`): `#040818`
- Text (`--text-main`): `#eff6ff`
- Calculated Ratio: **18.49:1** (PASS)
