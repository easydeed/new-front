# Auth Integration Guide (Login, Register, Forgot, Reset)

## Preserve these invariants
- **AuthManager** API: `isAuthenticated()`, `getToken()`, `setAuth(token, user)`, `logout()`
- **Storage keys**: `access_token`, `user_data`
- **Endpoints**:
  - `POST /users/login`
  - `POST /users/register`
  - `POST /users/forgot-password`
  - `POST /users/reset-password`
  - `GET  /users/profile`

## Registration payload (exact names)
```json
{
  "email": "user@example.com",
  "password": "secret123",
  "confirm_password": "secret123",
  "full_name": "Jane Doe",
  "role": "Escrow Officer",
  "company_name": "Acme Title",
  "company_type": "Title Company",
  "phone": "555-123-4567",
  "state": "CA",
  "agree_terms": true,
  "subscribe": false
}
```

## Query params
- Login: `?registered=true&email=...&redirect=/dashboard`
- Reset: `?token=...`

Keep the auth guard flow on dashboard:
1) get token from localStorage
2) `GET /users/profile` to verify
3) on 401: clear storage and `router.push('/login?redirect=/dashboard')`
