# 🚀 PATCH 5 DEPLOYMENT PLAN - FULL PARTNERS INFRASTRUCTURE

**Date**: October 17, 2025, 11:15 PM  
**Status**: 🔄 IN PROGRESS  
**Estimated Time**: 30-45 minutes

---

## 📋 **DEPLOYMENT CHECKLIST**

### **Phase 1: Backend - Database & Models** ✅
- [ ] 1.1: Copy database migration file
- [ ] 1.2: Copy Partner model (`backend/models/partner.py`)
- [ ] 1.3: Copy Partner schemas (`backend/schemas/partner.py`)
- [ ] 1.4: Copy Partner service (`backend/services/partners.py`)
- [ ] 1.5: Run migration in Render shell

### **Phase 2: Backend - API Routes** ✅
- [ ] 2.1: Copy partners router (`backend/routers/partners.py`)
- [ ] 2.2: Copy admin partners router (`backend/routers/admin_partners.py`)
- [ ] 2.3: Wire routers in `backend/main.py`
- [ ] 2.4: Add dependencies helper if missing
- [ ] 2.5: Test backend deployment

### **Phase 3: Frontend - API Proxy Routes** ✅
- [ ] 3.1: Create `/api/partners/route.ts` (POST - create partner)
- [ ] 3.2: Update existing `/api/partners/selectlist/route.ts` if needed
- [ ] 3.3: Test API proxy

### **Phase 4: Frontend - Re-enable PrefillCombo** ✅
- [ ] 4.1: Uncomment "+ Add" button
- [ ] 4.2: Fix payload format (`name` → `company_name`)
- [ ] 4.3: Add category and role defaults
- [ ] 4.4: Test dropdown functionality

### **Phase 5: Frontend - Optional UI Pages** 📦
- [ ] 5.1: Copy `/app/partners/page.tsx` (user CRUD)
- [ ] 5.2: Copy `/app/admin/partners/page.tsx` (admin panel)
- [ ] 5.3: Copy `PartnerSelect.tsx` component
- [ ] 5.4: Copy `PartnersManager.tsx` component
- [ ] 5.5: Test UI pages

### **Phase 6: Testing & Verification** 🧪
- [ ] 6.1: Create partner via wizard
- [ ] 6.2: Verify database entry
- [ ] 6.3: Verify dropdown shows new partner
- [ ] 6.4: Test admin panel
- [ ] 6.5: Test organization scoping

### **Phase 7: Documentation** 📝
- [ ] 7.1: Update PROJECT_STATUS.md
- [ ] 7.2: Document API endpoints
- [ ] 7.3: Clean up patch folders
- [ ] 7.4: Mark Patch 5 as deployed

---

## 🔧 **IMPLEMENTATION STEPS**

### **Step 1: Backend - Database Migration**

**Prerequisites:**
```sql
-- Check if users have organization_id column
SELECT id, email, organization_id FROM users LIMIT 5;
```

**If organization_id doesn't exist:**
```sql
ALTER TABLE users ADD COLUMN organization_id VARCHAR DEFAULT 'default-org';
UPDATE users SET organization_id = 'default-org' WHERE organization_id IS NULL;
```

**Migration file:**
```bash
# Copy from Patch5
cp Patch5/backend/alembic/versions/2e62f8d7dd65_create_partners_table.py \
   backend/migrations/add_partners_table.py
```

**Run in Render shell:**
```bash
python3 backend/migrations/add_partners_table.py
```

---

### **Step 2: Backend - Models & Services**

**Files to copy:**
1. `backend/models/partner.py`
2. `backend/schemas/partner.py`
3. `backend/services/partners.py`

**Dependencies check:**
- SQLAlchemy models
- Pydantic schemas
- Database connection

---

### **Step 3: Backend - API Routes**

**Route 1: User Partners** (`/partners`)
- GET: List user's partners (org-scoped)
- POST: Create partner (org-scoped)
- PUT: Update partner (must own)
- DELETE: Delete partner (must own)

**Route 2: Admin Partners** (`/admin/partners`)
- GET: List all partners (superuser only)
- PUT: Update any partner (superuser only)

**Wire in `backend/main.py`:**
```python
from routers.partners import router as partners_router
from routers.admin_partners import router as admin_partners_router

app.include_router(partners_router, prefix="/partners", tags=["partners"])
app.include_router(admin_partners_router, prefix="/admin/partners", tags=["admin"])
```

---

### **Step 4: Frontend - API Proxy**

**Create `/api/partners/route.ts`:**
```typescript
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const token = request.headers.get('authorization');
    
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/partners`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': token } : {}),
      },
      body: JSON.stringify(payload),
    });
    
    if (!res.ok) {
      const error = await res.text();
      return NextResponse.json({ error }, { status: res.status });
    }
    
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

---

### **Step 5: Fix PrefillCombo Payload**

**Update `PrefillCombo.tsx`:**
```typescript
const res = await fetch('/api/partners', {
  method: 'POST',
  headers: { 
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}` // Add auth token
  },
  body: JSON.stringify({ 
    company_name: draft,  // FIX: was 'name'
    category: 'other',    // ADD: default category
    role: 'other'         // ADD: default role
  }),
});
```

---

## 🎯 **SUCCESS CRITERIA**

### **Backend:**
- ✅ Migration runs without errors
- ✅ `partners` table exists in database
- ✅ POST `/partners` returns 200 with partner object
- ✅ GET `/partners` returns list of user's partners
- ✅ Organization scoping works (users only see their org's partners)

### **Frontend:**
- ✅ "+ Add" button visible in wizard
- ✅ Clicking "+ Add" creates partner (no 422 error)
- ✅ New partner appears in dropdown on next deed
- ✅ Can type free-form names (still works as before)

### **Integration:**
- ✅ Complete deed with partner → saves to database
- ✅ Partner persists across sessions
- ✅ Multiple users in same org see shared partners
- ✅ Different orgs see different partners

---

## ⚠️ **POTENTIAL ISSUES & SOLUTIONS**

### **Issue 1: Users don't have organization_id**
**Solution:**
```sql
ALTER TABLE users ADD COLUMN organization_id VARCHAR DEFAULT 'default-org';
```

### **Issue 2: Missing dependencies module**
**Solution:**
Create `backend/api/deps.py` with:
```python
def get_db():
    # Your existing database connection logic
    pass

def get_current_user():
    # Your existing auth logic
    pass
```

### **Issue 3: UUID import errors**
**Solution:**
```python
import uuid
from sqlalchemy.dialects.postgresql import UUID
```

### **Issue 4: Frontend auth token missing**
**Solution:**
```typescript
const token = localStorage.getItem('token') || localStorage.getItem('access_token');
```

---

## 📊 **DEPLOYMENT ORDER**

1. **Backend First** (Render)
   - Database migration
   - Models + Schemas + Services
   - API routes
   - Test with Postman/curl

2. **Frontend Second** (Vercel)
   - API proxy routes
   - Fix PrefillCombo payload
   - Re-enable "+ Add" button
   - Test in browser

3. **Optional UI Third**
   - User partners page
   - Admin partners page

---

## 🧪 **TESTING SCRIPT**

```bash
# 1. Test backend directly (after Render deploy)
curl -X POST https://deedpro-main-api.onrender.com/partners \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"company_name":"Test Title Co","category":"title_company","role":"title_officer"}'

# 2. Test via frontend proxy (after Vercel deploy)
# In browser console:
const token = localStorage.getItem('token');
fetch('/api/partners', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    company_name: 'Pacific Coast Title',
    category: 'title_company',
    role: 'title_officer'
  })
}).then(r => r.json()).then(console.log);

# 3. Test in wizard
# - Complete property search
# - Fill grantor
# - In "Requested By" field, type "John's Title"
# - Click "+ Add John's Title"
# - Should see success (no 422 error)
# - Complete deed
# - Start new deed → "John's Title" should appear in dropdown
```

---

## 📝 **ROLLBACK PLAN**

If anything breaks:
1. Recomment "+ Add" button (2 min)
2. Remove partner routes from `main.py` (2 min)
3. Optionally: Drop partners table (5 min)

**Safe:** All changes are additive, existing functionality unchanged.

---

**Status**: 📋 **READY TO START**  
**Next Step**: Begin Phase 1 (Backend - Database & Models)

