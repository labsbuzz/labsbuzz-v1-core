"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import StatusTimeline from "@/components/StatusTimeline";
import StarRating from "@/components/StarRating";
import {
  ArrowLeft,
  Loader2,
  CalendarCheck,
  Building2,
  MapPin,
  IndianRupee,
  Users,
  TestTubes,
  X,
  FileText,
  Download,
  AlertCircle,
  CheckCircle,
  MessageSquare,
} from "lucide-react";

interface PatientInfo {
  id: string;
  patient_name: string;
  patient_age: number;
  patient_gender: string;
  relationship: string;
}

interface BookingSummary {
  id: string;
  status: string;
  total_price: number;
  created_at: string;
  test_name: string;
  category: string;
  price_per_test: number;
  lab_name: string;
  city: string;
  state: string;
  unique_lab_id: string;
  patient_count: number;
  patients: PatientInfo[];
}

interface PatientCard {
  bookingId: string;
  patient: PatientInfo;
  status: string;
  test_name: string;
  price_per_test: number;
  lab_name: string;
  created_at: string;
}

interface BookingDetail {
  id: string;
  status: string;
  total_price: number;
  created_at: string;
  user_id: string;
  lab_registration_id: string;
  test_name: string;
  category: string;
  price_per_test: number;
  prerequisite: string;
  report_time_hours: number;
  lab_name: string;
  city: string;
  state: string;
  unique_lab_id: string;
  patients: {
    id: string;
    patient_name: string;
    patient_age: number;
    patient_gender: string;
    relationship: string;
  }[];
  status_logs: {
    id: string;
    from_status: string | null;
    to_status: string;
    note: string;
    created_at: string;
  }[];
  reports: {
    id: string;
    file_url: string;
    file_name: string;
    created_at: string;
  }[];
  review: {
    id: string;
    rating: number;
    message: string;
    created_at: string;
  } | null;
}

const STATUS_BADGE: Record<string, string> = {
  confirmed: "bg-blue-100 text-blue-700",
  visited: "bg-yellow-100 text-yellow-700",
  sample_collected: "bg-orange-100 text-orange-700",
  report_generated: "bg-purple-100 text-purple-700",
  done: "bg-green-100 text-green-700",
};

const STATUS_LABEL: Record<string, string> = {
  confirmed: "Confirmed",
  visited: "Visited",
  sample_collected: "Sample Collected",
  report_generated: "Report Ready",
  done: "Completed",
};

export default function UserDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState<BookingSummary[]>([]);
  const [selectedBooking, setSelectedBooking] = useState<BookingDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState("");

  // Review form
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewMessage, setReviewMessage] = useState("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewSuccess, setReviewSuccess] = useState(false);

  useEffect(() => {
    async function fetchBookings() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/signin");
        return;
      }

      try {
        const res = await fetch("/api/bookings");
        const data = await res.json();
        setBookings(data.bookings || []);
      } catch {
        setError("Failed to load bookings");
      }

      setLoading(false);
    }

    fetchBookings();
  }, [router]);

  async function openDetail(bookingId: string) {
    setDetailLoading(true);
    setShowReviewForm(false);
    setReviewSuccess(false);

    try {
      const res = await fetch(`/api/bookings/${bookingId}`);
      const data = await res.json();
      if (res.ok) {
        setSelectedBooking(data.booking);
      }
    } catch {
      // silently fail
    }

    setDetailLoading(false);
  }

  async function handleSubmitReview() {
    if (!selectedBooking || reviewRating === 0) return;

    setReviewSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId: selectedBooking.id,
          rating: reviewRating,
          message: reviewMessage,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit review");

      setReviewSuccess(true);
      setShowReviewForm(false);

      // Update the selected booking to reflect the review
      setSelectedBooking((prev) =>
        prev
          ? {
              ...prev,
              review: {
                id: "new",
                rating: reviewRating,
                message: reviewMessage,
                created_at: new Date().toISOString(),
              },
            }
          : null
      );
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to submit review";
      setError(message);
    } finally {
      setReviewSubmitting(false);
    }
  }

  // Flatten bookings into per-patient cards
  const patientCards: PatientCard[] = bookings.flatMap((b) =>
    (b.patients || []).map((p) => ({
      bookingId: b.id,
      patient: p,
      status: b.status,
      test_name: b.test_name,
      price_per_test: b.price_per_test,
      lab_name: b.lab_name,
      created_at: b.created_at,
    }))
  );

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-hero-start via-hero-mid to-hero-end">
        <Loader2 size={32} className="animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-hero-start via-hero-mid to-hero-end">
      {/* Header */}
      <div
        className="border-b border-white/40 px-4 py-4 backdrop-blur-xl"
        style={{ background: "rgba(255,255,255,0.6)" }}
      >
        <div className="mx-auto max-w-3xl">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:text-primary-light"
          >
            <ArrowLeft size={18} />
            Home
          </Link>
          <div className="mt-3 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
              <CalendarCheck size={24} className="text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">My Bookings</h1>
              <p className="text-sm text-gray-500">
                {patientCards.length} booking{patientCards.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-3xl px-4 py-6">
        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-600">
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        {patientCards.length === 0 ? (
          <div className="rounded-2xl bg-white/60 py-16 text-center backdrop-blur-sm">
            <TestTubes size={40} className="mx-auto mb-3 text-gray-300" />
            <p className="text-base font-semibold text-gray-600">
              No bookings yet
            </p>
            <p className="mt-1 text-sm text-gray-400">
              Search for a test and book your first appointment
            </p>
            <Link
              href="/"
              className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-light"
            >
              Search Tests
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {patientCards.map((card) => (
              <button
                key={`${card.bookingId}-${card.patient.id}`}
                onClick={() => openDetail(card.bookingId)}
                className="group flex w-full items-center gap-4 rounded-2xl border border-white/60 bg-white/70 p-4 text-left backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:bg-white hover:shadow-lg"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                  <TestTubes size={22} className="text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="truncate text-sm font-bold text-gray-900">
                      {card.patient.patient_name}
                    </h3>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        STATUS_BADGE[card.status] || "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {STATUS_LABEL[card.status] || card.status}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-gray-500">
                    {card.test_name}
                  </p>
                  <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
                    <Building2 size={12} />
                    {card.lab_name}
                    <span className="text-gray-300">|</span>
                    <span className="text-gray-400">
                      {card.patient.patient_age}y, {card.patient.patient_gender}, {card.patient.relationship}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="flex items-center gap-0.5 text-xs font-semibold text-green-700">
                      <IndianRupee size={11} />
                      {card.price_per_test}
                    </span>
                    <span className="text-xs text-gray-400">
                      {new Date(card.created_at).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Booking Detail Modal */}
      {(selectedBooking || detailLoading) && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
          onClick={() => {
            setSelectedBooking(null);
            setShowReviewForm(false);
            setReviewSuccess(false);
          }}
        >
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

          <div
            className="relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => {
                setSelectedBooking(null);
                setShowReviewForm(false);
                setReviewSuccess(false);
              }}
              className="absolute right-4 top-4 z-10 rounded-full bg-gray-100 p-1.5 text-gray-500 hover:bg-gray-200"
            >
              <X size={18} />
            </button>

            {detailLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 size={28} className="animate-spin text-primary" />
              </div>
            ) : selectedBooking ? (
              <div>
                {/* Header */}
                <div className="border-b border-gray-100 px-6 pb-4 pt-6">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                      STATUS_BADGE[selectedBooking.status] ||
                      "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {STATUS_LABEL[selectedBooking.status]}
                  </span>
                  <h2 className="mt-2 text-lg font-bold text-gray-900">
                    {selectedBooking.test_name}
                  </h2>
                  <p className="text-xs text-gray-500">
                    {selectedBooking.category}
                  </p>
                </div>

                {/* Price */}
                <div className="flex items-center justify-between bg-green-50 px-6 py-3">
                  <span className="text-sm text-green-800">Total</span>
                  <div className="flex items-center gap-0.5">
                    <IndianRupee size={16} className="text-green-600" />
                    <span className="text-xl font-extrabold text-green-700">
                      {selectedBooking.total_price}
                    </span>
                  </div>
                </div>

                {/* Lab info */}
                <div className="px-6 py-4">
                  <div className="flex items-center gap-3 rounded-xl bg-gray-50 p-3">
                    <Building2 size={18} className="text-primary" />
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        {selectedBooking.lab_name}
                      </p>
                      <p className="flex items-center gap-1 text-xs text-gray-500">
                        <MapPin size={10} />
                        {selectedBooking.city}, {selectedBooking.state}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Patients */}
                <div className="border-t border-gray-100 px-6 py-4">
                  <p className="text-xs font-semibold text-gray-500">
                    PATIENTS ({selectedBooking.patients.length})
                  </p>
                  <div className="mt-2 space-y-2">
                    {selectedBooking.patients.map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2"
                      >
                        <span className="text-sm font-medium text-gray-700">
                          {p.patient_name}
                        </span>
                        <span className="text-xs text-gray-400">
                          {p.patient_age}y, {p.patient_gender},{" "}
                          {p.relationship}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Status Timeline */}
                <div className="border-t border-gray-100 px-6 py-4">
                  <p className="mb-3 text-xs font-semibold text-gray-500">
                    ACTIVITY LOG
                  </p>
                  <StatusTimeline
                    logs={selectedBooking.status_logs}
                    currentStatus={selectedBooking.status}
                  />
                </div>

                {/* Reports */}
                {selectedBooking.reports.length > 0 && (
                  <div className="border-t border-gray-100 px-6 py-4">
                    <p className="mb-2 text-xs font-semibold text-gray-500">
                      REPORTS
                    </p>
                    {selectedBooking.reports.map((report) => (
                      <a
                        key={report.id}
                        href={report.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 rounded-xl border border-gray-100 p-3 transition-colors hover:bg-gray-50"
                      >
                        <FileText size={20} className="text-red-500" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-gray-700">
                            {report.file_name}
                          </p>
                          <p className="text-xs text-gray-400">
                            {new Date(report.created_at).toLocaleDateString(
                              "en-IN"
                            )}
                          </p>
                        </div>
                        <Download size={16} className="text-primary" />
                      </a>
                    ))}
                  </div>
                )}

                {/* Review section */}
                <div className="border-t border-gray-100 px-6 pb-6 pt-4">
                  {selectedBooking.review ? (
                    <div className="rounded-xl bg-yellow-50 p-4">
                      <p className="mb-2 text-xs font-semibold text-gray-500">
                        YOUR REVIEW
                      </p>
                      <StarRating rating={selectedBooking.review.rating} />
                      {selectedBooking.review.message && (
                        <p className="mt-2 text-sm text-gray-700">
                          {selectedBooking.review.message}
                        </p>
                      )}
                    </div>
                  ) : reviewSuccess ? (
                    <div className="flex items-center gap-2 rounded-xl bg-green-50 p-3 text-sm text-green-600">
                      <CheckCircle size={16} />
                      Review submitted successfully!
                    </div>
                  ) : selectedBooking.status === "done" ? (
                    showReviewForm ? (
                      <div className="space-y-3">
                        <p className="text-xs font-semibold text-gray-500">
                          WRITE A REVIEW
                        </p>
                        <StarRating
                          rating={reviewRating}
                          onRate={setReviewRating}
                          size={28}
                        />
                        <textarea
                          value={reviewMessage}
                          onChange={(e) => setReviewMessage(e.target.value)}
                          placeholder="Share your experience (optional)"
                          rows={3}
                          className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-primary"
                        />
                        <div className="flex gap-3">
                          <button
                            onClick={() => setShowReviewForm(false)}
                            className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-semibold text-gray-700"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={handleSubmitReview}
                            disabled={reviewRating === 0 || reviewSubmitting}
                            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary py-2.5 text-sm font-bold text-white disabled:opacity-50"
                          >
                            {reviewSubmitting ? (
                              <Loader2 size={16} className="animate-spin" />
                            ) : (
                              "Submit Review"
                            )}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setShowReviewForm(true)}
                        className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-primary/20 bg-primary/5 py-3 text-sm font-semibold text-primary transition-colors hover:bg-primary/10"
                      >
                        <MessageSquare size={16} />
                        Write a Review
                      </button>
                    )
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
