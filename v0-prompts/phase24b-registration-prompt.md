# V0 Prompt – DeedPro Registration Page (Phase 24-B)

## 🎯 Task
Redesign the **Registration page UI** for DeedPro while **preserving ALL existing logic** (11 fields, validation, snake_case API payload, redirect).

## 🔒 **CRITICAL: Keep ALL Logic**
- ✅ 11 form fields (exact field names)
- ✅ Validation logic (email format, password rules, required fields)
- ✅ snake_case API payload (NOT camelCase!)
- ✅ API endpoint: `POST /users/register`
- ✅ Redirect to `/login?registered=true&email={email}` on success
- ✅ States list (all 50 US states)
- ✅ Roles list (8 professional roles)
- ✅ Company types list (5 types)

## 🎨 **Design Requirements**
- Modern, clean UI with purple (#7C4DFF) brand color
- Multi-column layout for better UX (2 columns on desktop)
- Inline validation errors
- Progress indicator or visual hierarchy
- Mobile-first responsive design
- Great accessibility (labels, focus states, ARIA)

## 🎨 **Color Palette to Use**
```css
Primary: #7C4DFF (purple accent)
Secondary: #4F76F6 (blue accent)
Background: #F9F9F9 (light gray)
Surface: #FFFFFF (white cards)
Text: #1F2B37 (dark text)
Border: #E5E7EB (light borders)
Success: #10B981 (green)
Error: #EF4444 (red)
Required: #EF4444 (red asterisk)
```

## 📋 **EXACT Field Structure (DO NOT CHANGE):**

### **11 Required Fields:**
```typescript
const [formData, setFormData] = useState({
  email: "",                    // Required, email format
  password: "",                 // Required, 8+ chars, uppercase, lowercase, number
  confirmPassword: "",          // Required, must match password
  fullName: "",                 // Required
  role: "",                     // Required, select from roles list
  companyName: "",              // Optional
  companyType: "",              // Optional
  phone: "",                    // Optional
  state: "",                    // Required, select from states list
  agreeTerms: false,            // Required checkbox
  subscribe: false,             // Optional checkbox
});
```

### **States List (All 50):**
```typescript
const states = [
  { code: 'AL', name: 'Alabama' }, { code: 'AK', name: 'Alaska' }, { code: 'AZ', name: 'Arizona' },
  { code: 'AR', name: 'Arkansas' }, { code: 'CA', name: 'California' }, { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' }, { code: 'DE', name: 'Delaware' }, { code: 'FL', name: 'Florida' },
  { code: 'GA', name: 'Georgia' }, { code: 'HI', name: 'Hawaii' }, { code: 'ID', name: 'Idaho' },
  { code: 'IL', name: 'Illinois' }, { code: 'IN', name: 'Indiana' }, { code: 'IA', name: 'Iowa' },
  { code: 'KS', name: 'Kansas' }, { code: 'KY', name: 'Kentucky' }, { code: 'LA', name: 'Louisiana' },
  { code: 'ME', name: 'Maine' }, { code: 'MD', name: 'Maryland' }, { code: 'MA', name: 'Massachusetts' },
  { code: 'MI', name: 'Michigan' }, { code: 'MN', name: 'Minnesota' }, { code: 'MS', name: 'Mississippi' },
  { code: 'MO', name: 'Missouri' }, { code: 'MT', name: 'Montana' }, { code: 'NE', name: 'Nebraska' },
  { code: 'NV', name: 'Nevada' }, { code: 'NH', name: 'New Hampshire' }, { code: 'NJ', name: 'New Jersey' },
  { code: 'NM', name: 'New Mexico' }, { code: 'NY', name: 'New York' }, { code: 'NC', name: 'North Carolina' },
  { code: 'ND', name: 'North Dakota' }, { code: 'OH', name: 'Ohio' }, { code: 'OK', name: 'Oklahoma' },
  { code: 'OR', name: 'Oregon' }, { code: 'PA', name: 'Pennsylvania' }, { code: 'RI', name: 'Rhode Island' },
  { code: 'SC', name: 'South Carolina' }, { code: 'SD', name: 'South Dakota' }, { code: 'TN', name: 'Tennessee' },
  { code: 'TX', name: 'Texas' }, { code: 'UT', name: 'Utah' }, { code: 'VT', name: 'Vermont' },
  { code: 'VA', name: 'Virginia' }, { code: 'WA', name: 'Washington' }, { code: 'WV', name: 'West Virginia' },
  { code: 'WI', name: 'Wisconsin' }, { code: 'WY', name: 'Wyoming' }
];
```

### **Roles List (8 options):**
```typescript
const roles = [
  "Escrow Officer",
  "Title Agent", 
  "Real Estate Agent",
  "Real Estate Broker",
  "Attorney",
  "Paralegal",
  "Administrative Assistant",
  "Other"
];
```

### **Company Types (5 options):**
```typescript
const companyTypes = [
  "Independent Escrow Company",
  "Title Company",
  "Real Estate Brokerage",
  "Law Firm",
  "Other"
];
```

## 🔒 **CRITICAL: API Payload Must Use snake_case**

```typescript
// Frontend uses camelCase
formData.confirmPassword
formData.fullName
formData.companyName
formData.companyType

// Backend requires snake_case (DO NOT CHANGE THIS):
body: JSON.stringify({
  email: formData.email,
  password: formData.password,
  confirm_password: formData.confirmPassword,     // ← snake_case!
  full_name: formData.fullName,                  // ← snake_case!
  role: formData.role,
  company_name: formData.companyName || null,    // ← snake_case!
  company_type: formData.companyType || null,    // ← snake_case!
  phone: formData.phone || null,
  state: formData.state,
  agree_terms: formData.agreeTerms,              // ← snake_case!
  subscribe: formData.subscribe,
})
```

## ✅ **Validation Rules (Keep Exactly):**

```typescript
const validateForm = () => {
  const errors: Record<string, string> = {};

  // Email: Required, valid format
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!formData.email) {
    errors.email = "Email is required";
  } else if (!emailRegex.test(formData.email)) {
    errors.email = "Please enter a valid email address";
  }

  // Password: 8+ chars, uppercase, lowercase, number
  if (!formData.password) {
    errors.password = "Password is required";
  } else {
    if (formData.password.length < 8) {
      errors.password = "Password must be at least 8 characters long";
    } else if (!/(?=.*[a-z])/.test(formData.password)) {
      errors.password = "Password must contain at least one lowercase letter";
    } else if (!/(?=.*[A-Z])/.test(formData.password)) {
      errors.password = "Password must contain at least one uppercase letter";
    } else if (!/(?=.*\d)/.test(formData.password)) {
      errors.password = "Password must contain at least one number";
    }
  }

  // Confirm Password: Must match
  if (!formData.confirmPassword) {
    errors.confirmPassword = "Please confirm your password";
  } else if (formData.password !== formData.confirmPassword) {
    errors.confirmPassword = "Passwords do not match";
  }

  // Required text fields
  if (!formData.fullName) errors.fullName = "Full name is required";
  if (!formData.role) errors.role = "Role is required";
  if (!formData.state) errors.state = "State is required";
  
  // Terms checkbox
  if (!formData.agreeTerms) {
    errors.agreeTerms = "You must agree to the terms and conditions";
  }

  setValidationErrors(errors);
  return Object.keys(errors).length === 0;
};
```

## 🎯 **Submit Handler (Keep Exactly):**

```typescript
const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault();
  
  if (!validateForm()) {
    setError("Please fix the errors below");
    return;
  }

  setLoading(true);
  setError("");

  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || 'https://deedpro-main-api.onrender.com'}/users/register`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          confirm_password: formData.confirmPassword,  // snake_case!
          full_name: formData.fullName,                // snake_case!
          role: formData.role,
          company_name: formData.companyName || null,  // snake_case!
          company_type: formData.companyType || null,  // snake_case!
          phone: formData.phone || null,
          state: formData.state,
          agree_terms: formData.agreeTerms,            // snake_case!
          subscribe: formData.subscribe,
        }),
      }
    );

    if (response.ok) {
      // Redirect to login with success message
      router.push(`/login?registered=true&email=${encodeURIComponent(formData.email)}`);
    } else {
      const errorData = await response.json();
      setError(errorData.detail || "Registration failed. Please try again.");
    }
  } catch (err) {
    setError("Registration failed. Please check your connection and try again.");
  } finally {
    setLoading(false);
  }
};
```

## 🎨 **Recommended UI Layout:**

```
┌────────────────────────────────────────────┐
│                                            │
│        Join DeedPro Today                  │
│        Start creating professional docs    │
│                                            │
│  ┌─────────────────────────────────────┐  │
│  │                                     │  │
│  │  [Error Message if present]        │  │
│  │                                     │  │
│  │  Email Address *                   │  │
│  │  [input]                           │  │
│  │                                     │  │
│  │  Password *        Confirm Pass *  │  │
│  │  [input]           [input]         │  │
│  │                                     │  │
│  │  Full Name *                       │  │
│  │  [input]                           │  │
│  │                                     │  │
│  │  Role *            State *         │  │
│  │  [select]          [select]        │  │
│  │                                     │  │
│  │  Company Name      Company Type    │  │
│  │  [input]           [select]        │  │
│  │                                     │  │
│  │  Phone Number (Optional)           │  │
│  │  [input]                           │  │
│  │                                     │  │
│  │  ☐ I agree to Terms & Privacy *    │  │
│  │  ☐ Subscribe to updates            │  │
│  │                                     │  │
│  │  [Create My Account Button]        │  │
│  │                                     │  │
│  │  Already have account? Sign in     │  │
│  └─────────────────────────────────────┘  │
│                                            │
│  [3 Feature Cards: Free, AI, Secure]      │
│                                            │
└────────────────────────────────────────────┘
```

## ✨ **Design Enhancements You Can Add:**
1. Two-column layout for password/role+state/company fields
2. Password strength indicator
3. Real-time inline validation
4. Smooth animations for error messages
5. Focus rings and hover states
6. Progress indicator (e.g., "Step 1 of 1" or "80% complete")
7. Better checkbox styling
8. Modern select dropdowns
9. Grouped fields with visual sections
10. Feature cards at bottom

## 📱 **Mobile Considerations:**
- Stack all two-column layouts to single column
- Touch-friendly input sizes (min 44px height)
- Larger checkboxes for touch
- Sticky submit button on mobile (optional)

## ⚠️ **DO NOT CHANGE:**
- Field names (frontend camelCase)
- API payload field names (snake_case)
- Validation rules
- States/Roles/CompanyTypes lists
- Redirect URL after success
- API endpoint
- Error handling

## 🎯 **Deliverable:**
A single `page.tsx` file with:
- ✅ All 11 fields with exact names
- ✅ All validation logic preserved
- ✅ snake_case API payload
- ✅ Modern, beautiful UI with purple brand colors
- ✅ Tailwind v3 classes only
- ✅ Mobile responsive
- ✅ Accessible (WCAG 2.1 AA)
- ✅ Inline validation errors

---

## 🚀 **Instructions for V0:**
1. Paste this entire prompt into V0.dev
2. Ask V0 to: "Create a modern registration page for DeedPro with 11 fields. Preserve ALL the validation logic and snake_case API payload format exactly as specified. Improve the visual design with a two-column layout, purple brand colors (#7C4DFF), inline validation errors, and great mobile UX. Keep all field names, validation rules, and the redirect logic intact."
3. Review the generated code carefully
4. **Verify snake_case in API payload!**
5. Test that validation works
6. Copy the final code to replace `frontend/src/app/register/page.tsx`

