# DeedPro Admin Panel Overhaul
> **Clean Slate Redesign** — Real data, real value

---

## Decisions Made

| Question | Decision | Notes |
|----------|----------|-------|
| API Partners | **Hide for now** | No partners currently, bring back when API launches |
| Stripe Revenue | **Connect to real data** | Stripe key is configured in Render |
| Deed Edit/Regenerate | **No** | Only View PDF and Delete |
| Audit Logging | **Defer** | Not needed for MVP |

---

## Final Tab Structure

```
┌─────────────────────────────────────────────────────────────────┐
│  DeedPro Admin                                    [Admin Name ▼] │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  [Overview]  [Users]  [Deeds]  [Verification]  [Revenue] [System]│
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

6 tabs:
1. Overview      — Key metrics (enhanced)
2. Users         — User management (unchanged)
3. Deeds         — + View PDF, Delete
4. Verification  — NEW: Document authenticity
5. Revenue       — FIXED: Real Stripe data
6. System        — FIXED: Real PDF engine stats

HIDDEN:
- Partners tab (bring back when API launches)
```

---

## What Changes

| Tab | Before | After |
|-----|--------|-------|
| Overview | ✅ Real | ✅ + PDF/QR metrics |
| Users | ✅ Real | ✅ Unchanged |
| Deeds | ⚠️ View only | ✅ + View PDF, Delete |
| Partners | Visible | 🔒 Hidden |
| Verification | — | ✅ NEW |
| Revenue | ❌ Mock | ✅ Real Stripe |
| System | ❌ Mock | ✅ Real PDF stats |

---

## Tab 1: Overview (Enhanced)

```
┌─────────────────────────────────────────────────────────────────┐
│  Overview                                          [Last 7 days] │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐│
│  │   Users     │ │   Deeds     │ │   PDFs      │ │   Scans     ││
│  │   1,247     │ │   4,892     │ │   342       │ │   127       ││
│  │   +12 new   │ │   +89 new   │ │   this week │ │   this week ││
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘│
│                                                                  │
│  Recent Activity                                                │
│  • john@email.com created Grant Deed           2 min ago        │
│  • jane@email.com signed up                    15 min ago       │
│  • DOC-2026-A7X9K verified (QR scan)          23 min ago       │
│                                                                  │
│  [Export Users CSV]  [Export Deeds CSV]                         │
└─────────────────────────────────────────────────────────────────┘
```

---

## Tab 2: Users (Unchanged)

No changes needed — works well.

---

## Tab 3: Deeds (+ View PDF, Delete)

```
┌─────────────────────────────────────────────────────────────────┐
│  Deeds                                    [Search] [Filter ▼]    │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  │ ID   │ Type        │ Property       │ User    │ Status │ ⋮  │
│  ├──────┼─────────────┼────────────────┼─────────┼────────┼────│
│  │ 4892 │ Grant Deed  │ 123 Main St... │ john@.. │ ✓ Done │ ⋮  │
│                                                                  │
│  ⋮ Menu:                                                        │
│  ┌──────────────────┐                                           │
│  │ 👁 View Details   │                                           │
│  │ 📄 View PDF       │  ← NEW                                    │
│  │ 🗑 Delete Deed    │  ← NEW                                    │
│  └──────────────────┘                                           │
└─────────────────────────────────────────────────────────────────┘
```

**New Endpoints:**
```python
GET    /admin/deeds/{id}/pdf      → Returns PDF binary
DELETE /admin/deeds/{id}          → Soft delete
```

---

## Tab 4: Verification (NEW)

```
┌─────────────────────────────────────────────────────────────────┐
│  Document Verification                                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐│
│  │   Total     │ │   Active    │ │   Revoked   │ │   Scans     ││
│  │   1,247     │ │   1,231     │ │   16        │ │   47 today  ││
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘│
│                                                                  │
│  │ Doc ID          │ Type        │ Property    │ Status │ Scans│
│  │ DOC-2026-A7X9K  │ Grant Deed  │ 123 Main... │ Active │  47  │
│  │ DOC-2026-B3M2P  │ Quitclaim   │ 456 Oak...  │ Active │  32  │
│                                                                  │
│  Click row → View details + Revoke option                       │
└─────────────────────────────────────────────────────────────────┘
```

**Endpoints:**
```python
GET  /admin/verification/stats
GET  /admin/verification/documents
GET  /admin/verification/documents/{code}
POST /admin/verification/documents/{code}/revoke
```

---

## Tab 5: Revenue (Real Stripe Data)

```
┌─────────────────────────────────────────────────────────────────┐
│  Revenue                                           [This Month]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐│
│  │   MRR       │ │   Charges   │ │   Refunds   │ │   Active    ││
│  │   $2,450    │ │   $2,890    │ │   $120      │ │   Subs: 89  ││
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘│
│                                                                  │
│  Subscription Breakdown                                         │
│  Professional  ████████████████████████  67 ($29/mo)            │
│  Enterprise    ████████                  22 ($99/mo)            │
│  Free          ██████████████████████████████  412              │
│                                                                  │
│  Recent Transactions                                            │
│  Jan 21  │ john@email.com    │ Professional │  $29.00           │
│  Jan 21  │ jane@corp.com     │ Enterprise   │  $99.00           │
└─────────────────────────────────────────────────────────────────┘
```

**Endpoints:**
```python
GET /admin/revenue/stats          → Stripe API: MRR, charges, refunds
GET /admin/revenue/subscriptions  → Stripe API: by plan
GET /admin/revenue/transactions   → Stripe API: recent charges
```

**Implementation:**
```python
import stripe
stripe.api_key = os.getenv("STRIPE_SECRET_KEY")

@router.get("/admin/revenue/stats")
async def get_revenue_stats(admin = Depends(get_current_admin)):
    # Real Stripe data
    subscriptions = stripe.Subscription.list(status="active", limit=100)
    mrr = sum(sub.plan.amount / 100 for sub in subscriptions.data)
    
    charges = stripe.Charge.list(created={"gte": start_of_month}, limit=100)
    
    return {
        "mrr": mrr,
        "chargesThisMonth": sum(c.amount / 100 for c in charges.data),
        "activeSubscriptions": len(subscriptions.data)
    }
```

---

## Tab 6: System (Real PDF Stats)

```
┌─────────────────────────────────────────────────────────────────┐
│  System                                            [Last 7 days] │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  PDF Generation                                                 │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐│
│  │   Total     │ │  PDFShift   │ │  WeasyPrint │ │   Avg Time  ││
│  │   342       │ │   338 (99%) │ │   4 (1%)    │ │   1.2s      ││
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘│
│                                                                  │
│  By Deed Type                                                   │
│  Grant Deed      ████████████████████  156 (46%)                │
│  Quitclaim       ██████████            89 (26%)                 │
│  Interspousal    ████████              67 (20%)                 │
│                                                                  │
│  System Health                                                  │
│  Database     ● Online    12ms                                  │
│  PDF Engine   ● Online    PDFShift active                       │
│  SiteX API    ● Online    Last call: 2 min ago                  │
│  Stripe       ● Online    Webhook healthy                       │
└─────────────────────────────────────────────────────────────────┘
```

**Endpoints:**
```python
GET /admin/system/health      → Existing, enhance
GET /admin/system/pdf-stats   → New, from pdf_generation_log
```

---

## Database Tables Needed

### 1. PDF Generation Log
```sql
CREATE TABLE pdf_generation_log (
    id SERIAL PRIMARY KEY,
    deed_id INTEGER REFERENCES deeds(id),
    deed_type VARCHAR(50),
    engine_used VARCHAR(20) NOT NULL,
    generation_time_ms INTEGER,
    success BOOLEAN DEFAULT true,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);
```

### 2. Document Authenticity
(Already in QR_VERIFICATION_SYSTEM.md)

---

## Implementation Checklist

### Phase 5A: Hide Unused
- [ ] Hide Partners tab in frontend
- [ ] Remove unused Stripe plan endpoints

### Phase 5B: Deed Actions
- [ ] `GET /admin/deeds/{id}/pdf` endpoint
- [ ] `DELETE /admin/deeds/{id}` endpoint
- [ ] Action menu UI in Deeds tab

### Phase 5C: Revenue Tab (Real Stripe)
- [ ] `GET /admin/revenue/stats` endpoint
- [ ] `GET /admin/revenue/subscriptions` endpoint
- [ ] `GET /admin/revenue/transactions` endpoint
- [ ] Update Revenue tab UI

### Phase 5D: System Tab (Real PDF Stats)
- [ ] Create `pdf_generation_log` table
- [ ] Add logging to `render_pdf_async`
- [ ] `GET /admin/system/pdf-stats` endpoint
- [ ] Update System tab UI

### Phase 5E: Verification Tab
- [ ] Create verification tables (Phase 4)
- [ ] Verification endpoints
- [ ] Verification tab UI
- [ ] Revoke functionality

---

## Feature Flags

```typescript
export const FEATURE_FLAGS = {
  EXPORTS: true,
  SYSTEM_TAB: true,          // Enable - now real data
  REVENUE_TAB: true,         // Keep - now real Stripe data
  VERIFICATION_TAB: true,    // New
  DEED_ACTIONS: true,        // New - View PDF, Delete
  PARTNERS_TAB: false,       // Hide for now
};
```

---

## Summary

**Removing:**
- Partners tab (hidden, not deleted)
- Mock data everywhere

**Fixing:**
- Revenue → Real Stripe API
- System → Real PDF engine stats

**Adding:**
- Verification tab (for QR system)
- Deed View PDF action
- Deed Delete action

**Result:** 6 working tabs with 100% real data.
