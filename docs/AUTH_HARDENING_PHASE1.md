# Authentication Hardening - Phase 1

**Date:** 2026-02-27
**Status:** Implemented
**Backward Compatibility:** ✅ Fully maintained

## Overview

Phase 1 introduces identity-aware authentication while maintaining backward compatibility with the legacy shared-password model. Users can now log in with a username and password, while the original `SITE_PASSWORD` method continues to work.

## Features

### 1. Identity-Based Login (New)

Users can provide a username and password to gain full access with identity tracking:

```bash
POST /api/auth/login
{
  "username": "alice",
  "password": "secure-password",
  "role": "full"
}
```

Success response includes session token with identity marker:

```json
{
  "success": true,
  "identity": "alice"  // included in session payload
}
```

### 2. Legacy Password Fallback (Unchanged)

The original shared-password method remains fully functional:

```bash
POST /api/auth/login
{
  "password": "free",
  "role": "full"
}
```

Success response:

```json
{
  "success": true
}
```

Session token contains no identity marker (backward compatible).

### 3. Guest Access (Unchanged)

Guest access is unmodified:

```bash
POST /api/auth/login
{
  "password": "",
  "role": "guest"
}
```

## Environment Setup

### Option A: Legacy Password Only (Current Default)

```bash
export SITE_PASSWORD="free"
```

Users log in without a username.

### Option B: Identity-Based Login (New)

Set `FULL_USER_CREDENTIALS` in environment variables using one of these formats:

#### JSON Array Format

```bash
export FULL_USER_CREDENTIALS='[
  {"username": "alice", "password": "alice-secure-123"},
  {"username": "bob", "password": "bob-secure-456"}
]'
```

#### Newline-Delimited Format

```bash
export FULL_USER_CREDENTIALS='alice:alice-secure-123
bob:bob-secure-456'
```

### Option C: Both (Recommended for Migration)

Set both variables to support both authentication methods:

```bash
export SITE_PASSWORD="free"
export FULL_USER_CREDENTIALS='[
  {"username": "alice", "password": "alice-secure-123"}
]'
```

Users can then choose which method to use.

## Migration Notes

### For Operators

1. **Phase 1 is non-breaking:** All existing deployments continue to work
2. **Plan identity adoption:** When ready, add `FULL_USER_CREDENTIALS` to Netlify environment
3. **Gradual transition:** Keep `SITE_PASSWORD` while users migrate to identity login
4. **No database changes:** All auth logic is stateless, session-cookie based

### Session Payload

The session token payload now includes an optional `identity` field:

**Legacy password auth:**
```json
{
  "role": "full",
  "iat": 1709120000,
  "exp": 1709725000
}
```

**Identity-based auth:**
```json
{
  "role": "full",
  "identity": "alice",
  "iat": 1709120000,
  "exp": 1709725000
}
```

Both formats are valid and fully supported.

## Testing

Run the auth hardening test suite:

```bash
node scripts/test-auth-hardening.mjs
```

Test coverage:
- ✅ Legacy SITE_PASSWORD still works
- ✅ Username + password authentication (if configured)
- ✅ Invalid credentials rejection
- ✅ Guest access unchanged
- ✅ Session payload correctness

## API Reference

### POST /api/auth/login

**Request body:**

```json
{
  "username": "optional-username",
  "password": "required-password",
  "role": "full|guest"
}
```

**Success (200):**

```json
{
  "success": true
}
```

Sets `gwc_session` httpOnly cookie with JWT token.

**Invalid credentials (401):**

```json
{
  "error": "Invalid credentials"
}
```

**Invalid role (400):**

```json
{
  "error": "Invalid role"
}
```

### GET /api/auth/check

Returns current session information:

**Success (200):**

```json
{
  "role": "full",
  "identity": "alice"  // optional, only if set during login
}
```

## Next Steps

**Phase 2 (planned):**

- Database-backed user management (replace env-based credentials)
- Role-based access control (RBAC) expansion
- Audit logging for authentication events
- Session management UI

## Security Considerations

- Credentials should never be stored in code or version control
- Use environment variables or secret management systems
- `FULL_USER_CREDENTIALS` should be restricted to production deployments
- Session cookies are httpOnly and secure in production
- Passwords are never logged or transmitted in plaintext in logs

## Troubleshooting

### "Invalid credentials" when username provided

**Cause:** `FULL_USER_CREDENTIALS` is not configured in environment

**Solution:** Set up `FULL_USER_CREDENTIALS` in Netlify environment or `.env`

### Legacy password no longer works

**Cause:** `SITE_PASSWORD` was removed from environment

**Solution:** Re-add `SITE_PASSWORD` to environment variables

### Session missing identity field

**Cause:** User logged in with legacy `SITE_PASSWORD` method

**Solution:** No action needed—both session formats are supported
