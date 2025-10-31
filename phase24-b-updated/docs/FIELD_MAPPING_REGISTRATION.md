# Frontend → Backend Field Mapping (Registration)

**Exact names required by backend:**
```json
{
  "email": "string",
  "password": "string",
  "confirm_password": "string",
  "full_name": "string",
  "role": "string",
  "company_name": "string|null",
  "company_type": "string|null",
  "phone": "string|null",
  "state": "string",
  "agree_terms": true,
  "subscribe": false
}
```
Do **not** send camelCase keys like `confirmPassword` or `fullName`. Use snake_case as above.
