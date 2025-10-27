# Partners Dropdown Debug Checklist

## 🔍 Issue: 27 Partners Exist but None Appear

### Step-by-Step Diagnostic

Please open the wizard and check the console for these specific logs:

#### 1. **Partners Loading**
Look for:
```
[PartnersContext] Loading partners… { hasToken: true/false, hasOrgId: true/false, ... }
```

**What to check:**
- `hasToken`: Should be `true` (if false, user not logged in)
- `hasOrgId`: Should be `true` (if false, organization not set)

#### 2. **API Call**
Look for:
```
[partners/selectlist] Route called
[partners/selectlist] Proxying to: https://...
```

**What to check:**
- Does this log appear? (If no, route not being called)
- What URL is it proxying to?

#### 3. **Backend Response**
Look for:
```
[partners/selectlist] Backend response: { status: 200, statusText: "OK", ... }
[partners/selectlist] Response length: XXXX bytes
```

**What to check:**
- Status: Should be 200
- Response length: Should be > 100 bytes (empty array is just "[]" = 2 bytes)

#### 4. **Data Parsing**
Look for:
```
[partners/selectlist] Parsed data: { isArray: true, length: 27, ... }
```

**What to check:**
- `isArray`: Should be `true`
- `length`: Should be 27
- If not, what is it?

#### 5. **Frontend Receiving Data**
Look for:
```
[PartnersContext] Response: { status: 200, ok: true, fallback: null, ... }
[PartnersContext] Raw data: { isArray: true, rawLength: 27, firstItem: {...} }
```

**What to check:**
- `rawLength`: Should be 27
- `firstItem`: Should show first partner details

#### 6. **Data Transformation**
Look for:
```
[PartnersContext] Transformed options: { length: 27, firstLabel: "John Doe" }
```

**What to check:**
- `length`: Should be 27
- `firstLabel`: Should show actual partner name

#### 7. **PrefillCombo Receiving Data**
Look for:
```
[PrefillCombo] { fullListLength: 27, filteredListLength: 27, partnersLength: 27, ... }
```

**What to check:**
- `partnersLength`: Should be 27
- `fullListLength`: Should be 27
- `filteredListLength`: Should be 27 when field is empty

#### 8. **Dropdown Opening**
Look for:
```
[PrefillCombo] Focus - opening dropdown
```

**What to check:**
- Does this appear when you click the field?
- Does `open: true` show in the log after?

---

## 🎯 Possible Issues & Solutions

### Issue A: Partners Array is Empty
**Symptoms:**
- `rawLength: 0` or `length: 0` in logs
- Backend returns empty array

**Solutions:**
1. Check backend: Are partners actually in database?
2. Check organization_id: Is it correct?
3. Check backend filtering: Is it filtering out all partners?

### Issue B: Partners Not Passed to Component
**Symptoms:**
- `PartnersContext` shows 27 partners
- `PrefillCombo` shows `partnersLength: 0`

**Solutions:**
1. Check if `current.field === 'requestedBy'` condition is true
2. Check if `usePartners()` hook is working
3. Check if component is re-rendering after partners load

### Issue C: Dropdown Not Opening
**Symptoms:**
- Partners data exists
- No "Focus - opening dropdown" log

**Solutions:**
1. Check if input is being clicked
2. Check if `onFocus` is being called
3. Check for CSS `display: none` or `visibility: hidden`

### Issue D: Dropdown Hidden by CSS
**Symptoms:**
- All data present
- "Focus - opening dropdown" appears
- `open: true` in logs
- Still can't see dropdown

**Solutions:**
1. Check z-index (should be 999)
2. Check parent overflow: hidden
3. Check positioning (should be absolute)
4. Check if dropdown div is in DOM (inspect element)

---

## 📋 Next Steps Based on Console Output

Please share the FULL console output from when you:
1. Navigate to the "Requested By" step
2. Click the input field
3. Try typing a letter

I'll analyze the logs and pinpoint the exact issue!

