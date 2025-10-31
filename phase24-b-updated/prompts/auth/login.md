# V0 Prompt – Auth › Login (UI Refresh, Logic Preserved)

**Tech**: Next.js 15 (client), TypeScript, Tailwind v3  
**Keep exactly**: 
- AuthManager usage: `isAuthenticated()`, `setAuth(token, user)`, `getToken()`, `logout()`
- Query params: `?redirect=` and optional `?registered=true&email=`
- Error handling + loading state + password visibility toggle
- No changes to API path: `POST /users/login`

**Task**: Redesign ONLY the visual structure (forms/cards/buttons/spacing/empty states).  
Use semantic markup, system fonts, no global CSS. Ensure great mobile experience.

**Current page code** (paste your app version or use our sample from the package).

**Deliver**: a **single** `page.tsx` that keeps all logic intact and improves UI.  
