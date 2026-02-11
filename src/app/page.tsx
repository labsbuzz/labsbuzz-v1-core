"use client";

import { useState } from "react";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import {
  Loader2,
  Building2,
  MapPin,
  IndianRupee,
  Clock,
  ClipboardList,
  ChevronDown,
  ChevronUp,
  TestTubes,
  SearchX,
  X,
  Phone,
  Mail,
  ShieldCheck,
  CalendarCheck,
} from "lucide-react";

interface LabResult {
  id: string;
  lab_name: string;
  city: string;
  state: string;
  pincode: string;
  unique_lab_id: string;
  service_count: number;
}

interface ServiceResult {
  id: string;
  test_name: string;
  category: string;
  lab_name: string;
  city: string;
  state: string;
  pincode: string;
  unique_lab_id: string;
  price_inr: number;
  prerequisite: string;
  report_time_hours: number;
  lab_registration_id: string;
}

interface LabDetailService {
  id: string;
  price_inr: number;
  prerequisite: string;
  report_time_hours: number;
  available_tests: {
    name: string;
    category: string;
  };
}

// Unified modal data
interface ModalData {
  test_name: string;
  category: string;
  lab_name: string;
  city: string;
  state: string;
  pincode: string;
  unique_lab_id: string;
  price_inr: number;
  prerequisite: string;
  report_time_hours: number;
}

type SearchMode = "idle" | "labs" | "services" | "lab_detail";

export default function Home() {
  const [searchMode, setSearchMode] = useState<SearchMode>("idle");
  const [loading, setLoading] = useState(false);
  const [labs, setLabs] = useState<LabResult[]>([]);
  const [services, setServices] = useState<ServiceResult[]>([]);
  const [expandedLabId, setExpandedLabId] = useState<string | null>(null);
  const [labServices, setLabServices] = useState<LabDetailService[]>([]);
  const [labServicesLoading, setLabServicesLoading] = useState(false);
  const [searchInfo, setSearchInfo] = useState("");
  const [modalData, setModalData] = useState<ModalData | null>(null);

  async function handleSearch(test: string, pincode: string) {
    setLoading(true);
    setSearchMode("idle");
    setLabs([]);
    setServices([]);
    setExpandedLabId(null);
    setLabServices([]);

    const params = new URLSearchParams();
    if (test) params.set("test", test);
    if (pincode) params.set("pincode", pincode);

    // Build search info text
    if (test && pincode) {
      setSearchInfo(`"${test}" in pincode ${pincode}`);
    } else if (test) {
      setSearchInfo(`"${test}"`);
    } else {
      setSearchInfo(`pincode ${pincode}`);
    }

    try {
      const res = await fetch(`/api/search?${params.toString()}`);
      const data = await res.json();

      if (!res.ok) {
        setSearchMode("idle");
        return;
      }

      if (data.mode === "labs") {
        setLabs(data.labs || []);
        setSearchMode("labs");
      } else if (data.mode === "services") {
        setServices(data.services || []);
        setSearchMode("services");
      }
    } catch {
      setSearchMode("idle");
    } finally {
      setLoading(false);
    }
  }

  async function handleExpandLab(labId: string) {
    if (expandedLabId === labId) {
      setExpandedLabId(null);
      return;
    }

    setExpandedLabId(labId);
    setLabServicesLoading(true);

    try {
      const res = await fetch(`/api/search?labId=${labId}`);
      const data = await res.json();
      setLabServices(data.services || []);
    } catch {
      setLabServices([]);
    } finally {
      setLabServicesLoading(false);
    }
  }

  // Open modal from service search results
  function openServiceModal(service: ServiceResult) {
    setModalData({
      test_name: service.test_name,
      category: service.category,
      lab_name: service.lab_name,
      city: service.city,
      state: service.state,
      pincode: service.pincode,
      unique_lab_id: service.unique_lab_id,
      price_inr: service.price_inr,
      prerequisite: service.prerequisite,
      report_time_hours: service.report_time_hours,
    });
  }

  // Open modal from expanded lab's service list
  function openLabServiceModal(service: LabDetailService, lab: LabResult) {
    setModalData({
      test_name: service.available_tests.name,
      category: service.available_tests.category,
      lab_name: lab.lab_name,
      city: lab.city,
      state: lab.state,
      pincode: lab.pincode,
      unique_lab_id: lab.unique_lab_id,
      price_inr: service.price_inr,
      prerequisite: service.prerequisite,
      report_time_hours: service.report_time_hours,
    });
  }

  const hasResults =
    searchMode === "labs" ? labs.length > 0 : searchMode === "services" ? services.length > 0 : false;

  return (
    <>
      <Navbar />
      <HeroSection onSearch={handleSearch} />

      {/* Search Results */}
      {(loading || searchMode !== "idle") && (
        <section className="bg-gray-50 px-4 py-8">
          <div className="mx-auto max-w-3xl">
            {/* Loading */}
            {loading && (
              <div className="flex items-center justify-center py-12">
                <Loader2 size={28} className="animate-spin text-primary" />
                <span className="ml-3 text-sm text-gray-500">
                  Searching...
                </span>
              </div>
            )}

            {/* No Results */}
            {!loading && !hasResults && searchMode !== "idle" && (
              <div className="py-12 text-center">
                <SearchX size={48} className="mx-auto mb-3 text-gray-300" />
                <p className="text-lg font-semibold text-gray-600">
                  No results found
                </p>
                <p className="mt-1 text-sm text-gray-400">
                  No labs or services found for {searchInfo}
                </p>
              </div>
            )}

            {/* Labs Results (pincode search) */}
            {!loading && searchMode === "labs" && labs.length > 0 && (
              <div>
                <h2 className="mb-4 text-lg font-bold text-gray-900">
                  Labs in pincode {searchInfo.replace("pincode ", "")}
                </h2>
                <div className="space-y-3">
                  {labs.map((lab) => (
                    <div
                      key={lab.id}
                      className="overflow-hidden rounded-2xl bg-white shadow-sm"
                    >
                      <button
                        onClick={() => handleExpandLab(lab.id)}
                        className="flex w-full items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-gray-50/80"
                      >
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                          <Building2 size={20} className="text-primary" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="truncate text-base font-bold text-gray-900">
                            {lab.lab_name}
                          </h3>
                          <div className="flex items-center gap-3 text-sm text-gray-500">
                            <span className="flex items-center gap-1">
                              <MapPin size={12} />
                              {lab.city}, {lab.state}
                            </span>
                            <span className="font-mono text-xs">
                              {lab.unique_lab_id}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="rounded-full bg-accent/10 px-2.5 py-1 text-xs font-semibold text-accent">
                            {lab.service_count} test
                            {lab.service_count !== 1 ? "s" : ""}
                          </span>
                          {expandedLabId === lab.id ? (
                            <ChevronUp size={18} className="text-gray-400" />
                          ) : (
                            <ChevronDown size={18} className="text-gray-400" />
                          )}
                        </div>
                      </button>

                      {/* Expanded lab services */}
                      {expandedLabId === lab.id && (
                        <div className="border-t border-gray-100">
                          {labServicesLoading ? (
                            <div className="flex items-center justify-center py-6">
                              <Loader2
                                size={20}
                                className="animate-spin text-primary"
                              />
                            </div>
                          ) : labServices.length === 0 ? (
                            <div className="px-5 py-6 text-center">
                              <TestTubes
                                size={28}
                                className="mx-auto mb-2 text-gray-300"
                              />
                              <p className="text-sm text-gray-400">
                                No services listed
                              </p>
                            </div>
                          ) : (
                            <div className="divide-y divide-gray-100">
                              {labServices.map((service) => (
                                <button
                                  key={service.id}
                                  onClick={() => openLabServiceModal(service, lab)}
                                  className="w-full px-5 py-3.5 text-left transition-colors hover:bg-gray-50/60"
                                >
                                  <div className="flex items-center gap-2">
                                    <h4 className="text-sm font-semibold text-gray-900">
                                      {service.available_tests.name}
                                    </h4>
                                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500">
                                      {service.available_tests.category}
                                    </span>
                                  </div>
                                  <div className="mt-1.5 flex flex-wrap gap-3">
                                    <span className="flex items-center gap-1 text-xs text-gray-600">
                                      <IndianRupee
                                        size={12}
                                        className="text-green-600"
                                      />
                                      <span className="font-semibold text-green-700">
                                        {service.price_inr}
                                      </span>
                                    </span>
                                    <span className="flex items-center gap-1 text-xs text-gray-600">
                                      <Clock
                                        size={12}
                                        className="text-blue-500"
                                      />
                                      {service.report_time_hours}h
                                    </span>
                                    {service.prerequisite && (
                                      <span className="flex items-center gap-1 text-xs text-gray-600">
                                        <ClipboardList
                                          size={12}
                                          className="text-amber-500"
                                        />
                                        {service.prerequisite}
                                      </span>
                                    )}
                                  </div>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Services Results (test name search) */}
            {!loading && searchMode === "services" && services.length > 0 && (
              <div>
                <h2 className="mb-1 text-lg font-bold text-gray-900">
                  Results for {searchInfo}
                </h2>
                <p className="mb-4 text-sm text-gray-500">
                  {services.length} result{services.length !== 1 ? "s" : ""}{" "}
                  sorted by price
                </p>
                <div className="space-y-3">
                  {services.map((service) => (
                    <button
                      key={service.id}
                      onClick={() => openServiceModal(service)}
                      className="w-full rounded-2xl bg-white p-5 text-left shadow-sm transition-shadow hover:shadow-md"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="text-base font-bold text-gray-900">
                              {service.test_name}
                            </h3>
                            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500">
                              {service.category}
                            </span>
                          </div>

                          <div className="mt-2 flex items-center gap-2">
                            <Building2 size={14} className="text-primary" />
                            <span className="text-sm font-medium text-gray-700">
                              {service.lab_name}
                            </span>
                            <span className="text-xs text-gray-400">
                              {service.city}, {service.state}
                            </span>
                          </div>

                          <div className="mt-2.5 flex flex-wrap gap-3">
                            <span className="flex items-center gap-1 text-xs text-gray-600">
                              <Clock size={12} className="text-blue-500" />
                              {service.report_time_hours}h
                            </span>
                            {service.prerequisite && (
                              <span className="flex items-center gap-1 text-xs text-gray-600">
                                <ClipboardList
                                  size={12}
                                  className="text-amber-500"
                                />
                                {service.prerequisite}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="ml-4 flex items-center gap-1 rounded-lg bg-green-50 px-3 py-2">
                          <IndianRupee
                            size={16}
                            className="text-green-600"
                          />
                          <span className="text-lg font-bold text-green-700">
                            {service.price_inr}
                          </span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Detail Modal */}
      {modalData && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
          onClick={() => setModalData(null)}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

          {/* Modal */}
          <div
            className="relative w-full max-w-md animate-in slide-in-from-bottom rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={() => setModalData(null)}
              className="absolute right-4 top-4 rounded-full bg-gray-100 p-1.5 text-gray-500 transition-colors hover:bg-gray-200 hover:text-gray-700"
            >
              <X size={18} />
            </button>

            {/* Header */}
            <div className="border-b border-gray-100 px-6 pb-4 pt-6">
              <div className="flex items-center gap-2">
                <TestTubes size={20} className="text-primary" />
                <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                  {modalData.category}
                </span>
              </div>
              <h2 className="mt-2 text-xl font-bold text-gray-900">
                {modalData.test_name}
              </h2>
            </div>

            {/* Price banner */}
            <div className="flex items-center justify-between bg-green-50 px-6 py-4">
              <span className="text-sm font-medium text-green-800">Price</span>
              <div className="flex items-center gap-1">
                <IndianRupee size={20} className="text-green-600" />
                <span className="text-2xl font-extrabold text-green-700">
                  {modalData.price_inr}
                </span>
              </div>
            </div>

            {/* Lab details */}
            <div className="space-y-4 px-6 py-5">
              {/* Lab info */}
              <div className="rounded-xl bg-gray-50 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <Building2 size={20} className="text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-sm font-bold text-gray-900">
                      {modalData.lab_name}
                    </h3>
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <MapPin size={11} />
                      {modalData.city}, {modalData.state} — {modalData.pincode}
                    </div>
                  </div>
                </div>
                <div className="mt-2 flex items-center gap-1.5 pl-[52px]">
                  <ShieldCheck size={12} className="text-green-600" />
                  <span className="text-[11px] font-medium text-green-700">
                    Verified Lab
                  </span>
                  <span className="ml-1 font-mono text-[10px] text-gray-400">
                    {modalData.unique_lab_id}
                  </span>
                </div>
              </div>

              {/* Test details */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-gray-100 p-3">
                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <Clock size={13} className="text-blue-500" />
                    Report Time
                  </div>
                  <p className="mt-1 text-sm font-bold text-gray-900">
                    {modalData.report_time_hours} hours
                  </p>
                </div>
                <div className="rounded-xl border border-gray-100 p-3">
                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <ClipboardList size={13} className="text-amber-500" />
                    Preparation
                  </div>
                  <p className="mt-1 text-sm font-bold text-gray-900">
                    {modalData.prerequisite || "None required"}
                  </p>
                </div>
              </div>
            </div>

            {/* Book Now button */}
            <div className="border-t border-gray-100 px-6 pb-6 pt-4">
              <button
                onClick={() => {
                  // Placeholder — booking flow to be implemented
                  alert("Booking feature coming soon!");
                }}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-accent py-4 text-base font-bold text-white shadow-lg transition-colors hover:bg-accent-dark"
              >
                <CalendarCheck size={20} />
                Book Now
              </button>
              <p className="mt-2 text-center text-[11px] text-gray-400">
                Free cancellation available
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
