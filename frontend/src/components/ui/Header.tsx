"use client";

import { useState } from "react";
import { useSession, signOut } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { FiChevronDown, FiLogOut, FiUser, FiSettings, FiHelpCircle } from "react-icons/fi";

export default function Header() {
  const { data: session, status } = useSession();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  
  const toggleProfile = () => {
    setIsProfileOpen(!isProfileOpen);
  };
  
  const handleSignOut = () => {
    signOut({ callbackUrl: "/" });
  };

  return (
    <header className="sticky top-0 z-50 bg-[#001D58]/90 backdrop-blur-md border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center">
          <Image 
            src="/UGM_Lambang.png" 
            alt="UGM Logo" 
            width={40} 
            height={40} 
            className="mr-3"
            priority
          />
          <span className="text-white text-xl font-bold">UGM-AICare</span>
        </Link>
        
        {/* Navigation Links - Add your main nav links here */}
        <nav className="hidden md:flex items-center space-x-6">
          <Link href="/" className="text-white/80 hover:text-white transition">
            Home
          </Link>
          <Link href="/aika" className="text-white/80 hover:text-white transition">
            Talk to Aika
          </Link>
          <Link href="/resources" className="text-white/80 hover:text-white transition">
            Resources
          </Link>
        </nav>
        
        {/* User Profile / Sign In */}
        <div className="flex items-center">
          {status === "authenticated" && session?.user ? (
            <div className="relative">
              <button 
                onClick={toggleProfile}
                className="flex items-center bg-white/10 hover:bg-white/20 rounded-full p-1 pr-3 transition"
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
                
                <FiChevronDown className="ml-1 text-white/70" />
              </button>
              
              {/* Dropdown Menu */}
              <AnimatePresence>
                {isProfileOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="absolute right-0 mt-2 w-60 bg-[#0A2A6E] rounded-lg shadow-xl border border-white/10 overflow-hidden"
                  >
                    {/* User Info Section */}
                    <div className="p-4 border-b border-white/10">
                      <p className="text-white font-medium">{session.user.name}</p>
                      <p className="text-white/70 text-sm truncate">{session.user.email}</p>
                    </div>
                    
                    {/* Menu Items */}
                    <div className="py-1">
                      <Link href="/profile" className="flex items-center px-4 py-2 text-white/90 hover:bg-[#173A7A] transition">
                        <FiUser className="mr-2" />
                        Profile
                      </Link>
                      <Link href="/settings" className="flex items-center px-4 py-2 text-white/90 hover:bg-[#173A7A] transition">
                        <FiSettings className="mr-2" />
                        Settings
                      </Link>
                      <Link href="/help" className="flex items-center px-4 py-2 text-white/90 hover:bg-[#173A7A] transition">
                        <FiHelpCircle className="mr-2" />
                        Help
                      </Link>
                      <button 
                        onClick={handleSignOut}
                        className="flex items-center w-full text-left px-4 py-2 text-white/90 hover:bg-[#173A7A] transition"
                      >
                        <FiLogOut className="mr-2" />
                        Sign out
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <Link 
              href="/signin" 
              className="bg-white/10 hover:bg-white/20 px-4 py-2 rounded-full text-white transition"
            >
              Sign In
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}