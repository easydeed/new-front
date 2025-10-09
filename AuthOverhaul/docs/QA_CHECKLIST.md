# QA — Auth & DB Hardening

## Critical paths
- [ ] Registration creates user with hashed password; `verified` defaults FALSE
- [ ] Login works; `access_token` issued; token stored consistently
- [ ] Forgot password returns success immediately; email actually sent if configured
- [ ] Reset password enforces strength policy; token cannot be reused
- [ ] (Optional) Email verification required blocks login until verified
- [ ] Admin role recognized as 'admin' after normalization
- [ ] /deeds endpoint uses current user id, not hardcoded 1
- [ ] No call sites refer to localStorage key `'token'` or `'jwt'`

## Security regression checks
- [ ] JWT secret must be set in env; app fails fast without it
- [ ] Login limiter (if enabled) throttles after 5/min/IP
- [ ] Password reset tokens expire after 1 hour
- [ ] Refresh token endpoint disabled by default
