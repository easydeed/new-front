"use client";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowRight, LoadingSpinner, Eye } from "../../components/Icons";
// import { ParticlesMinimal } from "../../components/Particles";
import { AuthManager } from "../../utils/auth";

function LoginContent() {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Check if user is already authenticated
    if (AuthManager.isAuthenticated()) {
      router.push('/dashboard');
      return;
    }
    
    // Check for registration success
    if (searchParams.get('registered') === 'true') {
      const email = searchParams.get('email');
      setSuccessMessage(
        email 
          ? `Account created successfully! Please log in with ${email}`
          : "Account created successfully! Please log in with your credentials"
      );
      if (email) {
        const decodedEmail = decodeURIComponent(email);
        setFormData(prev => ({ ...prev, email: decodedEmail }));
      }
    }
  }, [searchParams, router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error when user starts typing
    if (error) setError("");
  };

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
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://deedpro-main-api.onrender.com'}/users/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        
        // Store the JWT token and user data using AuthManager
        const token = data.access_token || data.token || data.jwt;
        if (token) {
          AuthManager.setAuth(token, data.user);
        }
        
        // Show success message briefly before redirect
        setSuccessMessage("Login successful! Redirecting...");
        
        // Check for redirect parameter
        const redirectTo = searchParams.get('redirect') || '/dashboard';
        
        // Small delay to show success message
        setTimeout(() => {
          router.push(redirectTo);
        }, 1000);
      } else if (response.status === 401) {
        // Handle 401 Unauthorized specifically
        try {
          const errorData = await response.json();
          setError(errorData.detail || "Invalid email or password. Please check your credentials and try again.");
        } catch {
          setError("Invalid email or password. Please check your credentials and try again.");
        }
      } else if (response.status === 429) {
        setError("Too many login attempts. Please wait a moment and try again.");
      } else if (response.status === 500) {
        setError("Server error. Please try again later or contact support.");
      } else {
        // Handle other error status codes
        try {
          const errorData = await response.json();
          setError(errorData.detail || `Login failed (${response.status}). Please try again.`);
        } catch {
          setError(`Login failed (${response.status}). Please try again.`);
        }
      }
    } catch (err) {
      console.error('Login error:', err);
      setError("Network error. Please check your internet connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-light-seafoam flex items-center justify-center py-12 px-4 font-inter">
      
      <div className={`max-w-md w-full`}>
        
        {/* Header aligned to landing palette */}
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-dark-slate mb-2 relative">
            Welcome Back
            <span className="inline-block w-2 h-2 rounded-full bg-accent ml-2 align-middle" />
          </h1>
          <p className="text-base text-dark-slate/70">
            Sign in to your DeedPro account
          </p>
        </div>

        {/* Login Form */}
        <div className="bg-surface rounded-xl shadow-elevated p-6 border border-dark-slate/10">
          
          {/* Glow effect */}
          <div className="absolute -inset-0.5 bg-gradient-teal rounded-3xl blur opacity-20 group-hover:opacity-40 transition duration-500"></div>
          
          <div className="relative">
            {successMessage && (
              <div className="mb-6 p-4 bg-accent-soft border border-accent/30 text-dark-slate rounded-2xl animate-fade-in">
                {successMessage}
              </div>
            )}

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              
              {/* Enhanced Email Input */}
              <div className="group">
                <label htmlFor="email" className="block text-sm font-semibold text-dark-slate mb-2 transition-colors group-focus-within:text-gentle-indigo">
                  Email Address
                </label>
                <div className="relative">
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                  className="w-full p-4 bg-surface text-dark-slate border border-dark-slate/20 rounded-lg focus:ring-2 focus:ring-gentle-indigo focus:border-gentle-indigo placeholder-dark-slate/50"
                    placeholder="your.email@company.com"
                    autoComplete="email"
                  />
                </div>
              </div>

              {/* Enhanced Password Input */}
              <div className="group">
                <label htmlFor="password" className="block text-sm font-semibold text-dark-slate mb-2 transition-colors group-focus-within:text-gentle-indigo">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                  className="w-full p-4 pr-12 bg-surface text-dark-slate border border-dark-slate/20 rounded-lg focus:ring-2 focus:ring-gentle-indigo focus:border-gentle-indigo placeholder-dark-slate/50"
                    placeholder="Enter your password"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-dark-slate/70 hover:text-gentle-indigo transition-colors duration-200"
                  >
                    <Eye className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Enhanced Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className={`group relative w-full py-4 px-6 rounded-2xl font-semibold text-white transition-all duration-300 ${
                  loading
                    ? "bg-gray-600 cursor-not-allowed"
                    : "bg-gentle-indigo hover:bg-soft-cyan transform hover:scale-105 hover:-translate-y-0.5 active:scale-95"
                }`}
              >
                <div className="absolute -inset-0.5 rounded-2xl blur opacity-0 group-hover:opacity-30 transition duration-300"></div>
                <div className="relative flex items-center justify-center gap-2">
                  {loading ? (
                    <>
                      <LoadingSpinner className="h-5 w-5" />
                      Signing in...
                    </>
                  ) : (
                    <>
                      Sign In
                      <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                    </>
                  )}
                </div>
              </button>
            </form>

            {/* Enhanced Additional Links */}
            <div className="mt-6 space-y-4 text-center">
              <Link 
                href="/forgot-password" 
                className="inline-block text-gentle-indigo hover:text-dark-slate text-sm transition-colors duration-200 hover:scale-105 transform"
              >
                Forgot your password?
              </Link>
              
              <p className="text-dark-slate/70">
                Don&#39;t have an account?{" "}
                <Link 
                  href="/register" 
                  className="text-gentle-indigo hover:text-deep-teal font-semibold transition-all duration-200 hover:scale-105 transform inline-block"
                >
                  Sign up here
                </Link>
              </p>
            </div>
          </div>
        </div>
        {/* Demo Account (for testing purposes) */}
        <div className="mt-8 rounded-2xl p-6 border border-dark-slate/10 shadow-elevated bg-surface">
          <h3 className="font-semibold text-dark-slate mb-2">Demo Account</h3>
          <p className="text-xs text-dark-slate/60 mb-4">👆 Click to auto-fill credentials</p>
          <div className="space-y-3 text-sm">
            <button 
              type="button"
              className="w-full rounded-xl p-4 border-2 border-gentle-indigo/30 bg-gentle-indigo/5 hover:border-gentle-indigo hover:bg-gentle-indigo/10 transition-all duration-300 hover:scale-[1.02] group cursor-pointer text-left"
              onClick={(e) => {
                e.preventDefault();
                console.log('🔵 Demo credentials clicked!');
                setFormData({ email: "test@deedpro-check.com", password: "TestPassword123!" });
                setError("");
                setSuccessMessage("✅ Demo credentials loaded! Click 'Sign In' to continue.");
                
                // Focus the email field to show it worked
                setTimeout(() => {
                  const emailInput = document.getElementById('email');
                  if (emailInput) emailInput.focus();
                }, 100);
              }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-gentle-indigo group-hover:text-deep-teal transition-colors flex items-center gap-2">
                    <span className="text-lg">👤</span>
                    Demo User Account
                  </div>
                  <div className="text-dark-slate/70 text-xs mt-1">
                    test@deedpro-check.com • TestPassword123!
                  </div>
                </div>
                <div className="text-gentle-indigo group-hover:text-deep-teal">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </button>

            {/* Phase 7: Real User Account Auto-fill */}
            <button 
              type="button"
              className="w-full rounded-xl p-4 border-2 border-tropical-teal/30 bg-tropical-teal/5 hover:border-tropical-teal hover:bg-tropical-teal/10 transition-all duration-300 hover:scale-[1.02] group cursor-pointer text-left"
              onClick={(e) => {
                e.preventDefault();
                console.log('🟢 Real user credentials clicked!');
                setFormData({ email: "gerardoh@gmail.com", password: "Test123!" });
                setError("");
                setSuccessMessage("✅ Your credentials loaded! Click 'Sign In' to continue.");
                
                // Focus the email field to show it worked
                setTimeout(() => {
                  const emailInput = document.getElementById('email');
                  if (emailInput) emailInput.focus();
                }, 100);
              }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-tropical-teal group-hover:text-deep-teal transition-colors flex items-center gap-2">
                    <span className="text-lg">🔑</span>
                    User Account (Real Email)
                  </div>
                  <div className="text-dark-slate/70 text-xs mt-1">
                    gerardoh@gmail.com • Test123!
                  </div>
                </div>
                <div className="text-tropical-teal group-hover:text-deep-teal">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Enhanced Features Preview */}
        <div className="mt-8 text-center animate-fade-in-up" style={{ animationDelay: '0.8s' }}>
          <p className="text-aqua-mint/60 text-sm mb-4">What you&#39;ll get access to:</p>
          <div className="flex justify-center space-x-6 text-sm text-aqua-mint/80">
            {[
              { icon: "✨", text: "AI-Enhanced Deed Wizard" },
              { icon: "📋", text: "Professional Templates" },
              { icon: "🔒", text: "Secure Document Storage" }
            ].map((feature, index) => (
              <div 
                key={index}
                className="flex items-center gap-2 hover:scale-105 transition-transform duration-200 group"
              >
                <span className="text-tropical-teal group-hover:animate-bounce-subtle">{feature.icon}</span>
                <span className="group-hover:text-white transition-colors">{feature.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-light-seafoam flex items-center justify-center">
        <div className="text-dark-slate flex items-center gap-3">
          <LoadingSpinner className="h-6 w-6" />
          Loading...
        </div>
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
} 