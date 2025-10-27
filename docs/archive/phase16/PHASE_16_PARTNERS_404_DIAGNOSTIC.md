# Phase 16: Partners API 404 Error - Diagnostic

**Date**: October 24, 2025  
**Issue**: `/api/partners/selectlist` returns 404 in production  
**Status**: 🔴 **INVESTIGATING**

---

## 🚨 **Reported Issue**

**Error**: `https://deedpro-frontend-new.vercel.app/api/partners/selectlist 404 (Not Found)`

**Context**: 
- File exists locally: ✅ `frontend/src/app/api/partners/selectlist/route.ts`
- File was in commit `52c5aef`: ✅ Verified
- Build succeeded locally: ✅ 40 pages generated
- Hard refresh done: ✅ Confirmed

---

## 🔍 **Possible Root Causes**

### **Hypothesis #1: Edge Runtime Issue**

The route uses `export const runtime = 'edge'`:

```typescript
export const runtime = 'edge'; // switch to 'nodejs' if needed
```

**Problem**: Edge runtime might have deployment issues or the route might not be compatible.

**Test**: Check Vercel deployment logs for errors related to Edge runtime.

---

### **Hypothesis #2: DIAG Import Issue**

The route imports from `@/lib/diag/log`:

```typescript
import { DIAG } from '@/lib/diag/log';
```

**Problem**: If this import fails in production (even though it's only used for logging), it could cause the entire route to fail.

**Evidence**: 
- `DIAG` checks `process.env.NEXT_PUBLIC_DIAG`
- Edge runtime has different `process` behavior
- The import might be breaking the route compilation

---

### **Hypothesis #3: File Not Deployed**

**Problem**: The file might exist in git but not have been deployed to Vercel.

**Check**: 
1. Go to Vercel dashboard
2. Check deployment logs for `52c5aef`
3. Look for any errors about `api/partners/selectlist`

---

### **Hypothesis #4: Path/Routing Issue**

**Problem**: Next.js might not be recognizing the route structure.

**Expected Path**: `frontend/src/app/api/partners/selectlist/route.ts`  
**URL**: `/api/partners/selectlist`

This should work, but check if there are any route conflicts or misconfiguration.

---

## 🛠️ **Quick Fixes to Try**

### **Fix #1: Remove DIAG Import (Safest)**

Change the route to not depend on the DIAG import:

```typescript
// frontend/src/app/api/partners/selectlist/route.ts
import { NextRequest } from 'next/server';

export const runtime = 'edge';

const API_BASE = process.env.BACKEND_BASE_URL || process.env.NEXT_PUBLIC_BACKEND_BASE_URL || '';

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
    
    // Simple console.log instead of DIAG
    console.log('[partners/selectlist] proxy', { status: res.status, len: text?.length });
    
    return new Response(text, { status: res.status, headers: { 'content-type': ct } });
  } catch (e: any) {
    console.error('[partners/selectlist] proxy error:', e);
    return new Response(JSON.stringify({ detail: 'Proxy error', error: String(e) }), { status: 500 });
  }
}
```

**Pros**: Removes potential import issue  
**Cons**: Loses gated diagnostics feature

---

### **Fix #2: Switch to Node.js Runtime**

Change from Edge to Node.js runtime:

```typescript
export const runtime = 'nodejs'; // Changed from 'edge'
```

**Pros**: More stable, better compatibility  
**Cons**: Slightly slower cold starts

---

### **Fix #3: Add Fallback for DIAG**

Make DIAG import optional:

```typescript
let DIAG = false;
try {
  const diagModule = await import('@/lib/diag/log');
  DIAG = diagModule.DIAG;
} catch {
  DIAG = false; // Fallback if import fails
}
```

**Pros**: Graceful degradation  
**Cons**: More complex

---

## 📊 **Vercel Deployment Check**

### **What to Check in Vercel Dashboard**:

1. **Build Logs** (for commit `52c5aef`):
   - Look for errors mentioning `api/partners/selectlist`
   - Look for errors about Edge runtime
   - Look for errors about `@/lib/diag/log`

2. **Function Logs**:
   - Check if the function was created
   - Check for runtime errors

3. **Source**:
   - Verify the file exists in the deployed source
   - Check file path is correct

4. **Environment Variables**:
   - Verify `BACKEND_BASE_URL` or `NEXT_PUBLIC_BACKEND_BASE_URL` is set
   - Without this, the API call will fail

---

## 🔬 **Local vs Production Difference**

| Aspect | Local | Production | Status |
|--------|-------|------------|--------|
| **Build** | ✅ Success | ❓ Unknown | Check Vercel logs |
| **File exists** | ✅ Yes | ❓ Unknown | Check deployment |
| **DIAG import** | ✅ Works | ❓ Unknown | Might fail in Edge |
| **Runtime** | ✅ Works | ❓ Unknown | Edge might have issues |
| **Env vars** | ✅ Set (.env.local) | ❓ Unknown | Check Vercel settings |

---

## 🎯 **Recommended Action**

### **Immediate (5 min)**:

1. **Check Vercel Dashboard**:
   - Go to https://vercel.com/
   - Find the `deedpro-frontend-new` project
   - Check deployment `52c5aef`
   - Look for build errors or warnings

2. **Check Environment Variables**:
   - In Vercel dashboard → Settings → Environment Variables
   - Verify `BACKEND_BASE_URL` is set
   - Value should be: `https://deedpro-main-api.onrender.com`

### **If No Obvious Error (15 min)**:

Apply **Fix #1** (Remove DIAG import):
```bash
# Edit frontend/src/app/api/partners/selectlist/route.ts
# Remove: import { DIAG } from '@/lib/diag/log';
# Remove: if (DIAG) console.log(...)
# Add: console.log(...) directly

git add frontend/src/app/api/partners/selectlist/route.ts
git commit -m "fix: Remove DIAG import from partners proxy (edge runtime compatibility)"
git push origin main
```

### **If That Doesn't Work (20 min)**:

Apply **Fix #2** (Switch to Node.js runtime):
```bash
# Edit frontend/src/app/api/partners/selectlist/route.ts
# Change: export const runtime = 'nodejs';

git add frontend/src/app/api/partners/selectlist/route.ts
git commit -m "fix: Switch partners proxy to nodejs runtime"
git push origin main
```

---

## 📝 **Debug Info Needed**

To diagnose further, I need:

1. **Vercel Build Logs**:
   - Screenshot or copy of build logs for commit `52c5aef`
   - Any errors or warnings about api routes

2. **Vercel Function Logs**:
   - Real-time logs when you try to access `/api/partners/selectlist`
   - Any errors that appear

3. **Network Tab**:
   - Full error details from browser Network tab
   - Request headers
   - Response body (if any)

4. **Environment Variables**:
   - Confirm `BACKEND_BASE_URL` is set in Vercel

---

## 🔄 **Testing Steps**

After any fix is deployed:

1. Hard refresh: `Ctrl+Shift+R`
2. Open Console (F12)
3. Try to load partners:
   - Navigate to Modern Wizard
   - Go to "Requested By" field
   - Check console for logs
4. Check Network tab:
   - Look for `/api/partners/selectlist` request
   - Check status code
   - Check response

---

## 💡 **Why This Might Be Happening**

The most likely cause is **Edge runtime + DIAG import incompatibility**.

Edge runtime in Vercel:
- Has limited Node.js APIs
- Different `process.env` behavior
- Might not support all imports
- Can fail silently if there's an import issue

The `DIAG` constant tries to access `process.env.NEXT_PUBLIC_DIAG`, which might:
- Not be available in Edge runtime at build time
- Cause the entire module to fail
- Result in 404 because the route never registers

---

## 🚦 **Status**

**Current**: 🔴 **Route returns 404 in production**  
**Local**: 🟢 **Works fine**  
**Next**: ⚠️ **Check Vercel logs, apply Fix #1 or #2**

---

**I need to see Vercel build logs to confirm the root cause.**




