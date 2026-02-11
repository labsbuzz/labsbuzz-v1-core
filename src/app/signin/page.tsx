"use client";

import { useState, useRef, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { ArrowLeft, Mail, Shield, Loader2 } from "lucide-react";

type Step = "email" | "otp" | "success";

export default function SignInPage() {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [countdown, setCountdown] = useState(0);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  const passwordEmails = ["amanksah123@gmail.com", "user3@labsbuzz.com", "user4@labsbuzz.com", "rvraj@gmail.com"];
  const isPasswordLogin = passwordEmails.includes(email.toLowerCase());
  const isAdminEmail = email.toLowerCase() === "amanksah123@gmail.com";

  // Countdown timer for resend
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError("");
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) throw error;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to sign in with Google";
      setError(message);
      setLoading(false);
    }
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    setError("");

    try {
      // Password login (admin + test users)
      if (isPasswordLogin) {
        if (!password) {
          setError("Please enter the password");
          setLoading(false);
          return;
        }

        const supabase = createClient();
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: email.toLowerCase(),
          password,
        });

        if (signInError) throw signInError;

        setStep("success");
        setTimeout(() => {
          window.location.href = "/";
        }, 1500);
        return;
      }

      // Regular user: send OTP
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to send OTP");
      }

      setStep("otp");
      setCountdown(60);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to send OTP";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) {
      // Handle paste
      const digits = value.replace(/\D/g, "").slice(0, 6);
      const newOtp = [...otp];
      for (let i = 0; i < digits.length && index + i < 6; i++) {
        newOtp[index + i] = digits[i];
      }
      setOtp(newOtp);
      const nextIndex = Math.min(index + digits.length, 5);
      otpRefs.current[nextIndex]?.focus();
      return;
    }

    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const otpString = otp.join("");
    if (otpString.length !== 6) {
      setError("Please enter the complete 6-digit OTP");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp: otpString }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Verification failed");
      }

      // Exchange the magic link for a session
      if (data.actionLink) {
        const supabase = createClient();
        // Extract token_hash from the action link
        const url = new URL(data.actionLink);
        const tokenHash =
          url.searchParams.get("token_hash") ||
          url.searchParams.get("token") ||
          "";
        const type = url.searchParams.get("type") || "magiclink";

        const { error: verifyError } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: type as "magiclink",
        });

        if (verifyError) {
          console.error("Session exchange error:", verifyError);
          // Still show success — user was verified
        }
      }

      setStep("success");
      // Redirect after a brief delay
      setTimeout(() => {
        window.location.href = "/";
      }, 1500);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Verification failed";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (countdown > 0) return;
    setOtp(["", "", "", "", "", ""]);
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setCountdown(60);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to resend OTP";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-hero-start via-hero-mid to-hero-end">
      {/* Header */}
      <div className="p-4">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:text-primary-light"
        >
          <ArrowLeft size={18} />
          Back to Home
        </Link>
      </div>

      {/* Content */}
      <div className="flex flex-1 items-center justify-center px-4 pb-12">
        <div className="w-full max-w-md">
          {/* Card */}
          <div className="rounded-2xl bg-white p-6 shadow-xl sm:p-8">
            {/* Logo */}
            <div className="mb-6 text-center">
              <h2 className="text-2xl font-bold text-primary">labsbuzz</h2>
              <p className="mt-1 text-xs text-gray-500">
                health deserves clarity
              </p>
            </div>

            {/* Step: Email */}
            {step === "email" && (
              <>
                <h3 className="mb-1 text-lg font-semibold text-gray-900">
                  Sign in to your account
                </h3>
                <p className="mb-6 text-sm text-gray-500">
                  Enter your email to receive a one-time verification code
                </p>

                {/* Google Sign In */}
                <button
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-3 rounded-xl border-2 border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-700 transition-all hover:border-gray-300 hover:bg-gray-50 disabled:opacity-50"
                >
                  <svg viewBox="0 0 24 24" className="h-5 w-5">
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                  </svg>
                  Continue with Google
                </button>

                {/* Divider */}
                <div className="my-6 flex items-center gap-3">
                  <div className="h-px flex-1 bg-gray-200" />
                  <span className="text-xs font-medium text-gray-400">
                    OR
                  </span>
                  <div className="h-px flex-1 bg-gray-200" />
                </div>

                {/* Email form */}
                <form onSubmit={handleSendOtp}>
                  <label
                    htmlFor="email"
                    className="mb-1.5 block text-sm font-medium text-gray-700"
                  >
                    Email address
                  </label>
                  <div className="relative">
                    <Mail
                      size={18}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                    />
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      required
                      autoComplete="email"
                      className="h-12 w-full rounded-xl border-2 border-gray-200 bg-gray-50 pl-10 pr-4 text-base text-gray-900 placeholder-gray-400 outline-none transition-all focus:border-accent focus:bg-white focus:ring-2 focus:ring-accent/20"
                    />
                  </div>

                  {/* Password field for admin + test users */}
                  {isPasswordLogin && (
                    <div className="mt-3">
                      <label
                        htmlFor="password"
                        className="mb-1.5 block text-sm font-medium text-gray-700"
                      >
                        {isAdminEmail ? "Admin Password" : "Password"}
                      </label>
                      <input
                        id="password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter admin password"
                        className="h-12 w-full rounded-xl border-2 border-gray-200 bg-gray-50 px-4 text-base text-gray-900 placeholder-gray-400 outline-none transition-all focus:border-accent focus:bg-white focus:ring-2 focus:ring-accent/20"
                      />
                    </div>
                  )}

                  {error && (
                    <p className="mt-2 text-sm text-red-600">{error}</p>
                  )}

                  <button
                    type="submit"
                    disabled={loading || !email}
                    className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-accent font-semibold text-white transition-colors hover:bg-accent-dark disabled:opacity-50"
                  >
                    {loading ? (
                      <Loader2 size={20} className="animate-spin" />
                    ) : isPasswordLogin ? (
                      <>
                        <Shield size={18} />
                        {isAdminEmail ? "Sign In as Admin" : "Sign In"}
                      </>
                    ) : (
                      <>
                        <Mail size={18} />
                        Send Verification Code
                      </>
                    )}
                  </button>
                </form>

                <p className="mt-4 text-center text-xs text-gray-500">
                  New user? You&apos;ll be registered automatically.
                </p>
              </>
            )}

            {/* Step: OTP */}
            {step === "otp" && (
              <>
                <div className="mb-1 flex items-center gap-2">
                  <Shield size={20} className="text-accent" />
                  <h3 className="text-lg font-semibold text-gray-900">
                    Verify your email
                  </h3>
                </div>
                <p className="mb-6 text-sm text-gray-500">
                  We sent a 6-digit code to{" "}
                  <span className="font-medium text-gray-700">{email}</span>
                </p>

                <form onSubmit={handleVerifyOtp}>
                  <div className="flex justify-center gap-2 sm:gap-3">
                    {otp.map((digit, index) => (
                      <input
                        key={index}
                        ref={(el) => {
                          otpRefs.current[index] = el;
                        }}
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        value={digit}
                        onChange={(e) =>
                          handleOtpChange(index, e.target.value)
                        }
                        onKeyDown={(e) => handleOtpKeyDown(index, e)}
                        className="h-12 w-10 rounded-lg border-2 border-gray-200 bg-gray-50 text-center text-lg font-bold text-gray-900 outline-none transition-all focus:border-accent focus:bg-white focus:ring-2 focus:ring-accent/20 sm:h-14 sm:w-12"
                      />
                    ))}
                  </div>

                  {error && (
                    <p className="mt-3 text-center text-sm text-red-600">
                      {error}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={loading || otp.join("").length !== 6}
                    className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-accent font-semibold text-white transition-colors hover:bg-accent-dark disabled:opacity-50"
                  >
                    {loading ? (
                      <Loader2 size={20} className="animate-spin" />
                    ) : (
                      "Verify & Sign In"
                    )}
                  </button>
                </form>

                <div className="mt-4 flex items-center justify-between">
                  <button
                    onClick={() => {
                      setStep("email");
                      setOtp(["", "", "", "", "", ""]);
                      setError("");
                    }}
                    className="text-sm font-medium text-gray-500 hover:text-gray-700"
                  >
                    Change email
                  </button>
                  <button
                    onClick={handleResendOtp}
                    disabled={countdown > 0 || loading}
                    className="text-sm font-medium text-accent hover:text-accent-dark disabled:text-gray-400"
                  >
                    {countdown > 0
                      ? `Resend in ${countdown}s`
                      : "Resend OTP"}
                  </button>
                </div>
              </>
            )}

            {/* Step: Success */}
            {step === "success" && (
              <div className="py-4 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                  <svg
                    className="h-8 w-8 text-green-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Welcome!
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Signed in successfully. Redirecting...
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
