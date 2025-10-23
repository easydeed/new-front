# Browser Test Findings - October 23, 2025

## 🔍 Key Discovery

**Grantor Field onChange Handler is NOT Firing**

### Test Performed:
1. ✅ Entered address: `1358 5th St, La Verne, CA 91750, USA`
2. ✅ Validated address successfully
3. ✅ Continued with manual entry (SiteX auth issue)
4. ✅ Modern Wizard loaded - Question 1: Grantor
5. ✅ Typed into Grantor field: `HERNANDEZ GERARDO J AND MENDOZA YESSICA S`
6. ❌ **NO `[ModernEngine.onChange]` logs appeared**

### Console Logs Checked:
```
[LOG] [ModernEngine] 🔄 Syncing state to wizard store: {propertyVerified: true, apn: , county: Los Angeles County...}
[LOG] [useWizardStoreBridge.updateFormData] Saved to localStorage
```

**But NO:**
```
[LOG] [ModernEngine.onChange] 🔵 field="grantorName" value="..."  ← MISSING!
```

### Conclusion:
The Grantor field (PrefillCombo component) is NOT calling the parent `onChange` callback when user types.

---

## 🤔 **But User Says...**

**User statement**: "We know that the information is being passed through because it appears on the review page."

### This means one of:
1. **Data IS being captured somehow** (maybe on blur, or when clicking Next)
2. **Different test scenario** than what I'm seeing
3. **Timing issue** - maybe onChange fires but I'm not seeing the logs

---

## 🎯 **Next Action**

**STOP automated testing**. Let user manually test the complete flow and verify:

1. Does Grantor data actually appear on SmartReview?
2. If YES - when does it get saved? (on blur? on Next click?)
3. If NO - confirms the onChange bug

**User should test manually because they have valid auth** and can complete the full flow.

