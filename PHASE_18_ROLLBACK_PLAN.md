# Phase 18 v2: Rollback Plan

## 🔄 Quick Rollback Reference

**If Phase 18 v2 encounters issues in production, follow this guide for immediate rollback.**

---

## ⚡ Emergency Rollback (30 seconds)

### Option 1: Git Revert (Safest)
```bash
# From main branch
git revert f282cf0 --no-edit
git push origin main
```
**Effect**: Removes Phase 18 v2 commit while preserving history.

### Option 2: Rollback Script (File-level)
```bash
# From repo root
node phase18-v2/scripts/rollback_phase17_v2.mjs .
git add -A
git commit -m "rollback(phase18-v2): Restore pre-Phase 18 state using backup files"
git push origin main
```
**Effect**: Restores all modified files from `*.bak.v17` backups.

### Option 3: Branch Rollback (Full reset)
```bash
# Nuclear option - reset main to before Phase 18
git checkout main
git reset --hard 99feb6f  # Commit before Phase 18 v2 merge
git push origin main --force
```
**Effect**: Completely removes Phase 18 v2 from main branch.

---

## 📋 Rollback Decision Matrix

| Symptom | Likely Cause | Recommended Rollback |
|---------|--------------|---------------------|
| **Quitclaim PDF missing "Requested By"** | Adapter not forwarding | No rollback needed - check adapter manually |
| **Build fails on Vercel** | Import/syntax error | Option 1: Git revert |
| **All deed PDFs broken** | Backend model issue | Option 2: Rollback script |
| **Production completely down** | Critical regression | Option 3: Branch rollback |
| **Only one deed type affected** | Deed-specific issue | No rollback - hotfix individual deed |

---

## 🔍 Pre-Rollback Checks

**Before rolling back, verify the issue:**

1. **Check Vercel deployment logs**:
   - https://vercel.com/easydeed/new-front/deployments
   - Look for build errors or runtime errors

2. **Check backend logs** (Render):
   - https://dashboard.render.com/
   - Look for Python errors or PDF generation failures

3. **Test in dev environment first**:
   ```bash
   git checkout fix/phase17-all-deeds-bulletproof-v2
   cd frontend && npm run dev
   # Test locally before rolling back production
   ```

4. **Verify it's not a caching issue**:
   - Clear browser cache
   - Hard refresh (Ctrl+F5)
   - Test in incognito mode

---

## 📝 Rollback Execution Steps

### Option 1: Git Revert (RECOMMENDED)

**When to use**: Most issues, preserves history, safest option.

**Steps**:
```bash
# 1. Ensure you're on main
git checkout main
git pull origin main

# 2. Revert Phase 18 v2 commit
git revert f282cf0 --no-edit

# 3. Push to trigger Vercel rebuild
git push origin main

# 4. Monitor deployment
# Watch Vercel dashboard for new deployment
# ETA: 2-3 minutes for build + deploy
```

**What gets reverted**:
- ✅ All backup files removed
- ✅ phase18/ and phase18-v2/ folders removed
- ✅ No model/template/adapter changes (they were already correct)

**What stays intact**:
- ✅ Phase 16 Grant Deed fixes
- ✅ Phase 17 Landing page
- ✅ All existing functionality

**Verification**:
```bash
# After revert, check:
git log --oneline -5
# Should show revert commit at top

ls backend/models/*.bak.v17
# Should return "No such file or directory"
```

---

### Option 2: Rollback Script

**When to use**: If files were accidentally modified, restore from backups.

**Steps**:
```bash
# 1. Run rollback script
node phase18-v2/scripts/rollback_phase17_v2.mjs .

# Expected output:
# [phase17/rollback] restored backend/models/quitclaim_deed.py
# [phase17/rollback] restored backend/models/interspousal_transfer.py
# [phase17/rollback] restored backend/models/warranty_deed.py
# [phase17/rollback] restored backend/models/tax_deed.py
# [phase17/rollback] restored 4 file(s).

# 2. Verify restoration
git diff backend/models/

# 3. Commit rollback
git add -A
git commit -m "rollback(phase18-v2): Restore pre-Phase 18 state using backup files"
git push origin main
```

**What this does**:
1. Finds all `*.bak.v17` files
2. Copies backup over original file
3. Deletes backup file
4. Logs each restoration

---

### Option 3: Branch Rollback (Nuclear)

**When to use**: Production is completely broken, need immediate fix.

**⚠️ WARNING**: This uses `git push --force` which rewrites history. Only use if other options fail.

**Steps**:
```bash
# 1. Find commit hash BEFORE Phase 18 merge
git log --oneline --graph -10

# Should show:
# * f282cf0 feat(phase18-v2): Deploy bulletproof v2
# * 99feb6f docs: Add Phase 18 documentation summary  <-- Reset to this
# * 7309880 docs: Update PROJECT_STATUS.md

# 2. Reset main to before Phase 18
git checkout main
git reset --hard 99feb6f

# 3. Force push (DESTRUCTIVE)
git push origin main --force

# 4. Notify team
# Send message: "Phase 18 rolled back via force push. Branch reset to 99feb6f."
```

**Recovery after force push**:
```bash
# If you need to get Phase 18 v2 back later:
git checkout fix/phase17-all-deeds-bulletproof-v2
# Branch still exists with all changes intact
```

---

## 🧪 Post-Rollback Verification

After any rollback, verify these critical flows:

### 1. Grant Deed (Should still work - Phase 16)
- [ ] Property search returns data
- [ ] Legal description hydrates
- [ ] Partners dropdown loads
- [ ] PDF shows "RECORDING REQUESTED BY: [value]"

### 2. Other Deed Types (Reverted to pre-Phase 18)
- [ ] Quitclaim deed wizard loads
- [ ] Can complete full flow
- [ ] PDF generates (may not show "Requested By" - expected)

### 3. Build & Deploy
- [ ] Vercel build succeeds
- [ ] No console errors
- [ ] All pages load

**Verification Checklist** (5 min):
```bash
# 1. Check deployment
open https://deedpro-frontend-new.vercel.app/

# 2. Test Grant Deed flow
# Navigate to: /wizard/grant-deed
# Complete: Property search → Wizard → PDF

# 3. Check console
# Open DevTools → Console tab
# Should see no errors
```

---

## 📊 Rollback Impact Assessment

### Option 1: Git Revert
- **Downtime**: ~3 minutes (Vercel rebuild)
- **Data Loss**: None
- **User Impact**: Minimal (only during rebuild)
- **Recovery**: Can re-apply Phase 18 v2 later

### Option 2: Rollback Script
- **Downtime**: ~5 minutes (manual steps + rebuild)
- **Data Loss**: None (backups used)
- **User Impact**: Minimal
- **Recovery**: Can re-apply with fresh backups

### Option 3: Branch Rollback
- **Downtime**: ~3 minutes (force rebuild)
- **Data Loss**: Phase 18 v2 removed from main (but preserved in branch)
- **User Impact**: Brief
- **Recovery**: Re-merge from branch

---

## 🔧 Troubleshooting Common Issues

### Issue: "git revert fails with conflicts"
```bash
# Solution: Manual revert
git checkout 99feb6f -- backend/models/*.bak.v17
git rm backend/models/*.bak.v17
git commit -m "rollback(phase18-v2): Manual revert of backup files"
git push origin main
```

### Issue: "Rollback script not found"
```bash
# Solution: Clone fresh from branch
git fetch origin fix/phase17-all-deeds-bulletproof-v2
git checkout origin/fix/phase17-all-deeds-bulletproof-v2 -- phase18-v2/
node phase18-v2/scripts/rollback_phase17_v2.mjs .
```

### Issue: "Backup files (.bak.v17) are missing"
**Answer**: No rollback needed! Phase 18 v2 didn't modify any code (all changes were already present). The backup files were just safety measures.

---

## 📞 Escalation Contact

**If rollback fails or unsure which option to use:**

1. **Check Project Status**: `PROJECT_STATUS.md` → "KNOWN MINOR ISSUES"
2. **Review Logs**: Vercel + Render dashboards
3. **Consult Documentation**: `PHASE_18_V2_VIABILITY_ANALYSIS.md`

---

## 📈 Rollback History

| Date | Reason | Method Used | Outcome |
|------|--------|-------------|---------|
| TBD | (If rollback occurs) | (Method) | (Result) |

---

## ✅ Rollback Plan Confidence

**Confidence Level**: 95%

**Why?**
- ✅ Three independent rollback methods
- ✅ All backups verified and in place
- ✅ No code modifications in Phase 18 v2 (idempotent)
- ✅ Grant Deed (Phase 16) unaffected by rollback
- ✅ Clear decision matrix for which method to use
- ✅ Estimated rollback time: 30 seconds - 5 minutes

**Philosophy**: "Hope for the best, prepare for the worst" - We have multiple safety nets.

---

**Document Version**: 1.0  
**Created**: October 28, 2025  
**Status**: ACTIVE - Ready for use if needed  
**Related Docs**: `PROJECT_STATUS.md`, `PHASE_18_V2_VIABILITY_ANALYSIS.md`

