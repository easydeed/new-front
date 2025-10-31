# V0 Prompt – DeedPro Forgot Password Page (Phase 24-B)

## 🎯 Task
Redesign the **Forgot Password page UI** for DeedPro while **preserving ALL existing logic** (email input, API call, success/error messages).

## 🔒 **CRITICAL: Keep ALL Logic**
- ✅ Single email input field
- ✅ API endpoint: `POST /users/forgot-password`
- ✅ Success message: "Password reset link sent to your email!"
- ✅ Error handling (404 for not found, network errors)
- ✅ Loading state
- ✅ Link back to Login

## 🎨 **Design Requirements**
- Simple, clean UI (this is a simple page!)
- Purple (#7C4DFF) brand color
- Success/error message display
- Mobile-first responsive
- Match Login page style

## 🎨 **Color Palette**
```css
Primary: #7C4DFF (purple)
Background: #F9F9F9 (light gray)
Surface: #FFFFFF (white)
Text: #1F2B37 (dark)
Success: #10B981 (green)
Error: #EF4444 (red)
```

## 📋 **Current Logic (Keep Exactly):**

```typescript
const [email, setEmail] = useState("");
const [loading, setLoading] = useState(false);
const [message, setMessage] = useState("");
const [error, setError] = useState("");

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  
  if (!email) {
    setError("Please enter your email address");
    return;
  }

  setLoading(true);
  setError("");
  setMessage("");

  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || 'https://deedpro-main-api.onrender.com'}/users/forgot-password`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      }
    );

    if (response.ok) {
      setMessage("Password reset link sent to your email!");
    } else if (response.status === 404) {
      setError("Email address not found");
    } else {
      setError("Error sending reset link. Please try again.");
    }
  } catch {
    setError("Network error. Please check your connection and try again.");
  } finally {
    setLoading(false);
  }
};
```

## 🎨 **Simple UI Layout:**

```
┌────────────────────────────────┐
│                                │
│        Reset Password          │
│        Enter your email        │
│                                │
│  ┌──────────────────────────┐ │
│  │                          │ │
│  │  [Success/Error Message] │ │
│  │                          │ │
│  │  Email Address           │ │
│  │  [email input]           │ │
│  │                          │ │
│  │  [Send Reset Link]       │ │
│  │                          │ │
│  │  ← Back to Login         │ │
│  │                          │ │
│  └──────────────────────────┘ │
│                                │
│  Remember password? Sign in    │
│                                │
└────────────────────────────────┘
```

## ⚠️ **DO NOT CHANGE:**
- Email validation
- API endpoint
- Success/error messages
- Loading state logic

## 🎯 **Deliverable:**
Single `page.tsx` with modern UI, purple colors, matching Login page style.

---

**Instructions for V0:** Create a simple, modern forgot password page for DeedPro. Keep all logic intact, improve visual design with purple (#7C4DFF) brand colors.

