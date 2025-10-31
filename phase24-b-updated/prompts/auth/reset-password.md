# V0 Prompt – Auth › Reset Password (Query Token, UI Refresh)

**Keep exactly**:
- Read `?token=`
- Two fields: new password + confirm, min length 8, match
- API `POST /users/reset-password` with `{ token, new_password, confirm_password }`
- Success → auto‑redirect to login

**Task**: Refine UI, add optional strength meter (pure UI), preserve logic.  
Deliver `page.tsx` with same behavior.
