"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import StatusTimeline from "@/components/StatusTimeline";
import {
  ArrowLeft,
  ArrowRight,
  Plus,
  Trash2,
  Loader2,
  IndianRupee,
  Clock,
  ClipboardList,
  Building2,
  TestTubes,
  AlertCircle,
  MapPin,
  Search,
  X,
  CalendarCheck,
  Users,
  Upload,
  FileText,
  ChevronRight,
} from "lucide-react";

// ── Types ──────────────────────────────
interface LabService {
  id: string;
  test_id: string;
  price_inr: number;
  prerequisite: string;
  report_time_hours: number;
  available_tests: { name: string; category: string };
}

interface LabWithServices {
  id: string;
  lab_name: string;
  city: string;
  state: string;
  unique_lab_id: string;
  services: LabService[];
}

interface LabBooking {
  id: string;
  status: string;
  total_price: number;
  created_at: string;
  test_name: string;
  category: string;
  patient_count: number;
  user_name: string;
  user_phone: string;
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

const NEXT_STATUS: Record<string, string> = {
  confirmed: "visited",
  visited: "sample_collected",
  sample_collected: "report_generated",
  report_generated: "done",
};

const NEXT_STATUS_LABEL: Record<string, string> = {
  confirmed: "Mark Visited",
  visited: "Mark Sample Collected",
  sample_collected: "Mark Report Generated",
  report_generated: "Mark Complete",
};

type Tab = "services" | "bookings";

export default function LabDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [labs, setLabs] = useState<LabWithServices[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedService, setSelectedService] = useState<{
    service: LabService;
    lab: LabWithServices;
  } | null>(null);

  // Tab state
  const [activeTab, setActiveTab] = useState<Tab>("services");

  // Bookings state
  const [bookings, setBookings] = useState<LabBooking[]>([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<LabBooking | null>(null);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [bookingFilter, setBookingFilter] = useState("all");

  // Report upload
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchDashboard();
  }, []);

  async function fetchDashboard() {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/signin");
      return;
    }

    const res = await fetch("/api/register-lab");
    const data = await res.json();

    if (data.role !== "labs" || !data.registrations?.length) {
      router.push("/register-lab");
      return;
    }

    const approvedLabs = data.registrations.filter(
      (r: { status: string }) => r.status === "approved"
    );

    if (approvedLabs.length === 0) {
      router.push("/register-lab");
      return;
    }

    const labsWithServices: LabWithServices[] = await Promise.all(
      approvedLabs.map(
        async (lab: {
          id: string;
          lab_name: string;
          city: string;
          state: string;
          unique_lab_id: string;
        }) => {
          const servicesRes = await fetch(
            `/api/lab-services?labRegId=${lab.id}`
          );
          const servicesData = await servicesRes.json();
          return {
            id: lab.id,
            lab_name: lab.lab_name,
            city: lab.city,
            state: lab.state,
            unique_lab_id: lab.unique_lab_id,
            services: servicesData.services || [],
          };
        }
      )
    );

    setLabs(labsWithServices);
    setLoading(false);
  }

  async function fetchBookings() {
    if (!labs[0]) return;
    setBookingsLoading(true);

    try {
      const res = await fetch(`/api/bookings/${labs[0].id}/lab-bookings`);
      const data = await res.json();
      setBookings(data.bookings || []);
    } catch {
      // silently fail
    }

    setBookingsLoading(false);
  }

  useEffect(() => {
    if (activeTab === "bookings" && labs.length > 0 && bookings.length === 0) {
      fetchBookings();
    }
  }, [activeTab, labs]);

  async function handleDelete(labId: string, serviceId: string) {
    setDeletingId(serviceId);
    setError("");

    try {
      const res = await fetch("/api/lab-services", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serviceId }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete");

      setLabs((prev) =>
        prev.map((lab) =>
          lab.id === labId
            ? {
                ...lab,
                services: lab.services.filter((s) => s.id !== serviceId),
              }
            : lab
        )
      );

      if (selectedService?.service.id === serviceId) {
        setSelectedService(null);
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to delete service";
      setError(message);
    } finally {
      setDeletingId(null);
    }
  }

  async function handleStatusUpdate(bookingId: string, newStatus: string) {
    setStatusUpdating(true);
    setError("");

    try {
      const res = await fetch(`/api/bookings/${bookingId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update status");

      // Update local state
      setBookings((prev) =>
        prev.map((b) => (b.id === bookingId ? { ...b, status: newStatus } : b))
      );

      if (selectedBooking?.id === bookingId) {
        setSelectedBooking((prev) =>
          prev
            ? {
                ...prev,
                status: newStatus,
                status_logs: [
                  ...prev.status_logs,
                  {
                    id: "new",
                    from_status: prev.status,
                    to_status: newStatus,
                    note: `Status updated to ${newStatus.replace(/_/g, " ")}`,
                    created_at: new Date().toISOString(),
                  },
                ],
              }
            : null
        );
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to update status";
      setError(message);
    } finally {
      setStatusUpdating(false);
    }
  }

  async function handleReportUpload(bookingId: string, file: File) {
    setUploading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`/api/bookings/${bookingId}/report`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to upload");

      // Refresh bookings
      await fetchBookings();

      // Update selected booking if open
      if (selectedBooking?.id === bookingId) {
        setSelectedBooking((prev) =>
          prev
            ? {
                ...prev,
                status: prev.status === "sample_collected" ? "report_generated" : prev.status,
                reports: [
                  ...prev.reports,
                  {
                    id: "new",
                    file_url: data.fileUrl,
                    file_name: data.fileName,
                    created_at: new Date().toISOString(),
                  },
                ],
              }
            : null
        );
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to upload report";
      setError(message);
    } finally {
      setUploading(false);
    }
  }

  // Services search
  const allServices = labs.flatMap((lab) =>
    lab.services.map((service) => ({ service, lab }))
  );

  const filteredServices = searchQuery.trim()
    ? allServices.filter(
        ({ service }) =>
          service.available_tests.name
            .toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          service.available_tests.category
            .toLowerCase()
            .includes(searchQuery.toLowerCase())
      )
    : allServices;

  const totalServices = labs.reduce(
    (sum, lab) => sum + lab.services.length,
    0
  );

  // Bookings filter
  const filteredBookings =
    bookingFilter === "all"
      ? bookings
      : bookings.filter((b) => b.status === bookingFilter);

  const lab = labs[0];

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
              <Building2 size={24} className="text-primary" />
            </div>
            <div className="flex-1">
              <h1 className="text-xl font-bold text-gray-900">
                {lab?.lab_name || "Lab Dashboard"}
              </h1>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <MapPin size={12} />
                {lab?.city}, {lab?.state}
                <span className="font-mono text-xs text-gray-400">
                  {lab?.unique_lab_id}
                </span>
              </div>
            </div>
            <Link
              href={`/lab/services?labId=${lab?.id}`}
              className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-light"
            >
              <Plus size={16} />
              <span className="hidden sm:inline">Add Service</span>
            </Link>
          </div>

          {/* Tabs */}
          <div className="mt-4 flex gap-1 rounded-xl bg-white/50 p-1">
            <button
              onClick={() => setActiveTab("services")}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2.5 text-sm font-semibold transition-colors ${
                activeTab === "services"
                  ? "bg-white text-primary shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <TestTubes size={16} />
              Services
            </button>
            <button
              onClick={() => setActiveTab("bookings")}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2.5 text-sm font-semibold transition-colors ${
                activeTab === "bookings"
                  ? "bg-white text-primary shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <CalendarCheck size={16} />
              Bookings
              {bookings.length > 0 && (
                <span className="rounded-full bg-primary/10 px-1.5 text-xs text-primary">
                  {bookings.length}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-3xl px-4 py-6">
        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-600">
            <AlertCircle size={16} />
            {error}
            <button onClick={() => setError("")} className="ml-auto">
              <X size={14} />
            </button>
          </div>
        )}

        {/* ─── SERVICES TAB ─── */}
        {activeTab === "services" && (
          <>
            {/* Search bar */}
            <div
              className="mb-6 flex items-center gap-3 rounded-2xl px-4 py-3 shadow-sm"
              style={{
                background: "rgba(255,255,255,0.7)",
                backdropFilter: "blur(20px)",
              }}
            >
              <Search size={20} className="shrink-0 text-gray-400" />
              <input
                type="text"
                placeholder="Search your services..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 bg-transparent text-base text-gray-700 placeholder-gray-400 outline-none"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="shrink-0 rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                >
                  <X size={16} />
                </button>
              )}
              <span className="shrink-0 text-xs text-gray-400">
                {filteredServices.length} of {totalServices}
              </span>
            </div>

            {/* Services grid */}
            {filteredServices.length === 0 ? (
              <div className="rounded-2xl bg-white/60 py-16 text-center backdrop-blur-sm">
                <TestTubes
                  size={40}
                  className="mx-auto mb-3 text-gray-300"
                />
                <p className="text-base font-semibold text-gray-600">
                  {searchQuery
                    ? "No services match your search"
                    : "No services yet"}
                </p>
                <p className="mt-1 text-sm text-gray-400">
                  {searchQuery
                    ? "Try a different keyword"
                    : "Add your first service to get started"}
                </p>
                {!searchQuery && (
                  <Link
                    href={`/lab/services?labId=${lab?.id}`}
                    className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-light"
                  >
                    <Plus size={16} />
                    Add Service
                  </Link>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {filteredServices.map(({ service, lab: serviceLab }) => (
                  <button
                    key={service.id}
                    onClick={() =>
                      setSelectedService({ service, lab: serviceLab })
                    }
                    className="group flex items-center gap-4 rounded-2xl border border-white/60 bg-white/70 p-4 text-left backdrop-blur-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-white hover:shadow-lg"
                  >
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 transition-colors group-hover:bg-primary/15">
                      <TestTubes size={22} className="text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-sm font-bold text-gray-900">
                        {service.available_tests.name}
                      </h3>
                      <p className="text-xs text-gray-500">
                        {service.available_tests.category}
                      </p>
                      <div className="mt-1 flex items-center gap-1">
                        <IndianRupee size={11} className="text-green-600" />
                        <span className="text-xs font-semibold text-green-700">
                          {service.price_inr}
                        </span>
                      </div>
                    </div>
                    <ArrowRight
                      size={18}
                      className="shrink-0 text-gray-300 transition-colors group-hover:text-primary"
                    />
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        {/* ─── BOOKINGS TAB ─── */}
        {activeTab === "bookings" && (
          <>
            {/* Filter pills */}
            <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
              {["all", "confirmed", "visited", "sample_collected", "report_generated", "done"].map(
                (filter) => (
                  <button
                    key={filter}
                    onClick={() => setBookingFilter(filter)}
                    className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                      bookingFilter === filter
                        ? "bg-primary text-white"
                        : "bg-white/70 text-gray-600 hover:bg-white"
                    }`}
                  >
                    {filter === "all"
                      ? `All (${bookings.length})`
                      : `${STATUS_LABEL[filter]} (${bookings.filter((b) => b.status === filter).length})`}
                  </button>
                )
              )}
            </div>

            {bookingsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 size={24} className="animate-spin text-primary" />
              </div>
            ) : filteredBookings.length === 0 ? (
              <div className="rounded-2xl bg-white/60 py-16 text-center backdrop-blur-sm">
                <CalendarCheck
                  size={40}
                  className="mx-auto mb-3 text-gray-300"
                />
                <p className="text-base font-semibold text-gray-600">
                  {bookingFilter !== "all"
                    ? `No ${STATUS_LABEL[bookingFilter]?.toLowerCase()} bookings`
                    : "No bookings yet"}
                </p>
                <p className="mt-1 text-sm text-gray-400">
                  Bookings will appear here when patients book your services
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredBookings.map((booking) => (
                  <button
                    key={booking.id}
                    onClick={() => setSelectedBooking(booking)}
                    className="group flex w-full items-center gap-4 rounded-2xl border border-white/60 bg-white/70 p-4 text-left backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:bg-white hover:shadow-lg"
                  >
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                      <TestTubes size={22} className="text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="truncate text-sm font-bold text-gray-900">
                          {booking.test_name}
                        </h3>
                        <span
                          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                            STATUS_BADGE[booking.status] ||
                            "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {STATUS_LABEL[booking.status]}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
                        <Users size={12} />
                        {booking.user_name} ({booking.patient_count} patient
                        {booking.patient_count > 1 ? "s" : ""})
                      </div>
                      <div className="mt-1 flex items-center gap-2">
                        <span className="flex items-center gap-0.5 text-xs font-semibold text-green-700">
                          <IndianRupee size={11} />
                          {booking.total_price}
                        </span>
                        <span className="text-xs text-gray-400">
                          {new Date(booking.created_at).toLocaleDateString(
                            "en-IN",
                            {
                              day: "numeric",
                              month: "short",
                            }
                          )}
                        </span>
                      </div>
                    </div>
                    <ChevronRight
                      size={18}
                      className="shrink-0 text-gray-300 group-hover:text-primary"
                    />
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* ─── SERVICE DETAIL MODAL ─── */}
      {selectedService && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
          onClick={() => setSelectedService(null)}
        >
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div
            className="relative w-full max-w-md animate-in slide-in-from-bottom rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setSelectedService(null)}
              className="absolute right-4 top-4 rounded-full bg-gray-100 p-1.5 text-gray-500 hover:bg-gray-200"
            >
              <X size={18} />
            </button>

            <div className="border-b border-gray-100 px-6 pb-4 pt-6">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                  <TestTubes size={24} className="text-primary" />
                </div>
                <div>
                  <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold text-primary">
                    {selectedService.service.available_tests.category}
                  </span>
                  <h2 className="mt-1 text-lg font-bold text-gray-900">
                    {selectedService.service.available_tests.name}
                  </h2>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between bg-green-50 px-6 py-4">
              <span className="text-sm font-medium text-green-800">Price</span>
              <div className="flex items-center gap-1">
                <IndianRupee size={20} className="text-green-600" />
                <span className="text-2xl font-extrabold text-green-700">
                  {selectedService.service.price_inr}
                </span>
              </div>
            </div>

            <div className="space-y-3 px-6 py-5">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-gray-100 p-3">
                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <Clock size={13} className="text-blue-500" />
                    Report Time
                  </div>
                  <p className="mt-1 text-sm font-bold text-gray-900">
                    {selectedService.service.report_time_hours} hours
                  </p>
                </div>
                <div className="rounded-xl border border-gray-100 p-3">
                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <ClipboardList size={13} className="text-amber-500" />
                    Preparation
                  </div>
                  <p className="mt-1 text-sm font-bold text-gray-900">
                    {selectedService.service.prerequisite || "None required"}
                  </p>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-100 px-6 pb-6 pt-4">
              <button
                onClick={() =>
                  handleDelete(
                    selectedService.lab.id,
                    selectedService.service.id
                  )
                }
                disabled={deletingId === selectedService.service.id}
                className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-red-200 bg-red-50 py-3.5 text-sm font-semibold text-red-600 transition-colors hover:bg-red-100 disabled:opacity-50"
              >
                {deletingId === selectedService.service.id ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <>
                    <Trash2 size={16} />
                    Delete Service
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── BOOKING DETAIL MODAL ─── */}
      {selectedBooking && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
          onClick={() => setSelectedBooking(null)}
        >
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div
            className="relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setSelectedBooking(null)}
              className="absolute right-4 top-4 z-10 rounded-full bg-gray-100 p-1.5 text-gray-500 hover:bg-gray-200"
            >
              <X size={18} />
            </button>

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

            {/* Price & customer */}
            <div className="flex items-center justify-between bg-green-50 px-6 py-3">
              <div>
                <p className="text-sm font-medium text-green-800">
                  {selectedBooking.user_name}
                </p>
                <p className="text-xs text-green-600">
                  {selectedBooking.user_phone}
                </p>
              </div>
              <div className="flex items-center gap-0.5">
                <IndianRupee size={16} className="text-green-600" />
                <span className="text-xl font-extrabold text-green-700">
                  {selectedBooking.total_price}
                </span>
              </div>
            </div>

            {/* Patients */}
            <div className="border-b border-gray-100 px-6 py-4">
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
            <div className="border-b border-gray-100 px-6 py-4">
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
              <div className="border-b border-gray-100 px-6 py-4">
                <p className="mb-2 text-xs font-semibold text-gray-500">
                  UPLOADED REPORTS
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
                    <p className="min-w-0 flex-1 truncate text-sm font-medium text-gray-700">
                      {report.file_name}
                    </p>
                  </a>
                ))}
              </div>
            )}

            {/* Actions */}
            <div className="space-y-3 px-6 pb-6 pt-4">
              {/* Upload report */}
              {["sample_collected", "report_generated"].includes(
                selectedBooking.status
              ) && (
                <>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="application/pdf"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file && selectedBooking) {
                        handleReportUpload(selectedBooking.id, file);
                      }
                    }}
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-purple-200 bg-purple-50 py-3 text-sm font-semibold text-purple-600 transition-colors hover:bg-purple-100 disabled:opacity-50"
                  >
                    {uploading ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <>
                        <Upload size={16} />
                        Upload Report (PDF)
                      </>
                    )}
                  </button>
                </>
              )}

              {/* Next status button */}
              {NEXT_STATUS[selectedBooking.status] && (
                <button
                  onClick={() =>
                    handleStatusUpdate(
                      selectedBooking.id,
                      NEXT_STATUS[selectedBooking.status]
                    )
                  }
                  disabled={statusUpdating}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-bold text-white disabled:opacity-50"
                  style={{
                    background: "linear-gradient(135deg, #1a4cff, #00c6ff)",
                  }}
                >
                  {statusUpdating ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <>
                      <ChevronRight size={16} />
                      {NEXT_STATUS_LABEL[selectedBooking.status]}
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
