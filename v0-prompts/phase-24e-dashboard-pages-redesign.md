# Phase 24-E: Dashboard Pages V0 Redesign Instructions

**Date:** November 3, 2025  
**Scope:** Create Deed Selection, Past Deeds, Shared Deeds, Account Settings  
**Goal:** Modern, tactile UI while preserving 100% of existing functionality

---

## 🎯 **OVERALL DESIGN PRINCIPLES**

### Visual Identity
- **Design System:** Shadcn/UI components with Tailwind CSS
- **Color Palette:**
  - Primary: `#6366F1` (Indigo) for CTAs and highlights
  - Success: `#22C55E` (Green) for completed/approved states
  - Warning: `#F59E0B` (Amber) for pending/in-progress
  - Error: `#EF4444` (Red) for rejected/expired
  - Neutral: Slate scale for text and backgrounds
- **Typography:**
  - Headings: Inter/Geist Sans, weights 600-700
  - Body: Inter/Geist Sans, weights 400-500
  - Monospace: JetBrains Mono for code snippets
- **Spacing:** Consistent 4px grid system
- **Shadows:** Soft, layered elevation (sm/md/lg/xl)
- **Animations:** Smooth transitions (150-300ms), hover states, micro-interactions

### UX Standards
- **Accessibility:** WCAG 2.1 AA compliance
- **Responsive:** Mobile-first, breakpoints at 640/768/1024/1280/1536px
- **Loading States:** Skeleton loaders, spinners with context
- **Empty States:** Friendly illustrations with clear CTAs
- **Error States:** Helpful messages with recovery actions

---

## 📄 **PAGE 1: CREATE DEED (Deed Selection Page)**

### Current State Analysis
**File:** `frontend/src/app/create-deed/page.tsx`

**Existing Functionality:**
1. Fetches document types from `/api/doc-types` endpoint
2. Displays cards for each deed type (Grant Deed, Quitclaim, Interspousal, Warranty, Tax)
3. Shows description, process steps, and icons for each deed type
4. Clears wizard localStorage on deed selection (lines 70-76)
5. Navigates to `/create-deed/[docType]` on selection
6. Loading state with spinner
7. Error state with retry button
8. Empty state fallback

**Critical Business Logic (MUST PRESERVE):**
```typescript
// Line 67-80: Clear wizard localStorage when starting NEW deed
const handleDocumentTypeSelect = (docTypeKey: string) => {
  console.log('[CreateDeedPage] 🔄 Starting new deed - clearing all wizard localStorage');
  if (typeof window !== 'undefined') {
    localStorage.removeItem(WIZARD_DRAFT_KEY_MODERN);
    localStorage.removeItem(WIZARD_DRAFT_KEY_CLASSIC);
    sessionStorage.setItem('deedWizardCleared', 'true');
  }
  router.push(`/create-deed/${docTypeKey.replace('_', '-')}`);
};
```

### V0 Design Prompt

```
Create a modern deed selection page for a California legal document platform called DeedPro.

LAYOUT:
- Use the existing Sidebar component (do not redesign)
- Main content area with max-width 1400px, centered
- Hero section at top with heading and description
- Grid of deed type cards below

HERO SECTION:
- Heading (H1): "Create Legal Document" - font size 3xl/4xl, font weight 700, text slate-800
- Subheading: "Select the type of legal document you need to create. Our AI-powered wizard will guide you through the process step by step."
- Font size lg, text slate-600, max width 3xl, centered

DEED TYPE CARDS:
- Grid layout: 1 column on mobile, 2 on tablet, 3 on desktop
- Gap between cards: 1.5rem
- Each card should have:
  * White background with rounded-xl corners
  * Soft shadow (shadow-md) that lifts to shadow-lg on hover
  * Border: 1px solid slate-200
  * Padding: 2rem
  * Smooth scale transform on hover (scale-105)
  * Cursor pointer
  * Transition duration 200ms

CARD STRUCTURE (for each deed type):
1. ICON + TITLE ROW:
   - Document icon (use Lucide React FileText icon, 24px)
   - Background: indigo-50, rounded-lg, 48px square
   - Icon color: indigo-600
   - Title next to icon: H3, text-xl, font-semibold, slate-800

2. DESCRIPTION:
   - Paragraph below icon/title
   - Text-sm, slate-600, leading-relaxed
   - Min height 60px for alignment across cards

3. PROCESS STEPS:
   - Label: "Process Steps:" - text-xs, font-medium, slate-500
   - Chip-style badges for each step
   - Background slate-100, text slate-700, text-xs
   - Format: "1. Request Details", "2. Transfer Tax", etc.
   - Wrap in multiple rows if needed

4. ACTION FOOTER:
   - "Start Wizard" text in indigo-600, font-medium
   - Chevron right icon (Lucide React ChevronRight)
   - Flex row with items-center, text-sm

DEED TYPES TO DISPLAY:
1. Grant Deed: "Transfer property ownership with warranties against defects during grantor's ownership. Most commonly used in California real estate transactions and sales."
   Steps: Request Details, Transfer Tax, Parties & Property, Review, Generate

2. Quitclaim Deed: "Release all interest in property without warranties. Ideal for family transfers, clearing title defects, or removing a name from property ownership records."
   Steps: Generate PDF

3. Interspousal Transfer Deed: "Transfer property between spouses without reassessment or documentary transfer tax. Perfect for divorce settlements or changing ownership between married partners."
   Steps: Generate PDF

4. Warranty Deed: "Provide comprehensive guarantees against all title defects throughout property history. Offers maximum protection for buyers in commercial transactions."
   Steps: Generate PDF

5. Tax Deed: "Document property transfers resulting from tax sales or foreclosures. Used by government entities to convey ownership after unpaid property tax proceedings."
   Steps: Generate PDF

STATES TO HANDLE:
1. Loading: Center-aligned spinner with "Loading document types..." text
2. Error: Red warning icon (AlertCircle), error message, "Try Again" button (indigo-600 bg, white text)
3. Empty: Document emoji 📄, "No Document Types Available" heading, support contact text

INTERACTIONS:
- On card click: trigger handleDocumentTypeSelect function
- Hover effects: shadow lift, scale up, smooth transitions

Use Tailwind CSS, Shadcn/UI components, Lucide React icons. Make it feel premium and tactile.
```

---

## 📚 **PAGE 2: PAST DEEDS**

### Current State Analysis
**File:** `frontend/src/app/past-deeds/page.tsx`

**Existing Functionality:**
1. Fetches deeds from `/deeds` endpoint with auth token
2. Displays table with columns: Property, Deed Type, Status, Progress, Created, Updated, Actions
3. Status badges (completed/draft/in_progress)
4. Progress bars with percentage
5. Actions:
   - **Continue** (for drafts)
   - **Download** (for completed, uses `pdf_url`)
   - **Share** (for completed, opens modal)
   - **Delete** (confirmation dialog)
6. Share modal with full form:
   - Recipient name, email, role, message, expiry days
   - POST to `/shared-deeds` endpoint
7. "Create New Deed" button (links to `/create-deed`)
8. Count display: "Showing X deeds"

**Critical API Integration (MUST PRESERVE):**
```typescript
// Lines 24-46: Fetch deeds from backend
useEffect(() => {
  const api = process.env.NEXT_PUBLIC_API_URL || ...;
  const token = localStorage.getItem('access_token');
  // Fetch from ${api}/deeds with Authorization header
  // Set deeds array from response
}, []);

// Lines 97-149: Share modal POST to /shared-deeds
const handleAddRecipients = async () => {
  const response = await fetch(`${api}/shared-deeds`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({
      deed_id: selectedDeedId,
      recipient_name, recipient_email, recipient_role, message, expires_in_days
    })
  });
};
```

### V0 Design Prompt

```
Create a modern "Past Deeds" page for a California legal document platform. This is a data table page with actions.

LAYOUT:
- Use existing Sidebar (do not redesign)
- Main content area with contact-wrapper class
- Max width: full width for table responsiveness

HEADER SECTION:
- Page title (H1): "Past Deeds" - text-4xl, font-bold, slate-800
- Description: "View and manage all your created deeds. Continue working on drafts or download completed documents."
- Subheader bar with:
  * Left: "Showing X deeds" counter (text-lg, slate-600)
  * Right: "📝 Create New Deed" button (primary style, indigo-600 bg, white text, rounded-lg, shadow-sm, hover:shadow-md)

TABLE DESIGN:
- Use Shadcn/UI Table component or similar
- Striped rows (alternate slate-50 background)
- Hover effect on rows (bg-slate-100)
- Rounded corners on table container
- Shadow-md elevation
- Responsive: horizontal scroll on mobile

COLUMNS:
1. Property Address - font-weight 500, slate-800
2. Deed Type - slate-600
3. Status - Badge component:
   * Completed: green-100 bg, green-800 text, "Completed"
   * Draft: amber-100 bg, amber-800 text, "Draft"
   * In Progress: blue-100 bg, blue-800 text, "In Progress"
   * Rounded-full, px-3 py-1, text-xs, font-medium
4. Progress - Visual progress bar:
   * Container: gray-200 bg, 80px width, 8px height, rounded-full
   * Fill: indigo-600 bg (or green-500 if 100%), rounded-full, smooth transition
   * Percentage text next to bar: slate-600, text-sm
5. Created - format date as MM/DD/YYYY
6. Last Updated - format date as MM/DD/YYYY
7. Actions - Button group with gap-2:
   * Continue (drafts only): indigo-600 bg, white text, "Continue", padding 0.5rem 1rem, text-sm
   * Download (completed only): indigo-600 bg, white text, "Download", same styling
   * Share (completed only): slate-600 bg, white text, "Share", same styling
   * Delete (all): red-50 bg, red-600 text, red-200 border, "Delete", same styling, confirm dialog on click

STATES:
- Loading: Centered spinner in table row spanning all columns, "Loading deeds..." text
- Error: Red alert icon, error message in table row
- Empty: Center-aligned in table, slate-600 text, "No deeds yet. Create your first deed" with link to /create-deed

SHARE MODAL (triggered by Share button):
- Modal overlay: rgba(0,0,0,0.5) with backdrop blur
- Modal card: white bg, rounded-xl, shadow-2xl, max-width 550px, padding 2.5rem
- Header: "Share Deed" title (text-2xl, font-semibold), close button (X icon, slate-400, hover:slate-600)
- Form fields (vertical stack with gap-4):
  1. Recipient Name * - text input, full width
  2. Recipient Email * - email input, full width
  3. Recipient Role - select dropdown:
     * Options: Title Officer, Lender, Escrow Officer, Attorney, Other
  4. Message (Optional) - textarea, 3 rows
  5. Expiry Days - hidden or auto-set to 30
- Error banner (if shareError): red-50 bg, red-600 text, rounded-lg, padding 1rem
- Footer buttons:
  * Cancel: slate-200 bg, slate-700 text
  * Share Deed: indigo-600 bg, white text, loading state shows "Sending..."
  * Gap-3, justify-end

INTERACTIONS:
- Continue: alert (or navigate to /create-deed with deed ID)
- Download: open pdf_url in new tab if available, else alert
- Share: open modal, POST form data to /shared-deeds endpoint
- Delete: confirm dialog, filter out deleted deed from state

Use Shadcn/UI components, Lucide React icons (FileText, Download, Share2, Trash2, AlertCircle, CheckCircle), Tailwind CSS.
```

---

## 📤 **PAGE 3: SHARED DEEDS**

### Current State Analysis
**File:** `frontend/src/app/shared-deeds/page.tsx`

**Existing Functionality:**
1. Fetches shared deeds from `/shared-deeds` endpoint with auth token
2. Displays table with columns: Property, Deed Type, Shared With, Status, Shared Date, Expires, Response, Actions
3. Status badges (sent/viewed/approved/rejected/expired)
4. **Rejection feedback:** "View Feedback" button for rejected deeds
5. Expiry tracking with "X days left" countdown (red if ≤3 days)
6. Actions:
   - **Remind** (resend reminder via POST `/shared-deeds/{id}/resend`)
   - **Revoke** (revoke access via POST `/shared-deeds/{id}/revoke`)
7. "Share New Deed" button (opens share modal)
8. Share modal for sharing from available deeds
9. FeedbackModal component for viewing rejection comments

**Critical API Integration (MUST PRESERVE):**
```typescript
// Lines 36-53: Fetch shared deeds
async function refresh() {
  const res = await fetch(`${api}/shared-deeds`, { 
    headers: token ? { Authorization: `Bearer ${token}` } : {} 
  });
  const data = await res.json();
  setSharedDeeds(Array.isArray(data) ? data : data.shared_deeds || []);
}

// Lines 60-68: View feedback for rejected deeds
const onViewFeedback = async (shareId: string) => {
  const data = await getShareFeedback(parseInt(shareId), token);
  setFeedbackModal({ open: true, text: data.feedback || '(No comments provided)' });
};

// Lines 283-295: Resend reminder
onClick={async () => {
  await fetch(`${api}/shared-deeds/${sharedDeed.id}/resend`, { 
    method: 'POST', headers: token ? { Authorization: `Bearer ${token}` } : {} 
  });
  refresh();
}}

// Lines 320-332: Revoke access
onClick={async () => {
  await fetch(`${api}/shared-deeds/${sharedDeed.id}/revoke`, { 
    method: 'POST', headers: token ? { Authorization: `Bearer ${token}` } : {} 
  });
  refresh();
}}
```

### V0 Design Prompt

```
Create a modern "Shared Deeds" page for tracking deed approvals and collaboration. This is a data-heavy table page with real-time status tracking.

LAYOUT:
- Use existing Sidebar
- Main content area, full width for table
- contact-wrapper class

HEADER:
- Title (H1): "Shared Deeds" - text-4xl, font-bold, slate-800
- Description: "Track deeds shared for approval and manage collaboration with title companies, lenders, and other parties."
- Subheader bar:
  * Left: "X shared deeds" counter (slate-600, text-lg)
  * Right: "🤝 Share New Deed" button (indigo-600 bg, white text, rounded-lg, shadow-sm, hover:shadow-md)

TABLE:
- Shadcn/UI table, striped rows, hover effects
- Shadow-md, rounded corners

COLUMNS:
1. Property - font-weight 500, slate-800
2. Deed Type - slate-600
3. Shared With - email/name of recipient
4. Status - Badge + optional "View Feedback" link:
   * Sent: blue-100 bg, blue-800 text
   * Viewed: amber-100 bg, amber-800 text
   * Approved: green-100 bg, green-800 text
   * Rejected: red-100 bg, red-800 text (with "View Feedback" link next to it)
   * Expired: slate-100 bg, slate-800 text
   * "View Feedback" link: red-600 text, underline, text-sm, clickable
5. Shared Date - MM/DD/YYYY format
6. Expires - Two lines:
   * Date: MM/DD/YYYY
   * Countdown: "X days left" (red-500 if ≤3 days, slate-500 otherwise), text-xs
   * Hide countdown if expired or approved/rejected
7. Response - Two lines if viewed:
   * "Pending" or response date
   * "Viewed: MM/DD/YYYY" in smaller text-xs, slate-500
   * "Not viewed" if no viewed_at
8. Actions - Button group:
   * Remind: slate-600 bg, white text, "Remind", padding 0.5rem 1rem, text-sm (only if not expired and not approved/rejected/revoked)
   * Revoke: red-50 bg, red-600 text, red-200 border, "Revoke", same styling (hide if already revoked)

STATES:
- Loading: spinner in table, "Loading shared deeds..."
- Error: red alert, error message
- Empty: "No shared deeds yet. Share a deed from Past Deeds" with link

SHARE NEW DEED MODAL (when "Share New Deed" clicked):
- Modal overlay with backdrop blur
- White card, rounded-xl, shadow-2xl, max-width 600px
- Header: "Share Deed for Review" title, close X button
- Form (vertical stack, gap-4):
  1. Select Deed - dropdown with available deeds (property addresses as options)
  2. Email Recipients - textarea, placeholder "Enter email addresses separated by commas..."
  3. Expiry Period - select dropdown: 7 days, 14 days, 30 days, 60 days (default 30)
  4. Message (Optional) - textarea, 4 rows
- Footer: Cancel (slate), Share Deed (indigo-600) buttons

FEEDBACK MODAL (when "View Feedback" clicked on rejected deed):
- Use FeedbackModal component (already exists, do not redesign)
- Triggered by onViewFeedback function
- Displays title "Reviewer Feedback", comments text, and close button

INTERACTIONS:
- View Feedback: fetch from getShareFeedback(shareId, token), display in FeedbackModal
- Remind: POST to /shared-deeds/{id}/resend, then refresh()
- Revoke: POST to /shared-deeds/{id}/revoke, then refresh()
- Share New Deed: (placeholder alert for now, or POST to /shared-deeds)

EXPIRY LOGIC:
- Calculate days remaining: (expiry_date - now) / (1000*60*60*24)
- Show "Expires today" if 0 days
- Show "X days left" if > 0
- Red text if ≤ 3 days
- If expired AND status not approved/rejected, show "Expired" badge

Use Shadcn/UI, Lucide React icons (Send, XCircle, Eye, Clock, CheckCircle, XOctagon), Tailwind CSS.
```

---

## ⚙️ **PAGE 4: ACCOUNT SETTINGS**

### Current State Analysis
**File:** `frontend/src/app/account-settings/page.tsx`

**Existing Functionality:**
1. **5 Tabs:** Profile, Billing, Notifications, Security, Widget Add-on
2. **Profile Tab:**
   - Personal info form (first name, last name, email, phone, company)
   - Address form (street, city, state, zip)
   - Save button
3. **Billing Tab:**
   - Current plan display (fetches from `/users/profile`)
   - Plan comparison cards (Starter/Professional/Enterprise)
   - Upgrade button (POST to `/users/upgrade`, redirects to Stripe)
   - Manage Subscription button (POST to `/payments/create-portal-session`, redirects to Stripe portal)
   - Payment methods section (hardcoded Visa card)
   - Billing history table (hardcoded)
4. **Notifications Tab:**
   - Email notification preferences (4 checkboxes)
5. **Security Tab:**
   - Change password form (3 fields)
   - 2FA enable button
6. **Widget Add-on Tab:**
   - Status display (enabled/disabled)
   - Embed key display with copy button
   - Usage instructions

**Critical API Integration (MUST PRESERVE):**
```typescript
// Lines 93-113: Fetch user profile
const fetchUserProfile = async () => {
  const response = await fetch(`${api}/users/profile`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const profile = await response.json();
  setUserProfile(profile); // Contains plan, plan_limits, widget_addon, embed_key
};

// Lines 115-145: Upgrade plan
const handleUpgrade = async (planKey: string) => {
  const response = await fetch(`${api}/users/upgrade`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ plan: planKey })
  });
  const data = await response.json();
  window.location.href = data.session_url; // Redirect to Stripe
};

// Lines 147-174: Manage subscription (Stripe portal)
const handleManageSubscription = async () => {
  const response = await fetch(`${api}/payments/create-portal-session`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const data = await response.json();
  window.location.href = data.url; // Redirect to Stripe portal
};

// Lines 180-199: Copy embed snippet
const copySnippet = () => {
  const snippet = `<script>...</script><iframe>...</iframe>`;
  navigator.clipboard.writeText(snippet);
  alert('Snippet copied!');
};
```

### V0 Design Prompt

```
Create a modern "Account Settings" page for a SaaS legal document platform. This is a multi-tab settings page with forms and billing integration.

LAYOUT:
- Use existing Sidebar
- Main content in settings-container class
- Max-width 1200px, centered

HEADER:
- Title (H1): "Account Settings" - text-4xl, font-bold, slate-800, mb-3
- Description: "Manage your account preferences and billing information." - text-lg, slate-600

TABS NAVIGATION:
- Horizontal tab bar with 5 tabs:
  * Profile, Billing, Notifications, Security, Widget Add-on
- Active tab: indigo-600 border-bottom (3px), indigo-600 text, font-semibold
- Inactive tabs: slate-500 text, hover:slate-700, border-bottom transparent
- Tab padding: 1rem 1.5rem, rounded-t-lg
- Smooth transitions

---

TAB 1: PROFILE
- Two sections: "Personal Information" and "Address Information"
- Form fields in 2-column grid on desktop, 1-column on mobile:
  * First Name, Last Name (row)
  * Email Address, Phone Number (row)
  * Company (full width)
  * Street Address (full width)
  * City, State (row)
  * ZIP Code (half width)
- Input styling: border slate-300, rounded-lg, padding 0.75rem, focus:ring-2 ring-indigo-500
- Labels: text-sm, font-medium, slate-700, mb-2
- Save Changes button at bottom: indigo-600 bg, white text, rounded-lg, px-6 py-3, shadow-sm, hover:shadow-md

---

TAB 2: BILLING
Section 1: Current Plan Status
- Card with plan info:
  * Left side: Plan name (e.g., "Professional Plan"), plan features list, limits display
  * Right side: Price ($29 or $99 or Free), "per month" label
  * Background: slate-50, border indigo-200 if active plan
  * Padding 1.5rem, rounded-xl
- "Manage Subscription" button (if not free plan):
  * Indigo-600 bg, white text, opens Stripe billing portal
  * Loading state: "Loading..." text

Section 2: Choose Your Plan
- 3 plan cards in grid (1 col mobile, 3 cols desktop):
  * STARTER: Free, 5 deeds/month, basic AI, standard templates, email support
  * PROFESSIONAL: $29/month, unlimited deeds, advanced AI, SoftPro integration, priority support
  * ENTERPRISE: $99/month, everything in Pro + Qualia + API + team mgmt + 24/7 support
- Card styling:
  * Border: slate-200 (indigo-500 if current plan)
  * Background: white (indigo-50 if current plan)
  * Padding: 1.5rem, rounded-xl
  * "CURRENT" badge at top-right if user is on this plan (indigo-600 bg, white text)
- Features list: checkmark icons (green-500) next to each feature, text-sm
- Upgrade button at bottom of each card:
  * Indigo-600 bg if not current plan
  * Slate-300 bg, disabled if current plan
  * Text: "Upgrade to Pro" / "Upgrade to Enterprise" / "Current Plan"

Section 3: Payment Methods
- Card display: VISA logo (blue bg, white text), •••• •••• •••• 4242, Expires 12/26
- "Default" badge: green-100 bg, green-800 text
- "+ Add Payment Method" button: slate border, white bg, slate-700 text, hover:bg-slate-50

Section 4: Billing History
- Table with columns: Date, Description, Amount, Status
- Sample rows: "Professional Plan - Monthly", "$29.00", "Paid" (green badge)
- Striped rows, hover effect

---

TAB 3: NOTIFICATIONS
- Email Notifications section
- 4 notification toggles (vertical stack):
  1. Deed completion notifications - "Get notified when your deeds are ready"
  2. Payment receipts - "Receive receipts for all payments"
  3. Shared deed updates - "Notifications when shared deeds are approved or rejected"
  4. Marketing communications - "Product updates and feature announcements"
- Each toggle:
  * Checkbox on left, label + description on right
  * Border slate-200, rounded-lg, padding 1rem, cursor pointer
  * Hover: bg-slate-50

---

TAB 4: SECURITY
Section 1: Change Password
- 3 password fields (vertical stack):
  * Current Password
  * New Password
  * Confirm New Password
- Max-width 500px
- "Update Password" button: indigo-600 bg, white text

Section 2: Two-Factor Authentication
- Card with 2FA info:
  * Left: "SMS Authentication" heading, description "Add an extra layer of security to your account"
  * Right: "Enable 2FA" button (slate-600 bg)
  * Background: slate-50, padding 1.5rem, rounded-lg

---

TAB 5: WIDGET ADD-ON
Section 1: Widget Status Card
- Display widget add-on status:
  * If enabled: green border (green-500), green-50 bg, "✅ Enabled" heading, "$49 per month" price
  * If disabled: slate border, slate-50 bg, "❌ Disabled" heading, "N/A" price
- Left: Status heading + description
- Right: Price display (large font)

Section 2: Embed Key (if enabled)
- White card, green border, rounded-xl
- Heading: "🔑 Your Embed Key"
- Key display: monospace font, slate-800 bg, padding 1rem, rounded-lg, word-break all
- "📋 Copy Embed Snippet" button: blue-500 bg, white text, hover:blue-600

Section 3: Upgrade Prompt (if disabled)
- Blue-50 bg, rounded-xl, padding 2rem, text-center
- Icon: 🔧 (large)
- Heading: "Widget Add-On Not Enabled"
- Description: "Contact your administrator to enable..."
- Info box: slate-100 bg, "💡 Widget Add-On: $49/month additional charge"

---

GLOBAL STYLES:
- Use Shadcn/UI form components
- Input focus: ring-2 ring-indigo-500, border-indigo-500
- Button hover: shadow lift, slight scale
- Smooth transitions (150-200ms)
- Responsive breakpoints: mobile-first

INTERACTIONS:
- Profile: Save button triggers handleSave() (alert for now)
- Billing: Upgrade buttons call handleUpgrade(planKey), Manage Subscription calls handleManageSubscription()
- Widget: Copy button calls copySnippet() (copies to clipboard)

Use Shadcn/UI, Lucide React icons (User, CreditCard, Bell, Lock, Code, Check, ChevronRight), Tailwind CSS.
```

---

## 🔧 **IMPLEMENTATION CHECKLIST**

### For Each Page

#### Step 1: Generate with V0
- [ ] Copy the V0 prompt for the page
- [ ] Paste into V0 chat interface
- [ ] Review generated code
- [ ] Download zip file

#### Step 2: Code Review & Preparation
- [ ] Extract TSX component from zip
- [ ] Check for Shadcn/UI component dependencies
- [ ] Verify icon imports (Lucide React)
- [ ] Identify any custom components needed

#### Step 3: Integration Strategy
**CRITICAL:** Use route groups with isolated layouts (per Phase 24-A lessons)

```typescript
// Create isolated route group structure
frontend/src/app/(v0-pages)/
├── layout.tsx          // V0-specific layout (NO global CSS imports)
├── create-deed-v0/
│   └── page.tsx        // V0 Create Deed component
├── past-deeds-v0/
│   └── page.tsx        // V0 Past Deeds component
├── shared-deeds-v0/
│   └── page.tsx        // V0 Shared Deeds component
└── settings-v0/
    └── page.tsx        // V0 Settings component
```

**Layout file:**
```typescript
// frontend/src/app/(v0-pages)/layout.tsx
export default function V0Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
```

#### Step 4: Business Logic Integration
For each page, preserve critical functions:

**Create Deed:**
- [ ] Import `WIZARD_DRAFT_KEY_MODERN`, `WIZARD_DRAFT_KEY_CLASSIC` from persistence keys
- [ ] Implement `handleDocumentTypeSelect()` with localStorage clearing
- [ ] Connect to `/api/doc-types` endpoint
- [ ] Preserve loading/error/empty states

**Past Deeds:**
- [ ] Connect to `/deeds` endpoint with auth token
- [ ] Implement `handleContinue()`, `handleDownload()`, `handleShare()`, `handleDelete()`
- [ ] Build share modal with POST to `/shared-deeds`
- [ ] Preserve progress bar calculation
- [ ] Preserve status badge logic

**Shared Deeds:**
- [ ] Connect to `/shared-deeds` endpoint
- [ ] Implement `refresh()` function
- [ ] Implement `onViewFeedback()` with `getShareFeedback()` API call
- [ ] Implement Remind (POST to `/shared-deeds/{id}/resend`)
- [ ] Implement Revoke (POST to `/shared-deeds/{id}/revoke`)
- [ ] Import FeedbackModal component
- [ ] Preserve expiry countdown logic (days remaining calculation)

**Settings:**
- [ ] Import `fetchUserProfile()` on mount
- [ ] Implement `handleUpgrade()` with Stripe redirect
- [ ] Implement `handleManageSubscription()` with Stripe portal redirect
- [ ] Implement `copySnippet()` with clipboard API
- [ ] Preserve all form state management
- [ ] Connect to `/users/profile`, `/users/upgrade`, `/payments/create-portal-session`

#### Step 5: Testing Matrix
For each page:
- [ ] **Load Test:** Page renders without errors
- [ ] **API Test:** All endpoints called correctly with auth tokens
- [ ] **Loading State:** Spinner/skeleton displays during fetch
- [ ] **Error State:** Error message displays if API fails
- [ ] **Empty State:** Empty state displays if no data
- [ ] **Success State:** Data displays correctly in UI
- [ ] **Interaction Test:** All buttons/links trigger correct actions
- [ ] **Modal Test:** Modals open/close correctly
- [ ] **Form Test:** Form submissions work (validation, API calls)
- [ ] **Responsive Test:** Mobile, tablet, desktop layouts
- [ ] **Auth Test:** Unauthenticated users handled gracefully

#### Step 6: A/B Testing Deployment
- [ ] Deploy V0 version to `/[page]-v0` route
- [ ] Keep original page at `/[page]` route
- [ ] Add temporary link in Sidebar for testing
- [ ] User tests both versions
- [ ] Document feedback

#### Step 7: Production Cutover
Once approved:
- [ ] Move V0 component to main route (`/[page]`)
- [ ] Remove old component
- [ ] Remove temporary links
- [ ] Update `START_HERE.md` with completion

---

## 📝 **NOTES & BEST PRACTICES**

### From Phase 24-A Lessons Learned

1. **Route Groups Are Essential:**
   - V0 CSS will cascade to other pages if not isolated
   - Use `(v0-pages)` route group with empty layout
   - See `docs/V0_INTEGRATION_LESSONS_LEARNED.md`

2. **Component Reuse:**
   - Keep existing Sidebar component
   - Keep existing FeedbackModal component (Shared Deeds)
   - Import existing auth functions (get token from localStorage)
   - Import existing API utilities if available

3. **Environment Variables:**
   - `NEXT_PUBLIC_API_URL` for backend API
   - Access with `process.env.NEXT_PUBLIC_API_URL || 'https://deedpro-main-api.onrender.com'`

4. **Auth Pattern:**
   ```typescript
   const token = localStorage.getItem('access_token');
   const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
   ```

5. **Error Handling:**
   - Always wrap API calls in try/catch
   - Set loading states before fetch
   - Set error states on catch
   - Provide user-friendly error messages with recovery actions

6. **TypeScript:**
   - Maintain existing type definitions
   - Add new types as needed
   - Use strict type checking

7. **Accessibility:**
   - Semantic HTML (table, thead, tbody for tables)
   - ARIA labels for icons-only buttons
   - Keyboard navigation for modals
   - Focus management for interactive elements

---

## 🎨 **V0 DESIGN ASSETS TO REFERENCE**

When generating with V0, you can optionally attach:
- Screenshot of current page (saved in browser testing)
- Color palette reference
- Typography scale
- Spacing system

V0 will use these as visual references to match the design style.

---

## ✅ **SUCCESS CRITERIA**

Phase 24-E is complete when:
1. ✅ All 4 pages have modern V0 designs
2. ✅ 100% of existing functionality preserved
3. ✅ All API integrations working (auth, endpoints, error handling)
4. ✅ All user interactions tested (buttons, forms, modals, tables)
5. ✅ Responsive design verified on mobile, tablet, desktop
6. ✅ No CSS cascade issues (isolated layouts)
7. ✅ User approves final designs
8. ✅ V0 versions deployed to production routes

---

## 📦 **DELIVERABLE**

User will provide ZIP file from V0 for each page. Assistant will:
1. Extract and review code
2. Identify dependencies
3. Create route group structure
4. Integrate business logic
5. Test all functionality
6. Deploy for user testing
7. Iterate based on feedback
8. Cut over to production

**Let's modernize these pages! 🚀**

