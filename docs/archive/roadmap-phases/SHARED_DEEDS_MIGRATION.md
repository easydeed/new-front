# 🗄️ Shared Deeds Database Migration

**Purpose**: Enable real shared deeds functionality  
**Time Required**: 5 minutes  
**Status**: Ready to execute

---

## 📋 **WHAT THIS MIGRATION DOES**

Creates two new tables:
1. **`shared_deeds`** - Tracks deed sharing relationships and status
2. **`sharing_activity_log`** - Audit trail for all sharing activities

---

## 🚀 **EXECUTION STEPS**

### **Option A: Via Render Dashboard** (Recommended)

1. **Go to Render Dashboard**
   - Navigate to: https://dashboard.render.com
   - Select your **DeedPro Backend** service

2. **Open Shell**
   - Click "Shell" tab in the left sidebar
   - Wait for terminal to load

3. **Run Migration**
   ```bash
   psql $DATABASE_URL -f backend/shared_deeds_schema.sql
   ```

4. **Verify Success**
   - Look for messages:
     - `CREATE TABLE` (twice - for shared_deeds and sharing_activity_log)
     - `CREATE INDEX` (multiple times)
     - `CREATE TRIGGER` (twice)
   - No errors should appear

5. **Test the Feature**
   - Navigate to: https://deedpro-frontend-new.vercel.app/shared-deeds
   - Should still show empty (no data yet)
   - But now it's connected to the real database table

---

### **Option B: Local Testing** (Optional)

If you want to test locally first:

```bash
# From project root
psql YOUR_LOCAL_DATABASE_URL -f backend/shared_deeds_schema.sql
```

---

## ✅ **VERIFICATION CHECKLIST**

After running the migration:

- [ ] No SQL errors in Render Shell
- [ ] Tables created successfully
- [ ] Indexes created
- [ ] Triggers created
- [ ] Shared Deeds page loads (empty state is OK)
- [ ] No 500 errors in Render logs

---

## 📊 **WHAT GETS CREATED**

### **Table: `shared_deeds`**
```sql
Columns:
- id (PRIMARY KEY)
- deed_id (FK to deeds)
- shared_by (FK to users)
- shared_with_email
- shared_with_user_id (FK to users)
- status (pending/approved/rejected/revoked)
- message
- share_type (review/edit/sign)
- permissions (can_edit, can_download, can_share)
- timestamps (created_at, updated_at, expires_at)
- response tracking (approved_at, rejected_at, revoked_at)
- audit (ip_address, user_agent)
```

### **Table: `sharing_activity_log`**
```sql
Columns:
- id (PRIMARY KEY)
- shared_deed_id (FK to shared_deeds)
- user_id (FK to users)
- action (shared/viewed/approved/rejected/revoked/downloaded)
- details (JSONB)
- ip_address
- user_agent
- created_at
```

---

## 🔄 **ROLLBACK** (If Needed)

If something goes wrong:

```bash
# Drop tables (via Render Shell)
psql $DATABASE_URL -c "DROP TABLE IF EXISTS sharing_activity_log CASCADE;"
psql $DATABASE_URL -c "DROP TABLE IF EXISTS shared_deeds CASCADE;"
```

Then you can re-run the migration.

---

## 📝 **POST-MIGRATION**

After successful migration, the following will work:
- `GET /shared-deeds` - Returns real shared deeds from DB
- `DELETE /shared-deeds/{id}` - Revokes shares via DB update
- Frontend Shared Deeds page - Connected to real data

**Note**: Email notifications are not yet implemented (Phase 7 Option A).

---

## 🆘 **TROUBLESHOOTING**

### **Error: "relation already exists"**
**Solution**: Tables already exist. No action needed!

### **Error: "permission denied"**
**Solution**: Check that DATABASE_URL has proper permissions

### **Error: "file not found"**
**Solution**: Ensure you're running from the backend service root in Render Shell

---

**Status**: Ready to execute  
**Next**: Phase 7 Option A - Email & Notifications

