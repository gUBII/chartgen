# Frugal Multi-Agent Workflow

Last updated: 2026-03-01
Owner: Codex

## Objective

Reduce paid deploy churn while keeping delivery speed high.

## Operating Mode

- Default mode: `LOCAL-FIRST`.
- Deploy mode: `BATCHED RELEASE`.
- Production deploys are done only when Codex marks `DEPLOY_APPROVED` for a UUID scope.

## Frugal Rules

- Prefer more local commits, fewer deploys.
- Batch related changes into one release candidate instead of micro-deploying every commit.
- Avoid deploys for docs-only updates unless they unblock production operations.
- Run verification locally first; only deploy after all required gates pass.
- No agent should trigger a production deploy without explicit Codex authorization.

## Release Batch Policy

- Minimum release unit: one coherent feature slice, not scattered micro-fixes.
- Typical batch contents:
  - feature/refactor commits
  - one cleanup commit (if needed)
  - optional docs sync commit
- Recommended cadence:
  - accumulate approved local changes
  - run one deployment after gate pass

## Local <-> Netlify Environment Swap

Use this as the standard runbook for all agents.

1. Local dev mode:
   - `.env` points to local services (for example `localhost` Postgres).
   - run local iteration and tests here.
2. Production parity mode (local verification before deploy):
   - `.env.production.local` mirrors Netlify production variables.
   - never commit secrets.
3. Never push `localhost` DB values into Netlify environment variables.
4. Before deploy candidate approval, validate that production env targets remote DB host, not localhost.

## Required Pre-Deploy Local Checks

- `npm run lint:report`
- `npm run build -- --webpack`
- scope-specific verification from IACP gates

## Canonical Protocol Files

- `src/docs/iacp/README.md`
- `src/docs/iacp/PROTOCOL.md`
- `src/docs/iacp/GATES.md`
- `src/docs/iacp/TEMPLATES.md`
