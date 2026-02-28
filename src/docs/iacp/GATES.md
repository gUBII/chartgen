# IACP Quality Gates

## Gate 1 - Build

- `npm run build` passes for current scope.

## Gate 2 - Lint Delta

- No new lint errors introduced by scope changes.

## Gate 3 - Verification

- Independent verifier confirms critical assertions.

## Gate 4 - Deploy Truth (when deployment is part of scope)

- Expected commit deployed.
- Netlify state is `ready`.

## Gate 5 - Schema Safety (schema tasks only)

- `npm run schema:check:collision` reviewed.
- Overwrite/append-as-is only allowed at:
  - `cp_safe_now=yes`
  - `collisions=0`

## Release Decision

All required gates for the scope must pass before `SHIP_IT`.
