"use client";

import { useState, useEffect, useRef } from "react";
import { Search, ChevronDown, TestTubes } from "lucide-react";

interface HeroSectionProps {
  onSearch: (test: string, pincode: string) => void;
}

interface TestSuggestion {
  id: string;
  name: string;
  category: string;
}

export default function HeroSection({ onSearch }: HeroSectionProps) {
  const [testQuery, setTestQuery] = useState("");
  const [pincodeQuery, setPincodeQuery] = useState("");
  const [suggestions, setSuggestions] = useState<TestSuggestion[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedTest, setSelectedTest] = useState<string>("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function fetchTests() {
      try {
        const res = await fetch("/api/search?mode=suggestions");
        const data = await res.json();
        setSuggestions(data.tests || []);
      } catch {
        // silently fail
      }
    }
    fetchTests();
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = testQuery.trim()
    ? suggestions.filter((s) =>
        s.name.toLowerCase().includes(testQuery.toLowerCase())
      )
    : suggestions;

  function handleSelectTest(test: TestSuggestion) {
    setTestQuery(test.name);
    setSelectedTest(test.name);
    setShowDropdown(false);
  }

  function handleInputChange(value: string) {
    setTestQuery(value);
    setSelectedTest("");
    setShowDropdown(true);
  }

  function handleSearch() {
    const test = selectedTest || testQuery.trim();
    const pincode = pincodeQuery.trim();
    if (!test && !pincode) return;
    setShowDropdown(false);
    onSearch(test, pincode);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") handleSearch();
    if (e.key === "Escape") setShowDropdown(false);
  }

  return (
    <section className="relative min-h-[85vh] overflow-hidden bg-gradient-to-br from-hero-start via-hero-mid to-hero-end">
      {/* Floating background blobs */}
      <div
        className="pointer-events-none absolute -left-[150px] -top-[150px] h-[600px] w-[600px] rounded-full opacity-100"
        style={{
          background: "radial-gradient(circle, rgba(58,166,255,0.33), transparent 70%)",
          filter: "blur(80px)",
          animation: "float 8s ease-in-out infinite alternate",
        }}
      />
      <div
        className="pointer-events-none absolute -bottom-[150px] -right-[150px] h-[500px] w-[500px] rounded-full opacity-100"
        style={{
          background: "radial-gradient(circle, rgba(0,212,255,0.33), transparent 70%)",
          filter: "blur(90px)",
          animation: "float 10s ease-in-out infinite alternate",
        }}
      />

      {/* Content */}
      <div className="relative z-[1] flex min-h-[85vh] items-center px-5 sm:px-8 lg:px-16">
        <div className="w-full max-w-3xl">
          {/* Heading */}
          <h1 className="text-3xl font-extrabold leading-tight text-gray-900 sm:text-4xl md:text-[44px] md:leading-[1.2]">
            Get The Best Deals On Test/Scans
            <br />
            <span className="text-accent">From Certified Labs</span>
          </h1>

          {/* Search bar */}
          <div className="mt-8 sm:mt-10" ref={dropdownRef}>
            <div
              className="flex flex-col gap-0 rounded-[30px] p-2.5 shadow-[0_10px_30px_rgba(0,0,0,0.1)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_40px_rgba(0,0,0,0.15)] sm:flex-row sm:rounded-full"
              style={{
                background: "rgba(255,255,255,0.6)",
                backdropFilter: "blur(20px)",
              }}
            >
              {/* Test input */}
              <div className="relative flex-1">
                <div className="flex items-center px-4 py-3">
                  <Search size={20} className="mr-2 shrink-0 text-gray-400" />
                  <input
                    ref={inputRef}
                    type="text"
                    placeholder="Search Test / Scan..."
                    value={testQuery}
                    onChange={(e) => handleInputChange(e.target.value)}
                    onFocus={() => setShowDropdown(true)}
                    onKeyDown={handleKeyDown}
                    className="w-full bg-transparent text-base text-gray-700 placeholder-gray-400 outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowDropdown(!showDropdown)}
                    className="ml-1 shrink-0 rounded p-0.5 text-gray-400 transition-colors hover:text-gray-600"
                  >
                    <ChevronDown
                      size={18}
                      className={`transition-transform ${showDropdown ? "rotate-180" : ""}`}
                    />
                  </button>
                </div>

                {/* Dropdown */}
                {showDropdown && filtered.length > 0 && (
                  <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-60 overflow-y-auto rounded-2xl bg-white shadow-xl ring-1 ring-black/5">
                    {filtered.map((test) => (
                      <button
                        key={test.id}
                        type="button"
                        onClick={() => handleSelectTest(test)}
                        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50 first:rounded-t-2xl last:rounded-b-2xl"
                      >
                        <TestTubes size={16} className="shrink-0 text-primary/60" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-gray-800">
                            {test.name}
                          </p>
                          <p className="text-[11px] text-gray-400">{test.category}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Pincode input — hidden divider on mobile */}
              <div className="flex items-center border-t border-gray-200/60 px-4 py-3 sm:border-l sm:border-t-0">
                <input
                  type="text"
                  placeholder="Pincode"
                  value={pincodeQuery}
                  onChange={(e) => setPincodeQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  maxLength={6}
                  className="w-full bg-transparent text-base text-gray-700 placeholder-gray-400 outline-none sm:w-28"
                />
              </div>

              {/* Search button */}
              <button
                onClick={handleSearch}
                className="rounded-full px-8 py-3.5 text-base font-semibold text-white transition-transform hover:scale-105"
                style={{
                  background: "linear-gradient(135deg, #1a4cff, #00c6ff)",
                }}
              >
                Search
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
