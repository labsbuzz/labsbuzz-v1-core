"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import {
  X,
  UserPlus,
  User,
  Users,
  Trash2,
  Loader2,
  CheckCircle,
  AlertCircle,
  IndianRupee,
  Plus,
  Phone,
  Calendar,
  Save,
} from "lucide-react";

interface BookingModalProps {
  labServiceId: string;
  labRegistrationId: string;
  testName: string;
  category: string;
  labName: string;
  pricePerTest: number;
  onClose: () => void;
}

interface PatientForm {
  patientName: string;
  patientAge: string;
  patientGender: string;
  relationship: string;
}

interface Profile {
  full_name: string;
  age: number | null;
  gender: string | null;
  phone: string;
}

const RELATIONSHIPS = [
  "self",
  "father",
  "mother",
  "spouse",
  "child",
  "sibling",
  "other",
];

const emptyPatient: PatientForm = {
  patientName: "",
  patientAge: "",
  patientGender: "",
  relationship: "other",
};

export default function BookingModal({
  labServiceId,
  labRegistrationId,
  testName,
  category,
  labName,
  pricePerTest,
  onClose,
}: BookingModalProps) {
  const router = useRouter();
  const [step, setStep] = useState<
    "check" | "profile" | "who" | "form" | "confirm" | "success"
  >("check");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [patients, setPatients] = useState<PatientForm[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [bookingId, setBookingId] = useState("");

  // Inline profile form state
  const [pFullName, setPFullName] = useState("");
  const [pAge, setPAge] = useState("");
  const [pGender, setPGender] = useState("");
  const [pPhone, setPPhone] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    async function checkAuth() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/signin");
        return;
      }

      // Fetch profile
      try {
        const res = await fetch("/api/profile");
        const data = await res.json();

        if (!res.ok || !data.profile) {
          // Profile API failed — show inline profile form
          console.error("Profile fetch failed:", data.error || "No profile");
          setStep("profile");
          setLoading(false);
          return;
        }

        const p = data.profile;
        if (!p.full_name || !p.phone) {
          // Profile incomplete — pre-fill what we have and show form
          setPFullName(p.full_name || "");
          setPAge(p.age ? String(p.age) : "");
          setPGender(p.gender || "");
          setPPhone(p.phone || "");
          setStep("profile");
          setLoading(false);
          return;
        }

        setProfile({
          full_name: p.full_name,
          age: p.age,
          gender: p.gender,
          phone: p.phone,
        });
        setStep("who");
      } catch (err) {
        console.error("Profile check error:", err);
        setStep("profile");
      }

      setLoading(false);
    }

    checkAuth();
  }, [router]);

  async function handleSaveProfile() {
    setError("");

    if (!pFullName.trim()) {
      setError("Full name is required");
      return;
    }
    if (!pAge || isNaN(Number(pAge)) || Number(pAge) < 1 || Number(pAge) > 150) {
      setError("Please enter a valid age (1-150)");
      return;
    }
    if (!pGender) {
      setError("Please select your gender");
      return;
    }
    if (!/^[6-9]\d{9}$/.test(pPhone)) {
      setError("Enter a valid 10-digit Indian mobile number");
      return;
    }

    setSavingProfile(true);

    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: pFullName.trim(),
          age: Number(pAge),
          gender: pGender,
          phone: pPhone,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save profile");

      // Profile saved — set it and move to booking
      setProfile({
        full_name: pFullName.trim(),
        age: Number(pAge),
        gender: pGender,
        phone: pPhone,
      });
      setError("");
      setStep("who");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to save profile";
      setError(message);
    } finally {
      setSavingProfile(false);
    }
  }

  function handleSelf() {
    if (!profile) return;
    setPatients([
      {
        patientName: profile.full_name,
        patientAge: profile.age ? String(profile.age) : "",
        patientGender: profile.gender || "",
        relationship: "self",
      },
    ]);
    setStep("form");
  }

  function handleOthers() {
    setPatients([{ ...emptyPatient }]);
    setStep("form");
  }

  function updatePatient(index: number, field: keyof PatientForm, value: string) {
    setPatients((prev) =>
      prev.map((p, i) => (i === index ? { ...p, [field]: value } : p))
    );
  }

  function addPatient() {
    if (patients.length >= 5) return;
    setPatients((prev) => [...prev, { ...emptyPatient }]);
  }

  function removePatient(index: number) {
    setPatients((prev) => prev.filter((_, i) => i !== index));
  }

  function validatePatients(): boolean {
    for (const p of patients) {
      if (!p.patientName.trim()) {
        setError("Patient name is required");
        return false;
      }
      if (!p.patientAge || Number(p.patientAge) < 1 || Number(p.patientAge) > 150) {
        setError("Valid age required for all patients");
        return false;
      }
      if (!p.patientGender) {
        setError("Gender is required for all patients");
        return false;
      }
    }
    return true;
  }

  function handleProceedToConfirm() {
    setError("");
    if (!validatePatients()) return;
    setStep("confirm");
  }

  async function handleBook() {
    setError("");
    setSubmitting(true);

    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          labServiceId,
          labRegistrationId,
          patients: patients.map((p) => ({
            patientName: p.patientName.trim(),
            patientAge: Number(p.patientAge),
            patientGender: p.patientGender,
            relationship: p.relationship,
          })),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to book");

      setBookingId(data.bookingId);
      setStep("success");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Booking failed";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  const totalPrice = pricePerTest * patients.length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      <div
        className="relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-10 rounded-full bg-gray-100 p-1.5 text-gray-500 hover:bg-gray-200"
        >
          <X size={18} />
        </button>

        {/* Loading */}
        {loading && step === "check" && (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={28} className="animate-spin text-primary" />
          </div>
        )}

        {/* Step: Inline Profile Form */}
        {step === "profile" && (
          <div className="px-6 pb-6 pt-8">
            <h2 className="text-lg font-bold text-gray-900">
              Complete Your Profile
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Required before booking {testName}
            </p>

            {error && (
              <div className="mt-3 flex items-center gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-600">
                <AlertCircle size={16} />
                {error}
              </div>
            )}

            <div className="mt-4 space-y-3">
              {/* Full Name */}
              <div>
                <label className="mb-1 flex items-center gap-1.5 text-xs font-medium text-gray-600">
                  <User size={12} className="text-gray-400" />
                  Full Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={pFullName}
                  onChange={(e) => setPFullName(e.target.value)}
                  placeholder="Enter your full name"
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-primary"
                />
              </div>

              {/* Age & Gender */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-1 flex items-center gap-1.5 text-xs font-medium text-gray-600">
                    <Calendar size={12} className="text-gray-400" />
                    Age <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="number"
                    value={pAge}
                    onChange={(e) => setPAge(e.target.value)}
                    placeholder="Age"
                    min={1}
                    max={150}
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="mb-1 text-xs font-medium text-gray-600">
                    Gender <span className="text-red-400">*</span>
                  </label>
                  <select
                    value={pGender}
                    onChange={(e) => setPGender(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-primary"
                  >
                    <option value="">Select</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              {/* Phone */}
              <div>
                <label className="mb-1 flex items-center gap-1.5 text-xs font-medium text-gray-600">
                  <Phone size={12} className="text-gray-400" />
                  Phone <span className="text-red-400">*</span>
                </label>
                <input
                  type="tel"
                  value={pPhone}
                  onChange={(e) => setPPhone(e.target.value)}
                  placeholder="10-digit mobile number"
                  maxLength={10}
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-primary"
                />
              </div>
            </div>

            <button
              onClick={handleSaveProfile}
              disabled={savingProfile}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-white transition-transform hover:scale-[1.02] disabled:opacity-50"
              style={{ background: "linear-gradient(135deg, #1a4cff, #00c6ff)" }}
            >
              {savingProfile ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <>
                  <Save size={16} />
                  Save & Continue to Book
                </>
              )}
            </button>
          </div>
        )}

        {/* Step: Who is this for? */}
        {step === "who" && (
          <div className="px-6 pb-6 pt-8">
            <h2 className="text-lg font-bold text-gray-900">Book: {testName}</h2>
            <p className="mt-1 text-sm text-gray-500">at {labName}</p>

            {error && (
              <div className="mt-3 flex items-center gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-600">
                <AlertCircle size={16} />
                {error}
              </div>
            )}

            {profile && (
              <p className="mt-6 text-sm font-medium text-gray-700">
                Who is this test for?
              </p>
            )}

            {profile && (
              <>
                <div className="mt-3 space-y-3">
                  <button
                    onClick={handleSelf}
                    className="flex w-full items-center gap-3 rounded-2xl border-2 border-gray-100 p-4 text-left transition-colors hover:border-primary hover:bg-primary/5"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                      <User size={20} className="text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900">Myself</p>
                      <p className="text-xs text-gray-500">
                        {profile.full_name}
                      </p>
                    </div>
                  </button>

                  <button
                    onClick={handleOthers}
                    className="flex w-full items-center gap-3 rounded-2xl border-2 border-gray-100 p-4 text-left transition-colors hover:border-primary hover:bg-primary/5"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10">
                      <Users size={20} className="text-accent" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900">Others</p>
                      <p className="text-xs text-gray-500">
                        Family member or someone else
                      </p>
                    </div>
                  </button>
                </div>

                <div className="mt-4 flex items-center justify-between rounded-xl bg-green-50 px-4 py-3">
                  <span className="text-sm text-green-800">Price per person</span>
                  <div className="flex items-center gap-0.5">
                    <IndianRupee size={14} className="text-green-600" />
                    <span className="text-lg font-bold text-green-700">
                      {pricePerTest}
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Step: Patient Form */}
        {step === "form" && (
          <div className="px-6 pb-6 pt-8">
            <h2 className="text-lg font-bold text-gray-900">Patient Details</h2>
            <p className="mt-1 text-sm text-gray-500">
              {testName} at {labName}
            </p>

            {error && (
              <div className="mt-3 flex items-center gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-600">
                <AlertCircle size={16} />
                {error}
              </div>
            )}

            <div className="mt-4 space-y-4">
              {patients.map((patient, idx) => {
                const isSelf = patient.relationship === "self" && idx === 0;

                // Self patient — show as a compact read-only card
                if (isSelf) {
                  return (
                    <div
                      key={idx}
                      className="rounded-2xl border-2 border-primary/20 bg-primary/5 p-4"
                    >
                      <div className="flex items-center gap-2">
                        <User size={16} className="text-primary" />
                        <span className="text-sm font-semibold text-gray-700">
                          Myself
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-gray-600">
                        {patient.patientName}, {patient.patientAge}y,{" "}
                        {patient.patientGender}
                      </p>
                    </div>
                  );
                }

                // Other patients — editable form
                return (
                  <div
                    key={idx}
                    className="rounded-2xl border border-gray-100 p-4"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <UserPlus size={16} className="text-primary" />
                        <span className="text-sm font-semibold text-gray-700">
                          Patient {idx + 1}
                        </span>
                      </div>
                      {/* Allow removing non-self patients (keep at least 1 patient total) */}
                      {patients.length > 1 && (
                        <button
                          onClick={() => removePatient(idx)}
                          className="rounded-full p-1 text-red-400 hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>

                    <div className="mt-3 space-y-2.5">
                      <input
                        type="text"
                        placeholder="Full Name"
                        value={patient.patientName}
                        onChange={(e) =>
                          updatePatient(idx, "patientName", e.target.value)
                        }
                        className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-primary"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="number"
                          placeholder="Age"
                          value={patient.patientAge}
                          onChange={(e) =>
                            updatePatient(idx, "patientAge", e.target.value)
                          }
                          min={1}
                          max={150}
                          className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-primary"
                        />
                        <select
                          value={patient.patientGender}
                          onChange={(e) =>
                            updatePatient(idx, "patientGender", e.target.value)
                          }
                          className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-primary"
                        >
                          <option value="">Gender</option>
                          <option value="male">Male</option>
                          <option value="female">Female</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                      <select
                        value={patient.relationship}
                        onChange={(e) =>
                          updatePatient(idx, "relationship", e.target.value)
                        }
                        className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-primary"
                      >
                        {RELATIONSHIPS.filter((r) => r !== "self").map((r) => (
                          <option key={r} value={r}>
                            {r.charAt(0).toUpperCase() + r.slice(1)}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                );
              })}
            </div>

            {patients.length < 5 && (
              <button
                onClick={addPatient}
                className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-gray-200 py-3 text-sm font-medium text-gray-500 transition-colors hover:border-primary hover:text-primary"
              >
                <Plus size={16} />
                Add Another Patient
              </button>
            )}

            <div className="mt-4 flex items-center justify-between rounded-xl bg-green-50 px-4 py-3">
              <span className="text-sm text-green-800">
                Total ({patients.length} patient{patients.length > 1 ? "s" : ""})
              </span>
              <div className="flex items-center gap-0.5">
                <IndianRupee size={14} className="text-green-600" />
                <span className="text-lg font-bold text-green-700">
                  {pricePerTest * patients.length}
                </span>
              </div>
            </div>

            <div className="mt-4 flex gap-3">
              <button
                onClick={() => {
                  setStep("who");
                  setError("");
                }}
                className="flex-1 rounded-xl border border-gray-200 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Back
              </button>
              <button
                onClick={handleProceedToConfirm}
                className="flex-1 rounded-xl py-3 text-sm font-bold text-white"
                style={{
                  background: "linear-gradient(135deg, #1a4cff, #00c6ff)",
                }}
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {/* Step: Confirm */}
        {step === "confirm" && (
          <div className="px-6 pb-6 pt-8">
            <h2 className="text-lg font-bold text-gray-900">
              Confirm Booking
            </h2>

            {error && (
              <div className="mt-3 flex items-center gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-600">
                <AlertCircle size={16} />
                {error}
              </div>
            )}

            <div className="mt-4 space-y-3">
              {/* Test info */}
              <div className="rounded-xl bg-gray-50 p-4">
                <p className="text-xs text-gray-500">{category}</p>
                <p className="text-sm font-bold text-gray-900">{testName}</p>
                <p className="mt-1 text-xs text-gray-500">at {labName}</p>
              </div>

              {/* Patients */}
              <div className="rounded-xl border border-gray-100 p-4">
                <p className="text-xs font-semibold text-gray-500">
                  PATIENTS ({patients.length})
                </p>
                <div className="mt-2 space-y-2">
                  {patients.map((p, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="font-medium text-gray-700">
                        {p.patientName}
                      </span>
                      <span className="text-xs text-gray-400">
                        {p.patientAge}y, {p.patientGender},{" "}
                        {p.relationship}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Price */}
              <div className="flex items-center justify-between rounded-xl bg-green-50 px-4 py-4">
                <div>
                  <p className="text-sm font-medium text-green-800">
                    Total Amount
                  </p>
                  <p className="text-xs text-green-600">
                    {pricePerTest} x {patients.length} patient
                    {patients.length > 1 ? "s" : ""}
                  </p>
                </div>
                <div className="flex items-center gap-0.5">
                  <IndianRupee size={18} className="text-green-600" />
                  <span className="text-2xl font-extrabold text-green-700">
                    {totalPrice}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-4 flex gap-3">
              <button
                onClick={() => {
                  setStep("form");
                  setError("");
                }}
                className="flex-1 rounded-xl border border-gray-200 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Back
              </button>
              <button
                onClick={handleBook}
                disabled={submitting}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-white disabled:opacity-50"
                style={{
                  background: "linear-gradient(135deg, #1a4cff, #00c6ff)",
                }}
              >
                {submitting ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  "Confirm Booking"
                )}
              </button>
            </div>
          </div>
        )}

        {/* Step: Success */}
        {step === "success" && (
          <div className="px-6 pb-6 pt-8 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <CheckCircle size={32} className="text-green-600" />
            </div>
            <h2 className="mt-4 text-lg font-bold text-gray-900">
              Booking Confirmed!
            </h2>
            <p className="mt-2 text-sm text-gray-500">
              Your booking for <span className="font-medium">{testName}</span>{" "}
              at <span className="font-medium">{labName}</span> has been
              confirmed.
            </p>
            <p className="mt-1 text-xs text-gray-400">
              Booking ID: {bookingId.slice(0, 8)}
            </p>

            <div className="mt-6 flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 rounded-xl border border-gray-200 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Close
              </button>
              <button
                onClick={() => router.push("/user/dashboard")}
                className="flex-1 rounded-xl py-3 text-sm font-bold text-white"
                style={{
                  background: "linear-gradient(135deg, #1a4cff, #00c6ff)",
                }}
              >
                My Bookings
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
