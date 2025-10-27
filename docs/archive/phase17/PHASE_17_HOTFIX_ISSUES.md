# Phase 17: Facelift2 Hotfix Issues

**Date**: October 24, 2025  
**Status**: 🔴 **2 ISSUES FOUND**

---

## 🚨 **Issue #1: Sign In Button Doesn't Work**

**Location**: Home page header (`frontend/src/app/page.tsx` line 50)

**Problem**: The "Sign in" button has no `href` or click handler, so clicking it does nothing.

**Current Code**:
```typescript
<Button variant="ghost" className="hidden sm:inline-flex">Sign in</Button>
```

**Expected Behavior**: Should navigate to `/login` page

**Fix**:
```typescript
<Button variant="ghost" className="hidden sm:inline-flex" asChild>
  <a href="/login">Sign in</a>
</Button>
```

**Pattern**: Use the same `asChild` + `<a>` pattern as the "Get Started" button below it (lines 51-55).

---

## 🚨 **Issue #2: Partners API Route Returns 404**

**Location**: `/api/partners/selectlist`

**Problem**: The route exists locally but returns 404 in production.

**Error**:
```
GET https://deedpro-frontend-new.vercel.app/api/partners/selectlist 404 (Not Found)
```

**File Exists**: ✅ `frontend/src/app/api/partners/selectlist/route.ts`

**Possible Root Causes**:

1. **Edge Runtime Issue** (Most Likely):
   ```typescript
   export const runtime = 'edge';
   ```
   Edge runtime might have compatibility issues with the `DIAG` import or deployment.

2. **DIAG Import Issue**:
   ```typescript
   import { DIAG } from '@/lib/diag/log';
   ```
   This import might fail in production Edge runtime, causing the entire route to not register.

3. **Environment Variable Missing**:
   ```typescript
   const API_BASE = process.env.BACKEND_BASE_URL || process.env.NEXT_PUBLIC_BACKEND_BASE_URL || '';
   ```
   If `API_BASE` is empty, the proxy will fail.

**Quick Fix #1 (Safest)**: Remove DIAG import dependency:
```typescript
// frontend/src/app/api/partners/selectlist/route.ts
import { NextRequest } from 'next/server';

export const runtime = 'edge';

const API_BASE = process.env.BACKEND_BASE_URL || process.env.NEXT_PUBLIC_BACKEND_BASE_URL || 'https://deedpro-main-api.onrender.com';

export async function GET(req: NextRequest) {
  try {
    const auth = req.headers.get('authorization') || req.headers.get('Authorization') || '';
    const org = req.headers.get('x-organization-id') || req.headers.get('X-Organization-Id') || '';
    const url = `${API_BASE}/api/partners/selectlist`;
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': auth || '',
        'x-organization-id': org || '',
        'accept': 'application/json'
      } as any,
      cache: 'no-store',
    });
    const text = await res.text();
    const ct = res.headers.get('content-type') || 'application/json';
    
    // Direct console.log instead of DIAG
    console.log('[partners/selectlist] proxy', { status: res.status, len: text?.length });
    
    return new Response(text, { status: res.status, headers: { 'content-type': ct } });
  } catch (e: any) {
    console.error('[partners/selectlist] proxy error:', e);
    return new Response(JSON.stringify({ detail: 'Proxy error', error: String(e) }), { status: 500 });
  }
}
```

**Quick Fix #2 (Alternative)**: Switch to Node.js runtime:
```typescript
export const runtime = 'nodejs'; // Changed from 'edge'
```

---

## 🛠️ **Recommended Actions**

### **For Issue #1 (Sign In Button)** - 5 minutes

```bash
# Edit frontend/src/app/page.tsx line 50
# Change from:
#   <Button variant="ghost" className="hidden sm:inline-flex">Sign in</Button>
# To:
#   <Button variant="ghost" className="hidden sm:inline-flex" asChild>
#     <a href="/login">Sign in</a>
#   </Button>

git add frontend/src/app/page.tsx
git commit -m "fix(landing): Add href to Sign in button"
git push origin main
```

### **For Issue #2 (Partners API)** - 10 minutes

**Option A**: Remove DIAG dependency (safest):
```bash
# Edit frontend/src/app/api/partners/selectlist/route.ts
# - Remove: import { DIAG } from '@/lib/diag/log';
# - Remove: if (DIAG) console.log(...)
# - Add: console.log(...) directly
# - Add fallback URL: 'https://deedpro-main-api.onrender.com'

git add frontend/src/app/api/partners/selectlist/route.ts
git commit -m "fix(api): Remove DIAG import from partners proxy for edge runtime compatibility"
git push origin main
```

**Option B**: Switch to Node.js runtime:
```bash
# Edit frontend/src/app/api/partners/selectlist/route.ts
# Change: export const runtime = 'nodejs';

git add frontend/src/app/api/partners/selectlist/route.ts
git commit -m "fix(api): Switch partners proxy to nodejs runtime"
git push origin main
```

---

## 📋 **Testing After Fix**

### **Test #1: Sign In Button**
1. Navigate to https://deedpro-frontend-new.vercel.app/
2. Click "Sign in" button in header
3. **Expected**: Navigates to `/login` page
4. **Current**: Button does nothing (stays on `/`)

### **Test #2: Partners API**
1. Navigate to https://deedpro-frontend-new.vercel.app/create-deed/grant-deed
2. Open Console (F12)
3. Go to "Requested By" field
4. **Expected**: Dropdown shows partners list
5. **Current**: Error 404 in console

---

## 🔍 **Verification Needed**

Before deploying fix for Issue #2, check:

1. **Vercel Build Logs**: Look for errors about `api/partners/selectlist` or `@/lib/diag/log`
2. **Vercel Function Logs**: Check real-time logs when accessing the route
3. **Environment Variables**: Confirm `BACKEND_BASE_URL` is set in Vercel dashboard

---

## 🎯 **Priority**

**Issue #1 (Sign In)**: 🔴 **HIGH** - Affects user navigation, simple fix  
**Issue #2 (Partners API)**: 🔴 **HIGH** - Affects wizard functionality

---

## 💡 **Root Cause Analysis**

### **Issue #1**: 
- Facelift2 template had incomplete button
- Copy/paste error - "Get Started" button works correctly
- Simple oversight in Phase 17 deployment

### **Issue #2**:
- Edge runtime + DIAG import incompatibility
- OR missing environment variable in Vercel
- Worked locally because `.env.local` has `NEXT_PUBLIC_DIAG`
- Didn't work in production because:
  - Edge runtime has limited Node.js API access
  - `process.env` behavior is different in Edge
  - Import might fail silently, causing route to not register

---

## ✅ **Next Steps**

1. **Apply fixes** for both issues
2. **Commit and deploy**
3. **Test in production** after Vercel deployment
4. **Monitor** for any other issues from Phase 17 facelift

---

**Both issues are simple to fix and can be deployed together in one commit.**




