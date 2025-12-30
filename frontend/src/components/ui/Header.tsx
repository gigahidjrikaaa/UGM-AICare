"use client";

import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import { HiMenu, HiViewGrid } from "react-icons/hi"; // Added HiViewGrid for Dashboard icon
import { useWellnessState } from "@/hooks/useQuests";
import MobileNavMenu from "./MobileNavMenu";
import ProfileDropdown from "./ProfileDropdown";

interface HeaderProps {
  onToggleSidebar: () => void;
}

export default function Header({ onToggleSidebar }: HeaderProps) {
  const { data: session, status } = useSession();
  const { data: wellness } = useWellnessState();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Track scroll position
  useEffect(() => {
    const scrollContainer = document.getElementById("app-scroll-container");
    const target: (Window & typeof globalThis) | HTMLElement = scrollContainer ?? window;

    const getScrollTop = () => {
      if (target === window) {
        return window.scrollY;
      }
      return (target as HTMLElement).scrollTop;
    };

    const handleScroll = () => {
      setScrolled(getScrollTop() > 10);
    };

    handleScroll();
    target.addEventListener("scroll", handleScroll, { passive: true } as AddEventListenerOptions);

    return () => {
      target.removeEventListener("scroll", handleScroll as EventListener);
    };
  }, []);

  const toggleProfile = () => {
    setIsProfileOpen(!isProfileOpen);
    if (isMobileMenuOpen) setIsMobileMenuOpen(false);
  };

  const handleSignOut = () => {
    signOut({ callbackUrl: "/" });
  };

  const navLinks = [
    { href: "/aika", label: "Talk to Aika" }, // Added Talk to Aika
    { href: "/about", label: "About" },
    { href: "/features", label: "Features" },
    { href: "/resources", label: "Resources" },
  ];

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-100 transition-all duration-500 ease-in-out ${scrolled
          ? "bg-[#001D58]/70 backdrop-blur-md border-b border-white/10 py-3 shadow-lg supports-backdrop-filter:bg-[#001D58]/60"
          : "bg-transparent py-5"
          }`}
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">

            {/* Left Section: Logo & Nav */}
            <div className="flex items-center gap-8">
              {/* Logo */}
              <Link href="/" className="flex items-center gap-3 group">
                <div className="relative w-9 h-9 overflow-hidden rounded-full border-2 border-white/20 group-hover:border-[#FFCA40] transition-colors duration-300 shadow-md">
                  <Image
                    src="/UGM_Lambang.png"
                    alt="UGM Logo"
                    fill
                    className="object-cover"
                    priority
                  />
                </div>
                <div className="flex flex-col">
                  <span className="text-base font-bold leading-none text-white tracking-wide group-hover:text-[#FFCA40] transition-colors">
                    UGM-AICare
                  </span>
                  <span className="text-[9px] uppercase tracking-widest text-white/60 font-medium mt-0.5">
                    Mental Health
                  </span>
                </div>
              </Link>

              {/* Desktop Nav Links */}
              <nav className="hidden md:flex items-center gap-6">
                {navLinks.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`text-sm font-medium transition-colors duration-200 relative group ${item.href === '/aika' ? 'text-[#FFCA40] hover:text-[#FFCA40]/80' : 'text-white/70 hover:text-white'
                      }`}
                  >
                    {item.label}
                    <span className={`absolute -bottom-1 left-0 w-0 h-0.5 transition-all duration-300 group-hover:w-full opacity-0 group-hover:opacity-100 ${item.href === '/aika' ? 'bg-[#FFCA40]' : 'bg-white'
                      }`} />
                  </Link>
                ))}
              </nav>
            </div>

            {/* Right Section: Actions */}
            <div className="flex items-center gap-4">
              {status === "authenticated" ? (
                <>
                  {/* Dashboard Button (Desktop) */}
                  <Link
                    href="/dashboard"
                    className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 transition-all duration-200 text-white/80 group"
                  >
                    <HiViewGrid className="w-4 h-4 group-hover:text-[#FFCA40] transition-colors" />
                    <span className="text-xs font-medium uppercase tracking-wider">Dashboard</span>
                  </Link>

                  {/* Sidebar Toggle (Desktop) */}
                  <button
                    onClick={onToggleSidebar}
                    className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 transition-all duration-200 text-white/80 group"
                  >
                    <HiMenu className="w-4 h-4 group-hover:text-[#FFCA40] transition-colors" />
                    <span className="text-xs font-medium uppercase tracking-wider">Menu</span>
                  </button>

                  {/* Profile Dropdown Trigger */}
                  <div className="relative">
                    <button
                      onClick={toggleProfile}
                      className={`relative w-9 h-9 rounded-full overflow-hidden border-2 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#FFCA40]/50 ${isProfileOpen ? "border-[#FFCA40]" : "border-white/20 hover:border-white/40"
                        }`}
                    >
                      <Image
                        src={session.user?.image || "/default-avatar.png"}
                        alt="Profile"
                        fill
                        className="object-cover"
                      />
                    </button>

                    <ProfileDropdown
                      user={session.user}
                      isOpen={isProfileOpen}
                      onClose={() => setIsProfileOpen(false)}
                      onSignOut={handleSignOut}
                    />
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-4">
                  <Link
                    href="/signin"
                    className="text-sm font-medium text-white/80 hover:text-white transition-colors"
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/signup"
                    className="px-5 py-2 bg-white text-[#001D58] rounded-full text-sm font-bold hover:bg-[#FFCA40] transition-colors duration-300 shadow-lg shadow-black/10"
                  >
                    Get Started
                  </Link>
                </div>
              )}

              {/* Mobile Menu Toggle */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="md:hidden p-2 text-white/80 hover:text-white transition-colors"
              >
                <HiMenu size={24} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Navigation Menu */}
      <MobileNavMenu
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />
    </>
  );
}
