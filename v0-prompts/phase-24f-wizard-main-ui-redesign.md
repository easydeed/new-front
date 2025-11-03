# V0 Prompt: DeedPro Wizard Main UI Redesign

**Goal**: Modernize the wizard's main container, progress bar, and step shell while preserving 100% of existing business logic.

---

## 🎯 **DESIGN REQUIREMENTS**

### **1. Main Content Layout Fix**
**Current Issue**: Main content has ~200px left padding, pushing content too far right.

**Required Changes**:
- Reduce left padding to `max-w-5xl mx-auto px-6 md:px-10 lg:px-16`
- Center content properly with balanced whitespace
- Use same spacing pattern as the new dashboard pages (Create Deed, Past Deeds, etc.)
- Ensure content uses available width efficiently

### **2. Property Search Connection (Step 1)**
**Current Issue**: Property search feels isolated from the wizard flow.

**Required Changes**:
- Add visual connection between progress bar and PropertySearch component
- Include step number badge "1" with purple gradient background
- Add "Step 1 of X" text above the property search
- Show progress bar at the top (not isolated)
- Use consistent card styling with subtle shadow and border

### **3. Progress Bar Enhancement**
**Current Issue**: Progress bar numbers are basic, feels crushed and small.

**Required Changes**:
- Make progress bar more prominent (larger size, better spacing)
- Use elaborate step numbers with:
  - Larger circular badges (w-12 h-12 instead of w-8 h-8)
  - Purple gradient background for current step
  - Check icon ✓ for completed steps
  - Subtle animation on step transitions
- Add step titles below the numbers
- Show connecting lines between steps (gradient from purple to gray)
- Add step status indicators (Completed, Current, Upcoming)

### **4. Overall Spacing & Polish**
- Use the same gradient background: `bg-gradient-to-br from-slate-50 via-white to-slate-50`
- Add subtle shadow to main wizard card
- Increase padding around steps for breathing room
- Match the modern, spacious feel of the new dashboard pages

---

## 🏗️ **COMPONENT STRUCTURE**

You are redesigning the **wizard shell/container**, NOT the individual step components. The wizard has these parts:

1. **ProgressBar Component** (needs redesign)
2. **StepShell/Container** (needs redesign)
3. **PropertySearch** (existing component - just needs better integration)
4. **SmartReview** (existing component - already modernized)
5. **Step Components** (existing - don't touch)

---

## 🎨 **DETAILED DESIGN SPECS**

### **A. Enhanced Progress Bar Component**

```typescript
// Location: frontend/src/features/wizard/mode/components/ProgressBar.tsx
// Current: Basic numbered circles with small labels
// New: Elaborate progress indicator with animations

interface ProgressBarProps {
  currentStep: number
  totalSteps: number
  steps: Array<{ key: string; title: string }>
}
```

**Design Elements**:

1. **Container**:
   - Full width with max-w-5xl mx-auto
   - bg-white with rounded-2xl shadow-md border border-slate-200
   - Padding: py-8 px-6 md:px-10
   - Margin bottom: mb-8

2. **Step Indicators**:
   - Large circular badges: `w-12 h-12 md:w-14 md:h-14`
   - Font size for numbers: `text-lg md:text-xl font-bold`
   - Completed steps: Green background `bg-green-500` with white checkmark ✓
   - Current step: Purple gradient `bg-gradient-to-br from-[#7C4DFF] to-[#6a3de8]` with white number
   - Future steps: Gray background `bg-slate-200` with slate-600 number
   - Box shadow on current step: `shadow-lg shadow-purple-500/30`
   - Transition: `transition-all duration-300`

3. **Connecting Lines**:
   - Between step circles
   - Height: `h-1` on mobile, `h-1.5` on desktop
   - Completed line: `bg-green-500`
   - Upcoming line: `bg-slate-300`
   - Gradient transition at current step
   - Flex-1 to fill space between steps

4. **Step Labels**:
   - Below each circle
   - Text size: `text-xs md:text-sm`
   - Font weight: `font-medium`
   - Current step: `text-[#7C4DFF] font-semibold`
   - Completed: `text-slate-700`
   - Upcoming: `text-slate-500`
   - Max width: 2-3 words (truncate if needed)

5. **Progress Percentage**:
   - Top right corner
   - Show: `"Step X of Y • Z% Complete"`
   - Text: `text-sm font-semibold text-slate-600`
   - Purple accent color for percentage

**Layout**:
```
┌─────────────────────────────────────────────────────────┐
│  Step 1 of 5 • 20% Complete                            │
│                                                         │
│   ┌─────┐ ───── ┌─────┐ ───── ┌─────┐ ───── ┌─────┐  │
│   │  1  │ ────▶ │  2  │ ────▶ │  3  │ ────▶ │  4  │  │
│   └─────┘       └─────┘       └─────┘       └─────┘  │
│   Property    Request      Parties       Review       │
│   Search      Details      & Property                 │
└─────────────────────────────────────────────────────────┘
```

---

### **B. Step Shell / Container Component**

```typescript
// Location: frontend/src/features/wizard/mode/components/StepShell.tsx
// Purpose: Wraps each step with consistent styling
```

**Design Elements**:

1. **Main Container**:
   ```tsx
   <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
     <Sidebar /> {/* Existing sidebar - don't change */}
     
     <main className="flex-1 p-6 md:p-10 lg:p-16">
       <div className="max-w-5xl mx-auto"> {/* REDUCED from excessive left padding */}
         {/* Progress Bar */}
         <ProgressBar {...} />
         
         {/* Step Content */}
         <div className="bg-white rounded-2xl shadow-md border border-slate-200 overflow-hidden">
           {/* Step Header */}
           <div className="border-b border-slate-200 bg-gradient-to-r from-purple-50 to-white px-8 py-6">
             <div className="flex items-center gap-4">
               {/* Step Badge */}
               <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#7C4DFF] to-[#6a3de8] flex items-center justify-center shadow-lg">
                 <span className="text-xl font-bold text-white">{currentStep}</span>
               </div>
               
               {/* Step Title */}
               <div>
                 <div className="text-sm text-slate-500 font-medium">Step {currentStep} of {totalSteps}</div>
                 <h2 className="text-2xl md:text-3xl font-bold text-slate-800">{stepTitle}</h2>
               </div>
             </div>
           </div>
           
           {/* Step Body */}
           <div className="p-8 md:p-10">
             {children} {/* Existing step content - PropertySearch, SmartReview, etc. */}
           </div>
         </div>
       </div>
     </main>
   </div>
   ```

2. **Spacing Guidelines**:
   - Max width: `max-w-5xl` (matches new dashboard pages)
   - Horizontal padding: `px-6 md:px-10 lg:px-16`
   - Step card padding: `p-8 md:p-10`
   - Gap between progress bar and step card: `mb-8`

---

### **C. Property Search Step Integration**

**Current State**: PropertySearch component exists and works perfectly.

**What You're Changing**: Only the wrapper/shell around it.

```tsx
{/* Step 1: Property Search */}
<StepShell 
  currentStep={1} 
  totalSteps={5}
  stepTitle="Property Search & Verification"
  stepDescription="Enter the property address to begin your deed creation"
>
  {/* ✅ EXISTING PropertySearch component - DO NOT CHANGE */}
  <PropertySearchWithTitlePoint {...existingProps} />
</StepShell>
```

**Visual Connection**:
- Progress bar shows "Step 1" highlighted in purple
- Step header shows "Step 1 of 5" badge
- Purple gradient accent connects header to content
- PropertySearch component stays exactly as-is

---

## 🎨 **VISUAL DESIGN REFERENCE**

**Match These Styles** (from the new dashboard pages):

1. **Background**: `bg-gradient-to-br from-slate-50 via-white to-slate-50`
2. **Cards**: `bg-white rounded-2xl shadow-md border border-slate-200`
3. **Purple Accent**: `#7C4DFF` (primary) and `#6a3de8` (hover)
4. **Typography**:
   - Page Title: `text-4xl md:text-5xl font-bold text-slate-800`
   - Section Title: `text-2xl md:text-3xl font-bold text-slate-800`
   - Body Text: `text-base text-slate-600`
   - Labels: `text-sm font-medium text-slate-700`
5. **Spacing**: Generous padding, breathing room, balanced whitespace

---

## 📐 **RESPONSIVE BREAKPOINTS**

Mobile (< 768px):
- Progress bar: Stack vertically or show current step only
- Step badge: w-10 h-10 (smaller)
- Padding: p-6

Tablet (768px - 1024px):
- Progress bar: Show all steps in horizontal layout
- Step badge: w-12 h-12
- Padding: p-8

Desktop (> 1024px):
- Progress bar: Full width with generous spacing
- Step badge: w-14 h-14
- Padding: p-10

---

## ⚠️ **CRITICAL: BUSINESS LOGIC TO PRESERVE**

### **DO NOT CHANGE**:
1. ✅ All state management (Zustand store)
2. ✅ Step navigation logic (next/back buttons)
3. ✅ Form validation
4. ✅ API calls to backend
5. ✅ PropertySearch component internals
6. ✅ SmartReview component internals
7. ✅ Telemetry tracking
8. ✅ localStorage persistence
9. ✅ finalizeDeed function
10. ✅ Canonical adapters

### **ONLY CHANGE**:
1. ✅ ProgressBar visual design (keep same props interface)
2. ✅ StepShell container styling
3. ✅ Main layout padding/spacing
4. ✅ Step header design
5. ✅ Visual connections between steps

---

## 🔌 **PLUG-AND-PLAY INTEGRATION**

**After V0 generates the code**:

1. **Replace ProgressBar Component**:
   ```bash
   # Copy V0 output to:
   frontend/src/features/wizard/mode/components/ProgressBar.tsx
   ```

2. **Replace StepShell Component** (if needed):
   ```bash
   # Copy V0 output to:
   frontend/src/features/wizard/mode/components/StepShell.tsx
   ```

3. **Update ModernEngine.tsx** (only layout wrapper):
   ```tsx
   // Just update the outer container div
   // Keep ALL existing business logic
   ```

**No other files need to be touched!**

---

## 🎯 **V0 PROMPT TO USE**

Copy this exact prompt to V0:

---

### **V0 Prompt:**

Create a modern, spacious wizard UI with an enhanced progress bar for a multi-step deed creation wizard.

**Components to Generate:**

1. **Enhanced Progress Bar Component**
   - Large circular step indicators (w-12 h-12)
   - Purple gradient (#7C4DFF to #6a3de8) for current step
   - Green with checkmark for completed steps
   - Gray for upcoming steps
   - Connecting lines between steps (gradient transitions)
   - Step labels below each circle
   - Progress percentage in top-right ("Step X of Y • Z% Complete")
   - Smooth transitions and animations
   - Responsive: horizontal on desktop, condensed on mobile

2. **Step Container Shell**
   - Gradient background: `from-slate-50 via-white to-slate-50`
   - Main content: `max-w-5xl mx-auto` with `px-6 md:px-10 lg:px-16`
   - White card with rounded-2xl, shadow-md, border
   - Step header with:
     - Purple gradient badge with step number
     - "Step X of Y" subtitle
     - Step title (2xl font, bold)
     - Purple-to-white gradient background
   - Step body with generous padding (p-8 md:p-10)

3. **Props Interface** (must match existing code):
   ```typescript
   interface ProgressBarProps {
     currentStep: number
     totalSteps: number
     steps: Array<{ key: string; title: string }>
   }
   
   interface StepShellProps {
     currentStep: number
     totalSteps: number
     stepTitle: string
     stepDescription?: string
     children: React.ReactNode
   }
   ```

**Design Requirements:**
- Match the spacious, modern feel of Create Deed page and Past Deeds page
- Use purple accent color (#7C4DFF)
- Generous padding and breathing room
- Smooth animations and transitions
- Responsive design (mobile to desktop)
- Clean, professional UI with subtle shadows

**Visual Style Reference:**
- Background gradient: slate-50 → white → slate-50
- Cards: white with rounded corners and subtle shadow
- Typography: Inter font, bold headers, medium labels
- Icons: Lucide React (Check, Circle, etc.)

Generate only the UI components. Do not include business logic, state management, or API calls.

---

## 📝 **EXPECTED OUTPUT**

V0 will generate:
1. `ProgressBar.tsx` - Enhanced progress indicator
2. `StepShell.tsx` - Modern step container wrapper
3. Example usage code

**You can then plug these directly into the existing wizard!**

---

## ✅ **SUCCESS CRITERIA**

After integration:
- [ ] Main content uses space efficiently (no excessive left padding)
- [ ] Progress bar is prominent and easy to read
- [ ] Step numbers are large and styled beautifully
- [ ] Property Search feels connected to wizard flow
- [ ] Consistent styling with new dashboard pages
- [ ] All existing functionality works (form validation, API calls, navigation)
- [ ] Responsive on all screen sizes
- [ ] Smooth animations and transitions

---

## 🎨 **VISUAL MOCKUP**

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Step 1 of 5 • 20% Complete                           │ │
│  │                                                        │ │
│  │   ●────▶○─────○─────○─────○                          │ │
│  │   1     2     3     4     5                          │ │
│  │  Property Request Parties Review Generate           │ │
│  │  Search  Details  &Property                          │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ ┌────┐                                                 │ │
│  │ │ 1  │  Step 1 of 5                                   │ │
│  │ └────┘  Property Search & Verification               │ │
│  │─────────────────────────────────────────────────────│ │
│  │                                                        │ │
│  │  [PropertySearch Component - existing, don't touch]   │ │
│  │                                                        │ │
│  │  Address search box                                   │ │
│  │  Google Places autocomplete                           │ │
│  │  Property details display                             │ │
│  │  etc...                                               │ │
│  │                                                        │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## 🚀 **READY TO SEND TO V0!**

This prompt gives V0 everything it needs to create a plug-and-play enhancement while preserving all your working business logic.

**Next Steps:**
1. Copy the "V0 Prompt" section above
2. Paste into V0
3. Review the generated code
4. I'll integrate it with proper imports and props
5. Test in browser
6. Deploy!

Let me know when you have the V0 output! 🎯

