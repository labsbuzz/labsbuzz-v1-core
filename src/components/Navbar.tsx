"use client";

import {
  MapPin,
  User,
  Phone,
  Building2,
  Menu,
  X,
  LogOut,
  Loader2,
} from "lucide-react";
import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [user, setUser] = useState<{ email: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getUser().then(({ data: { user: authUser } }) => {
      if (authUser) {
        setUser({ email: authUser.email! });
      }
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ? { email: session.user.email! } : null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setUser(null);
    window.location.href = "/";
  };

  return (
    <nav className="w-full bg-white shadow-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex flex-col">
            <span className="text-2xl font-bold text-primary">labsbuzz</span>
            <span className="-mt-1 text-[10px] tracking-wide text-gray-500">
              health deserves clarity
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden items-center gap-6 md:flex">
            <Link
              href="/location"
              className="flex items-center gap-1.5 text-sm font-medium text-gray-700 transition-colors hover:text-primary"
            >
              <MapPin size={16} className="text-accent" />
              Location
            </Link>

            {loading ? (
              <Loader2 size={16} className="animate-spin text-gray-400" />
            ) : user ? (
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
                  <User size={16} className="text-accent" />
                  {user.email.split("@")[0]}
                </span>
                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-1.5 text-sm font-medium text-gray-500 transition-colors hover:text-red-600"
                >
                  <LogOut size={16} />
                  Sign out
                </button>
              </div>
            ) : (
              <Link
                href="/signin"
                className="flex items-center gap-1.5 text-sm font-medium text-gray-700 transition-colors hover:text-primary"
              >
                <User size={16} className="text-accent" />
                Sign in
              </Link>
            )}

            <Link
              href="/support"
              className="flex items-center gap-1.5 text-sm font-medium text-gray-700 transition-colors hover:text-primary"
            >
              <Phone size={16} className="text-accent" />
              Support
            </Link>
            <Link
              href="/register-lab"
              className="flex items-center gap-1.5 rounded-full border-2 border-primary bg-white px-4 py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary hover:text-white"
            >
              <Building2 size={16} />
              Register Labs
            </Link>
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 md:hidden"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="border-t border-gray-100 bg-white px-4 pb-4 md:hidden">
          <div className="flex flex-col gap-3 pt-3">
            <Link
              href="/location"
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              onClick={() => setMobileMenuOpen(false)}
            >
              <MapPin size={18} className="text-accent" />
              Location
            </Link>

            {user ? (
              <>
                <div className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-gray-700">
                  <User size={18} className="text-accent" />
                  {user.email}
                </div>
                <button
                  onClick={() => {
                    handleSignOut();
                    setMobileMenuOpen(false);
                  }}
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                >
                  <LogOut size={18} />
                  Sign out
                </button>
              </>
            ) : (
              <Link
                href="/signin"
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                onClick={() => setMobileMenuOpen(false)}
              >
                <User size={18} className="text-accent" />
                Sign in
              </Link>
            )}

            <Link
              href="/support"
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              onClick={() => setMobileMenuOpen(false)}
            >
              <Phone size={18} className="text-accent" />
              Support
            </Link>
            <Link
              href="/register-lab"
              className="flex items-center gap-2 rounded-full border-2 border-primary px-4 py-2 text-center text-sm font-semibold text-primary hover:bg-primary hover:text-white"
              onClick={() => setMobileMenuOpen(false)}
            >
              <Building2 size={18} />
              Register Labs
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
