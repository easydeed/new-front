"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, LoadingSpinner } from "../../components/Icons";
import { ParticlesMinimal } from "../../components/Particles";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

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
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://deedpro-main-api.onrender.com'}/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (response.ok) {
        setMessage("Password reset link sent to your email!");
      } else if (response.status === 404) {
        setError("Email address not found");
      } else {
        setError("Error sending reset link. Please try again.");
      }
    } catch (err) {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-charcoal-blue via-soft-charcoal to-slate-navy flex items-center justify-center py-12 px-4 relative overflow-hidden font-inter">
      
      {/* Minimal particles for performance */}
      <ParticlesMinimal />
      
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-tropical-teal/3 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-electric-indigo/3 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      <div className="max-w-md w-full relative z-10 animate-fade-in-up">
        
        {/* Enhanced Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl lg:text-5xl font-bold text-white mb-4 relative">
            Reset Password
            <div className="absolute -top-1 -right-8 w-3 h-3 bg-electric-indigo rounded-full animate-pulse"></div>
          </h1>
          <p className="text-lg text-aqua-mint/80">
            Enter your email to receive a password reset link
          </p>
        </div>

        {/* Enhanced Form */}
        <div className="bg-gradient-dark rounded-3xl shadow-elevated p-8 border border-tropical-teal/20 relative group hover:shadow-glow-teal transition-all duration-500">
          
          {/* Glow effect */}
          <div className="absolute -inset-0.5 bg-gradient-teal rounded-3xl blur opacity-20 group-hover:opacity-40 transition duration-500"></div>
          
          <div className="relative">
            {message && (
              <div className="mb-6 p-4 bg-tropical-teal/10 border border-tropical-teal/30 text-aqua-mint rounded-2xl animate-fade-in-up backdrop-blur-sm">
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-tropical-teal rounded-full mr-3 animate-pulse"></div>
                  {message}
                </div>
              </div>
            )}

            {error && (
              <div className="mb-6 p-4 bg-red-500/10 border border-red-400/30 text-red-400 rounded-2xl animate-fade-in-up backdrop-blur-sm">
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-red-400 rounded-full mr-3 animate-pulse"></div>
                  {error}
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              
              {/* Enhanced Email Input */}
              <div className="group">
                <label htmlFor="email" className="block text-sm font-semibold text-white mb-2 transition-colors group-focus-within:text-tropical-teal">
                  Email Address
                </label>
                <div className="relative">
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full p-4 bg-charcoal-blue/50 text-white border-2 border-aqua-mint/20 rounded-2xl focus:ring-2 focus:ring-tropical-teal focus:border-tropical-teal transition-all duration-300 placeholder-aqua-mint/50 backdrop-blur-sm hover:border-tropical-teal/40 group-hover:scale-[1.02]"
                    placeholder="your.email@company.com"
                    autoComplete="email"
                  />
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
                    : "bg-gradient-indigo hover:shadow-glow-indigo transform hover:scale-105 hover:-translate-y-0.5 active:scale-95"
                }`}
              >
                <div className="absolute -inset-0.5 bg-gradient-indigo rounded-2xl blur opacity-0 group-hover:opacity-30 transition duration-300"></div>
                <div className="relative flex items-center justify-center gap-2">
                  {loading ? (
                    <>
                      <LoadingSpinner className="h-5 w-5" />
                      Sending Reset Link...
                    </>
                  ) : (
                    <>
                      Send Reset Link
                      <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                    </>
                  )}
                </div>
              </button>
            </form>

            {/* Enhanced Back Link */}
            <div className="mt-6 text-center">
              <Link 
                href="/login" 
                className="inline-block text-electric-indigo hover:text-aqua-mint transition-colors duration-200 hover:scale-105 transform"
              >
                ← Back to Login
              </Link>
            </div>
          </div>
        </div>

        {/* Enhanced Help Text */}
        <div className="mt-8 text-center">
          <p className="text-aqua-mint/60 text-sm">
            Remember your password?{" "}
            <Link 
              href="/login" 
              className="text-electric-indigo hover:text-tropical-teal font-semibold transition-all duration-200 hover:scale-105 transform inline-block"
            >
              Sign in here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
} 