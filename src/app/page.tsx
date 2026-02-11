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
                                <div
                                  key={service.id}
                                  className="px-5 py-3.5"
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
                                </div>
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
                    <div
                      key={service.id}
                      className="rounded-2xl bg-white p-5 shadow-sm"
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
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      )}
    </>
  );
}
