"use client";

import {
  MapPin,
  User,
  Phone,
  Sun,
  Menu,
  X,
  LogOut,
  LayoutDashboard,
  CalendarCheck,
} from "lucide-react";
import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [user, setUser] = useState<{ email: string } | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getUser().then(async ({ data: { user: authUser } }) => {
      if (authUser) {
        setUser({ email: authUser.email! });
        const res = await fetch("/api/register-lab");
        const data = await res.json();
        setUserRole(data.role || null);
      }
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ? { email: session.user.email! } : null);
      if (!session?.user) setUserRole(null);
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
    <nav className="relative z-10 border-b border-white/40 backdrop-blur-xl"
      style={{ background: "rgba(255,255,255,0.6)" }}
    >
      <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-12">
        <div className="flex h-[68px] items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex flex-col">
            <span className="text-[28px] font-extrabold leading-tight sm:text-[32px]">
              <span className="text-primary">labs</span>
              <span className="text-gray-900">buzz</span>
            </span>
            <span className="-mt-1 text-[11px] tracking-wide text-gray-500">
              health deserves clarity
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden items-center gap-2 md:flex">
            {/* Location */}
            <NavPill href="/location" icon={<MapPin size={15} />} label="Location" />

            {/* Auth state */}
            {!loading && (user ? (
              <>
                <NavPill
                  href="/profile"
                  icon={<User size={15} />}
                  label={user.email.split("@")[0]}
                />
                {userRole === "labs" ? (
                  <NavPill
                    href="/lab/dashboard"
                    icon={<LayoutDashboard size={15} />}
                    label="Dashboard"
                  />
                ) : (
                  <NavPill
                    href="/user/dashboard"
                    icon={<CalendarCheck size={15} />}
                    label="My Bookings"
                  />
                )}
                <button
                  onClick={handleSignOut}
                  className="group flex items-center gap-2 rounded-full border border-black/12 bg-white/55 px-4 py-[7px] text-sm font-medium text-gray-700 backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-red-400 hover:bg-red-50 hover:text-red-600 hover:shadow-md"
                >
                  <span className="flex h-[30px] w-[30px] items-center justify-center rounded-full border border-black/10 bg-white/90 transition-all duration-300 group-hover:border-red-400 group-hover:bg-red-500">
                    <LogOut size={15} className="text-gray-500 transition-colors group-hover:text-white" />
                  </span>
                  Sign out
                </button>
              </>
            ) : (
              <NavPill href="/signin" icon={<User size={15} />} label="Sign In" />
            ))}

            {/* Support */}
            <NavPill href="/support" icon={<Phone size={15} />} label="Support" />

            {/* Register Labs — liquid spinning border */}
            <Link
              href="/register-lab"
              className="register-btn-liquid ml-1 flex items-center gap-2 rounded-full px-5 py-[10px] text-sm font-bold text-white transition-all duration-300 hover:-translate-y-0.5 hover:scale-[1.04] hover:shadow-[0_8px_32px_rgba(0,180,255,0.55),0_0_20px_rgba(0,198,255,0.3)]"
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/30 bg-white/18">
                <Sun size={14} className="text-white" />
              </span>
              Register Labs
            </Link>
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="rounded-full border border-black/10 bg-white/60 p-2.5 backdrop-blur-sm md:hidden"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="border-t border-white/40 px-5 pb-5 md:hidden" style={{ background: "rgba(255,255,255,0.8)" }}>
          <div className="flex flex-col gap-2 pt-4">
            <MobileNavItem href="/location" icon={<MapPin size={18} />} label="Location" onClick={() => setMobileMenuOpen(false)} />

            {!loading && (user ? (
              <>
                <MobileNavItem href="/profile" icon={<User size={18} />} label={user.email.split("@")[0]} onClick={() => setMobileMenuOpen(false)} />
                {userRole === "labs" ? (
                  <MobileNavItem href="/lab/dashboard" icon={<LayoutDashboard size={18} />} label="Dashboard" onClick={() => setMobileMenuOpen(false)} />
                ) : (
                  <MobileNavItem href="/user/dashboard" icon={<CalendarCheck size={18} />} label="My Bookings" onClick={() => setMobileMenuOpen(false)} />
                )}
                <button
                  onClick={() => { handleSignOut(); setMobileMenuOpen(false); }}
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-full border border-red-200 bg-red-50">
                    <LogOut size={16} className="text-red-500" />
                  </span>
                  Sign out
                </button>
              </>
            ) : (
              <MobileNavItem href="/signin" icon={<User size={18} />} label="Sign In" onClick={() => setMobileMenuOpen(false)} />
            ))}

            <MobileNavItem href="/support" icon={<Phone size={18} />} label="Support" onClick={() => setMobileMenuOpen(false)} />

            <Link
              href="/register-lab"
              onClick={() => setMobileMenuOpen(false)}
              className="register-btn-liquid mt-1 flex items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-bold text-white"
            >
              <Sun size={16} />
              Register Labs
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}

/* Reusable pill-shaped nav button */
function NavPill({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-2 rounded-full border border-black/12 bg-white/55 px-4 py-[7px] text-sm font-medium text-gray-700 backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-primary hover:bg-primary/5 hover:text-primary hover:shadow-md"
    >
      <span className="flex h-[30px] w-[30px] items-center justify-center rounded-full border border-black/10 bg-white/90 transition-all duration-300 group-hover:border-primary group-hover:bg-primary">
        <span className="text-gray-500 transition-colors group-hover:text-white">{icon}</span>
      </span>
      <span className="hidden lg:inline">{label}</span>
    </Link>
  );
}

/* Mobile nav item */
function MobileNavItem({ href, icon, label, onClick }: { href: string; icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-white/80"
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-full border border-black/10 bg-white/90">
        <span className="text-gray-500">{icon}</span>
      </span>
      {label}
    </Link>
  );
}
