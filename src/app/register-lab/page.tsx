"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import {
  ArrowLeft,
  Building2,
  Mail,
  Phone,
  MapPin,
  FileText,
  Upload,
  Shield,
  Loader2,
  CheckCircle2,
  Copy,
  ImageIcon,
  X,
  Clock,
  XCircle,
  Eye,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka",
  "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram",
  "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu",
  "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
  "Delhi", "Jammu and Kashmir", "Ladakh", "Chandigarh", "Puducherry",
  "Andaman and Nicobar Islands", "Dadra and Nagar Haveli and Daman and Diu", "Lakshadweep",
];

const MAX_IMAGE_SIZE = 1 * 1024 * 1024; // 1MB

const labFormSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().optional(),
  phone: z
    .string()
    .regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile number"),
  labName: z.string().min(2, "Lab name must be at least 2 characters").max(200),
  landmark: z.string().min(2, "Landmark is required").max(200),
  city: z.string().min(2, "City is required").max(100),
  district: z.string().min(2, "District is required").max(100),
  state: z.string().min(2, "Please select a state"),
  labRegIdNo: z.string().min(2, "Lab Registration ID is required").max(100),
  description: z.string().max(500, "Description must be under 500 characters").optional(),
});

type LabFormData = z.infer<typeof labFormSchema>;

interface LabRegistration {
  id: string;
  unique_lab_id: string;
  email: string;
  phone: string;
  lab_name: string;
  landmark: string;
  city: string;
  district: string;
  state: string;
  lab_reg_id_no: string;
  image_url: string | null;
  description: string | null;
  status: "pending" | "approved" | "rejected";
  created_at: string;
}

type Step = "loading" | "status" | "admin" | "form" | "verify-otp" | "submitting" | "success";

export default function RegisterLabPage() {
  const [user, setUser] = useState<{ id: string; email: string } | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [step, setStep] = useState<Step>("loading");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageError, setImageError] = useState("");
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [uniqueLabId, setUniqueLabId] = useState("");
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Existing registration data
  const [existingRegistration, setExistingRegistration] = useState<LabRegistration | null>(null);

  // Admin data
  const [allRegistrations, setAllRegistrations] = useState<LabRegistration[]>([]);
  const [adminActionLoading, setAdminActionLoading] = useState<string | null>(null);
  const [expandedCard, setExpandedCard] = useState<string | null>(null);

  // Stored form data after validation (before OTP)
  const [pendingFormData, setPendingFormData] = useState<LabFormData | null>(null);

  // OTP states
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState("");
  const [countdown, setCountdown] = useState(0);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<LabFormData>({
    resolver: zodResolver(labFormSchema),
    defaultValues: {
      email: "",
      phone: "",
      labName: "",
      landmark: "",
      city: "",
      district: "",
      state: "",
      labRegIdNo: "",
      description: "",
    },
  });

  const watchEmail = watch("email");

  // Check auth and fetch existing registrations
  useEffect(() => {
    const init = async () => {
      const supabase = createClient();
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();

      if (authUser) {
        setUser({ id: authUser.id, email: authUser.email! });
        setValue("email", authUser.email!);

        // Fetch registrations and role
        try {
          const res = await fetch("/api/register-lab");
          const data = await res.json();

          if (res.ok) {
            setUserRole(data.role);

            if (data.role === "admin") {
              setAllRegistrations(data.registrations || []);
              setStep("admin");
            } else if (data.registrations && data.registrations.length > 0) {
              setExistingRegistration(data.registrations[0]);
              setStep("status");
            } else {
              setStep("form");
            }
          } else {
            setStep("form");
          }
        } catch {
          setStep("form");
        }
      } else {
        setStep("form");
      }

      setAuthLoading(false);
    };

    init();
  }, [setValue]);

  // Countdown timer
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  // Admin: approve or reject
  const handleAdminAction = async (registrationId: string, status: "approved" | "rejected") => {
    setAdminActionLoading(registrationId + status);

    try {
      const res = await fetch("/api/register-lab", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ registrationId, status }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      // Update local state
      setAllRegistrations((prev) =>
        prev.map((r) => (r.id === registrationId ? { ...r, status } : r))
      );
    } catch (err) {
      console.error("Admin action error:", err);
    } finally {
      setAdminActionLoading(null);
    }
  };

  // Step 1: User fills form and clicks submit → validate → send OTP
  const onFormSubmit = async (data: LabFormData) => {
    setPendingFormData(data);
    setSubmitError("");

    if (user) {
      await submitRegistration(data, user.id);
      return;
    }

    setOtpLoading(true);
    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: data.email }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error);

      setStep("verify-otp");
      setCountdown(60);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to send OTP";
      setSubmitError(message);
    } finally {
      setOtpLoading(false);
    }
  };

  // Step 2: Verify OTP → then submit registration
  const handleVerifyAndSubmit = async () => {
    const otpString = otp.join("");
    if (otpString.length !== 6) {
      setOtpError("Please enter the complete 6-digit OTP");
      return;
    }

    if (!pendingFormData) return;

    setOtpLoading(true);
    setOtpError("");

    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: pendingFormData.email, otp: otpString }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      let userId = data.userId;
      if (data.actionLink) {
        const supabase = createClient();
        const url = new URL(data.actionLink);
        const tokenHash =
          url.searchParams.get("token_hash") ||
          url.searchParams.get("token") ||
          "";

        await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: "magiclink",
        });

        const {
          data: { user: authUser },
        } = await supabase.auth.getUser();
        if (authUser) {
          setUser({ id: authUser.id, email: authUser.email! });
          userId = authUser.id;
        }
      }

      setStep("submitting");
      await submitRegistration(pendingFormData, userId);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Verification failed";
      setOtpError(message);
    } finally {
      setOtpLoading(false);
    }
  };

  // Actual registration submission
  const submitRegistration = async (data: LabFormData, userId?: string) => {
    setSubmitLoading(true);
    setSubmitError("");

    try {
      let imageUrl: string | undefined;

      if (imageFile) {
        const supabase = createClient();
        const fileExt = imageFile.name.split(".").pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("lab-images")
          .upload(fileName, imageFile, {
            cacheControl: "3600",
            upsert: false,
          });

        if (uploadError) {
          throw new Error("Image upload failed: " + uploadError.message);
        }

        const {
          data: { publicUrl },
        } = supabase.storage.from("lab-images").getPublicUrl(uploadData.path);

        imageUrl = publicUrl;
      }

      const res = await fetch("/api/register-lab", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          imageUrl,
          userId,
        }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error);

      setUniqueLabId(result.uniqueLabId);
      setStep("success");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Registration failed";
      setSubmitError(message);
      if (step === "submitting") setStep("form");
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (countdown > 0 || !pendingFormData) return;
    setOtp(["", "", "", "", "", ""]);
    setOtpError("");
    setOtpLoading(true);

    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: pendingFormData.email }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      setCountdown(60);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to resend OTP";
      setOtpError(message);
    } finally {
      setOtpLoading(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) {
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
    if (value && index < 5) otpRefs.current[index + 1]?.focus();
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setImageError("");

    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      setImageError("Only JPEG, PNG, and WebP images are allowed");
      return;
    }

    if (file.size > MAX_IMAGE_SIZE) {
      setImageError("Image must be under 1MB");
      return;
    }

    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const copyLabId = (id?: string) => {
    navigator.clipboard.writeText(id || uniqueLabId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (authLoading || step === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-hero-start via-hero-mid to-hero-end">
        <Loader2 size={32} className="animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-hero-start via-hero-mid to-hero-end">
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

      <div className="mx-auto max-w-2xl px-4 pb-12">
        {/* Title */}
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
            <Building2 size={28} className="text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-primary sm:text-3xl">
            {step === "admin" ? "Lab Registration Requests" : "Register Your Lab"}
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            {step === "admin"
              ? "Review and manage lab registration requests"
              : "Join LabsBuzz network and reach thousands of patients"}
          </p>
        </div>

        {/* ===================== STATUS STEP (Existing Registration) ===================== */}
        {step === "status" && existingRegistration && (
          <div className="rounded-2xl bg-white p-6 shadow-xl sm:p-8">
            {existingRegistration.status === "pending" && (
              <>
                <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-yellow-100">
                  <Clock size={40} className="text-yellow-600" />
                </div>
                <h2 className="text-center text-xl font-bold text-gray-900">
                  Registration Under Review
                </h2>
                <p className="mt-2 text-center text-sm text-gray-600">
                  Your lab has been registered. Please wait for admin approval.
                </p>

                <div className="mx-auto mt-6 max-w-xs">
                  <div className="flex items-center justify-between rounded-xl border-2 border-yellow-200 bg-yellow-50 px-4 py-3">
                    <div>
                      <p className="text-xs text-yellow-600">Your Lab ID</p>
                      <span className="text-lg font-bold tracking-wider text-yellow-700">
                        {existingRegistration.unique_lab_id}
                      </span>
                    </div>
                    <button
                      onClick={() => copyLabId(existingRegistration.unique_lab_id)}
                      className="rounded-lg p-2 text-yellow-600 transition-colors hover:bg-yellow-100"
                    >
                      {copied ? <CheckCircle2 size={20} className="text-green-600" /> : <Copy size={20} />}
                    </button>
                  </div>
                </div>

                <div className="mt-6 rounded-xl border border-gray-200 bg-gray-50 p-4">
                  <h3 className="mb-2 text-sm font-semibold text-gray-700">Registration Details</h3>
                  <div className="space-y-1 text-sm text-gray-600">
                    <p><span className="font-medium">Lab Name:</span> {existingRegistration.lab_name}</p>
                    <p><span className="font-medium">Location:</span> {existingRegistration.city}, {existingRegistration.district}, {existingRegistration.state}</p>
                    <p><span className="font-medium">Reg ID:</span> {existingRegistration.lab_reg_id_no}</p>
                  </div>
                </div>
              </>
            )}

            {existingRegistration.status === "approved" && (
              <>
                <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
                  <CheckCircle2 size={40} className="text-green-600" />
                </div>
                <h2 className="text-center text-xl font-bold text-gray-900">
                  Lab Approved!
                </h2>
                <p className="mt-2 text-center text-sm text-gray-600">
                  Your lab <span className="font-semibold">{existingRegistration.lab_name}</span> has been approved.
                </p>

                <div className="mx-auto mt-6 max-w-xs">
                  <div className="flex items-center justify-between rounded-xl border-2 border-green-200 bg-green-50 px-4 py-3">
                    <div>
                      <p className="text-xs text-green-600">Your Lab ID</p>
                      <span className="text-lg font-bold tracking-wider text-green-700">
                        {existingRegistration.unique_lab_id}
                      </span>
                    </div>
                    <button
                      onClick={() => copyLabId(existingRegistration.unique_lab_id)}
                      className="rounded-lg p-2 text-green-600 transition-colors hover:bg-green-100"
                    >
                      {copied ? <CheckCircle2 size={20} /> : <Copy size={20} />}
                    </button>
                  </div>
                </div>

                <button className="mt-6 flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-primary text-base font-bold text-white shadow-lg transition-all hover:bg-primary-light">
                  <Building2 size={20} />
                  Register Your Service
                </button>
              </>
            )}

            {existingRegistration.status === "rejected" && (
              <>
                <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-red-100">
                  <XCircle size={40} className="text-red-600" />
                </div>
                <h2 className="text-center text-xl font-bold text-gray-900">
                  Registration Rejected
                </h2>
                <p className="mt-2 text-center text-sm text-gray-600">
                  Unfortunately, your lab registration for <span className="font-semibold">{existingRegistration.lab_name}</span> was not approved.
                  Please contact support or try registering again with updated details.
                </p>

                <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4">
                  <p className="text-sm text-red-700">
                    <span className="font-medium">Lab ID:</span> {existingRegistration.unique_lab_id}
                  </p>
                  <p className="text-sm text-red-700">
                    <span className="font-medium">Reg ID:</span> {existingRegistration.lab_reg_id_no}
                  </p>
                </div>

                <button
                  onClick={() => {
                    setExistingRegistration(null);
                    setStep("form");
                  }}
                  className="mt-6 flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-primary text-base font-bold text-white shadow-lg transition-all hover:bg-primary-light"
                >
                  <Building2 size={20} />
                  Register Again
                </button>
              </>
            )}

            <div className="mt-6 flex justify-center">
              <Link
                href="/"
                className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-700"
              >
                <ArrowLeft size={16} />
                Back to Home
              </Link>
            </div>
          </div>
        )}

        {/* ===================== ADMIN PANEL ===================== */}
        {step === "admin" && (
          <div className="space-y-4">
            {allRegistrations.length === 0 ? (
              <div className="rounded-2xl bg-white p-6 text-center shadow-xl sm:p-8">
                <Building2 size={40} className="mx-auto text-gray-300" />
                <p className="mt-3 text-sm text-gray-500">No registration requests yet.</p>
              </div>
            ) : (
              allRegistrations.map((reg) => (
                <div
                  key={reg.id}
                  className="rounded-2xl bg-white shadow-xl overflow-hidden"
                >
                  {/* Card Header */}
                  <div className="flex items-center justify-between p-4 sm:p-6">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-bold text-gray-900">{reg.lab_name}</h3>
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            reg.status === "pending"
                              ? "bg-yellow-100 text-yellow-700"
                              : reg.status === "approved"
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {reg.status.charAt(0).toUpperCase() + reg.status.slice(1)}
                        </span>
                      </div>
                      <p className="mt-0.5 text-sm text-gray-500">
                        {reg.unique_lab_id} &middot; {new Date(reg.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <button
                      onClick={() => setExpandedCard(expandedCard === reg.id ? null : reg.id)}
                      className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                    >
                      <Eye size={18} />
                    </button>
                  </div>

                  {/* Expanded Details */}
                  {expandedCard === reg.id && (
                    <div className="border-t border-gray-100 bg-gray-50 p-4 sm:p-6">
                      <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                        <div>
                          <span className="font-medium text-gray-500">Email:</span>
                          <p className="text-gray-900">{reg.email}</p>
                        </div>
                        <div>
                          <span className="font-medium text-gray-500">Phone:</span>
                          <p className="text-gray-900">+91 {reg.phone}</p>
                        </div>
                        <div>
                          <span className="font-medium text-gray-500">Landmark:</span>
                          <p className="text-gray-900">{reg.landmark}</p>
                        </div>
                        <div>
                          <span className="font-medium text-gray-500">City:</span>
                          <p className="text-gray-900">{reg.city}</p>
                        </div>
                        <div>
                          <span className="font-medium text-gray-500">District:</span>
                          <p className="text-gray-900">{reg.district}</p>
                        </div>
                        <div>
                          <span className="font-medium text-gray-500">State:</span>
                          <p className="text-gray-900">{reg.state}</p>
                        </div>
                        <div>
                          <span className="font-medium text-gray-500">Lab Reg ID:</span>
                          <p className="text-gray-900">{reg.lab_reg_id_no}</p>
                        </div>
                        <div>
                          <span className="font-medium text-gray-500">Lab ID:</span>
                          <p className="text-gray-900">{reg.unique_lab_id}</p>
                        </div>
                      </div>
                      {reg.description && (
                        <div className="mt-3">
                          <span className="text-sm font-medium text-gray-500">Description:</span>
                          <p className="text-sm text-gray-900">{reg.description}</p>
                        </div>
                      )}
                      {reg.image_url && (
                        <div className="mt-3">
                          <span className="text-sm font-medium text-gray-500">Lab Image:</span>
                          <img
                            src={reg.image_url}
                            alt={reg.lab_name}
                            className="mt-1 h-40 w-full rounded-lg object-cover"
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Action Buttons */}
                  {reg.status === "pending" && (
                    <div className="flex gap-3 border-t border-gray-100 p-4 sm:p-6">
                      <button
                        onClick={() => handleAdminAction(reg.id, "approved")}
                        disabled={adminActionLoading !== null}
                        className="flex h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-green-600 text-sm font-semibold text-white transition-colors hover:bg-green-700 disabled:opacity-50"
                      >
                        {adminActionLoading === reg.id + "approved" ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <>
                            <CheckCircle2 size={16} />
                            Approve
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => handleAdminAction(reg.id, "rejected")}
                        disabled={adminActionLoading !== null}
                        className="flex h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-red-600 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-50"
                      >
                        {adminActionLoading === reg.id + "rejected" ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <>
                            <XCircle size={16} />
                            Reject
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* ===================== FORM STEP ===================== */}
        {step === "form" && (
          <form
            onSubmit={handleSubmit(onFormSubmit)}
            className="space-y-4 rounded-2xl bg-white p-6 shadow-xl sm:p-8"
          >
            {/* Email */}
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-gray-700">
                <Mail size={15} className="text-accent" />
                Email Address <span className="text-red-500">*</span>
              </label>
              {user ? (
                <div className="flex h-12 items-center gap-2 rounded-xl border-2 border-green-200 bg-green-50 px-4">
                  <CheckCircle2 size={18} className="text-green-600" />
                  <span className="text-sm font-medium text-green-800">
                    {user.email}
                  </span>
                  <span className="ml-auto text-xs font-medium text-green-600">
                    Verified
                  </span>
                </div>
              ) : (
                <>
                  <input
                    {...register("email")}
                    type="email"
                    placeholder="lab@example.com"
                    className="h-12 w-full rounded-xl border-2 border-gray-200 bg-gray-50 px-4 text-base text-gray-900 placeholder-gray-400 outline-none transition-all focus:border-accent focus:bg-white focus:ring-2 focus:ring-accent/20"
                  />
                  <p className="mt-1 text-xs text-gray-400">
                    An OTP will be sent to verify this email on submit
                  </p>
                </>
              )}
              {errors.email && (
                <p className="mt-1 text-xs text-red-600">
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* Password — only show if user is NOT logged in */}
            {!user && (
              <div>
                <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-gray-700">
                  <Shield size={15} className="text-accent" />
                  Password{" "}
                  <span className="text-xs font-normal text-gray-400">
                    (optional if using OTP)
                  </span>
                </label>
                <input
                  {...register("password")}
                  type="password"
                  placeholder="Min 8 characters"
                  autoComplete="new-password"
                  className="h-12 w-full rounded-xl border-2 border-gray-200 bg-gray-50 px-4 text-base text-gray-900 placeholder-gray-400 outline-none transition-all focus:border-accent focus:bg-white focus:ring-2 focus:ring-accent/20"
                />
              </div>
            )}

            {/* Phone */}
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-gray-700">
                <Phone size={15} className="text-accent" />
                Mobile Number <span className="text-red-500">*</span>
              </label>
              <div className="flex">
                <div className="flex h-12 items-center rounded-l-xl border-2 border-r-0 border-gray-200 bg-gray-100 px-3 text-sm font-medium text-gray-600">
                  +91
                </div>
                <input
                  {...register("phone")}
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  placeholder="9876543210"
                  className="h-12 flex-1 rounded-r-xl border-2 border-gray-200 bg-gray-50 px-4 text-base text-gray-900 placeholder-gray-400 outline-none transition-all focus:border-accent focus:bg-white focus:ring-2 focus:ring-accent/20"
                />
              </div>
              {errors.phone && (
                <p className="mt-1 text-xs text-red-600">
                  {errors.phone.message}
                </p>
              )}
            </div>

            {/* Lab Name */}
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-gray-700">
                <Building2 size={15} className="text-accent" />
                Lab Name <span className="text-red-500">*</span>
              </label>
              <input
                {...register("labName")}
                type="text"
                placeholder="e.g., Metro Diagnostics Lab"
                className="h-12 w-full rounded-xl border-2 border-gray-200 bg-gray-50 px-4 text-base text-gray-900 placeholder-gray-400 outline-none transition-all focus:border-accent focus:bg-white focus:ring-2 focus:ring-accent/20"
              />
              {errors.labName && (
                <p className="mt-1 text-xs text-red-600">
                  {errors.labName.message}
                </p>
              )}
            </div>

            {/* Landmark */}
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-gray-700">
                <MapPin size={15} className="text-accent" />
                Landmark <span className="text-red-500">*</span>
              </label>
              <input
                {...register("landmark")}
                type="text"
                placeholder="e.g., Near City Hospital"
                className="h-12 w-full rounded-xl border-2 border-gray-200 bg-gray-50 px-4 text-base text-gray-900 placeholder-gray-400 outline-none transition-all focus:border-accent focus:bg-white focus:ring-2 focus:ring-accent/20"
              />
              {errors.landmark && (
                <p className="mt-1 text-xs text-red-600">
                  {errors.landmark.message}
                </p>
              )}
            </div>

            {/* City & District */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  City <span className="text-red-500">*</span>
                </label>
                <input
                  {...register("city")}
                  type="text"
                  placeholder="e.g., Patna"
                  className="h-12 w-full rounded-xl border-2 border-gray-200 bg-gray-50 px-4 text-base text-gray-900 placeholder-gray-400 outline-none transition-all focus:border-accent focus:bg-white focus:ring-2 focus:ring-accent/20"
                />
                {errors.city && (
                  <p className="mt-1 text-xs text-red-600">
                    {errors.city.message}
                  </p>
                )}
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  District <span className="text-red-500">*</span>
                </label>
                <input
                  {...register("district")}
                  type="text"
                  placeholder="e.g., Patna"
                  className="h-12 w-full rounded-xl border-2 border-gray-200 bg-gray-50 px-4 text-base text-gray-900 placeholder-gray-400 outline-none transition-all focus:border-accent focus:bg-white focus:ring-2 focus:ring-accent/20"
                />
                {errors.district && (
                  <p className="mt-1 text-xs text-red-600">
                    {errors.district.message}
                  </p>
                )}
              </div>
            </div>

            {/* State */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                State <span className="text-red-500">*</span>
              </label>
              <select
                {...register("state")}
                className="h-12 w-full rounded-xl border-2 border-gray-200 bg-gray-50 px-4 text-base text-gray-900 outline-none transition-all focus:border-accent focus:bg-white focus:ring-2 focus:ring-accent/20"
              >
                <option value="">Select State</option>
                {INDIAN_STATES.map((state) => (
                  <option key={state} value={state}>
                    {state}
                  </option>
                ))}
              </select>
              {errors.state && (
                <p className="mt-1 text-xs text-red-600">
                  {errors.state.message}
                </p>
              )}
            </div>

            {/* Lab Registration ID */}
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-gray-700">
                <FileText size={15} className="text-accent" />
                Lab Registration ID No. <span className="text-red-500">*</span>
              </label>
              <input
                {...register("labRegIdNo")}
                type="text"
                placeholder="e.g., NABL-12345"
                className="h-12 w-full rounded-xl border-2 border-gray-200 bg-gray-50 px-4 text-base text-gray-900 placeholder-gray-400 outline-none transition-all focus:border-accent focus:bg-white focus:ring-2 focus:ring-accent/20"
              />
              {errors.labRegIdNo && (
                <p className="mt-1 text-xs text-red-600">
                  {errors.labRegIdNo.message}
                </p>
              )}
            </div>

            {/* Image Upload */}
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-gray-700">
                <Upload size={15} className="text-accent" />
                Lab Image{" "}
                <span className="text-xs font-normal text-gray-400">
                  (up to 1MB, JPEG/PNG/WebP)
                </span>
              </label>
              {imagePreview ? (
                <div className="relative overflow-hidden rounded-xl border-2 border-gray-200">
                  <img
                    src={imagePreview}
                    alt="Lab preview"
                    className="h-48 w-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={removeImage}
                    className="absolute right-2 top-2 rounded-full bg-black/50 p-1.5 text-white transition-colors hover:bg-black/70"
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex h-32 w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 text-gray-400 transition-colors hover:border-accent hover:bg-accent/5 hover:text-accent"
                >
                  <ImageIcon size={28} />
                  <span className="text-sm font-medium">
                    Click to upload lab image
                  </span>
                </button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleImageChange}
                className="hidden"
              />
              {imageError && (
                <p className="mt-1 text-xs text-red-600">{imageError}</p>
              )}
            </div>

            {/* Description */}
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-gray-700">
                <FileText size={15} className="text-accent" />
                Description{" "}
                <span className="text-xs font-normal text-gray-400">
                  (optional)
                </span>
              </label>
              <textarea
                {...register("description")}
                placeholder="Tell us about your lab, specializations, certifications..."
                rows={3}
                className="w-full rounded-xl border-2 border-gray-200 bg-gray-50 px-4 py-3 text-base text-gray-900 placeholder-gray-400 outline-none transition-all focus:border-accent focus:bg-white focus:ring-2 focus:ring-accent/20"
              />
              {errors.description && (
                <p className="mt-1 text-xs text-red-600">
                  {errors.description.message}
                </p>
              )}
            </div>

            {/* Submit Error */}
            {submitError && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {submitError}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitLoading || otpLoading}
              className="flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-primary text-base font-bold text-white shadow-lg transition-all hover:bg-primary-light disabled:opacity-50"
            >
              {submitLoading || otpLoading ? (
                <Loader2 size={22} className="animate-spin" />
              ) : (
                <>
                  <Building2 size={20} />
                  {user ? "Submit Registration" : "Submit & Verify Email"}
                </>
              )}
            </button>

            {!user && (
              <p className="text-center text-xs text-gray-500">
                A verification code will be sent to your email to confirm
              </p>
            )}
          </form>
        )}

        {/* ===================== OTP VERIFY STEP ===================== */}
        {step === "verify-otp" && pendingFormData && (
          <div className="rounded-2xl bg-white p-6 shadow-xl sm:p-8">
            <div className="mb-1 flex items-center gap-2">
              <Shield size={22} className="text-accent" />
              <h3 className="text-lg font-semibold text-gray-900">
                Verify your email
              </h3>
            </div>
            <p className="mb-6 text-sm text-gray-500">
              We sent a 6-digit code to{" "}
              <span className="font-medium text-gray-700">
                {pendingFormData.email}
              </span>
            </p>

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
                  onChange={(e) => handleOtpChange(index, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(index, e)}
                  className="h-12 w-10 rounded-lg border-2 border-gray-200 bg-gray-50 text-center text-lg font-bold text-gray-900 outline-none transition-all focus:border-accent focus:bg-white focus:ring-2 focus:ring-accent/20 sm:h-14 sm:w-12"
                />
              ))}
            </div>

            {otpError && (
              <p className="mt-3 text-center text-sm text-red-600">
                {otpError}
              </p>
            )}

            <button
              onClick={handleVerifyAndSubmit}
              disabled={otpLoading || otp.join("").length !== 6}
              className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-accent font-semibold text-white transition-colors hover:bg-accent-dark disabled:opacity-50"
            >
              {otpLoading ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                <>
                  <CheckCircle2 size={18} />
                  Verify & Confirm Registration
                </>
              )}
            </button>

            <div className="mt-4 flex items-center justify-between">
              <button
                onClick={() => {
                  setStep("form");
                  setOtp(["", "", "", "", "", ""]);
                  setOtpError("");
                }}
                className="text-sm font-medium text-gray-500 hover:text-gray-700"
              >
                <span className="flex items-center gap-1">
                  <ArrowLeft size={14} />
                  Back to form
                </span>
              </button>
              <button
                onClick={handleResendOtp}
                disabled={countdown > 0 || otpLoading}
                className="text-sm font-medium text-accent hover:text-accent-dark disabled:text-gray-400"
              >
                {countdown > 0
                  ? `Resend in ${countdown}s`
                  : "Resend OTP"}
              </button>
            </div>
          </div>
        )}

        {/* ===================== SUBMITTING STEP ===================== */}
        {step === "submitting" && (
          <div className="rounded-2xl bg-white p-6 text-center shadow-xl sm:p-8">
            <Loader2 size={40} className="mx-auto animate-spin text-primary" />
            <p className="mt-4 text-sm font-medium text-gray-600">
              Registering your lab...
            </p>
            {submitError && (
              <p className="mt-2 text-sm text-red-600">{submitError}</p>
            )}
          </div>
        )}

        {/* ===================== SUCCESS STEP ===================== */}
        {step === "success" && (
          <div className="rounded-2xl bg-white p-6 text-center shadow-xl sm:p-8">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
              <CheckCircle2 size={40} className="text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">
              Registration Successful!
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Your lab has been registered. Here is your unique Lab ID:
            </p>

            <div className="mx-auto mt-6 max-w-xs">
              <div className="flex items-center justify-between rounded-xl border-2 border-primary/20 bg-primary/5 px-4 py-3">
                <span className="text-lg font-bold tracking-wider text-primary">
                  {uniqueLabId}
                </span>
                <button
                  onClick={() => copyLabId()}
                  className="rounded-lg p-2 text-primary transition-colors hover:bg-primary/10"
                  title="Copy Lab ID"
                >
                  {copied ? (
                    <CheckCircle2 size={20} className="text-green-600" />
                  ) : (
                    <Copy size={20} />
                  )}
                </button>
              </div>
              {copied && (
                <p className="mt-1 text-xs text-green-600">
                  Copied to clipboard!
                </p>
              )}
            </div>

            <p className="mt-6 text-xs text-gray-500">
              Save this ID. Our team will review your registration and you&apos;ll
              be notified once approved.
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Link
                href="/"
                className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-gray-200 px-6 py-3 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
              >
                <ArrowLeft size={16} />
                Back to Home
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
