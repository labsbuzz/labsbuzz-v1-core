"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
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
} from "lucide-react";

interface LabService {
  id: string;
  test_id: string;
  price_inr: number;
  prerequisite: string;
  report_time_hours: number;
  available_tests: {
    name: string;
    category: string;
  };
}

interface LabWithServices {
  id: string;
  lab_name: string;
  city: string;
  state: string;
  unique_lab_id: string;
  services: LabService[];
}

export default function LabDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [labs, setLabs] = useState<LabWithServices[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState("");

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

    // Fetch services for each approved lab in parallel
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
            ? { ...lab, services: lab.services.filter((s) => s.id !== serviceId) }
            : lab
        )
      );
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to delete service";
      setError(message);
    } finally {
      setDeletingId(null);
    }
  }

  const totalServices = labs.reduce((sum, lab) => sum + lab.services.length, 0);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Loader2 size={32} className="animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="border-b bg-white px-4 py-4 shadow-sm">
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
            <div>
              <h1 className="text-xl font-bold text-gray-900">Lab Dashboard</h1>
              <p className="text-sm text-gray-500">
                {labs.length} lab{labs.length > 1 ? "s" : ""} &middot; {totalServices} service{totalServices !== 1 ? "s" : ""} total
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-3xl px-4 py-6">
        {/* Error */}
        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-600">
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        {/* Labs */}
        <div className="space-y-6">
          {labs.map((lab) => (
            <div key={lab.id} className="overflow-hidden rounded-2xl bg-white shadow-sm">
              {/* Lab Header */}
              <div className="flex items-center gap-3 border-b border-gray-100 px-5 py-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <Building2 size={20} className="text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="truncate text-lg font-bold text-gray-900">
                    {lab.lab_name}
                  </h2>
                  <div className="flex items-center gap-3 text-sm text-gray-500">
                    <span className="flex items-center gap-1">
                      <MapPin size={12} />
                      {lab.city}, {lab.state}
                    </span>
                    <span className="font-mono text-xs">{lab.unique_lab_id}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-accent/10 px-2.5 py-1 text-xs font-semibold text-accent">
                    {lab.services.length} service{lab.services.length !== 1 ? "s" : ""}
                  </span>
                  <Link
                    href={`/lab/services?labId=${lab.id}`}
                    className="flex items-center gap-1 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-primary-light"
                  >
                    <Plus size={14} />
                    Add
                  </Link>
                </div>
              </div>

              {/* Services */}
              {lab.services.length === 0 ? (
                <div className="px-5 py-8 text-center">
                  <TestTubes size={36} className="mx-auto mb-2 text-gray-300" />
                  <p className="text-sm font-medium text-gray-500">No services yet</p>
                  <Link
                    href={`/lab/services?labId=${lab.id}`}
                    className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-light"
                  >
                    <Plus size={16} />
                    Add Services
                  </Link>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {lab.services.map((service) => (
                    <div
                      key={service.id}
                      className="flex items-start justify-between px-5 py-3.5 transition-colors hover:bg-gray-50/50"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-semibold text-gray-900">
                            {service.available_tests.name}
                          </h3>
                          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500">
                            {service.available_tests.category}
                          </span>
                        </div>

                        <div className="mt-1.5 flex flex-wrap gap-3">
                          <span className="flex items-center gap-1 text-xs text-gray-600">
                            <IndianRupee size={12} className="text-green-600" />
                            <span className="font-semibold text-green-700">
                              {service.price_inr}
                            </span>
                          </span>

                          <span className="flex items-center gap-1 text-xs text-gray-600">
                            <Clock size={12} className="text-blue-500" />
                            {service.report_time_hours}h
                          </span>

                          {service.prerequisite && (
                            <span className="flex items-center gap-1 text-xs text-gray-600">
                              <ClipboardList size={12} className="text-amber-500" />
                              {service.prerequisite}
                            </span>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={() => handleDelete(lab.id, service.id)}
                        disabled={deletingId === service.id}
                        className="ml-2 rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500 disabled:opacity-50"
                      >
                        {deletingId === service.id ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <Trash2 size={14} />
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Register another lab */}
        <Link
          href="/register-lab"
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-gray-300 bg-white py-4 text-sm font-semibold text-gray-600 shadow-sm transition-colors hover:border-primary hover:text-primary"
        >
          <Plus size={18} />
          Register Another Lab
        </Link>
      </div>
    </div>
  );
}
