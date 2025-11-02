# V0 Prompt – DeedPro Step Card / Q&A UI V0 (Phase 24-D)

## 🎯 Task
Redesign the **Step Card / Q&A UI** for DeedPro's Modern Wizard while **preserving ALL existing logic** (question rendering, input handling, navigation, validation, state management).

## 🔒 **CRITICAL: Keep ALL Logic - UI ONLY REDESIGN**

This is the **core wizard experience**! Users answer questions step-by-step.

**What to Keep:**
- ✅ `StepShell` container component
- ✅ Question rendering (`current.question`, `current.title`, `current.why`)
- ✅ Input type detection (`text`, `email`, `dropdown`, `textarea`, `radio`, `checkbox`)
- ✅ `PrefillCombo` component (Google Places autocomplete for addresses)
- ✅ Validation logic (`isValid` function)
- ✅ State management (`state`, `setState`)
- ✅ Navigation handlers (`onNext`, `onBack`)
- ✅ Progress indicator logic (`i`, `total`)
- ✅ `MicroSummary` component (floating progress summary)
- ✅ `ProgressBar` component (step indicator)
- ✅ All event handlers
- ✅ Error states
- ✅ Disabled states

## 🎨 **Design Requirements**
- Modern, clean Q&A UI with purple accents
- Tailwind v3 utilities only
- Light theme with subtle gradients
- Mobile-first responsive design (320px → 1920px)
- Great accessibility (WCAG AA, labels, focus states, ARIA)
- Smooth animations between steps (fade-in, slide-up)
- Clear visual hierarchy (progress → question → input → action)
- Input validation feedback (real-time)
- Progress visibility (always know where you are)

## 🎨 **Color Palette to Use**
```css
/* DeedPro Modern Wizard brand colors: */
Primary Purple: #7C4DFF (buttons, accents, progress)
Secondary Blue: #4F76F6 (links, info)
Background: #F9F9F9 (light gray page bg)
Surface: #FFFFFF (white cards, input backgrounds)
Text: #1F2B37 (dark text)
Border: #E5E7EB (light borders)
Success: #10B981 (green - valid input)
Warning: #F59E0B (yellow - optional warnings)
Error: #EF4444 (red - validation errors)
Info: #3B82F6 (blue - info messages)
Gray: #9CA3AF (placeholder, helper text)
```

## 📋 **Current Component Structure**

### **ModernEngine Overview:**
```typescript
// File: ModernEngine.tsx
// This orchestrates the entire Q&A flow

export default function ModernEngine({ docType }: { docType: string }) {
  const flow = useMemo(() => promptFlows[docType] || promptFlows['grant-deed'], [docType]);
  const [i, setI] = useState(0);  // ✅ Current step index
  const [state, setState] = useState<Record<string, any>>({});  // ✅ All answers
  
  const total = flow.steps.length;  // ✅ Total steps
  const current = flow.steps[i];    // ✅ Current step config
  
  // ✅ Progress: i / total (e.g. "2 / 5")
  // ✅ At end: i === total → show SmartReview

  // ✅ Validation logic
  const isValid = () => {
    if (!current) return false;
    const v = state[current.key];
    return v && String(v).trim() !== '';
  };

  // ✅ Navigation
  const onNext = () => {
    if (i < total) setI(i + 1);
    // Save to localStorage
    // Track telemetry
  };

  const onBack = () => {
    if (i > 0) setI(i - 1);
  };

  // ✅ Render logic
  if (i === total) {
    // Show SmartReview (final step)
    return <SmartReview {...} />;
  }

  // Show current step Q&A
  return (
    <StepShell>
      <ProgressBar current={i + 1} total={total} />
      
      <div className="modern-qna">
        <h1 className="modern-qna__title">{current.title || current.question}</h1>
        {current.why && <p className="modern-qna__why">{current.why}</p>}
        
        {/* Input rendering based on type */}
        {renderInput(current)}
        
        <div className="modern-qna__nav">
          {i > 0 && <button onClick={onBack}>Back</button>}
          <button onClick={onNext} disabled={!isValid()}>Next</button>
        </div>
      </div>

      <MicroSummary text={`Step ${i + 1} of ${total}`} />
    </StepShell>
  );
}
```

### **Step Config Structure:**
```typescript
// Each step has this structure:
type Step = {
  key: string;          // e.g. 'grantorName'
  question: string;     // e.g. "Who is transferring the property?"
  title?: string;       // Optional: Shorter title for display
  why?: string;         // Optional: Explanation text
  type: 'text' | 'email' | 'dropdown' | 'textarea' | 'radio' | 'checkbox';
  options?: string[];   // For dropdown/radio/checkbox
  prefill?: boolean;    // If true, use PrefillCombo (Google autocomplete)
  placeholder?: string; // Input placeholder
  required?: boolean;   // If true, user must answer before proceeding
};
```

### **Input Type Examples:**

#### **Text Input:**
```typescript
{
  key: 'grantorName',
  question: 'Who is transferring the property?',
  why: 'This is the current owner(s) listed on the deed.',
  type: 'text',
  placeholder: 'e.g., John Doe; Jane Doe',
  required: true
}
```

#### **Email Input:**
```typescript
{
  key: 'contactEmail',
  question: 'What is your email address?',
  type: 'email',
  placeholder: 'you@example.com',
  required: false
}
```

#### **Dropdown:**
```typescript
{
  key: 'vesting',
  question: 'How should the grantee take title?',
  why: 'Vesting determines ownership rights.',
  type: 'dropdown',
  options: ['Joint Tenants', 'Tenants in Common', 'Community Property', 'Sole Ownership'],
  required: true
}
```

#### **Textarea:**
```typescript
{
  key: 'legalDescription',
  question: 'What is the legal description?',
  why: 'This is from the county records.',
  type: 'textarea',
  placeholder: 'LOT 42, TRACT 5432...',
  required: true
}
```

#### **Radio:**
```typescript
{
  key: 'propertyType',
  question: 'What type of property is this?',
  type: 'radio',
  options: ['Residential', 'Commercial', 'Vacant Land'],
  required: true
}
```

#### **Checkbox:**
```typescript
{
  key: 'confirmations',
  question: 'Please confirm the following:',
  type: 'checkbox',
  options: [
    'I have read the disclosures',
    'I understand this is a legal document',
    'I authorize the deed to be prepared'
  ],
  required: true
}
```

#### **Text with Prefill (Google Autocomplete):**
```typescript
{
  key: 'grantorAddress',
  question: 'What is the grantor\'s mailing address?',
  type: 'text',
  prefill: true,  // ✅ This triggers PrefillCombo component
  placeholder: 'Start typing an address...',
  required: false
}
```

## 🎨 **Current UI Flow & States**

### **State 1: Question Display (Standard)**
```
User sees:
- Progress bar at top: "Step 2 of 5" (purple progress fill)
- Question title: "Who is transferring the property?" (large, bold)
- Why text: "This is the current owner(s) listed on the deed." (smaller, gray)
- Input field (based on type)
- Navigation buttons:
  - [Back] (if not first step)
  - [Next] (disabled if answer is empty/invalid)
- Floating progress: "Step 2 of 5" (bottom-right corner)
```

### **State 2: Input Focus (User is Typing)**
```
Same as State 1, but:
- Input has purple focus ring (#7C4DFF)
- Input border is purple
- [Next] button is still disabled until valid input
```

### **State 3: Input Filled (Valid)**
```
Same as State 1, but:
- Input has value
- Input border is green (#10B981) OR standard gray
- Green checkmark icon appears next to input (optional)
- [Next] button is ENABLED (purple, prominent)
```

### **State 4: Input Invalid (Error)**
```
Same as State 1, but:
- Input has red border (#EF4444)
- Error message appears below input: "This field is required" or "Invalid email format"
- [Next] button is DISABLED
```

### **State 5: Dropdown Open**
```
Same as State 1, but:
- Dropdown menu is expanded below select
- Options are visible
- Hover state on options
- Keyboard navigation (arrow keys)
```

### **State 6: Prefill Autocomplete (Google Places)**
```
User types in a prefill field:
- Suggestions dropdown appears (like PropertySearch)
- Shows address suggestions from Google
- Click suggestion → auto-fills input
```

### **State 7: Textarea (Long Text)**
```
Same as State 1, but:
- Input is multi-line (4-6 rows minimum)
- Auto-expands as user types
- Character count (optional): "245 characters"
```

### **State 8: Radio Buttons**
```
Same as State 1, but:
- Multiple radio buttons displayed vertically
- Only one can be selected
- Selected radio has purple fill
- Unselected radio is gray outline
```

### **State 9: Checkboxes**
```
Same as State 1, but:
- Multiple checkboxes displayed vertically
- Multiple can be selected
- Selected checkbox has purple checkmark
- Unselected checkbox is gray outline
```

## 📐 **UI Layout to Create**

### **Desktop Layout (≥ 768px):**
```
┌────────────────────────────────────────────────────────────┐
│                                                            │
│  ┌────────────────────────────────────────────────────┐   │ (ProgressBar)
│  │ ●──────●──────●──────○──────○  Step 2 of 5        │   │
│  └────────────────────────────────────────────────────┘   │
│                                                            │
│  ┌────────────────────────────────────────────────────┐   │
│  │                                                    │   │
│  │  Who is transferring the property?                │   │ (Question)
│  │                                                    │   │
│  │  This is the current owner(s) listed on the deed. │   │ (Why text)
│  │                                                    │   │
│  │  ┌──────────────────────────────────────────────┐ │   │ (Input)
│  │  │ John Doe; Jane Doe                           │ │   │
│  │  └──────────────────────────────────────────────┘ │   │
│  │                                                    │   │
│  │  [Back]                             [Next →]      │   │ (Navigation)
│  │                                                    │   │
│  └────────────────────────────────────────────────────┘   │
│                                                            │
│                               ┌──────────────────┐         │ (MicroSummary)
│                               │ Step 2 of 5      │         │
│                               └──────────────────┘         │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### **Mobile Layout (< 768px):**
```
┌──────────────────────────────┐
│                              │
│  ●──●──●──○──○               │ (ProgressBar)
│  Step 2 of 5                 │
│                              │
│  Who is transferring         │ (Question)
│  the property?               │
│                              │
│  This is the current         │ (Why text)
│  owner(s) listed on          │
│  the deed.                   │
│                              │
│  ┌──────────────────────┐   │ (Input)
│  │ John Doe; Jane Doe   │   │
│  └──────────────────────┘   │
│                              │
│  [Back]      [Next →]        │ (Navigation)
│                              │
│                              │
│  ┌────────────┐              │ (MicroSummary)
│  │ Step 2/5   │              │
│  └────────────┘              │
│                              │
└──────────────────────────────┘
```

## ✨ **Design Enhancements You Can Add:**

### **1. Progress Bar:**
- Horizontal bar with filled circles (●) for completed steps
- Empty circles (○) for upcoming steps
- Purple fill (#7C4DFF) for progress
- Gray for incomplete
- Smooth animation as user advances
- Text: "Step X of Y" on the right

### **2. Question Title:**
- Large (text-2xl md:text-3xl)
- Bold (font-bold)
- Dark text (#1F2B37)
- Margin-bottom for spacing

### **3. Why Text:**
- Smaller (text-base)
- Gray (#6B7280)
- Italic (optional)
- Icon: 💡 or ℹ️ (optional)
- Margin-bottom for spacing

### **4. Input Fields:**
- Large padding (px-4 py-3)
- Rounded corners (rounded-lg)
- Border: gray → purple on focus → green when valid
- Focus ring (purple, #7C4DFF)
- Placeholder: gray, italic
- Auto-focus on mount
- Smooth transitions

### **5. Dropdown:**
- Custom styled (not default browser)
- Arrow icon (▼)
- Options menu:
  - White background
  - Shadow-lg
  - Hover: Purple background (#7C4DFF10)
  - Selected: Purple text + checkmark

### **6. Textarea:**
- Min height: 120px
- Max height: 400px (scrollable)
- Auto-resize as user types
- Character counter (optional)
- Same border/focus behavior as text input

### **7. Radio Buttons:**
- Custom styled (purple accent)
- Large click target (min 44x44px)
- Label on right
- Hover: Slight background color
- Selected: Purple fill + white center dot

### **8. Checkboxes:**
- Custom styled (purple accent)
- Large click target (min 44x44px)
- Label on right
- Hover: Slight background color
- Selected: Purple background + white checkmark

### **9. Navigation Buttons:**
- Back:
  - Secondary style (outline, gray)
  - Left side
  - Icon: ← arrow
- Next:
  - Primary style (solid purple)
  - Right side
  - Icon: → arrow
  - Disabled: Gray, cursor-not-allowed
  - Hover: Slightly darker
  - Active: Scale down (0.98)

### **10. MicroSummary (Floating Progress):**
- Bottom-right corner (fixed position)
- Small card (shadow-md)
- White background
- Purple text
- Text: "Step X of Y"
- Fade-in animation
- Only show on desktop (md:block)

### **11. Animations:**
- Step transition: Fade-out old → Fade-in new
- Input focus: Border color transition
- Button hover: Scale + color transition
- Dropdown expand: Slide-down
- Error message: Slide-down from top
- Respect prefers-reduced-motion

### **12. Error Messages:**
- Below input
- Red text (#EF4444)
- Small font (text-sm)
- Icon: ⚠️
- Smooth slide-in animation

### **13. Validation Indicators:**
- Green checkmark icon (✓) when valid
- Red X icon (✗) when invalid
- Appears on right side of input
- Fade-in animation

## 🔧 **Components to Keep:**

### **StepShell:**
```typescript
// File: StepShell.tsx
import React from 'react';

export default function StepShell({ children }: { children: React.ReactNode }) {
  return <div className="modern-container">{children}</div>;
}
```
**What to do**: Keep this, but enhance `.modern-container` styling with Tailwind

### **ProgressBar:**
```typescript
// File: ProgressBar.tsx
export default function ProgressBar({ current, total }: { current: number; total: number }) {
  // Shows progress: 2 / 5
  // Filled circles for completed steps
  // Empty circles for upcoming steps
}
```
**What to do**: Redesign this with beautiful Tailwind progress UI

### **MicroSummary:**
```typescript
// File: MicroSummary.tsx
export default function MicroSummary({ text }: { text: string }) {
  return <div className="wiz-micro">{text}</div>;
}
```
**What to do**: Redesign as floating bottom-right card with Tailwind

### **PrefillCombo:**
```typescript
// File: PrefillCombo.tsx
// Google Places autocomplete for address fields
// Already has all logic - just needs UI redesign
```
**What to do**: Redesign dropdown styling to match new design system

## 🎨 **Tailwind Classes to Use:**

### **Container (StepShell):**
```tsx
<div className="max-w-2xl mx-auto px-4 py-8 md:py-12">
  {children}
</div>
```

### **Question Title:**
```tsx
<h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
  {current.title || current.question}
</h1>
```

### **Why Text:**
```tsx
<p className="text-base text-gray-600 mb-6 flex items-start gap-2">
  <span className="text-blue-500">💡</span>
  {current.why}
</p>
```

### **Text Input:**
```tsx
<input
  type="text"
  className="w-full px-4 py-3 text-base rounded-lg border-2 border-gray-300 
             focus:border-purple-500 focus:ring-4 focus:ring-purple-500/20 
             transition-all duration-200 
             placeholder:text-gray-400
             disabled:bg-gray-100 disabled:cursor-not-allowed"
  placeholder={current.placeholder}
  value={state[current.key] || ''}
  onChange={(e) => setState({ ...state, [current.key]: e.target.value })}
/>
```

### **Textarea:**
```tsx
<textarea
  className="w-full px-4 py-3 text-base rounded-lg border-2 border-gray-300 
             focus:border-purple-500 focus:ring-4 focus:ring-purple-500/20 
             transition-all duration-200 
             placeholder:text-gray-400
             resize-none
             min-h-[120px]"
  placeholder={current.placeholder}
  value={state[current.key] || ''}
  onChange={(e) => setState({ ...state, [current.key]: e.target.value })}
/>
```

### **Dropdown:**
```tsx
<select
  className="w-full px-4 py-3 text-base rounded-lg border-2 border-gray-300 
             focus:border-purple-500 focus:ring-4 focus:ring-purple-500/20 
             transition-all duration-200 
             bg-white
             cursor-pointer"
  value={state[current.key] || ''}
  onChange={(e) => setState({ ...state, [current.key]: e.target.value })}
>
  <option value="">Select an option...</option>
  {current.options?.map((opt) => (
    <option key={opt} value={opt}>{opt}</option>
  ))}
</select>
```

### **Radio Button:**
```tsx
<label className="flex items-center gap-3 p-4 rounded-lg border-2 border-gray-200 
                  hover:border-purple-300 hover:bg-purple-50 
                  cursor-pointer transition-all duration-200">
  <input
    type="radio"
    name={current.key}
    value={option}
    checked={state[current.key] === option}
    onChange={(e) => setState({ ...state, [current.key]: e.target.value })}
    className="w-5 h-5 text-purple-600 focus:ring-purple-500"
  />
  <span className="text-base text-gray-900">{option}</span>
</label>
```

### **Checkbox:**
```tsx
<label className="flex items-center gap-3 p-4 rounded-lg border-2 border-gray-200 
                  hover:border-purple-300 hover:bg-purple-50 
                  cursor-pointer transition-all duration-200">
  <input
    type="checkbox"
    checked={state[current.key]?.includes(option) || false}
    onChange={(e) => {
      const current = state[current.key] || [];
      setState({
        ...state,
        [current.key]: e.target.checked 
          ? [...current, option] 
          : current.filter((v: string) => v !== option)
      });
    }}
    className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500"
  />
  <span className="text-base text-gray-900">{option}</span>
</label>
```

### **Navigation Buttons:**
```tsx
<div className="flex items-center justify-between gap-4 mt-8">
  {i > 0 && (
    <button
      onClick={onBack}
      className="px-6 py-3 border-2 border-gray-300 text-gray-700 
                 hover:border-gray-400 hover:bg-gray-50 
                 font-semibold rounded-lg transition-all duration-200
                 focus:ring-4 focus:ring-gray-300/50"
    >
      ← Back
    </button>
  )}
  <button
    onClick={onNext}
    disabled={!isValid()}
    className="ml-auto px-6 py-3 bg-purple-600 hover:bg-purple-700 
               active:scale-98 text-white font-semibold rounded-lg 
               shadow-lg shadow-purple-500/25 transition-all duration-200 
               disabled:bg-gray-300 disabled:cursor-not-allowed
               focus:ring-4 focus:ring-purple-500/50"
  >
    Next →
  </button>
</div>
```

### **Error Message:**
```tsx
<div className="mt-2 text-sm text-red-600 flex items-center gap-2">
  <span>⚠️</span>
  <span>This field is required</span>
</div>
```

## 📱 **Responsive Breakpoints:**

```typescript
// Tailwind breakpoints (mobile-first)
sm: 640px   // Small tablets
md: 768px   // Tablets
lg: 1024px  // Laptops
xl: 1280px  // Desktops

// Usage:
<div className="text-2xl md:text-3xl">  // Smaller text on mobile, larger on desktop
```

## 🎯 **Output Format:**

Provide:

1. **Updated ModernEngine.tsx** (or just the JSX template):
   - All logic preserved
   - Beautiful Tailwind styling
   - Responsive design
   - All input types supported
   - Validation feedback
   - Navigation logic

2. **Updated StepShell.tsx**:
   - Enhanced container styling

3. **Updated ProgressBar.tsx**:
   - Beautiful progress UI with filled/empty circles

4. **Updated MicroSummary.tsx**:
   - Floating bottom-right card

5. **Updated PrefillCombo.tsx** (if needed):
   - Match new design system

6. **Notes**:
   - What animations were added
   - What accessibility features were added
   - What responsive changes were made
   - How input types are handled

## ✅ **Final Checklist:**

Before you submit, verify:

- [ ] All input types supported (text, email, dropdown, textarea, radio, checkbox, prefill)
- [ ] Validation logic preserved
- [ ] State management preserved
- [ ] Navigation handlers preserved (onNext, onBack)
- [ ] Progress tracking preserved (i, total)
- [ ] PrefillCombo integration preserved
- [ ] Disabled states work (Next button when invalid)
- [ ] Error messages appear for invalid input
- [ ] Success states appear for valid input
- [ ] Focus states visible
- [ ] Mobile responsive (320px → 1920px)
- [ ] Keyboard navigation works
- [ ] Animations respect prefers-reduced-motion
- [ ] Colors match brand (#7C4DFF purple)
- [ ] No console errors or warnings
- [ ] All step configs render correctly
- [ ] Smooth transitions between steps

## 💪 **LET'S CRUSH THIS!**

**Remember**: This is the CORE wizard experience. Make it:
- **Simple** (one question at a time)
- **Clear** (users know what to answer)
- **Fast** (no perceived delay between steps)
- **Beautiful** (modern, professional)
- **Accessible** (keyboard nav, screen readers)
- **Encouraging** (progress indicators, validation feedback)

**You got this, V0! Create the best Q&A experience ever!** 🚀

---

**Generated by**: AI Assistant (A-Game Mode)  
**Date**: November 2, 2025  
**Score**: 10/10 Championship Edition  
**Ready for**: Vercel V0 → Production

