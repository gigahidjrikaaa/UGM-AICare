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
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ease-out ${
        scrolled 
          ? "bg-white/10 backdrop-blur-xl border-white/20 shadow-2xl shadow-black/10" 
          : "bg-white/5 backdrop-blur-lg border-white/10"
      } border-b border-solid`}>
        <div className="mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center">
            {/* --- Sidebar Toggle Button --- */}
            {/* Show toggle only when logged in (as sidebar is only for logged-in users) */}
            {status === "authenticated" && (
                <motion.button
                  onClick={onToggleSidebar} // Call the handler from props
                  whileHover={{ 
                    scale: 1.05, 
                    backgroundColor: "rgba(255,255,255,0.12)",
                    boxShadow: "0 0 20px rgba(255,202,64,0.3), 0 0 40px rgba(255,202,64,0.1)"
                  }}
                  whileTap={{ scale: 0.95 }}
                  className="mr-4 p-3 rounded-2xl bg-white/5 hover:bg-white/10 backdrop-blur-sm border border-white/10 hover:border-white/20 transition-all duration-300 text-white/80 hover:text-white shadow-lg hover:shadow-xl"
                  aria-label="Toggle navigation menu"
                >
                  <HiMenu size={18} />
                </motion.button>
            )}
            {/* Logo Section with Animation */}
            <Link href="/" className="flex items-center group">
              <motion.div
                initial={{ rotate: 0 }}
                whileHover={{ rotate: 8, scale: 1.05 }}
                transition={{ type: "spring", stiffness: 400, damping: 10 }}
                className="mr-3"
              >
                {/* Logo Image */}
                <Image 
                  src="/UGM_Lambang.png" 
                  alt="UGM Logo" 
                  width={32} 
                  height={32} 
                  className="rounded-lg" 
                  priority
                />
              </motion.div>
              <div>
                <h1 className="font-semibold text-lg text-white/95 group-hover:text-white transition-colors duration-300">
                  UGM-AICare
                </h1>
                <p className="text-[#FFCA40]/90 text-xs font-medium hidden sm:block group-hover:text-[#FFCA40] transition-colors duration-300">
                  Aika - Your Mental Health Companion
                </p>
              </div>
            </Link>
          </div>
          
          {/* Desktop Navigation Links - Enhanced iOS Style */}
          <nav className="hidden md:flex items-center bg-white/8 backdrop-blur-xl rounded-3xl px-3 py-2 border border-white/10 shadow-2xl">
            {[
              { href: "/", label: "Home", icon: "🏠" },
              { href: "/about", label: "About", icon: "ℹ️" },
              { href: "/resources", label: "Resources", icon: "📚" },
              { href: "/aika", label: "Talk to Aika", icon: "💬" }
            ].map((link, i) => (
              <motion.div key={i} className="relative">
                <Link 
                  href={link.href} 
                  className="flex items-center gap-2 text-white/80 hover:text-white transition-all duration-300 py-3 px-4 rounded-2xl relative group overflow-hidden"
                >
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-white/5 to-white/10 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    whileHover={{ 
                      scale: 1.02,
                      boxShadow: "0 0 25px rgba(255,202,64,0.2), inset 0 1px 0 rgba(255,255,255,0.1)"
                    }}
                  />
                  <motion.span 
                    className="text-sm relative z-10"
                    whileHover={{ scale: 1.1 }}
                    transition={{ type: "spring", stiffness: 400, damping: 10 }}
                  >
                    {link.icon}
                  </motion.span>
                  <span className="text-sm font-medium relative z-10">{link.label}</span>
                  <motion.div
                    className="absolute bottom-1 left-1/2 w-0 h-0.5 bg-gradient-to-r from-[#FFCA40] to-[#FFD700] rounded-full shadow-lg"
                    initial={{ width: 0, x: "-50%" }}
                    whileHover={{ width: "70%", x: "-50%" }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                  />
                </Link>
              </motion.div>
            ))}
          </nav>
          
          {/* Mobile Menu Button - Show only on smaller screens */}
          <div className="md:hidden flex items-center">
            <motion.button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              whileHover={{ 
                scale: 1.05, 
                backgroundColor: "rgba(255,255,255,0.12)",
                boxShadow: "0 0 20px rgba(255,202,64,0.3), 0 0 40px rgba(255,202,64,0.1)"
              }}
              whileTap={{ scale: 0.95 }}
              className="p-3 rounded-2xl bg-white/5 hover:bg-white/10 backdrop-blur-sm border border-white/10 hover:border-white/20 transition-all duration-300 text-white/80 hover:text-white mr-3 shadow-lg hover:shadow-xl"
              aria-label="Toggle mobile menu"
            >
              <motion.div
                animate={{ rotate: isMobileMenuOpen ? 90 : 0 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
              >
                <HiMenu size={18} />
              </motion.div>
            </motion.button>
          </div>

          {/* Right side: User Profile / Sign In Button - Enhanced iOS Style */}
          <div className="flex items-center">
            {status === "authenticated" && session?.user ? (
              <div className="relative">
                {/* Profile Button - Enhanced Glassmorphism */}
                <motion.button
                  id="user-menu-button"
                  onClick={toggleProfile}
                  whileHover={{ 
                    scale: 1.02, 
                    backgroundColor: "rgba(255,255,255,0.15)",
                    boxShadow: "0 0 25px rgba(255,202,64,0.4), 0 0 50px rgba(255,202,64,0.15), inset 0 1px 0 rgba(255,255,255,0.1)"
                  }}
                  whileTap={{ scale: 0.98 }}
                  className="flex items-center bg-white/8 hover:bg-white/15 backdrop-blur-xl rounded-3xl p-3 pr-4 transition-all duration-300 border border-white/10 hover:border-white/20 shadow-xl hover:shadow-2xl"
                  aria-haspopup="true"
                  aria-expanded={isProfileOpen}
                >
                  <motion.div 
                    className="relative h-8 w-8 rounded-2xl overflow-hidden border-2 border-[#FFCA40]/40 hover:border-[#FFCA40]/60 transition-all duration-300"
                    whileHover={{ 
                      boxShadow: "0 0 15px rgba(255,202,64,0.5)"
                    }}
                  >
                    <Image
                        src={session.user.image || "/default-avatar.png"}
                        alt={session.user.name || "User"} 
                        fill 
                        className="object-cover"
                      />
                  </motion.div>
                  <span className="ml-3 text-white/90 text-sm font-medium hidden sm:inline-block">
                      {session.user.name?.split(' ')[0]}
                  </span>
                  <motion.div
                    animate={{ rotate: isProfileOpen ? 180 : 0 }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                    whileHover={{ scale: 1.1 }}
                  >
                    <HiChevronDown className="ml-2 text-white/60" size={16} />
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
                      scale: 1.05, 
                      backgroundColor: "rgba(255,255,255,0.12)",
                      borderColor: "rgba(255,202,64,0.6)",
                      boxShadow: "0 0 30px rgba(255,202,64,0.4), 0 0 60px rgba(255,202,64,0.15), inset 0 1px 0 rgba(255,255,255,0.1)"
                    }}
                    whileTap={{ scale: 0.95 }}
                    className="bg-white/8 backdrop-blur-xl border border-white/20 hover:border-[#FFCA40]/50 px-8 py-3 rounded-3xl text-white/90 hover:text-white transition-all duration-300 text-sm font-medium shadow-xl hover:shadow-2xl"
                  >
                    <span className="relative z-10">Sign In</span>
                  </motion.button>
                </Link>
              )
            )}
            {status === "loading" && ( // Loading indicator - Enhanced
                <motion.div 
                  className="w-10 h-10 rounded-2xl border-2 border-white/10 border-t-[#FFCA40]/80 backdrop-blur-sm shadow-lg"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  whileHover={{ 
                    boxShadow: "0 0 20px rgba(255,202,64,0.3)"
                  }}
                />
            )}
          </div>
        </div>
      </header>

      {/* Mobile Navigation Menu - Enhanced iOS Style */}
      <MobileNavMenu
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />
  </>
  );
}