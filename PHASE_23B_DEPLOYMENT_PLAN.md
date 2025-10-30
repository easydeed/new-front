# 🚀 PHASE 23-B: DEPLOYMENT PLAN

**Date**: October 30, 2025 at 7:45 PM PST  
**Package**: phase23-b/ (Billing & Reporting - Full Implementation)  
**Score**: 9.2/10 🟢 PRODUCTION-READY  
**Approach**: Slow and steady, document every step for easy debugging  
**Estimated Time**: 2 hours

---

## 📋 **PRE-DEPLOYMENT CHECKLIST**

### **✅ Prerequisites**:
- [ ] Phase 22-B deployed (External API service)
- [ ] Database accessible (PostgreSQL on Render)
- [ ] Stripe account set up (test or live mode)
- [ ] Environment variable access (Render dashboard)
- [ ] GitHub repository access
- [ ] Backup taken (if needed)

### **✅ Documentation Review**:
- [ ] Read `PHASE_23B_COMPLETE_REVIEW.md` (deployment section)
- [ ] Understand rollback plan
- [ ] Know success criteria

---

## 🎯 **DEPLOYMENT PHASES**

### **PHASE 1: PREP & DEPENDENCIES** (30 minutes)

#### **Step 1.1: Install Python Dependencies** (10 min)

**On Render** (via `requirements.txt`):
```bash
# Add to backend/requirements.txt
fastapi>=0.104.0
uvicorn[standard]>=0.24.0
SQLAlchemy>=2.0.23
psycopg[binary]>=3.1.13
pydantic-settings>=2.1.0
stripe>=7.4.0
boto3>=1.34.0
weasyprint>=60.0
httpx>=0.25.2
python-dotenv>=1.0.0
```

**Commit**:
```bash
git add backend/requirements.txt
git commit -m "Phase 23-B: Add billing dependencies"
git push origin main
```

**⏳ Wait**: Render will auto-redeploy (~2 minutes)

**✅ Verify**: Check Render logs for successful build

**🔄 Rollback**: If build fails, revert `requirements.txt` changes

---

#### **Step 1.2: Copy Package Files** (5 min)

```bash
# Copy billing package
cp -r phase23-b/billing backend/phase23_billing

# Copy migrations
cp -r phase23-b/migrations backend/migrations/phase23

# Copy scripts
cp -r phase23-b/scripts backend/scripts/phase23
```

**Commit**:
```bash
git add backend/phase23_billing backend/migrations/phase23 backend/scripts/phase23
git commit -m "Phase 23-B: Add billing package"
git push origin main
```

**⏳ Wait**: Render redeploys (~2 minutes)

**✅ Verify**: Check Render logs - should build successfully (no code execution yet)

**🔄 Rollback**: If build fails, delete added directories and revert commit

---

#### **Step 1.3: Set Environment Variables** (15 min)

**Go to**: Render Dashboard → deedpro-main-api → Environment

**Add**:
```env
STRIPE_SECRET_KEY=sk_test_...  # Or sk_live_ for production
STRIPE_WEBHOOK_SECRET=whsec_...  # Get from Stripe Dashboard
STRIPE_OVERAGE_PRICE_CENTS=500
STORAGE_DRIVER=local
LOCAL_STORAGE_DIR=./billing_storage/files
```

**Optional** (if using S3):
```env
STORAGE_DRIVER=s3
S3_BUCKET=deedpro-invoices
S3_REGION=us-west-1
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
```

**⚠️ IMPORTANT**: After adding env vars, click "Manual Deploy" (Render doesn't auto-deploy on env changes)

**✅ Verify**: Check Render logs for successful restart

**🔄 Rollback**: Remove env vars if service fails to start

---

### **PHASE 2: DATABASE MIGRATIONS** (10 minutes)

#### **Step 2.1: Enable pgcrypto Extension** (1 min)

**Via Render Shell**:
```bash
# Open Render Dashboard → deedpro-main-api → Shell
psql $DATABASE_URL -c "CREATE EXTENSION IF NOT EXISTS pgcrypto;"
```

**Expected**: `CREATE EXTENSION` or `NOTICE: extension "pgcrypto" already exists`

**✅ Verify**: Extension enabled

**🔄 Rollback**: N/A (extension is safe)

---

#### **Step 2.2: Run Migrations** (9 min)

**Via Render Shell** (run one at a time):
```bash
cd backend/migrations/phase23

# Migration 1: Invoices table
psql $DATABASE_URL -f phase23_001_invoices.sql

# Migration 2: Payment history table
psql $DATABASE_URL -f phase23_002_payments.sql

# Migration 3: Usage events table
psql $DATABASE_URL -f phase23_003_usage_events.sql

# Migration 4: Credits table
psql $DATABASE_URL -f phase23_004_credits.sql

# Migration 5: API partner contracts table
psql $DATABASE_URL -f phase23_005_api_partner_contracts.sql

# Migration 6: Subscriptions table enhancements
psql $DATABASE_URL -f phase23_006_subscriptions_alter.sql

# Migration 7: Indexes
psql $DATABASE_URL -f phase23_007_indexes.sql
```

**Expected** (for each):
```
CREATE TABLE
```

or for ALTER:
```
ALTER TABLE
```

or for indexes:
```
CREATE INDEX
```

**✅ Verify**: Check all tables exist
```bash
psql $DATABASE_URL -c "\dt" | grep -E "(invoices|payment_history|usage_events|credits|api_partner_contracts)"
```

**Expected**:
```
 public | api_partner_contracts | table | ...
 public | credits              | table | ...
 public | invoices             | table | ...
 public | payment_history      | table | ...
 public | usage_events         | table | ...
```

**🔄 Rollback**: 
```sql
DROP TABLE IF EXISTS api_partner_contracts;
DROP TABLE IF EXISTS credits;
DROP TABLE IF EXISTS usage_events;
DROP TABLE IF EXISTS payment_history;
DROP TABLE IF EXISTS invoices;
```

---

### **PHASE 3: INTEGRATE ROUTERS** (5 minutes)

#### **Step 3.1: Modify main.py** (5 min)

**Edit** `backend/main.py`:

**Add at top** (after existing imports):
```python
# Phase 23-B: Billing routers
from phase23_billing.app_include import include_billing_routers
```

**Add after** `app = FastAPI(...)`:
```python
# Phase 23-B: Mount billing routers
include_billing_routers(app)
```

**Commit**:
```bash
git add backend/main.py
git commit -m "Phase 23-B: Integrate billing routers"
git push origin main
```

**⏳ Wait**: Render redeploys (~2 minutes)

**✅ Verify**: Check Render logs for successful startup (no errors)

**🔄 Rollback**: Revert `main.py` changes and redeploy

---

### **PHASE 4: TEST ENDPOINTS** (15 minutes)

#### **Test 1: Admin Revenue Endpoint** (3 min)

```bash
curl https://deedpro-main-api.onrender.com/admin/revenue
```

**Expected** (initially, with $0 revenue):
```json
{
  "overview": {
    "total_revenue_cents": 0,
    "monthly_revenue_cents": 0,
    "stripe_fees_cents": 0,
    "refunds_cents": 0,
    "net_monthly_revenue_cents": 0
  },
  "monthly_breakdown": [],
  "mrr_arr": {
    "mrr_cents": 0,
    "mrr_dollars": 0,
    "arr_cents": 0,
    "arr_dollars": 0
  }
}
```

**✅ Pass**: Returns JSON (not mock data!)
**❌ Fail**: 500 error or mock data

---

#### **Test 2: Invoices List Endpoint** (2 min)

```bash
curl https://deedpro-main-api.onrender.com/admin/invoices
```

**Expected** (initially, empty):
```json
[]
```

**✅ Pass**: Returns empty array
**❌ Fail**: 500 error

---

#### **Test 3: Payments List Endpoint** (2 min)

```bash
curl https://deedpro-main-api.onrender.com/admin/payments
```

**Expected** (initially, empty):
```json
[]
```

**✅ Pass**: Returns empty array
**❌ Fail**: 500 error

---

#### **Test 4: Stripe Webhook Endpoint** (8 min)

**Install Stripe CLI** (if needed):
```bash
# Download from: https://stripe.com/docs/stripe-cli
```

**Login to Stripe**:
```bash
stripe login
```

**Forward webhooks to production**:
```bash
stripe listen --forward-to https://deedpro-main-api.onrender.com/payments/webhook
```

**Trigger a test payment**:
```bash
stripe trigger payment_intent.succeeded
```

**Expected in Stripe CLI**:
```
--> payment_intent.succeeded
<-- [200] POST https://deedpro-main-api.onrender.com/payments/webhook
```

**✅ Pass**: 200 response, no errors in Render logs
**❌ Fail**: 400/500 error

**Check Database**:
```bash
psql $DATABASE_URL -c "SELECT * FROM payment_history ORDER BY id DESC LIMIT 1;"
```

**Expected**: 1 row with test payment data

---

### **PHASE 5: CONFIGURE STRIPE WEBHOOK** (10 minutes)

#### **Step 5.1: Create Webhook in Stripe Dashboard** (10 min)

1. Go to: https://dashboard.stripe.com/webhooks
2. Click "Add endpoint"
3. **Endpoint URL**: `https://deedpro-main-api.onrender.com/payments/webhook`
4. **Events to send**: Select:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.created`
   - `invoice.payment_succeeded`
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `charge.refunded`
5. Click "Add endpoint"
6. **Copy Signing Secret** (starts with `whsec_...`)
7. Update `STRIPE_WEBHOOK_SECRET` env var in Render
8. Click "Manual Deploy" in Render

**✅ Verify**: Send test webhook from Stripe dashboard, check 200 response

---

### **PHASE 6: SETUP CRON JOBS** (10 minutes)

**Option A: Render Cron Jobs** (Recommended)

1. Go to Render Dashboard
2. Click "New +" → "Cron Job"
3. **Name**: `deedpro-partner-invoices`
4. **Command**: `python backend/scripts/phase23/run_monthly_partner_invoices.py`
5. **Schedule**: `0 0 1 * *` (1st of every month at midnight)
6. Click "Create Cron Job"

Repeat for reconciliation:
- **Name**: `deedpro-daily-reconciliation`
- **Command**: `python backend/scripts/phase23/run_daily_reconciliation.py`
- **Schedule**: `0 6 * * *` (daily at 6 AM)

**✅ Verify**: Cron jobs listed in Render dashboard

---

### **PHASE 7: UPDATE FRONTEND** (30 minutes)

#### **Step 7.1: Update Admin API Types** (10 min)

**Edit** `frontend/src/lib/adminApi.ts`:

**Add type**:
```typescript
export type RevenueData = {
  overview: {
    total_revenue_cents: number;
    monthly_revenue_cents: number;
    stripe_fees_cents: number;
    refunds_cents: number;
    net_monthly_revenue_cents: number;
  };
  monthly_breakdown: Array<{
    month: string;
    revenue_cents: number;
    revenue_dollars: number;
  }>;
  mrr_arr: {
    mrr_cents: number;
    mrr_dollars: number;
    arr_cents: number;
    arr_dollars: number;
  };
};
```

**Update method**:
```typescript
getRevenue: () => http<RevenueData>('/admin/revenue'),
```

---

#### **Step 7.2: Update Revenue Tab Component** (20 min)

**Edit** `frontend/src/app/admin-honest-v2/components/RevenueTab.tsx`:

```typescript
'use client';
import { useEffect, useState } from 'react';
import { AdminApi, RevenueData } from '@/lib/adminApi';
import EmptyState from './EmptyState';

export default function RevenueTab(){
  const [data, setData] = useState<RevenueData | null>(null);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(()=>{
    let mounted = true;
    (async() => {
      try{
        const r = await AdminApi.getRevenue();
        if (mounted) setData(r);
      }catch(e:any){
        setErr(e?.message || 'Failed to load revenue');
      }finally{
        setLoading(false);
      }
    })();
    return ()=>{ mounted = false; };
  }, []);

  if (loading) return <div className="card skeleton" style={{height:120}} />;
  if (err || !data) return <EmptyState icon="💰" title="No revenue data" description="Check API connection" />;

  const { overview, monthly_breakdown, mrr_arr } = data;

  return (
    <div className="vstack">
      {/* KPIs */}
      <div className="kpis">
        <div className="card stat-card">
          <div className="stat-title">Total Revenue</div>
          <div className="stat-value">${(overview.total_revenue_cents / 100).toLocaleString()}</div>
        </div>
        <div className="card stat-card">
          <div className="stat-title">Monthly Revenue</div>
          <div className="stat-value">${(overview.monthly_revenue_cents / 100).toLocaleString()}</div>
        </div>
        <div className="card stat-card">
          <div className="stat-title">Net Revenue (After Fees)</div>
          <div className="stat-value">${(overview.net_monthly_revenue_cents / 100).toLocaleString()}</div>
        </div>
        <div className="card stat-card">
          <div className="stat-title">MRR</div>
          <div className="stat-value">${(mrr_arr.mrr_cents / 100).toLocaleString()}</div>
        </div>
        <div className="card stat-card">
          <div className="stat-title">ARR</div>
          <div className="stat-value">${(mrr_arr.arr_cents / 100).toLocaleString()}</div>
        </div>
      </div>

      {/* Monthly Breakdown */}
      {monthly_breakdown.length > 0 && (
        <div className="card">
          <div style={{fontWeight:700, marginBottom:12}}>Monthly Breakdown (Last 12 Months)</div>
          <table className="table">
            <thead><tr><th>Month</th><th>Revenue</th></tr></thead>
            <tbody>
              {monthly_breakdown.map(row => (
                <tr key={row.month}>
                  <td>{row.month}</td>
                  <td>${row.revenue_dollars.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
```

**Commit**:
```bash
git add frontend/src/lib/adminApi.ts frontend/src/app/admin-honest-v2/components/RevenueTab.tsx
git commit -m "Phase 23-B: Update admin revenue UI with real data"
git push origin main
```

**⏳ Wait**: Vercel deploys (~2 minutes)

**✅ Verify**: Check admin dashboard shows real numbers (not mock data)

---

### **PHASE 8: VERIFICATION & TESTING** (20 minutes)

#### **Final Checklist**:

- [ ] **Admin revenue endpoint returns real data** (not mock)
- [ ] **Admin dashboard shows $0** (initially, before payments)
- [ ] **Stripe webhook receives events** (test with Stripe CLI)
- [ ] **Payment history table populated** (after test payment)
- [ ] **Invoice list endpoint works** (returns empty array initially)
- [ ] **CSV export downloads** (empty initially)
- [ ] **No errors in Render logs**
- [ ] **No errors in Vercel logs**
- [ ] **Frontend renders without errors**

---

## 📊 **SUCCESS CRITERIA**

### **✅ DEPLOYMENT SUCCESSFUL IF**:

1. All endpoints return 200 (not 500)
2. Admin revenue shows real data structure (not mock data)
3. Stripe webhook responds with 200
4. Database tables exist and are queryable
5. Frontend renders without errors
6. No critical errors in logs

### **⚠️ ROLLBACK IF**:

1. 500 errors on multiple endpoints
2. Database migrations fail
3. Service won't start after router integration
4. Critical errors in logs

---

## 🔄 **ROLLBACK PLAN**

### **Scenario 1: Service Won't Start**

```bash
# Revert main.py changes
git revert HEAD --no-edit
git push origin main
# Wait for Render redeploy
```

---

### **Scenario 2: Database Issues**

```bash
# Drop tables in reverse order
psql $DATABASE_URL -c "DROP TABLE IF EXISTS api_partner_contracts;"
psql $DATABASE_URL -c "DROP TABLE IF EXISTS credits;"
psql $DATABASE_URL -c "DROP TABLE IF EXISTS usage_events;"
psql $DATABASE_URL -c "DROP TABLE IF EXISTS payment_history;"
psql $DATABASE_URL -c "DROP TABLE IF EXISTS invoices;"

# Revert code
git revert HEAD~2..HEAD --no-edit
git push origin main
```

---

### **Scenario 3: Frontend Breaks**

```bash
# Revert frontend changes
cd frontend
git checkout HEAD~1 -- src/lib/adminApi.ts src/app/admin-honest-v2/components/RevenueTab.tsx
git commit -m "Rollback: Revert Phase 23-B frontend changes"
git push origin main
```

---

## 📝 **DEPLOYMENT LOG TEMPLATE**

Use this to track progress:

```
PHASE 23-B DEPLOYMENT LOG
Date: 2025-10-30
Deployed By: [Your Name]

PHASE 1: PREP & DEPENDENCIES
[ ] Step 1.1: Dependencies installed (Time: ___:___)
[ ] Step 1.2: Package files copied (Time: ___:___)
[ ] Step 1.3: Environment variables set (Time: ___:___)

PHASE 2: DATABASE MIGRATIONS
[ ] Step 2.1: pgcrypto enabled (Time: ___:___)
[ ] Step 2.2: All 7 migrations run (Time: ___:___)

PHASE 3: INTEGRATE ROUTERS
[ ] Step 3.1: main.py modified (Time: ___:___)

PHASE 4: TEST ENDPOINTS
[ ] Test 1: Admin revenue (Pass/Fail: ___)
[ ] Test 2: Invoices list (Pass/Fail: ___)
[ ] Test 3: Payments list (Pass/Fail: ___)
[ ] Test 4: Stripe webhook (Pass/Fail: ___)

PHASE 5: CONFIGURE STRIPE WEBHOOK
[ ] Step 5.1: Webhook created in Stripe (Time: ___:___)

PHASE 6: SETUP CRON JOBS
[ ] Cron job 1: Partner invoices (Time: ___:___)
[ ] Cron job 2: Daily reconciliation (Time: ___:___)

PHASE 7: UPDATE FRONTEND
[ ] Step 7.1: Admin API types updated (Time: ___:___)
[ ] Step 7.2: Revenue Tab component updated (Time: ___:___)

PHASE 8: VERIFICATION & TESTING
[ ] All endpoints return 200
[ ] Admin dashboard shows real data
[ ] Stripe webhook works
[ ] Database tables exist
[ ] Frontend renders correctly
[ ] No errors in logs

TOTAL TIME: _____ minutes
STATUS: ✅ SUCCESS / ❌ ROLLED BACK
NOTES:
```

---

## 🎯 **POST-DEPLOYMENT**

### **Immediate (Today)**:
- [ ] Monitor Render logs for 1 hour
- [ ] Test admin dashboard with real user
- [ ] Send test Stripe payment
- [ ] Verify payment appears in database

### **This Week**:
- [ ] Monitor Stripe webhook deliveries daily
- [ ] Check reconciliation script output (after first run)
- [ ] Review any error logs

### **Next Month**:
- [ ] Add first API partner contract
- [ ] Test partner invoice generation (manually run script)
- [ ] Review monthly breakdown data

---

## 📞 **SUPPORT**

**If Issues Arise**:
1. Check Render logs (deedpro-main-api)
2. Check Stripe webhook delivery logs
3. Check database for data
4. Review `PHASE_23B_COMPLETE_REVIEW.md` troubleshooting section
5. Rollback if critical

**Documentation**:
- `PHASE_23B_COMPLETE_REVIEW.md` - Full review
- `PHASE_23_BILLING_REPORTING_BRUTAL_ANALYSIS.md` - Gap analysis
- `PHASE_23_SYSTEMS_ARCHITECT_REVIEW.md` - Phase 23 review

---

**READY TO DEPLOY, CHAMP!** 🚀

**Next Step**: Start Phase 1, Step 1.1 (Install Dependencies)

