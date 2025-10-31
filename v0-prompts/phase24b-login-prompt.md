# V0 Prompt – DeedPro Login Page (Phase 24-B)

## 🎯 Task
Redesign the **Login page UI** for DeedPro while **preserving ALL existing logic** (AuthManager, query params, error handling, demo auto-fill).

## 🔒 **CRITICAL: Keep ALL Logic**
- ✅ AuthManager usage: `isAuthenticated()`, `setAuth(token, user)`, `getToken()`
- ✅ Query params: `?redirect=` and `?registered=true&email=`
- ✅ Error handling (401, 429, 500) + loading states
- ✅ Password visibility toggle
- ✅ Demo credentials auto-fill functionality
- ✅ API endpoint: `POST /users/login`
- ✅ Redirect logic after login

## 🎨 **Design Requirements**
- Modern, clean UI with system fonts (no external fonts)
- Tailwind v3 utilities only (no custom CSS)
- Light theme with subtle gradients
- Mobile-first responsive design
- Great accessibility (labels, focus states, ARIA)
- Smooth animations and transitions

## 🎨 **Color Palette to Use**
```css
/* Use these DeedPro brand colors: */
Primary: #7C4DFF (purple accent)
Secondary: #4F76F6 (blue accent)
Background: #F9F9F9 (light gray)
Surface: #FFFFFF (white cards)
Text: #1F2B37 (dark text)
Border: #E5E7EB (light borders)
Success: #10B981 (green)
Error: #EF4444 (red)
```

## 📋 **Current Code Structure**

### **Component Setup:**
```typescript
"use client";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { AuthManager } from "../../utils/auth";

function LoginContent() {
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // ... keep all existing logic
}
```

### **Must Keep:**
1. **Auth Check on Mount:**
```typescript
useEffect(() => {
  if (AuthManager.isAuthenticated()) {
    router.push('/dashboard');
    return;
  }
  
  // Check for registration success message
  if (searchParams.get('registered') === 'true') {
    const email = searchParams.get('email');
    setSuccessMessage(
      email 
        ? `Account created successfully! Please log in with ${email}`
        : "Account created successfully! Please log in with your credentials"
    );
    if (email) {
      setFormData(prev => ({ ...prev, email: decodeURIComponent(email) }));
    }
  }
}, [searchParams, router]);
```

2. **Form Submit Handler:**
```typescript
const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault();
  
  if (!formData.email || !formData.password) {
    setError("Please enter both email and password");
    return;
  }

  setLoading(true);
  setError("");
  setSuccessMessage("");

  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || 'https://deedpro-main-api.onrender.com'}/users/login`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: formData.email, password: formData.password }),
      }
    );

    if (response.ok) {
      const data = await response.json();
      const token = data.access_token || data.token || data.jwt;
      if (token) {
        AuthManager.setAuth(token, data.user);
      }
      setSuccessMessage("Login successful! Redirecting...");
      const redirectTo = searchParams.get('redirect') || '/dashboard';
      setTimeout(() => router.push(redirectTo), 1000);
    } else if (response.status === 401) {
      setError("Invalid email or password. Please check your credentials and try again.");
    } else if (response.status === 429) {
      setError("Too many login attempts. Please wait a moment and try again.");
    } else if (response.status === 500) {
      setError("Server error. Please try again later or contact support.");
    } else {
      setError(`Login failed (${response.status}). Please try again.`);
    }
  } catch (err) {
    console.error('Login error:', err);
    setError("Network error. Please check your internet connection and try again.");
  } finally {
    setLoading(false);
  }
};
```

3. **Demo Auto-Fill (Keep this functionality!):**
```typescript
<button
  type="button"
  onClick={() => {
    const email = "gerardoh@gmail.com";
    const password = "Test123!";
    setFormData({ email, password });
    
    const emailEl = document.getElementById('email') as HTMLInputElement;
    const passEl = document.getElementById('password') as HTMLInputElement;
    
    if (emailEl) {
      emailEl.value = email;
      emailEl.dispatchEvent(new Event('change', { bubbles: true }));
    }
    if (passEl) {
      passEl.value = password;
      passEl.dispatchEvent(new Event('change', { bubbles: true }));
    }
    
    setSuccessMessage("✅ Credentials filled! Click 'Sign In' above.");
    setError("");
  }}
>
  ⚡ Fill Login Form
</button>
```

## 🎨 **UI Layout to Create**

### **Structure:**
```
┌─────────────────────────────────────┐
│                                     │
│      Welcome Back to DeedPro        │
│      Sign in to your account        │
│                                     │
│  ┌──────────────────────────────┐  │
│  │                              │  │
│  │  [Success/Error Messages]    │  │
│  │                              │  │
│  │  Email Address               │  │
│  │  [email input]               │  │
│  │                              │  │
│  │  Password                    │  │
│  │  [password input] [eye icon] │  │
│  │                              │  │
│  │  [Sign In Button]            │  │
│  │                              │  │
│  │  Forgot password?            │  │
│  │                              │  │
│  │  Don't have account? Sign up │  │
│  │                              │  │
│  └──────────────────────────────┘  │
│                                     │
│  ┌──────────────────────────────┐  │
│  │  🔑 Demo Credentials          │  │
│  │  Email: [copyable]            │  │
│  │  Password: [copyable]         │  │
│  │  [⚡ Fill Login Form]         │  │
│  └──────────────────────────────┘  │
│                                     │
└─────────────────────────────────────┘
```

## ✨ **Design Enhancements You Can Add:**
1. Smooth fade-in animations
2. Hover effects on buttons
3. Focus rings on inputs
4. Loading spinner on submit
5. Subtle gradient backgrounds
6. Modern card shadows
7. Better spacing and typography
8. Success/error message styling with icons

## 📱 **Mobile Considerations:**
- Single column layout
- Touch-friendly input sizes (min 44px height)
- Responsive padding
- Stack elements vertically on small screens

## ⚠️ **DO NOT CHANGE:**
- AuthManager imports and usage
- API endpoint URL
- Query parameter logic
- Error handling logic
- Redirect logic
- Demo credentials functionality
- Form validation logic

## 🎯 **Deliverable:**
A single `page.tsx` file with:
- ✅ All existing logic preserved
- ✅ Modern, beautiful UI
- ✅ Tailwind v3 classes only
- ✅ Mobile responsive
- ✅ Accessible (WCAG 2.1 AA)
- ✅ Smooth animations

---

## 🚀 **Instructions for V0:**
1. Paste this entire prompt into V0.dev
2. Ask V0 to: "Create a modern login page for DeedPro based on this prompt. Preserve ALL the logic exactly as specified, but improve the visual design with Tailwind v3, better spacing, modern cards, smooth animations, and great mobile UX."
3. Review the generated code
4. Test that all functionality still works
5. Copy the final code to replace `frontend/src/app/login/page.tsx`

