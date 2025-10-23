# Backend Hotfix V1 - Deployment Plan

## Date: October 23, 2025 at 01:45 AM UTC

---

## 🎯 Mission

Fix the backend persistence issue where deeds are being saved with **empty** `grantor_name`, `grantee_name`, and `legal_description` fields despite the frontend sending complete data.

---

## 📊 Root Cause Confirmed

**Browser Automation Testing Results**:
- ✅ Frontend: Collecting ALL data correctly
- ✅ finalizeDeed: Creating complete backend payload
- ✅ API Call: POST `/api/deeds/create` returns 200 OK with Deed ID
- ❌ Database: Deed record has EMPTY critical fields
- ❌ Preview: Fails with "Validation failed: Grantor information is required..."

**Conclusion**: The issue is in the backend request parsing or database save logic.

---

## 🔧 Solution: rescue-patch-6-a (Adapted)

The `rescue-patch-6-a` provides a comprehensive fix for **both** the frontend proxy and backend validation. However, our backend uses a different structure, so we need to adapt it:

### Original Patch Structure:
- `backend/routers/deeds.py` - Separate router file
- `backend/services/deeds.py` - Service layer with SQLAlchemy
- `backend/schemas/deeds.py` - Pydantic schemas

### Our Current Structure:
- `backend/main.py` - All routes in one file
- `backend/database.py` - Database functions with psycopg2
- Pydantic models defined in `backend/main.py`

---

## 📝 Changes to Apply

### 1. Frontend Proxy Fix (Apply As-Is)

**File**: `frontend/src/app/api/deeds/create/route.ts`

**Issue**: The proxy might be consuming the request body incorrectly, preventing the backend from receiving the JSON payload.

**Fix**:
- Read `await req.json()` ONCE
- Forward as `JSON.stringify(payload)` with proper headers
- Add `x-proxy: 'frontend-next'` header for tracing

**Status**: ✅ Can apply directly from patch

---

### 2. Backend Schema Enhancement (Adapt to main.py)

**File**: `backend/main.py` (Update existing `DeedCreate` class)

**Issue**: Current Pydantic model has all fields as `Optional[str]`, allowing empty strings to pass validation.

**Current Code** (line 332-342):
```python
class DeedCreate(BaseModel):
    deed_type: str
    property_address: Optional[str] = None
    apn: Optional[str] = None
    county: Optional[str] = None
    legal_description: Optional[str] = None
    owner_type: Optional[str] = None
    sales_price: Optional[float] = None
    grantor_name: Optional[str] = None
    grantee_name: Optional[str] = None
    vesting: Optional[str] = None
```

**Fixed Code**:
```python
from pydantic import BaseModel, Field

class DeedCreate(BaseModel):
    deed_type: str = Field(..., description="Deed type, e.g., 'grant-deed'")
    property_address: Optional[str] = Field(default=None)
    apn: Optional[str] = Field(default=None)
    county: Optional[str] = Field(default=None)
    legal_description: str = Field(..., min_length=1)  # REQUIRED, non-empty
    owner_type: Optional[str] = Field(default=None)
    sales_price: Optional[float] = Field(default=None)
    grantor_name: str = Field(..., min_length=1)  # REQUIRED, non-empty
    grantee_name: str = Field(..., min_length=1)  # REQUIRED, non-empty
    vesting: Optional[str] = Field(default=None)
    source: Optional[str] = Field(default=None)  # NEW: track data source
    
    class Config:
        extra = "ignore"  # Ignore extra fields from frontend
```

**Status**: ⚠️ Needs adaptation to our structure

---

### 3. Backend Endpoint Enhancement (Adapt to main.py)

**File**: `backend/main.py` (Update `create_deed_endpoint` function, line 1446-1458)

**Issue**: The endpoint might not be properly validating the parsed Pydantic model before passing to database.

**Current Code** (line 1446-1458):
```python
@app.post("/deeds")
def create_deed_endpoint(deed: DeedCreate, user_id: int = Depends(get_current_user_id)):
    """Create a new deed - Auth hardening: remove hardcoded user id"""
    deed_data = deed.dict()
    
    # Debug logging for Phase 11
    print(f"[Phase 11] Creating deed for user_id={user_id}: {deed_data}")
    
    new_deed = create_deed(user_id, deed_data)
    
    if not new_deed:
        raise HTTPException(status_code=500, detail="Failed to create deed - check backend logs")
    
    # ... notification logic ...
```

**Fixed Code**:
```python
@app.post("/deeds")
def create_deed_endpoint(deed: DeedCreate, user_id: int = Depends(get_current_user_id)):
    """Create a new deed with validation"""
    
    # Convert Pydantic model to dict
    deed_data = deed.dict()
    
    # DEFENSIVE: Strip whitespace and validate non-empty for critical fields
    for field in ("grantor_name", "grantee_name", "legal_description"):
        value = (deed_data.get(field) or "").strip()
        deed_data[field] = value
        if not value:
            raise HTTPException(
                status_code=422, 
                detail=f"Validation failed: {field.replace('_', ' ').title()} is required and cannot be empty"
            )
    
    # Enhanced logging
    print(f"[Backend /deeds] Creating deed for user_id={user_id}")
    print(f"[Backend /deeds] deed_type={deed_data.get('deed_type')}")
    print(f"[Backend /deeds] grantor_name={deed_data.get('grantor_name')}")
    print(f"[Backend /deeds] grantee_name={deed_data.get('grantee_name')}")
    print(f"[Backend /deeds] legal_description={deed_data.get('legal_description')[:50]}...")
    
    new_deed = create_deed(user_id, deed_data)
    
    if not new_deed:
        raise HTTPException(status_code=500, detail="Failed to create deed - check backend logs")
    
    # ... rest of function ...
```

**Status**: ⚠️ Needs adaptation to our structure

---

### 4. Database Function Enhancement (Optional)

**File**: `backend/database.py` (Update `create_deed` function, line 198-235)

**Issue**: The function uses `.get()` which returns `None` for missing keys, and doesn't validate non-empty values.

**Current Code** (line 210-228):
```python
cursor.execute("""
    INSERT INTO deeds (user_id, deed_type, property_address, apn, county, 
                     legal_description, owner_type, sales_price, 
                     grantor_name, grantee_name, vesting)
    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
    RETURNING *
""", (
    user_id, 
    deed_data.get('deed_type'),
    deed_data.get('property_address') or 'Unknown',
    deed_data.get('apn'),
    deed_data.get('county'),
    deed_data.get('legal_description'),
    deed_data.get('owner_type'),
    deed_data.get('sales_price'),
    deed_data.get('grantor_name'),
    deed_data.get('grantee_name'),
    deed_data.get('vesting')
))
```

**Enhanced Code** (optional, since endpoint now validates):
```python
# Defensive validation before DB insert
for field in ("grantor_name", "grantee_name", "legal_description"):
    if not deed_data.get(field):
        print(f"[Phase 11] ERROR: Missing {field} in deed_data!")
        return None

cursor.execute("""
    INSERT INTO deeds (user_id, deed_type, property_address, apn, county, 
                     legal_description, owner_type, sales_price, 
                     grantor_name, grantee_name, vesting, source)
    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
    RETURNING *
""", (
    user_id, 
    deed_data.get('deed_type'),
    deed_data.get('property_address') or 'Unknown',
    deed_data.get('apn'),
    deed_data.get('county'),
    deed_data.get('legal_description'),
    deed_data.get('owner_type'),
    deed_data.get('sales_price'),
    deed_data.get('grantor_name'),
    deed_data.get('grantee_name'),
    deed_data.get('vesting'),
    deed_data.get('source')  # NEW: track data source (modern-canonical, classic, etc.)
))
```

**Status**: ⚠️ Optional (validation at endpoint level is sufficient)

---

## 🚀 Deployment Steps

### Phase 1: Preparation
1. ✅ Review rescue-patch-6-a files
2. ✅ Document adaptation plan
3. ⏳ Create feature branch

### Phase 2: Apply Changes
4. ⏳ Update frontend proxy (`frontend/src/app/api/deeds/create/route.ts`)
5. ⏳ Update Pydantic model (`backend/main.py` - `DeedCreate` class)
6. ⏳ Update endpoint validation (`backend/main.py` - `create_deed_endpoint`)
7. ⏳ (Optional) Update database function (`backend/database.py` - `create_deed`)

### Phase 3: Build & Test
8. ⏳ Build frontend (`npm run build`)
9. ⏳ Run backend linting/type checks
10. ⏳ Test locally if possible
11. ⏳ Commit changes
12. ⏳ Push to GitHub

### Phase 4: Deploy
13. ⏳ Backend: Deploy to Render (or restart server)
14. ⏳ Frontend: Deploy via Vercel (automatic on push)
15. ⏳ Monitor deployment logs

### Phase 5: Verification
16. ⏳ Test Modern wizard end-to-end
17. ⏳ Verify console logs show complete payload
18. ⏳ Verify backend logs show received values
19. ⏳ Verify database has all fields populated
20. ⏳ Verify PDF generates successfully

---

## 🎯 Success Criteria

The fix will be considered successful when:

1. ✅ Frontend proxy forwards complete JSON body
2. ✅ Backend Pydantic validation rejects empty required fields
3. ✅ Backend endpoint validates and logs received values
4. ✅ Database receives and saves all critical fields
5. ✅ Preview page loads without 400 errors
6. ✅ PDF generates with correct grantor, grantee, and legal description
7. ✅ Modern wizard works for all 5 deed types

---

## 🔄 Rollback Plan

If issues arise:

**Frontend**:
```bash
git checkout main -- frontend/src/app/api/deeds/create/route.ts
cd frontend && npm run build
git commit -m "rollback: frontend proxy"
git push
```

**Backend**:
```bash
git checkout main -- backend/main.py backend/database.py
# Restart backend server
git commit -m "rollback: backend validation"
git push
```

Or full rollback:
```bash
git checkout main
git branch -D fix/backend-hotfix-v1
```

---

## 📊 Estimated Time

- **Preparation**: 5 minutes ✅ DONE
- **Code Changes**: 15-20 minutes ⏳ NEXT
- **Build & Test**: 5-10 minutes
- **Deployment**: 10-15 minutes
- **Verification**: 10-15 minutes
- **TOTAL**: ~45-65 minutes

---

## 🔑 Key Differences from Original Patch

| Aspect | Original Patch | Our Adaptation |
|--------|----------------|----------------|
| Backend Structure | Separate `routers/`, `services/`, `schemas/` | All in `main.py` and `database.py` |
| ORM | SQLAlchemy models | Direct psycopg2 |
| Endpoint Path | `/api/deeds/create` | `/deeds` |
| Schema Location | `backend/schemas/deeds.py` | `backend/main.py` (DeedCreate class) |
| Service Layer | `backend/services/deeds.py` | `backend/database.py` (create_deed function) |

**Advantage**: Our simpler structure means fewer files to modify!

---

## 📝 Next Action

**IMMEDIATE**: Apply the changes to our codebase, starting with the frontend proxy, then the backend validation.

**READY TO PROCEED**: ✅ Yes, all changes documented and understood

