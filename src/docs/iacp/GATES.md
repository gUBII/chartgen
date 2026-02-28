# IACP Quality Gates (v3)

## Gate Vector

For task `T`, evaluate:

- `g0`: scope/deploy budget gate
- `g1`: build gate
- `g2`: lint delta gate
- `g3`: independent verification gate
- `g4`: deploy truth gate (only if deployment is in scope)
- `g5`: schema safety gate (only for schema tasks)

Each `g_i in {0,1}`.

## Gate Definitions

### g0 - Deploy Budget

- `1` if deploy scope is valid:
  - deployment not requested, or
  - instruction explicitly includes `DEPLOY_APPROVED`
- otherwise `0`

### g1 - Build

- `1` when `npm run build` passes for scope
- otherwise `0`

### g2 - Lint Delta

- `1` when no new lint errors are introduced
- otherwise `0`

### g3 - Independent Verification

- `1` when verifier confirms critical assertions with evidence
- otherwise `0`

### g4 - Deploy Truth (conditional)

- required only when deployment is in scope
- `1` when expected commit is deployed, Netlify state is `ready`, and production DB host is remote
- otherwise `0`

### g5 - Schema Safety (conditional)

- required only for schema tasks
- `1` only when `cp_safe_now=yes` and `collisions=0`
- otherwise `0`

## Lock Formula

Let `R(T)` be required gates for task `T`, and `v(T) in {0,1}` be contradiction flag.

- `PASS(T) = 1 <=> (product over i in R(T) of g_i) = 1 AND v(T)=0`
- `SHIP_IT(T) = 1 <=> PASS(T)=1 AND g0=1`

If either formula is false, status must be `FAIL` or `BLOCKED`.
