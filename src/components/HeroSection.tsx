"use client";

import { useState } from "react";
import { Search, MapPin } from "lucide-react";
import Image from "next/image";

interface HeroSectionProps {
  onSearch: (test: string, pincode: string) => void;
}

export default function HeroSection({ onSearch }: HeroSectionProps) {
  const [testQuery, setTestQuery] = useState("");
  const [pincodeQuery, setPincodeQuery] = useState("");

  function handleSearch() {
    const test = testQuery.trim();
    const pincode = pincodeQuery.trim();
    if (!test && !pincode) return;
    onSearch(test, pincode);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") handleSearch();
  }

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-hero-start via-hero-mid to-hero-end">
      {/* Background network pattern */}
      <div className="pointer-events-none absolute inset-0 opacity-10">
        <svg
          className="h-full w-full"
          viewBox="0 0 1200 600"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx="200" cy="150" r="3" fill="#1a3c5e" />
          <circle cx="350" cy="100" r="2" fill="#1a3c5e" />
          <circle cx="500" cy="200" r="3" fill="#1a3c5e" />
          <circle cx="150" cy="300" r="2" fill="#1a3c5e" />
          <circle cx="400" cy="350" r="3" fill="#1a3c5e" />
          <circle cx="600" cy="120" r="2" fill="#1a3c5e" />
          <circle cx="700" cy="250" r="3" fill="#1a3c5e" />
          <circle cx="300" cy="250" r="2" fill="#1a3c5e" />
          <line x1="200" y1="150" x2="350" y2="100" stroke="#1a3c5e" strokeWidth="0.5" />
          <line x1="350" y1="100" x2="500" y2="200" stroke="#1a3c5e" strokeWidth="0.5" />
          <line x1="200" y1="150" x2="150" y2="300" stroke="#1a3c5e" strokeWidth="0.5" />
          <line x1="150" y1="300" x2="400" y2="350" stroke="#1a3c5e" strokeWidth="0.5" />
          <line x1="500" y1="200" x2="600" y2="120" stroke="#1a3c5e" strokeWidth="0.5" />
          <line x1="600" y1="120" x2="700" y2="250" stroke="#1a3c5e" strokeWidth="0.5" />
          <line x1="300" y1="250" x2="400" y2="350" stroke="#1a3c5e" strokeWidth="0.5" />
          <line x1="200" y1="150" x2="300" y2="250" stroke="#1a3c5e" strokeWidth="0.5" />
          <line x1="350" y1="100" x2="600" y2="120" stroke="#1a3c5e" strokeWidth="0.5" />
          <line x1="500" y1="200" x2="700" y2="250" stroke="#1a3c5e" strokeWidth="0.5" />
        </svg>
      </div>

      <div className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6 md:py-16 lg:px-8 lg:py-20">
        <div className="flex flex-col items-center gap-8 lg:flex-row lg:items-center lg:justify-between">
          {/* Left content */}
          <div className="w-full max-w-xl text-center lg:text-left">
            <h1 className="text-3xl font-extrabold uppercase leading-tight tracking-tight text-primary sm:text-4xl md:text-5xl">
              Get the best deals on test/scans{" "}
              <span className="text-accent">from certified labs</span>
            </h1>

            {/* Search bar */}
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:gap-0">
              <div className="flex flex-1 items-center rounded-full bg-white px-4 py-3 shadow-lg sm:rounded-l-full sm:rounded-r-none">
                <Search size={20} className="mr-2 shrink-0 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search Test/Scan..."
                  value={testQuery}
                  onChange={(e) => setTestQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="w-full bg-transparent text-base text-gray-700 placeholder-gray-400 outline-none"
                />
              </div>
              <div className="flex items-center rounded-full border-t bg-white px-4 py-3 shadow-lg sm:rounded-none sm:border-l sm:border-t-0">
                <MapPin size={20} className="mr-2 shrink-0 text-accent" />
                <input
                  type="text"
                  placeholder="Pincode"
                  value={pincodeQuery}
                  onChange={(e) => setPincodeQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  maxLength={6}
                  className="w-full bg-transparent text-base text-gray-700 placeholder-gray-400 outline-none"
                />
              </div>
              <button
                onClick={handleSearch}
                className="rounded-full bg-accent px-8 py-3 text-base font-semibold text-white shadow-lg transition-colors hover:bg-accent-dark sm:rounded-l-none sm:rounded-r-full"
              >
                Search
              </button>
            </div>
          </div>

          {/* Right content — Doctor image + trust badge */}
          <div className="relative flex shrink-0 items-center justify-center">
            {/* Trust badge */}
            <div className="absolute -top-2 right-4 z-10 flex h-20 w-20 flex-col items-center justify-center rounded-full bg-primary text-center shadow-lg sm:right-8 sm:h-24 sm:w-24">
              <span className="text-[9px] font-medium uppercase tracking-wide text-gray-300">
                Trusted by
              </span>
              <span className="text-lg font-extrabold leading-tight text-white sm:text-xl">
                10K+
              </span>
              <span className="text-[9px] font-medium uppercase tracking-wide text-gray-300">
                Users
              </span>
            </div>

            {/* Doctor image placeholder */}
            <div className="relative h-[300px] w-[280px] sm:h-[380px] sm:w-[340px] md:h-[420px] md:w-[380px]">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-t from-hero-end/50 to-transparent" />
              <Image
                src="/doctor-hero.svg"
                alt="Certified lab professional"
                fill
                className="object-contain object-bottom"
                priority
                sizes="(max-width: 640px) 280px, (max-width: 768px) 340px, 380px"
              />
            </div>

            {/* Decorative sparkle */}
            <div className="absolute -bottom-2 -right-2 text-accent">
              <svg
                width="32"
                height="32"
                viewBox="0 0 32 32"
                fill="currentColor"
              >
                <path d="M16 0L19.5 12.5L32 16L19.5 19.5L16 32L12.5 19.5L0 16L12.5 12.5L16 0Z" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
