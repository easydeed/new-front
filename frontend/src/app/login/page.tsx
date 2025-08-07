"use client";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowRight, LoadingSpinner, Eye } from "../../components/Icons";
import { ParticlesMinimal } from "../../components/Particles";

function LoginContent() {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    setIsVisible(true);
    
    // Check for registration success
    if (searchParams.get('registered') === 'true') {
      const email = searchParams.get('email');
      setSuccessMessage(
        email 
          ? `Account created successfully! Please log in with ${email}`
          : "Account created successfully! Please log in with your credentials"
      );
      if (email) {
        setFormData((prev: any) => ({ ...prev, email: decodeURIComponent(email) }));
      }
    }
  }, [searchParams]);

  const handleChange = (e: any) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    
    // Clear error when user starts typing
    if (error) setError("");
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    
    if (!formData.email || !formData.password) {
      setError("Please enter both email and password");
      return;
    }

    setLoading(true);
    setError("");
    setSuccessMessage("");

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/users/login`, {
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
        
        // Store the JWT token (try different possible field names)
        const token = data.access_token || data.token || data.jwt;
        if (token) {
          localStorage.setItem('access_token', token);
        }
        
        // Store user data if available
        if (data.user) {
          localStorage.setItem('user_data', JSON.stringify(data.user));
        }
        
        // Show success message briefly before redirect
        setSuccessMessage("Login successful! Redirecting...");
        
        // Small delay to show success message
        setTimeout(() => {
          router.push('/dashboard');
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
        
        {/* Enhanced Header */}
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-dark-slate mb-2 relative">
            Welcome Back
            <span className="inline-block w-2 h-2 rounded-full bg-accent ml-2 align-middle" />
          </h1>
          <p className="text-base text-dark-slate/70">
            Sign in to your DeedPro account
          </p>
        </div>

        {/* Enhanced Login Form */}
        <div className="bg-surface rounded-xl shadow-elevated p-6 border border-dark-slate/10">
          
          {/* Glow effect */}
          <div className="absolute -inset-0.5 bg-gradient-teal rounded-3xl blur opacity-20 group-hover:opacity-40 transition duration-500"></div>
          
          <div className="relative">
            {successMessage && (
              <div className="mb-6 p-4 bg-tropical-teal/10 border border-tropical-teal/30 text-aqua-mint rounded-2xl animate-fade-in-up backdrop-blur-sm">
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-tropical-teal rounded-full mr-3 animate-pulse"></div>
                  {successMessage}
                </div>
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
                <label htmlFor="email" className="block text-sm font-semibold text-dark-slate dark:text-white mb-2 transition-colors group-focus-within:text-deep-teal dark:group-focus-within:text-tropical-teal">
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
                  <div className="absolute inset-0 rounded-2xl bg-gradient-teal opacity-0 group-focus-within:opacity-5 transition-opacity duration-300 pointer-events-none"></div>
                </div>
              </div>

              {/* Enhanced Password Input */}
              <div className="group">
                <label htmlFor="password" className="block text-sm font-semibold text-dark-slate dark:text-white mb-2 transition-colors group-focus-within:text-deep-teal dark:group-focus-within:text-tropical-teal">
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
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-dark-slate/70 dark:text-aqua-mint/70 hover:text-deep-teal dark:hover:text-tropical-teal transition-colors duration-200"
                  >
                    <Eye className="h-5 w-5" />
                  </button>
                  <div className="absolute inset-0 rounded-2xl bg-gradient-teal opacity-0 group-focus-within:opacity-5 transition-opacity duration-300 pointer-events-none"></div>
                </div>
              </div>

              {/* Enhanced Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className={`group relative w-full py-4 px-6 rounded-2xl font-semibold text-white transition-all duration-300 ${
                  loading
                    ? "bg-gray-600 cursor-not-allowed"
                    : "bg-deep-teal dark:bg-gradient-teal hover:bg-soft-cyan dark:hover:shadow-glow-teal transform hover:scale-105 hover:-translate-y-0.5 active:scale-95"
                }`}
              >
                <div className="absolute -inset-0.5 bg-gradient-teal rounded-2xl blur opacity-0 group-hover:opacity-30 transition duration-300"></div>
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
                className="inline-block text-electric-indigo hover:text-aqua-mint text-sm transition-colors duration-200 hover:scale-105 transform"
              >
                Forgot your password?
              </Link>
              
              <p className="text-aqua-mint/80">
                Don't have an account?{" "}
                <Link 
                  href="/register" 
                  className="text-electric-indigo hover:text-tropical-teal font-semibold transition-all duration-200 hover:scale-105 transform inline-block"
                >
                  Sign up here
                </Link>
              </p>
            </div>
          </div>
        </div>

        {/* Enhanced Test Credentials */}
        <div className="mt-8 bg-gradient-dark rounded-2xl p-6 border border-tropical-teal/20 shadow-elevated animate-fade-in-up" style={{ animationDelay: '0.6s' }}>
          <h3 className="font-semibold text-tropical-teal mb-4 flex items-center gap-2">
            <div className="w-2 h-2 bg-tropical-teal rounded-full animate-pulse"></div>
            Test Accounts Available
          </h3>
          <div className="space-y-3 text-sm">
            {[
              { title: "Free Plan User", email: "test@escrow.com", password: "testpass123" },
              { title: "Professional Plan User", email: "pro@title.com", password: "propass123" },
              { title: "Enterprise Admin User", email: "admin@deedpro.com", password: "adminpass123" }
            ].map((account, index) => (
              <div 
                key={index}
                className="bg-charcoal-blue/50 rounded-xl p-4 border border-aqua-mint/10 hover:border-tropical-teal/30 transition-all duration-300 hover:scale-[1.02] group cursor-pointer backdrop-blur-sm"
                onClick={() => setFormData({ email: account.email, password: account.password })}
              >
                <div className="font-medium text-electric-indigo group-hover:text-tropical-teal transition-colors">{account.title}</div>
                <div className="text-aqua-mint/80 text-xs mt-1">
                  {account.email} • {account.password}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Enhanced Features Preview */}
        <div className="mt-8 text-center animate-fade-in-up" style={{ animationDelay: '0.8s' }}>
          <p className="text-aqua-mint/60 text-sm mb-4">What you'll get access to:</p>
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
      <div className="min-h-screen bg-charcoal-blue flex items-center justify-center">
        <div className="text-aqua-mint flex items-center gap-3">
          <LoadingSpinner className="h-6 w-6" />
          Loading...
        </div>
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
} 