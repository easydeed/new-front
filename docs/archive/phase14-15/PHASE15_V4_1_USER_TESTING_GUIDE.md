# 🧪 Phase 15 v4.1 - User Testing Guide

**Status**: ✅ **DEPLOYED TO PRODUCTION**  
**Test URL**: `https://deedpro-frontend-new.vercel.app/create-deed/grant-deed?mode=modern`

---

## 🎯 WHAT WAS FIXED

### **Your 3 Issues**:

1. ✅ **"When I get to generate the Deed it sends me to the classic"**  
   → **FIX**: Now redirects to `/deeds/[id]/preview?mode=modern` (stays in Modern)

2. ✅ **"I thought we were going to have a toggle switch on screen"**  
   → **FIX**: Toggle button now visible in header (top right)

3. ✅ **"Currently it feels like its own stand-alone page"**  
   → **FIX**: Consistent header + layout matching Classic wizard

---

## 🔍 WHAT TO TEST (7 Items)

### **Test #1: Finalize Stays in Modern** ⭐ CRITICAL
**Steps**:
1. Go to: `https://deedpro-frontend-new.vercel.app/create-deed/grant-deed?mode=modern`
2. Complete property search (enter address, verify)
3. Answer all Q&A prompts (grantor, grantee, etc.)
4. Click "Confirm & Generate" button
5. **Look at the URL bar** after redirect

**Expected**:
- ✅ URL should be: `/deeds/[123]/preview?mode=modern`
- ✅ Should NOT go back to Classic wizard
- ✅ Should NOT lose the `?mode=modern` parameter

**If fails**: Report URL you see + console logs

---

### **Test #2: Toggle Switch Visible** ⭐ CRITICAL
**Steps**:
1. Go to: `https://deedpro-frontend-new.vercel.app/create-deed/grant-deed?mode=modern`
2. Look at the **top right** of the page

**Expected**:
- ✅ Should see a button labeled **"Modern Q&A"**
- ✅ Button should be in the header area
- ✅ Next to DeedTypeBadge and "Create Deed" heading

**If fails**: Send screenshot

---

### **Test #3: Toggle Works (Switch Modes)**
**Steps**:
1. On Modern wizard, click the **"Modern Q&A"** button **once**
2. Wait 2 seconds
3. Click it **again**

**Expected**:
- After 1st click: See message "Switch modes? Data is preserved."
- After 2nd click: Switches to Classic wizard
- Data should be preserved (property, grantor, grantee still there)

**If fails**: Report what you see

---

### **Test #4: Layout is Consistent**
**Steps**:
1. Visit Modern wizard: `?mode=modern`
2. Visit Classic wizard: `?mode=classic` (or no param)
3. Compare the two

**Expected**:
- ✅ Both should have **header** with:
  - DeedTypeBadge (left)
  - "Create Deed" heading
  - Mode label ("Modern" or nothing)
  - Toggle button (right)
- ✅ Both should have **same width** (~960px max, centered)
- ✅ Both should have **same padding** (not edge-to-edge)

**If fails**: Send screenshots of both modes

---

### **Test #5: Loading State Works**
**Steps**:
1. Complete Modern Q&A flow
2. Click "Confirm & Generate" button
3. **Watch the button**

**Expected**:
- ✅ Button text changes to **"Generating..."**
- ✅ Button is **disabled** (grayed out, can't click again)
- ✅ After deed created, redirects to preview

**If fails**: Report if button stayed clickable or didn't show "Generating..."

---

### **Test #6: Error Handling (Optional)**
**Steps**:
1. Complete Modern Q&A flow
2. Open browser DevTools (F12)
3. Go to Network tab → Enable "Offline" mode
4. Click "Confirm & Generate"

**Expected**:
- ✅ Alert should appear: "Failed to create deed. Please try again."
- ✅ Console should log error details
- ✅ Button should become clickable again

**If fails**: Report what happens

---

### **Test #7: No Hydration Errors**
**Steps**:
1. Go to: `https://deedpro-frontend-new.vercel.app/create-deed/grant-deed?mode=modern`
2. Open browser console (F12)
3. **Hard refresh**: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
4. Look for errors

**Expected**:
- ✅ NO "React Error #418" in console
- ✅ NO "Hydration failed" messages
- ✅ Property search loads correctly
- ✅ No infinite "Loading wizard..." state

**If fails**: Copy/paste console errors

---

## 📋 QUICK CHECKLIST

Copy/paste this and check off each item:

```
[ ] Test #1: Finalize stays in Modern (URL has ?mode=modern)
[ ] Test #2: Toggle switch visible in header
[ ] Test #3: Toggle switch works (can switch modes)
[ ] Test #4: Layout is consistent (header, width, padding)
[ ] Test #5: Loading state shows "Generating..."
[ ] Test #6: Error handling works (optional)
[ ] Test #7: No hydration errors in console
```

---

## 🚨 IF YOU FIND ISSUES

**Report Format**:
```
Issue: [Brief description]
Test #: [Which test failed]
URL: [Full URL from browser]
Console Logs: [Copy/paste from DevTools]
Screenshot: [If applicable]
Steps: [What you did]
```

---

## 🔄 ROLLBACK (If Needed)

If something is broken, you can instantly rollback:

### **Option 1: URL Parameter** (Instant)
Change URL from `?mode=modern` to `?mode=classic`

### **Option 2: Vercel Rollback** (Instant)
1. Go to Vercel Dashboard
2. Deployments → Find previous deployment
3. Click "Promote to Production"

### **Option 3: Git Revert** (5 minutes)
Let me know and I'll revert the commit

---

## ✅ IF EVERYTHING WORKS

**Report**:
```
✅ All 7 tests passed!
- Finalize stays in Modern
- Toggle visible and works
- Layout is consistent
- Loading state works
- No hydration errors
```

Then we can:
1. Archive the `finalize/` folder (no longer needed)
2. Plan Phase 16 (future enhancements)

---

## 📞 QUESTIONS?

**Expected Experience**:
1. Visit `/create-deed/grant-deed?mode=modern`
2. See clean header with toggle (top right)
3. Complete property search
4. Answer Q&A prompts (one at a time)
5. Review deed details
6. Click "Confirm & Generate" → See "Generating..."
7. Redirect to preview **with** `?mode=modern` in URL
8. Click toggle anytime to switch back to Classic

**If ANY step is different**, let me know!

---

**Happy Testing! 🎉**


