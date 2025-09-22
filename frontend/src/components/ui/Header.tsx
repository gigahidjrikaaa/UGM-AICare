"use client";

import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { HiMenu, HiChevronDown } from "@/icons";
// --- Import the new MobileNavMenu ---
import MobileNavMenu from './MobileNavMenu';
import ProfileDropdown from './ProfileDropdown';

// --- Define Props: Need handler to toggle sidebar state in parent ---
interface HeaderProps {
  onToggleSidebar: () => void; // Function passed from AppLayout
}

export default function Header({ onToggleSidebar }: HeaderProps) {
  const { data: session, status } = useSession();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
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
  };
  
  // const toggleMobileMenu = () => {
  //   setIsMobileMenuOpen(!isMobileMenuOpen);
  //   if (isProfileOpen) setIsProfileOpen(false);
  // };
  
  const handleSignOut = () => {
    signOut({ callbackUrl: "/" });
  };

  return (
    <>
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-700 ease-out ${
        scrolled 
          ? "bg-white/8 backdrop-blur-2xl border-white/15 shadow-xl shadow-black/5" 
          : "bg-white/3 backdrop-blur-xl border-white/8"
      } border-b border-solid`}>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-2 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* --- Sidebar Toggle Button --- */}
            {/* Show toggle only when logged in (as sidebar is only for logged-in users) */}
            {status === "authenticated" && (
                <motion.button
                  onClick={onToggleSidebar} // Call the handler from props
                  whileHover={{
                    scale: 1.05,
                    boxShadow: "0 0 0 6px rgba(255,202,64,0.25)"
                  }}
                  whileTap={{ scale: 0.97 }}
                  className="relative inline-flex items-center gap-2 overflow-hidden rounded-full border border-[#FFD772] bg-[#FFCA40] px-4 py-2 text-sm font-semibold text-[#001D58] shadow-[0_12px_30px_rgba(255,202,64,0.35)] transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FFCA40]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#00112e] group"
                  aria-label="Toggle navigation menu"
                >
                  <span className="pointer-events-none absolute -inset-1 rounded-full bg-white/50 opacity-0 blur-lg transition-opacity duration-300 group-hover:opacity-30" aria-hidden="true" />
                  <span className="relative z-10 flex items-center gap-2">
                    <HiMenu size={18} />
                    <span className="hidden sm:inline-block">Menu</span>
                  </span>
                </motion.button>
            )}
            {/* Logo Section with Animation */}
            <Link href="/" className="flex items-center group">
              <motion.div
                initial={{ rotate: 0 }}
                whileHover={{ rotate: 5, scale: 1.03 }}
                transition={{ type: "spring", stiffness: 300, damping: 15 }}
                className="mr-2.5"
              >
                {/* Logo Image */}
                <Image 
                  src="/UGM_Lambang.png" 
                  alt="UGM Logo" 
                  width={28} 
                  height={28} 
                  className="rounded-lg" 
                  priority
                />
              </motion.div>
              <div>
                <h1 className="font-semibold text-base text-white/95 group-hover:text-white transition-colors duration-200">
                  UGM-AICare
                </h1>
                <p className="text-[#FFCA40]/80 text-xs font-medium hidden sm:block group-hover:text-[#FFCA40] transition-colors duration-200">
                  Mental Health Companion
                </p>
              </div>
            </Link>
          </div>
          
          {/* Desktop Navigation Links - Professional Style */}
          <nav className="hidden md:flex items-center gap-6">
            {[
              { href: "/", label: "Home" },
              { href: "/about", label: "About" },
              { href: "/resources", label: "Resources" },
              { href: "/aika", label: "Talk to Aika" }
            ].map((link, i) => (
              <motion.div key={i} className="relative">
                <Link 
                  href={link.href} 
                  className="relative text-white/70 hover:text-white transition-all duration-300 text-sm font-medium tracking-wide group py-2"
                >
                  <span className="relative z-10">{link.label}</span>
                  
                  {/* Animated underline */}
                  <motion.div
                    className="absolute bottom-0 left-0 h-0.5 bg-gradient-to-r from-[#FFCA40] to-[#FFD700] rounded-full"
                    initial={{ width: 0 }}
                    whileHover={{ width: "100%" }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                  />
                  
                  {/* Subtle glow effect on hover */}
                  <motion.div
                    className="absolute inset-0 bg-white/5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 -mx-2 -my-1"
                    whileHover={{ 
                      boxShadow: "0 0 20px rgba(255,202,64,0.1)"
                    }}
                  />
                </Link>
              </motion.div>
            ))}
          </nav>
          
          {/* Mobile Menu Button - Minimal Design */}
          <div className="md:hidden flex items-center">
            <motion.button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              whileHover={{ 
                scale: 1.02, 
                backgroundColor: "rgba(255,255,255,0.08)"
              }}
              whileTap={{ scale: 0.98 }}
              className="p-2.5 rounded-xl bg-white/4 hover:bg-white/8 backdrop-blur-sm border border-white/8 hover:border-white/15 transition-all duration-200 text-white/70 hover:text-white/90"
              aria-label="Toggle mobile menu"
            >
              <motion.div
                animate={{ rotate: isMobileMenuOpen ? 90 : 0 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
              >
                <HiMenu size={16} />
              </motion.div>
            </motion.button>
          </div>

          {/* Right side: User Profile / Sign In Button - Clean Modern Style */}
          <div className="flex items-center">
            {status === "authenticated" && session?.user ? (
              <div className="relative">
                {/* Profile Button - Minimal Glassmorphism */}
                <motion.button
                  id="user-menu-button"
                  onClick={toggleProfile}
                  whileHover={{ 
                    scale: 1.02, 
                    backgroundColor: "rgba(255,255,255,0.08)"
                  }}
                  whileTap={{ scale: 0.98 }}
                  className="flex items-center bg-white/5 hover:bg-white/8 backdrop-blur-xl rounded-2xl p-2 pr-3 transition-all duration-200 border border-white/8 hover:border-white/15"
                  aria-haspopup="true"
                  aria-expanded={isProfileOpen}
                >
                  <motion.div 
                    className="relative h-7 w-7 rounded-xl overflow-hidden border border-white/15"
                    whileHover={{ 
                      borderColor: "rgba(255,202,64,0.3)"
                    }}
                  >
                    <Image
                        src={session.user.image || "/default-avatar.png"}
                        alt={session.user.name || "User"} 
                        fill 
                        className="object-cover"
                      />
                  </motion.div>
                  <span className="ml-2 text-white/80 text-sm font-medium hidden sm:inline-block">
                      {session.user.name?.split(' ')[0]}
                  </span>
                  <motion.div
                    animate={{ rotate: isProfileOpen ? 180 : 0 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                  >
                    <HiChevronDown className="ml-1.5 text-white/50" size={14} />
                  </motion.div>
                </motion.button>

                {/* Render the extracted ProfileDropdown */}
                <ProfileDropdown
                  isOpen={isProfileOpen}
                  user={session.user}
                  onClose={() => setIsProfileOpen(false)}
                  onSignOut={handleSignOut}
                />
              </div>
            ) : (
              status === "unauthenticated" && ( // Show Sign In only when not logged in
                <Link href="/signin">
                  <motion.button
                    whileHover={{ 
                      scale: 1.02, 
                      backgroundColor: "rgba(255,255,255,0.08)"
                    }}
                    whileTap={{ scale: 0.98 }}
                    className="bg-white/5 backdrop-blur-xl border border-white/10 hover:border-white/20 px-6 py-2 rounded-2xl text-white/80 hover:text-white transition-all duration-200 text-sm font-medium"
                  >
                    <span className="relative z-10">Sign In</span>
                  </motion.button>
                </Link>
              )
            )}
            {status === "loading" && ( // Loading indicator - Minimal
                <motion.div 
                  className="w-8 h-8 rounded-xl border border-white/10 border-t-[#FFCA40]/70 backdrop-blur-sm"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                />
            )}
          </div>
        </div>
      </header>

      {/* Mobile Navigation Menu - Modern Style */}
      <MobileNavMenu
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />
  </>
  );
}
