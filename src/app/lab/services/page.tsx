"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Search,
  Loader2,
  ChevronDown,
  IndianRupee,
  Clock,
  ClipboardList,
  Send,
} from "lucide-react";

interface AvailableTest {
  id: string;
  name: string;
  category: string;
}

interface ServiceEntry {
  testId: string;
  testName: string;
  priceInr: string;
  prerequisite: string;
  reportTimeHours: string;
}

const COMMON_PREREQUISITES = [
  "No special preparation required",
  "12 hours fasting required",
  "8 hours fasting required",
  "Avoid alcohol for 24 hours",
  "Early morning sample preferred",
  "Avoid biotin supplements for 48 hours",
];

export default function RegisterServicesPageWrapper() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-gray-50">
          <Loader2 size={32} className="animate-spin text-primary" />
        </div>
      }
    >
      <RegisterServicesPage />
    </Suspense>
  );
}

function RegisterServicesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [tests, setTests] = useState<AvailableTest[]>([]);
  const [labRegId, setLabRegId] = useState("");
  const [labName, setLabName] = useState("");
  const [services, setServices] = useState<ServiceEntry[]>([]);
  const [existingTestIds, setExistingTestIds] = useState<string[]>([]);

  // Fetch lab info and available tests
  useEffect(() => {
    async function init() {
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

      // Use labId from query param, or fall back to first approved lab
      const targetLabId = searchParams.get("labId");
      const approvedLabs = data.registrations.filter(
        (r: { status: string }) => r.status === "approved"
      );

      if (approvedLabs.length === 0) {
        router.push("/register-lab");
        return;
      }

      const selectedLab = targetLabId
        ? approvedLabs.find((r: { id: string }) => r.id === targetLabId)
        : approvedLabs[0];

      if (!selectedLab) {
        router.push("/register-lab");
        return;
      }

      setLabRegId(selectedLab.id);
      setLabName(selectedLab.lab_name);

      // Fetch available tests and existing services
      const testsRes = await fetch(`/api/lab-services?labRegId=${selectedLab.id}`);
      const testsData = await testsRes.json();
      setTests(testsData.tests || []);

      // Track existing test IDs so user can't add duplicates
      const existing = (testsData.services || []).map(
        (s: { test_id: string }) => s.test_id
      );
      setExistingTestIds(existing);

      setServices([createEmptyService()]);
      setLoading(false);
    }

    init();
  }, [router, searchParams]);

  function createEmptyService(): ServiceEntry {
    return {
      testId: "",
      testName: "",
      priceInr: "",
      prerequisite: "",
      reportTimeHours: "",
    };
  }

  function addService() {
    setServices((prev) => [...prev, createEmptyService()]);
  }

  function removeService(index: number) {
    setServices((prev) => prev.filter((_, i) => i !== index));
  }

  function updateService(index: number, field: keyof ServiceEntry, value: string) {
    setServices((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  }

  // Get tests not already selected and not already registered
  function getAvailableTestsForEntry(currentIndex: number) {
    const selectedIds = services
      .filter((_, i) => i !== currentIndex)
      .map((s) => s.testId);
    return tests.filter(
      (t) => !selectedIds.includes(t.id) && !existingTestIds.includes(t.id)
    );
  }

  async function handleSubmit() {
    setError("");

    // Validate all services
    for (let i = 0; i < services.length; i++) {
      const s = services[i];
      if (!s.testId) {
        setError(`Service ${i + 1}: Please select a test`);
        return;
      }
      if (!s.priceInr || parseFloat(s.priceInr) <= 0) {
        setError(`Service ${i + 1}: Please enter a valid price`);
        return;
      }
      if (!s.reportTimeHours || parseInt(s.reportTimeHours) <= 0) {
        setError(`Service ${i + 1}: Please enter report generation time`);
        return;
      }
    }

    setSubmitting(true);

    try {
      const res = await fetch("/api/lab-services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          labRegId,
          services: services.map((s) => ({
            testId: s.testId,
            priceInr: parseFloat(s.priceInr),
            prerequisite: s.prerequisite,
            reportTimeHours: parseInt(s.reportTimeHours),
          })),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save services");

      router.push("/lab/dashboard");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      setError(message);
      setSubmitting(false);
    }
  }

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
            href="/lab/dashboard"
            className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:text-primary-light"
          >
            <ArrowLeft size={18} />
            Dashboard
          </Link>
          <h1 className="mt-2 text-xl font-bold text-gray-900">
            Register Services
          </h1>
          <p className="text-sm text-gray-500">
            Add tests and services offered by{" "}
            <span className="font-semibold text-primary">{labName}</span>
          </p>
        </div>
      </div>

      {/* Services Form */}
      <div className="mx-auto max-w-3xl px-4 py-6">
        <div className="space-y-4">
          {services.map((service, index) => (
            <ServiceCard
              key={index}
              index={index}
              service={service}
              availableTests={getAvailableTestsForEntry(index)}
              onUpdate={updateService}
              onRemove={removeService}
              canRemove={services.length > 1}
            />
          ))}
        </div>

        {/* Add Service Button */}
        {services.length < tests.length && (
          <button
            onClick={addService}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 bg-white py-3 text-sm font-medium text-gray-600 transition-colors hover:border-primary hover:text-primary"
          >
            <Plus size={18} />
            Add Another Service
          </button>
        )}

        {/* Error */}
        {error && (
          <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">
            {error}
          </p>
        )}

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={submitting || services.length === 0}
          className="mt-6 flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-primary text-base font-bold text-white shadow-lg transition-all hover:bg-primary-light disabled:opacity-50"
        >
          {submitting ? (
            <Loader2 size={20} className="animate-spin" />
          ) : (
            <>
              <Send size={20} />
              Submit Services ({services.length})
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// Service Card Component
function ServiceCard({
  index,
  service,
  availableTests,
  onUpdate,
  onRemove,
  canRemove,
}: {
  index: number;
  service: ServiceEntry;
  availableTests: AvailableTest[];
  onUpdate: (index: number, field: keyof ServiceEntry, value: string) => void;
  onRemove: (index: number) => void;
  canRemove: boolean;
}) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredTests = useMemo(
    () =>
      availableTests.filter(
        (t) =>
          t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.category.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    [availableTests, searchQuery]
  );

  // Group tests by category
  const groupedTests = useMemo(() => {
    const groups: Record<string, AvailableTest[]> = {};
    for (const test of filteredTests) {
      if (!groups[test.category]) groups[test.category] = [];
      groups[test.category].push(test);
    }
    return groups;
  }, [filteredTests]);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-semibold text-gray-700">
          Service {index + 1}
        </span>
        {canRemove && (
          <button
            onClick={() => onRemove(index)}
            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500"
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>

      {/* Test Dropdown */}
      <div className="relative mb-3">
        <label className="mb-1 block text-xs font-medium text-gray-600">
          Select Test
        </label>
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="flex h-12 w-full items-center justify-between rounded-xl border-2 border-gray-200 bg-gray-50 px-4 text-left text-base transition-all hover:border-primary focus:border-primary focus:ring-2 focus:ring-primary/20"
        >
          <span className={service.testName ? "text-gray-900" : "text-gray-400"}>
            {service.testName || "Choose a test..."}
          </span>
          <ChevronDown
            size={18}
            className={`text-gray-400 transition-transform ${dropdownOpen ? "rotate-180" : ""}`}
          />
        </button>

        {dropdownOpen && (
          <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-64 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
            {/* Search */}
            <div className="border-b p-2">
              <div className="relative">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search tests..."
                  autoFocus
                  className="h-10 w-full rounded-lg border border-gray-200 bg-gray-50 pl-9 pr-3 text-sm outline-none focus:border-primary"
                />
              </div>
            </div>

            {/* Options */}
            <div className="max-h-48 overflow-y-auto">
              {Object.entries(groupedTests).length === 0 ? (
                <p className="p-3 text-center text-sm text-gray-400">
                  No tests found
                </p>
              ) : (
                Object.entries(groupedTests).map(([category, categoryTests]) => (
                  <div key={category}>
                    <p className="bg-gray-50 px-3 py-1.5 text-xs font-semibold text-gray-500">
                      {category}
                    </p>
                    {categoryTests.map((test) => (
                      <button
                        key={test.id}
                        onClick={() => {
                          onUpdate(index, "testId", test.id);
                          onUpdate(index, "testName", test.name);
                          setDropdownOpen(false);
                          setSearchQuery("");
                        }}
                        className="w-full px-3 py-2.5 text-left text-sm text-gray-700 transition-colors hover:bg-primary/5 hover:text-primary"
                      >
                        {test.name}
                      </button>
                    ))}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Price, Prerequisite, Report Time — shown after test is selected */}
      {service.testId && (
        <div className="space-y-3">
          {/* Price */}
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              Price (INR)
            </label>
            <div className="relative">
              <IndianRupee
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="number"
                min="1"
                value={service.priceInr}
                onChange={(e) => onUpdate(index, "priceInr", e.target.value)}
                placeholder="e.g. 350"
                className="h-12 w-full rounded-xl border-2 border-gray-200 bg-gray-50 pl-10 pr-4 text-base text-gray-900 outline-none transition-all focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>

          {/* Prerequisite */}
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              Prerequisite
            </label>
            <div className="relative">
              <ClipboardList
                size={16}
                className="absolute left-3.5 top-3.5 text-gray-400"
              />
              <input
                type="text"
                value={service.prerequisite}
                onChange={(e) => onUpdate(index, "prerequisite", e.target.value)}
                placeholder="e.g. 12 hours fasting required"
                list={`prereq-${index}`}
                className="h-12 w-full rounded-xl border-2 border-gray-200 bg-gray-50 pl-10 pr-4 text-base text-gray-900 outline-none transition-all focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20"
              />
              <datalist id={`prereq-${index}`}>
                {COMMON_PREREQUISITES.map((p) => (
                  <option key={p} value={p} />
                ))}
              </datalist>
            </div>
          </div>

          {/* Report Time */}
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              Report Generation Time (hours)
            </label>
            <div className="relative">
              <Clock
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="number"
                min="1"
                value={service.reportTimeHours}
                onChange={(e) =>
                  onUpdate(index, "reportTimeHours", e.target.value)
                }
                placeholder="e.g. 24"
                className="h-12 w-full rounded-xl border-2 border-gray-200 bg-gray-50 pl-10 pr-4 text-base text-gray-900 outline-none transition-all focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
