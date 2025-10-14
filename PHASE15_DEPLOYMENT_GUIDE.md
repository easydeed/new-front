# 🚀 Phase 15: Dual-Mode Wizard - Deployment Guide

**Status**: ✅ **READY TO DEPLOY**  
**Branch**: `feat/wizard-dual-mode-v4`  
**Risk Level**: 🟢 **VERY LOW** (Feature-flagged + Error boundary + Zero backend changes)

---

## 📋 DEPLOYMENT STEPS (15 minutes)

### ✅ Step 1: Add Environment Variable to Vercel (5 min)

**Go to Vercel**:
1. Visit: https://vercel.com/
2. Select your project
3. Click: **Settings** → **Environment Variables**

**Add Variable**:
- **Key**: `NEXT_PUBLIC_WIZARD_MODE_DEFAULT`
- **Value**: `classic`
- **Environments**: ✅ Production, ✅ Preview, ✅ Development
- Click: **Save**

**Why `classic`?**
- Defaults to your existing wizard (zero risk)
- Modern mode available via `?mode=modern` for testing
- Easy rollback (just change this value)

---

### ✅ Step 2: Merge to Main (5 min)

```bash
# Switch to main
git checkout main

# Merge feature branch
git merge feat/wizard-dual-mode-v4

# Push to GitHub
git push origin main
```

**Vercel will auto-deploy** (takes 2-3 minutes)

---

### ✅ Step 3: Test Deployment (5 min)

**Test Classic Mode (Default)**:
1. Visit: `https://your-app.vercel.app/create-deed/grant-deed`
2. Should see: **Your existing wizard** (unchanged)
3. Create a deed to verify it works

**Test Modern Mode (Opt-in)**:
1. Visit: `https://your-app.vercel.app/create-deed/grant-deed?mode=modern`
2. Should see: **Property search** (Step 1 - same as classic)
3. After property verified: **Modern Q&A prompts** appear
4. Answer prompts → See **Smart Review** → Click **Confirm & Generate**
5. Verify deed is created

---

## 🎯 WHAT YOU'LL SEE

### Classic Mode (Default - All Users):
```
Step 1: Property Search (existing)
Step 2: Request Details (existing)
Step 3: Transfer Tax (existing)
Step 4: Parties & Property (existing)
Step 5: Review & Generate (existing)
```
**Nothing changes for your users.**

### Modern Mode (Opt-in - Beta Testing):
```
Step 1: Property Search (existing - reused)
     ↓ (after property verified)
Modern Q&A:
  Q: "Who is granting title (current owner)?"
  Q: "Who will receive title?"
  Q: "What is the vesting for the receiving party?"
     ↓
Smart Review:
  - Grantor John Smith will transfer title to Jane Smith.
  - Property: 123 Main St (APN 123-456-789).
  - Vesting: Community Property.
  - Completeness: 100%
     ↓
[Confirm & Generate] → Creates deed (same as classic)
```

---

## 📊 TESTING CHECKLIST

After deployment, test these:

### Classic Mode (5 minutes):
- [ ] Visit `/create-deed/grant-deed` → See existing wizard
- [ ] Complete all steps → Create deed
- [ ] Verify PDF generates correctly
- [ ] **Result**: Should work exactly as before

### Modern Mode (10 minutes):
- [ ] Visit `/create-deed/grant-deed?mode=modern`
- [ ] See property search (Step 1)
- [ ] After property verified → See Modern Q&A prompts
- [ ] Answer: "Who is granting title?" → Enter name
- [ ] Answer: "Who will receive title?" → Enter name
- [ ] Answer: "What is the vesting?" → Enter vesting
- [ ] See Smart Review with completeness score
- [ ] Click "Confirm & Generate" → Creates deed
- [ ] **Result**: Deed created successfully

### All 5 Deed Types (Modern):
- [ ] `/create-deed/grant-deed?mode=modern`
- [ ] `/create-deed/quitclaim?mode=modern`
- [ ] `/create-deed/interspousal-transfer?mode=modern`
- [ ] `/create-deed/warranty-deed?mode=modern`
- [ ] `/create-deed/tax-deed?mode=modern`

---

## 🚨 IF SOMETHING GOES WRONG

### Issue: Modern mode not working
**Check**:
1. Vercel env var: `NEXT_PUBLIC_WIZARD_MODE_DEFAULT` is set
2. Try hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
3. Check browser console for errors

**Rollback**:
- Change Vercel env var to `classic` → Redeploy

---

### Issue: Classic mode not working
**This shouldn't happen** (zero changes to classic wizard)

**Check**:
1. Vercel deployment succeeded
2. No build errors in Vercel logs
3. Try URL: `?mode=classic`

**Rollback**:
- Revert commit in GitHub
- Vercel will auto-redeploy previous version

---

### Issue: Property search not working in Modern mode
**Check**:
1. Browser console for errors
2. localStorage has `deedWizardDraft` after property search
3. PropertySearchWithTitlePoint is rendering

**Debug**:
- Open browser DevTools → Console tab
- Look for red errors
- Take screenshot → Share for debugging

---

## 🎯 ROLLBACK OPTIONS

**Instant Rollback** (30 seconds):
1. Vercel → Settings → Environment Variables
2. Change `NEXT_PUBLIC_WIZARD_MODE_DEFAULT` to `classic`
3. Click "Save" → Redeploy

**Full Rollback** (5 minutes):
```bash
git revert e45fbf7
git push origin main
```

---

## 📈 SUCCESS METRICS

**After 1 week**, check:
- Classic mode: 0 errors (should be unchanged)
- Modern mode: 10-20% of users try it (via `?mode=modern`)
- Modern mode completion rate: >80%
- Error boundary triggers: <5%

**If metrics look good**:
- Week 2: Change env var to `modern` (make it default)
- Monitor adoption and feedback

---

## 🎉 WHAT'S NEW

**For Users**:
- **Classic Mode**: Nothing changes (existing wizard)
- **Modern Mode** (opt-in): 
  - One question at a time (less overwhelming)
  - Contextual "why" explanations (educational)
  - Smart Review with completeness score
  - Validation that blocks invalid data

**For You**:
- **Zero backend changes** (frontend-only)
- **Zero database changes**
- **Feature-flagged** (instant rollback)
- **Error boundary** (automatic fallback to Classic)

---

## 📞 NEED HELP?

**Debugging Steps**:
1. Check Vercel deployment logs
2. Check browser console for errors
3. Check localStorage for `deedWizardDraft`
4. Take screenshots of errors
5. Share deployment log: `PHASE15_DEPLOYMENT_LOG.md`

---

## ✅ DEPLOYMENT SUMMARY

**What We Deployed**:
- Dual-Mode Wizard (Modern Q&A + Classic)
- 59 files changed, 1674 lines added
- Zero backend changes
- Zero database changes

**Safety Features**:
- Feature flag (default: classic)
- Error boundary (falls back to classic)
- URL override (?mode=classic or ?mode=modern)
- Git revert available

**Risk Level**: 🟢 **VERY LOW**

**Ready to deploy?** Follow the 3 steps above! 🚀

---

**Good luck, Rockstar!** 🎸

