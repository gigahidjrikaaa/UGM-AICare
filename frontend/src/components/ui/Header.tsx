"use client";

import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { HiMenu, HiX, HiChevronDown } from "react-icons/hi";
import { FiLogOut, FiUser, FiHelpCircle, FiActivity } from "react-icons/fi";
import { BsChatDots, BsCalendar } from "react-icons/bs";

export default function Header() {
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
  
  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
    if (isProfileOpen) setIsProfileOpen(false);
  };
  
  const handleSignOut = () => {
    signOut({ callbackUrl: "/" });
  };

  return (
    <header className={`sticky top-0 z-50 transition-all duration-300 ${
      scrolled ? "bg-[#001D58]/90 backdrop-blur-md shadow-md" : "bg-[#001D58]"
    } border-b border-white/10`}>
      <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between">
        {/* Logo Section with Animation */}
        <Link href="/" className="flex items-center group">
          <motion.div
            initial={{ rotate: 0 }}
            whileHover={{ rotate: 10, scale: 1.05 }}
            transition={{ type: "spring", stiffness: 300 }}
            className="mr-2"
          >
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
        
        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center space-x-6">
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
        </nav>
        
        {/* Mobile Menu Toggle */}
        <div className="md:hidden mr-2">
          <button 
            onClick={toggleMobileMenu}
            className="p-2 rounded-full hover:bg-white/10 transition-colors"
          >
            {isMobileMenuOpen ? <HiX size={24} /> : <HiMenu size={24} />}
          </button>
        </div>
        
        {/* User Profile / Sign In */}
        <div className="flex items-center">
          {status === "authenticated" && session?.user ? (
            <div className="relative">
              <motion.button 
                onClick={toggleProfile}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex items-center bg-white/10 hover:bg-white/20 rounded-full p-1 pr-3 transition-colors"
              >
                {/* User Avatar */}
                <div className="relative h-8 w-8 rounded-full overflow-hidden border-2 border-[#FFCA40]/60">
                  <Image 
                    src={session.user.image || "/default-avatar.png"}
                    alt={session.user.name || "User"}
                    fill
                    className="object-cover"
                  />
                </div>
                
                {/* User Name */}
                <span className="ml-2 text-white text-sm hidden sm:inline-block">
                  {session.user.name?.split(' ')[0]}
                </span>
                
                <HiChevronDown className="ml-1 text-white/70" />
              </motion.button>
              
              {/* Dropdown Menu with Enhanced Styling */}
              <AnimatePresence>
                {isProfileOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className="absolute right-0 mt-2 w-64 bg-gradient-to-b from-[#0A2A6E] to-[#001a4f] rounded-lg shadow-xl border border-white/10 overflow-hidden"
                  >
                    {/* User Info Section */}
                    <div className="p-4 border-b border-white/10 bg-white/5">
                      <p className="text-white font-medium">{session.user.name}</p>
                      <p className="text-white/70 text-xs truncate">{session.user.email}</p>
                    </div>
                    
                    {/* Menu Items with Icons */}
                    <div className="py-1">
                      <Link href="/profile" className="flex items-center px-4 py-2 text-white/90 hover:bg-[#FFCA40]/10 hover:text-[#FFCA40] transition-colors">
                        <FiUser className="mr-2" />
                        Profile
                      </Link>
                      <Link href="/aika" className="flex items-center px-4 py-2 text-white/90 hover:bg-[#FFCA40]/10 hover:text-[#FFCA40] transition-colors">
                        <BsChatDots className="mr-2" />
                        Chat with Aika
                      </Link>
                      <Link href="/journaling" className="flex items-center px-4 py-2 text-white/90 hover:bg-[#FFCA40]/10 hover:text-[#FFCA40] transition-colors">
                        <FiActivity className="mr-2" />
                        Journaling
                      </Link>
                      <Link href="/appointments" className="flex items-center px-4 py-2 text-white/90 hover:bg-[#FFCA40]/10 hover:text-[#FFCA40] transition-colors">
                        <BsCalendar className="mr-2" />
                        Appointments
                      </Link>
                      <Link href="/help" className="flex items-center px-4 py-2 text-white/90 hover:bg-[#FFCA40]/10 hover:text-[#FFCA40] transition-colors">
                        <FiHelpCircle className="mr-2" />
                        Help Center
                      </Link>
                      <motion.button 
                        onClick={handleSignOut}
                        whileHover={{ x: 3 }}
                        whileTap={{ scale: 0.98 }}
                        className="flex items-center w-full text-left px-4 py-2 text-white/90 hover:bg-red-500/20 hover:text-red-200 transition-colors"
                      >
                        <FiLogOut className="mr-2" />
                        Sign out
                      </motion.button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <Link href="/signin">
              <motion.button
                whileHover={{ scale: 1.05, backgroundColor: "rgba(255,255,255,0.2)" }}
                whileTap={{ scale: 0.95 }}
                className="bg-white/10 px-4 py-2 rounded-full text-white transition-colors"
              >
                Sign In
              </motion.button>
            </Link>
          )}
        </div>
      </div>
      
      {/* Mobile Navigation Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden overflow-hidden bg-[#001a4f]/90 backdrop-blur-md border-t border-white/10"
          >
            <nav className="py-2 px-4">
              {[
                { href: "/", label: "Home", icon: "🏠" },
                { href: "/aika", label: "Talk to Aika", icon: "💬" },
                { href: "/resources", label: "Resources", icon: "📚" },
                { href: "/about", label: "About Us", icon: "ℹ️" }
              ].map((link, i) => (
                <Link 
                  key={i}
                  href={link.href} 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center py-3 px-2 text-white hover:bg-white/10 rounded-lg transition-colors"
                >
                  <span className="mr-3">{link.icon}</span>
                  {link.label}
                </Link>
              ))}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}