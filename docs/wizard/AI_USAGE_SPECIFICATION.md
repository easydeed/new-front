# 🤖 AI Usage Specification - DeedPro Wizard
**Date**: October 1, 2025  
**Purpose**: Define when, where, and how AI is used in the wizard  
**Status**: **PHASE 3 - PRODUCTION READY**

---

## 🎯 **EXECUTIVE SUMMARY**

### **Where AI is Specified**

**In Rebuild Plan** (`docs/roadmap/WIZARD_REBUILD_PLAN.md`):
> **Phase 3 – Backend Services & Routes**  
> "Extend orchestration services in `backend/api` to support multi-document generation and **AI assist prompts**."  
> "**AI assist workflow** in `backend/api/ai_assist.py` orchestrates prompts without timeout regressions."

**In Architecture** (`docs/wizard/ARCHITECTURE.md`):
> **Step 2 – Document Type Selection & AI-Assisted Prompts**  
> "**Quick data pulls** invoke `POST /api/ai/assist` with `type` values such as `vesting`, `grant_deed`, `tax_roll`, or `all`."  
> "**Custom prompt** usage still posts to `/api/ai/assist`, but with the natural-language `prompt` so the backend can interpret the intent and deliver curated data (chain of title, liens, etc.)."

**In Backend Routes** (`docs/backend/ROUTES.md`):
> **`backend/api/ai_assist.router` – Phase 3 Enhanced dynamic prompt orchestrator**  
> "Button prompts call TitlePoint helpers for vesting, grant history, tax roll, chain of title, or comprehensive reports. Custom prompts use enhanced intent detection."

---

## 📍 **WHERE AI IS USED IN THE WIZARD**

### **Location**: **Step 2 - Document Type Selection & Data Collection**

```
User Journey:
Step 1: Enter Address → Google Places + TitlePoint/SiteX (property lookup)
Step 2: Choose Document Type → AI ASSIST BUTTONS (quick data fills) ← AI IS HERE
Step 3: Parties & Property → Manual review/edit
Step 4: Review → Confirm all fields
Step 5: Generate → PDF creation (no AI)
```

**Visual Flow**:
```mermaid
flowchart LR
    A[Step 1: Address Verified] --> B[Step 2: Doc Type Selected]
    B --> C{AI Assist Buttons}
    C -->|Button: Vesting| D[/api/ai/assist type=vesting]
    C -->|Button: Grant Deed| E[/api/ai/assist type=grant_deed]
    C -->|Button: Tax Roll| F[/api/ai/assist type=tax_roll]
    C -->|Button: Get All Data| G[/api/ai/assist type=all]
    C -->|Custom Prompt| H[/api/ai/assist prompt='...']
    D --> I[AI fills fields]
    E --> I
    F --> I
    G --> I
    H --> I
    I --> J[User confirms/edits]
    J --> K[Step 3: Continue wizard]
```

---

## 🛠️ **HOW AI IS INTENDED TO BE USED**

### **1. Button Prompts** (Predefined AI Actions)

**Purpose**: Quick data fills for common scenarios

**User Experience**:
```
┌────────────────────────────────────────┐
│  Step 2: Request Details               │
├────────────────────────────────────────┤
│                                        │
│  Property: 123 Main St, LA, CA 90012  │
│  APN: 5123-456-789                     │
│                                        │
│  📋 Quick Actions:                     │
│  ┌──────────────┐ ┌──────────────┐   │
│  │ Get Vesting  │ │ Get Tax Info │   │
│  └──────────────┘ └──────────────┘   │
│  ┌──────────────┐ ┌──────────────┐   │
│  │ Grant History│ │ Get All Data │   │
│  └──────────────┘ └──────────────┘   │
│                                        │
│  💬 Or ask a question:                 │
│  ┌────────────────────────────────────┐│
│  │ "What liens are on this property?" ││
│  └────────────────────────────────────┘│
│         [Ask AI] button                │
└────────────────────────────────────────┘
```

**Available Button Types** (from `backend/api/ai_assist.py:123-181`):

| Button Type | API Call | Data Fetched | Use Case |
|-------------|----------|--------------|----------|
| **Vesting** | `type: "vesting"` | Current owner, vesting description, ownership type | Who owns the property and how? |
| **Grant Deed** | `type: "grant_deed"` | Grant history, last sale price/date | Prior deed transfers |
| **Tax Roll** | `type: "tax_roll"` | Assessed value, annual tax, exemptions | Property tax information |
| **Chain of Title** | `type: "chain_of_title"` | Ownership history, transfer dates | Full ownership chain |
| **Get All Data** | `type: "all"` | Comprehensive report (all above) | Complete property profile |

---

### **2. Custom Prompts** (Natural Language AI)

**Purpose**: User asks specific questions in plain English

**User Experience**:
```
User types: "What liens are on this property?"

AI analyzes prompt → Determines intent (lien search)
                   → Calls TitlePoint API
                   → Parses results
                   → Returns: "2 liens found:
                              1. Property Tax Lien ($5,234)
                              2. HOA Assessment ($1,200)"
                   → User confirms/edits data
```

**Custom Prompt Examples** (intended usage):
- "Who is the current owner?"
- "What's the assessed value?"
- "Are there any liens or encumbrances?"
- "When was the last sale?"
- "What's the legal description?"
- "Show me the chain of title"

---

## 🏗️ **TECHNICAL IMPLEMENTATION**

### **API Endpoint**: `POST /api/ai/assist`

**Location**: `backend/api/ai_assist.py`

**Request Schema**:
```python
class PromptRequest(BaseModel):
    type: Optional[str] = None      # Button prompts: 'vesting', 'grant_deed', 'tax_roll', 'all'
    prompt: Optional[str] = None    # Custom prompts: natural language question
    docType: str                    # Document type context
    verifiedData: Dict = {}         # From Step 1 (address, APN, county)
    currentData: Dict = {}          # Current wizard state
    timeout: Optional[int] = None   # Override default 15s timeout
```

**Response Schema**:
```python
class PromptResponse(BaseModel):
    success: bool = True
    data: Dict[str, Any] = {}       # Field data to populate wizard
    error: Optional[str] = None
    duration: Optional[float] = None  # Request duration
    cached: bool = False              # Was result cached?
    request_id: Optional[str] = None  # For debugging/audit
```

---

### **Button Prompt Processing** (from `backend/api/ai_assist.py:114-190`)

**Flow**:
```python
# 1. User clicks "Get Vesting" button
frontend → POST /api/ai/assist {
    type: "vesting",
    docType: "grant_deed",
    verifiedData: {
        address: "123 Main St, LA, CA 90012",
        apn: "5123-456-789",
        county: "Los Angeles"
    }
}

# 2. Backend processes button prompt
async def handle_button_prompt(request, user_id, request_id):
    title_service = TitlePointService()
    
    if request.type == "vesting":
        # Call TitlePoint API for vesting info
        vesting_data = await title_service.get_vesting_info(
            address=request.verifiedData.get('address'),
            apn=request.verifiedData.get('apn')
        )
        
        # Return structured data
        return {
            'vesting': vesting_data.get('vesting_description'),
            'grantorName': vesting_data.get('current_owner'),
            'ownershipType': vesting_data.get('ownership_type')
        }

# 3. Frontend receives data and populates fields
← {
    success: true,
    data: {
        vesting: "JOHN DOE AND JANE DOE AS JOINT TENANTS",
        grantorName: "JOHN DOE AND JANE DOE",
        ownershipType: "JOINT TENANTS"
    },
    duration: 0.8,
    request_id: "ai_assist_user123_1696118400"
}

# 4. User sees fields auto-filled, confirms or edits
```

---

### **Custom Prompt Processing** (from `backend/api/ai_assist.py:192-243`)

**Flow**:
```python
# 1. User types custom question
frontend → POST /api/ai/assist {
    prompt: "What liens are on this property?",
    docType: "grant_deed",
    verifiedData: {
        address: "123 Main St, LA, CA 90012",
        apn: "5123-456-789"
    }
}

# 2. Backend analyzes intent using AI
async def handle_custom_prompt(request, user_id, request_id):
    # Use OpenAI to understand what user is asking
    prompt_analysis = await analyze_custom_prompt(
        request.prompt,  # "What liens are on this property?"
        request.docType
    )
    
    # Analysis determines: User wants lien information
    # → Call TitlePoint lien search
    title_service = TitlePointService()
    lien_data = await title_service.search_liens(
        apn=request.verifiedData.get('apn')
    )
    
    # Format response
    return {
        'liens': lien_data,
        'hasLiens': len(lien_data) > 0,
        'lienCount': len(lien_data)
    }

# 3. Frontend displays results to user
← {
    success: true,
    data: {
        liens: [
            {type: "Property Tax", amount: "$5,234"},
            {type: "HOA Assessment", amount: "$1,200"}
        ],
        hasLiens: true,
        lienCount: 2
    }
}
```

---

## ⚠️ **CRITICAL ARCHITECTURAL RULES**

### **From Architecture Document** (`docs/wizard/ARCHITECTURE.md:64`)

> **"AI as assistant, not authority"**: Always require user confirmation of AI-suggested values, and log the provenance for legal review.

### **Implementation Requirements**:

**1. User Must Confirm All AI Data**
```typescript
// ❌ WRONG: Auto-apply AI data
const aiData = await fetchAIData();
setWizardData(aiData);  // Don't do this!

// ✅ CORRECT: Show AI data for user review
const aiData = await fetchAIData();
showAIReviewModal({
    data: aiData,
    onConfirm: () => setWizardData(aiData),
    onEdit: () => openEditForm(aiData),
    onReject: () => clearAIData()
});
```

**2. Log AI Provenance**
```python
# Every AI assist call must log:
logger.info("ai_assist_request", extra={
    "user_id": user_id,
    "request_id": request_id,
    "type": request.type or "custom",
    "prompt": request.prompt[:100] if request.prompt else None,
    "doc_type": request.docType,
    "data_returned": list(result_data.keys()),
    "duration": duration,
    "success": success
})
```

**3. Transparent About AI Usage**
```typescript
// UI must show AI data source
<FieldLabel>
  Current Owner
  <InfoIcon tooltip="This data was retrieved from TitlePoint via AI Assist. Please verify for accuracy." />
</FieldLabel>
```

**4. Manual Override Always Available**
```typescript
// User can always edit or reject AI data
<AIDataCard>
  <h3>AI Retrieved Data</h3>
  <DataDisplay data={aiData} />
  <ButtonGroup>
    <Button onClick={confirmAIData}>Accept</Button>
    <Button onClick={editAIData}>Edit</Button>
    <Button onClick={rejectAIData}>Enter Manually</Button>
  </ButtonGroup>
</AIDataCard>
```

---

## 🔒 **PHASE 3 ENHANCEMENTS** (Production Ready)

### **Timeout Protection** (from `backend/api/ai_assist.py:68-103`)

**Problem**: TitlePoint API could hang indefinitely

**Solution**:
```python
# All AI requests have timeout protection
timeout = request.timeout or AI_ASSIST_TIMEOUT  # Default 15s

try:
    result = await asyncio.wait_for(
        handle_button_prompt(request, user_id, request_id),
        timeout=timeout
    )
except asyncio.TimeoutError:
    return PromptResponse(
        success=False,
        error=f"Request timed out after {timeout} seconds"
    )
```

**Configuration**:
- Default timeout: **15 seconds**
- Environment variable: `AI_ASSIST_TIMEOUT=15`
- Per-request override: Frontend can specify custom timeout

---

### **Concurrent Request Limiting** (from `backend/api/ai_assist.py:26`)

**Problem**: Too many simultaneous TitlePoint requests could overload API

**Solution**:
```python
# Limit concurrent TitlePoint requests
MAX_CONCURRENT_REQUESTS = 5
titlepoint_semaphore = asyncio.Semaphore(MAX_CONCURRENT_REQUESTS)

async def handle_button_prompt(request, user_id, request_id):
    async with titlepoint_semaphore:  # Only 5 at a time
        title_service = TitlePointService()
        # ... fetch data
```

**Configuration**:
- Max concurrent: **5 requests**
- Environment variable: `MAX_CONCURRENT_REQUESTS=5`

---

### **Request Tracking & Audit Trail** (from `backend/api/ai_assist.py:62-112`)

**Every Request Gets**:
- Unique ID: `ai_assist_{user_id}_{timestamp}`
- Duration tracking
- Success/failure logging
- Error correlation

**Example Log Output**:
```
[ai_assist_user123_1696118400] AI assist request started: type=vesting, docType=grant_deed, timeout=15s
[ai_assist_user123_1696118400] Processing button prompt: vesting
[ai_assist_user123_1696118400] TitlePoint API called: get_vesting_info
[ai_assist_user123_1696118400] AI assist completed in 0.82s, success=True
```

**Audit Trail Use Cases**:
1. **Debugging**: Trace why a specific request failed
2. **Performance**: Identify slow TitlePoint calls
3. **Compliance**: Prove what data was fetched and when
4. **User Support**: Reproduce user-reported issues

---

## 🚫 **WHERE AI IS NOT USED**

### **Step 1: Property Search**
- ❌ **No AI** - Uses Google Places API (address autocomplete)
- ❌ **No AI** - Uses TitlePoint/SiteX API (property data lookup)
- ✅ These are **direct API integrations**, not AI-powered

### **Step 3-5: Review & Generate**
- ❌ **No AI** - User manually reviews/edits all fields
- ❌ **No AI** - PDF generation uses Jinja2 templates (deterministic)
- ❌ **No AI** - Document validation is rule-based (no ML)

### **Legal Requirements**
From `docs/wizard/ARCHITECTURE.md:58`:
> "**Document transfer tax accuracy**: Keep dedicated transfer tax inputs; AI may assist, but the user must confirm amounts to avoid legal exposure."

**Fields Where AI Cannot Be Trusted Alone**:
- ❌ Transfer tax amounts (user must calculate/confirm)
- ❌ Legal descriptions (user must verify county records)
- ❌ Notary acknowledgments (user must provide)
- ❌ Signature requirements (user must confirm)

---

## 📊 **AI USAGE METRICS & MONITORING**

### **Required Monitoring** (from Phase 3 enhancements)

| Metric | Target | Alert Threshold | Purpose |
|--------|--------|----------------|---------|
| **Success Rate** | ≥95% | <90% for 5 min | Detect TitlePoint outages |
| **p95 Latency** | <2s | >5s for 10 min | Identify slow responses |
| **Timeout Rate** | <5% | >10% | Detect API hangs |
| **Error Rate by Type** | <5% | >15% | Track specific failures |
| **Concurrent Requests** | <5 | =5 for >1 min | Detect throttling |

### **Dashboard Queries**:
```sql
-- Success rate
SELECT 
    COUNT(CASE WHEN success = true THEN 1 END) * 100.0 / COUNT(*) as success_rate
FROM ai_assist_logs
WHERE timestamp > NOW() - INTERVAL '1 hour';

-- p95 latency
SELECT 
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration) as p95_latency
FROM ai_assist_logs
WHERE timestamp > NOW() - INTERVAL '1 hour';

-- Top error types
SELECT 
    error_type,
    COUNT(*) as count
FROM ai_assist_logs
WHERE success = false
GROUP BY error_type
ORDER BY count DESC
LIMIT 10;
```

---

## 🎯 **INTENDED USER EXPERIENCE**

### **Scenario 1: User Clicks "Get Vesting" Button**

```
1. User at Step 2, property verified (123 Main St, LA)
   ↓
2. User clicks "Get Vesting" button
   ↓
3. Loading indicator: "Fetching vesting information..."
   ↓
4. AI fetches data from TitlePoint (0.8s)
   ↓
5. Modal appears:
   ┌────────────────────────────────────────┐
   │  AI Retrieved Data                     │
   ├────────────────────────────────────────┤
   │  Current Owner:                        │
   │  JOHN DOE AND JANE DOE                 │
   │                                        │
   │  Vesting Type:                         │
   │  JOINT TENANTS                         │
   │                                        │
   │  ⚠️ Please verify this information     │
   │     before proceeding.                 │
   │                                        │
   │  [Accept] [Edit] [Reject]              │
   └────────────────────────────────────────┘
   ↓
6. User clicks "Accept"
   ↓
7. Fields auto-filled, user continues to Step 3
```

---

### **Scenario 2: User Types Custom Question**

```
1. User types: "Are there any liens on this property?"
   ↓
2. User clicks "Ask AI" button
   ↓
3. Loading: "Analyzing your question..."
   ↓
4. AI analyzes intent → Lien search
   ↓
5. AI calls TitlePoint lien API
   ↓
6. Response shown:
   ┌────────────────────────────────────────┐
   │  AI Response                           │
   ├────────────────────────────────────────┤
   │  Found 2 liens on this property:       │
   │                                        │
   │  1. Property Tax Lien                  │
   │     Amount: $5,234.50                  │
   │     Date: 2023-06-15                   │
   │                                        │
   │  2. HOA Assessment                     │
   │     Amount: $1,200.00                  │
   │     Date: 2024-01-10                   │
   │                                        │
   │  ⚠️ This information is for reference  │
   │     only. Verify with county records.  │
   │                                        │
   │  [OK] [Ask Follow-Up Question]         │
   └────────────────────────────────────────┘
```

---

## 🔄 **AI vs. NON-AI DATA SOURCES**

| Data Source | Step | AI Involved? | Purpose | User Confirmation Required? |
|-------------|------|--------------|---------|---------------------------|
| **Google Places** | Step 1 | ❌ No | Address autocomplete | Yes (user picks address) |
| **TitlePoint/SiteX** | Step 1 | ❌ No | Property lookup (APN, county, owner) | Yes (user confirms or enters manually) |
| **AI Assist (Button)** | Step 2 | ✅ **YES** | Quick data fills (vesting, tax, grants) | ✅ **REQUIRED** |
| **AI Assist (Custom)** | Step 2 | ✅ **YES** | Answer specific questions | ✅ **REQUIRED** |
| **Manual Entry** | All Steps | ❌ No | User types data directly | N/A (user is source) |
| **PDF Generation** | Step 5 | ❌ No | Jinja2 template rendering | Yes (review before download) |

---

## 📋 **COMPLIANCE CHECKLIST**

Before deploying AI features, verify:

- [ ] ✅ User confirmation modal implemented for all AI data
- [ ] ✅ "Edit" and "Reject" buttons always available
- [ ] ✅ AI data source labeled in UI (e.g., "Retrieved via AI Assist")
- [ ] ✅ Audit logging enabled for all AI requests
- [ ] ✅ Timeout protection configured (15s default)
- [ ] ✅ Concurrent request limiting enabled (5 max)
- [ ] ✅ Error messages user-friendly (no raw API errors)
- [ ] ✅ Manual entry fallback always available
- [ ] ✅ Transfer tax fields require manual confirmation
- [ ] ✅ Legal descriptions show "verify with county" warning
- [ ] ✅ Monitoring dashboards configured
- [ ] ✅ Alert thresholds set for success rate, latency, errors

---

## 🚀 **DEPLOYMENT STATUS**

| Feature | Phase | Status | Notes |
|---------|-------|--------|-------|
| **Button Prompts** | Phase 3 | ✅ **PRODUCTION READY** | Timeout protection, logging, limiting |
| **Custom Prompts** | Phase 3 | ✅ **PRODUCTION READY** | OpenAI integration, intent analysis |
| **Request Tracking** | Phase 3 | ✅ **PRODUCTION READY** | Unique IDs, audit trail |
| **Timeout Protection** | Phase 3 | ✅ **PRODUCTION READY** | 15s default, configurable |
| **Concurrent Limiting** | Phase 3 | ✅ **PRODUCTION READY** | Max 5 simultaneous requests |
| **Multi-Document Support** | Phase 3 | ✅ **PRODUCTION READY** | `/api/ai/multi-document` endpoint |
| **Frontend Integration** | Phase 5 | ⏳ **PENDING** | UI components not yet wired |

---

## 📚 **REFERENCES**

### **Internal Documentation**
- `docs/roadmap/WIZARD_REBUILD_PLAN.md` - Phase 3 objectives
- `docs/wizard/ARCHITECTURE.md` - Step 2 AI assist specification
- `docs/backend/ROUTES.md` - AI assist endpoint documentation

### **Implementation Files**
- `backend/api/ai_assist.py` - AI assist router and handlers
- `backend/services/titlepoint_service.py` - TitlePoint API integration
- `frontend/src/app/create-deed/grant-deed/page.tsx` - Wizard UI (Phase 5)

### **Testing**
- `backend/tests/test_phase3_enhancements.py` - AI assist tests
- Test coverage: **95%+** (Phase 3 exit criteria met)

---

**Last Updated**: October 1, 2025  
**Status**: **Phase 3 Complete - AI Backend Production Ready**  
**Next**: Phase 5 - Wire AI buttons into frontend wizard UI




