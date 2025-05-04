"use client";

import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { HiMenu, HiChevronDown } from "react-icons/hi";
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
      <header className={`sticky top-0 z-30 transition-all duration-300 ${ 
        scrolled ? "bg-[#001D58]/90 backdrop-blur-md shadow-md" : "bg-[#001D58]"
      } border-b border-white/10`}>
        <div className="mx-auto px-4 py-2 flex items-center justify-between">
          <div className="flex items-center">
            {/* --- Sidebar Toggle Button --- */}
            {/* Show toggle only when logged in (as sidebar is only for logged-in users) */}
            {status === "authenticated" && (
                <button
                  onClick={onToggleSidebar} // Call the handler from props
                  className="mr-2 p-2 rounded-full hover:bg-white/10 transition-colors text-white"
                  aria-label="Toggle navigation menu"
                >
                  <HiMenu size={24} />
                </button>
            )}
            {/* Logo Section with Animation */}
            <Link href="/" className="flex items-center group">
              <motion.div
                initial={{ rotate: 0 }}
                whileHover={{ rotate: 10, scale: 1.05 }}
                transition={{ type: "spring", stiffness: 300 }}
                className="mr-2"
              >
                {/* Logo Image */}
                <Image 
                  src="/UGM_Lambang.png" 
                  alt="UGM Logo" 
                  width={36} 
                  height={36} 
                  className="mr-1" 
                  priority
                />
              </motion.div>
              <div>
                <h1 className="font-bold text-base sm:text-lg md:text-xl text-white">UGM-AICare</h1>
                <p className="text-[#FFCA40] text-xs font-medium hidden xs:block">Aika - Your Mental Health Companion</p>
              </div>
            </Link>
          </div>
          
          {/* Desktop Navigation Links */}
          {/* <nav className="hidden md:flex items-center space-x-6">
            {[
              { href: "/", label: "Home" },
              { href: "/aika", label: "Talk to Aika" },
              { href: "/resources", label: "Resources" },
              { href: "/about", label: "About Us" }
            ].map((link, i) => (
              <Link 
                key={i}
                href={link.href} 
                className="text-white/80 hover:text-[#FFCA40] transition-colors py-1 px-2 relative group"
              >
                {link.label}
                <motion.span 
                  className="absolute bottom-0 left-0 w-0 h-0.5 bg-[#FFCA40] group-hover:w-full transition-all duration-300"
                  initial={{ width: 0 }}
                  whileHover={{ width: "100%" }}
                />
              </Link>
            ))}
          </nav> */}
          
          {/* Right side: User Profile / Sign In Button */}
          <div className="flex items-center">
            {status === "authenticated" && session?.user ? (
              <div className="relative">
                {/* Profile Button */}
                <motion.button
                  id="user-menu-button"
                  onClick={toggleProfile}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex items-center bg-white/10 hover:bg-white/20 rounded-full p-1 pr-3 transition-colors"
                  aria-haspopup="true"
                  aria-expanded={isProfileOpen}
                >
                  <div className="relative h-8 w-8 rounded-full overflow-hidden border-2 border-[#FFCA40]/60">
                    <Image
                        src={session.user.image || "/default-avatar.png"}
                        alt={session.user.name || "User"} fill className="object-cover"
                      />
                  </div>
                  <span className="ml-2 text-white text-sm hidden sm:inline-block">
                      {session.user.name?.split(' ')[0]}
                  </span>
                  <HiChevronDown className={`ml-1 text-white/70 transition-transform duration-200 ${isProfileOpen ? 'rotate-180' : ''}`} />
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
                    whileHover={{ scale: 1.05, backgroundColor: "rgba(255,255,255,0.2)" }}
                    whileTap={{ scale: 0.95 }}
                    className="bg-white/10 px-4 py-2 rounded-full text-white transition-colors text-sm"
                  >
                    Sign In
                  </motion.button>
                </Link>
              )
            )}
            {status === "loading" && ( // Loading indicator
                <div className="w-8 h-8 rounded-full border-2 border-white/20 border-t-[#FFCA40] animate-spin"></div>
            )}
          </div>
        </div>
      </header>

      <MobileNavMenu
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />
  </>
  );
}