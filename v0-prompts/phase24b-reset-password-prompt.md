# V0 Prompt – DeedPro Reset Password Page (Phase 24-B)

## 🎯 Task
Redesign the **Reset Password page UI** for DeedPro while **preserving ALL existing logic** (token from URL, two password fields, API call, redirect).

## 🔒 **CRITICAL: Keep ALL Logic**
- ✅ Get `token` from URL query parameter: `?token=...`
- ✅ Two password fields (password + confirm)
- ✅ Password match validation
- ✅ API endpoint: `POST /users/reset-password`
- ✅ Payload: `{ token, new_password, confirm_password }` (snake_case!)
- ✅ Redirect to `/login` on success
- ✅ Show error if no token in URL
- ✅ Suspense wrapper (required for useSearchParams)

## 🎨 **Design Requirements**
- Clean UI with two password fields
- Purple (#7C4DFF) brand color
- Eye toggle for password visibility
- Success/error message display
- Match Login/Registration style
- Mobile-first responsive

## 🎨 **Color Palette**
```css
Primary: #7C4DFF (purple)
Background: #F9F9F9
Surface: #FFFFFF
Text: #1F2B37
Success: #10B981
Error: #EF4444
```

## 📋 **Current Logic (MUST Keep):**

```typescript
'use client';
import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (password !== confirmPassword) { 
      setError("Passwords don't match"); 
      return; 
    }
    
    setLoading(true);
    
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'https://deedpro-main-api.onrender.com'}/users/reset-password`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            token, 
            new_password: password,      // snake_case!
            confirm_password: confirmPassword  // snake_case!
          })
        }
      );
      
      if (!response.ok) {
        const data = await response.json().catch(() => ({ detail: 'Reset failed' }));
        throw new Error(data.detail || 'Reset failed');
      }
      
      setSuccess(true);
      setTimeout(() => router.push('/login'), 1500);
    } catch (e: any) {
      setError(e?.message || 'Reset failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* Your UI here */}
      {!token && <p>Invalid or missing token.</p>}
      {success ? (
        <p>Success! Redirecting to login...</p>
      ) : (
        <form onSubmit={handleSubmit}>
          {/* Password fields */}
        </form>
      )}
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ResetPasswordContent />
    </Suspense>
  );
}
```

## 🎨 **UI Layout:**

```
┌────────────────────────────────┐
│                                │
│        Reset Your Password     │
│        Enter new password      │
│                                │
│  ┌──────────────────────────┐ │
│  │                          │ │
│  │  [Error Message]         │ │
│  │                          │ │
│  │  New Password            │ │
│  │  [password] [eye toggle] │ │
│  │                          │ │
│  │  Confirm Password        │ │
│  │  [password] [eye toggle] │ │
│  │                          │ │
│  │  [Update Password]       │ │
│  │                          │ │
│  └──────────────────────────┘ │
│                                │
└────────────────────────────────┘
```

## ⚠️ **CRITICAL: snake_case Payload**
```typescript
body: JSON.stringify({ 
  token,                         // no underscore
  new_password: password,        // snake_case!
  confirm_password: confirmPassword  // snake_case!
})
```

## ⚠️ **DO NOT CHANGE:**
- Token extraction from URL
- snake_case field names
- Password match validation
- Success redirect to `/login`
- Suspense wrapper
- API endpoint

## 🎯 **Deliverable:**
Single `page.tsx` with Suspense wrapper, modern UI, purple colors, eye toggles, matching Login style.

---

**Instructions for V0:** Create a modern reset password page for DeedPro. MUST preserve Suspense wrapper, token from URL, snake_case API payload, and redirect logic. Improve visual design with purple (#7C4DFF) brand colors and eye toggles.

