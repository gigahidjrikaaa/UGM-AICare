"use client";

import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { HiMenu, HiChevronDown } from "react-icons/hi";
import { useWellnessState } from "@/hooks/useQuests";
// --- Import the new MobileNavMenu ---
import MobileNavMenu from "./MobileNavMenu";
import ProfileDropdown from "./ProfileDropdown";

// --- Define Props: Need handler to toggle sidebar state in parent ---
interface HeaderProps {
  onToggleSidebar: () => void; // Function passed from AppLayout
}

export default function Header({ onToggleSidebar }: HeaderProps) {
  const { data: session, status } = useSession();
  // Only fetch wellness state if authenticated
  const { data: wellness } = useWellnessState();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isAboutDropdownOpen, setIsAboutDropdownOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  
  // Track scroll position to add background blur on scroll
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  
  const toggleProfile = () => {
    setIsProfileOpen(!isProfileOpen);
    if (isMobileMenuOpen) setIsMobileMenuOpen(false);
    if (isAboutDropdownOpen) setIsAboutDropdownOpen(false);
  };
  
  const handleSignOut = () => {
    signOut({ callbackUrl: "/" });
  };

  // About submenu items
  const aboutMenuItems = [
    { href: "/about", label: "About" },
    { href: "/about/features", label: "Features" },
    { href: "/resources", label: "Resources" },
  ];

  return (
    <>
      <header className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-700 ease-out ${
        scrolled 
          ? "bg-[#001D58]/80 backdrop-blur-md border-b border-white/10 py-4" 
          : "bg-transparent py-6"
      }`}>
        <div className="mx-auto max-w-7xl px-6 lg:px-12 flex items-center justify-between">
          <div className="flex items-center gap-8">
            {/* Logo Section */}
            <Link href="/" className="flex items-center gap-3 group">
              <div className="relative w-10 h-10 overflow-hidden rounded-full border border-white/20 shadow-lg group-hover:border-[#FFCA40]/50 transition-colors duration-500">
                <Image 
                  src="/UGM_Lambang.png" 
                  alt="UGM Logo" 
                  fill
                  className="object-cover"
                  priority
                />
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-bold leading-none text-white group-hover:text-[#FFCA40] transition-colors duration-300 font-sans">
                  UGM-AICare
                </span>
                <span className="text-[10px] uppercase tracking-wider text-white/70 font-sans">
                  Mental Health Companion
                </span>
              </div>
            </Link>

            {/* Desktop Navigation - Minimal & Elegant */}
            <nav className="hidden md:flex items-center gap-8 ml-4">
              {aboutMenuItems.map((item) => (
                <Link 
                  key={item.href} 
                  href={item.href}
                  className="text-sm text-white/70 hover:text-white transition-colors duration-300 font-light tracking-wider font-sans"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-6">
            {status === "authenticated" ? (
              <>
                <button 
                  onClick={onToggleSidebar}
                  className="hidden md:flex items-center gap-2 text-white/80 hover:text-[#FFCA40] transition-colors duration-300"
                >
                  <span className="text-sm font-light tracking-wider uppercase">Menu</span>
                </button>

                {/* Profile Trigger */}
                <button 
                  onClick={toggleProfile}
                  className="relative w-10 h-10 rounded-full overflow-hidden border border-white/20 hover:border-[#FFCA40] transition-colors duration-300 focus:outline-none"
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
              </>
            ) : (
              <div className="flex items-center gap-6">
                <Link 
                  href="/signin" 
                  className="text-sm text-white hover:text-[#FFCA40] transition-colors duration-300 font-medium font-sans"
                >
                  Sign In
                </Link>
                <Link 
                  href="/signup" 
                  className="px-6 py-2 bg-white text-[#001D58] rounded-full text-sm font-medium hover:bg-[#FFCA40] transition-colors duration-300 shadow-lg shadow-black/20 font-sans"
                >
                  Get Started
                </Link>
              </div>
            )}

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden text-white p-2"
            >
              <HiMenu size={24} />
            </button>
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
