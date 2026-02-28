# IACP Quality Gates

## Gate 0 - Deploy Budget

- Deploy is in scope only when dispatch includes `DEPLOY_APPROVED`.
- Without `DEPLOY_APPROVED`, release output is local-ready only.
- Prefer one batched deployment over multiple micro-deploys.

## Gate 1 - Build

- `npm run build` passes for current scope.

## Gate 2 - Lint Delta

- No new lint errors introduced by scope changes.

## Gate 3 - Verification

- Independent verifier confirms critical assertions.

## Gate 4 - Deploy Truth (when deployment is part of scope)

- Expected commit deployed.
- Netlify state is `ready`.
- Production env values verified as remote (no localhost DB host).

## Gate 5 - Schema Safety (schema tasks only)

- `npm run schema:check:collision` reviewed.
- Overwrite/append-as-is only allowed at:
  - `cp_safe_now=yes`
  - `collisions=0`

## Release Decision

All required gates for the scope must pass before `SHIP_IT`.
