"use client";

import { useState, useEffect } from 'react';
import ChatInterface from '@/components/chat/ChatInterface';
import ParticleBackground from '@/components/ui/ParticleBackground';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { HiMenu, HiX, HiChevronLeft, HiLogout, HiChevronDown } from 'react-icons/hi';
import { BsChatDots, BsCalendar, BsQuestionCircle, BsClockHistory } from 'react-icons/bs';
import { FaRobot } from 'react-icons/fa';
import { FiUser, FiSettings } from "react-icons/fi";
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function AikaChat() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { data: session, status } = useSession();
  const router = useRouter();

  // Get user from session or use guest fallback
  const user = session?.user || {
    name: "Guest User",
    image: null,
    email: "guest@example.com",
    id: "guest-user",
    role: "user"
  };
  
  useEffect(() => {
    setMounted(true);
    
    // Redirect if not authenticated and not loading
    if (status === "unauthenticated") {
      router.push('/signin');
    }
    
  }, [status, router]);

  // Log user ID and full user object
  // useEffect(() => {
  //   if (session?.user) {
  //     console.log("User ID:", session.user.id);
  //     console.log("Full user object:", session.user);
  //   }
  // }, [session]);

  // While checking authentication status
  if (!mounted || status === "loading") {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-gradient-to-br from-[#001d58]/95 via-[#0a2a6e]/95 to-[#173a7a]/95 text-white">
        <div className="text-center">
          <div className="inline-block w-16 h-16 relative">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[#FFCA40]"></div>
            <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center">
              <Image src="/UGM_Lambang.png" alt="UGM" width={32} height={32} />
            </div>
          </div>
          <p className="mt-4 text-lg">Loading Aika...</p>
        </div>
      </div>
    );
  }

  // Handle sign out
  const handleSignOut = async () => {
    await signOut({ callbackUrl: '/' });
  };

  if (!mounted) return null; // Prevents hydration errors

  return (
    <main className="h-screen w-screen overflow-hidden bg-gradient-to-br from-[#001d58]/95 via-[#0a2a6e]/95 to-[#173a7a]/95 text-white">
      {/* Particle Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-10">
        <ParticleBackground count={70} colors={["#FFCA40", "#6A98F0", "#ffffff"]} minSize={2} maxSize={8} speed={1} />
      </div>

      {/* Header - Fixed at top with conditional blur effect */}
      <header className={`fixed top-0 left-0 right-0 z-20 bg-[#001D58]${sidebarOpen ? '' : '/80 backdrop-blur-md'} border-b border-white/10 shadow-md transition-all duration-300`}>
        <div className="flex items-center justify-between px-3 sm:px-4 py-2">
          {/* Left Section with Sidebar Toggle and Logo */}
          <div className="flex items-center">
            <button 
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="mr-2 sm:mr-3 p-2 rounded-full hover:bg-white/10 transition-all"
              aria-label="Toggle sidebar"
            >
              {sidebarOpen ? <HiX size={20} /> : <HiMenu size={20} />}
            </button>
            
            <Link href="/" className="flex items-center group">
              <motion.div
                initial={{ rotate: 0 }}
                whileHover={{ rotate: 10, scale: 1.05 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <Image 
                  src="/UGM_Lambang.png" 
                  alt="UGM Logo" 
                  width={32} 
                  height={32} 
                  className="mr-2 sm:mr-3 hidden xs:block" 
                  priority
                />
              </motion.div>
              <div>
                <h1 className="font-bold text-base sm:text-lg md:text-xl">UGM-AICare</h1>
                <p className="text-[#FFCA40] text-xs md:text-sm font-medium truncate max-w-[150px] sm:max-w-none">Aika - Your Mental Health Companion</p>
              </div>
            </Link>
          </div>
          
          {/* Right Section with User Profile */}
          <div className="relative">
            {/* User Profile Dropdown Button */}
            <motion.button
              onClick={() => setProfileOpen(!profileOpen)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center space-x-1 sm:space-x-2 bg-white/10 hover:bg-white/15 rounded-full pl-2 pr-3 py-1 transition-colors"
            >
              {/* User Avatar */}
              <div className="w-8 h-8 rounded-full overflow-hidden bg-gradient-to-br from-[#FFCA40] to-[#ffb700] flex items-center justify-center text-[#001D58] text-sm font-bold shadow">
                {user.image ? (
                  <Image 
                    src={user.image} 
                    alt={user.name || "User"} 
                    width={32} 
                    height={32} 
                    className="object-cover w-full h-full"
                  />
                ) : (
                  user.name?.charAt(0) || "G"
                )}
              </div>
              
              {/* User Name - Hide on small screens */}
              <span className="hidden sm:inline text-sm font-medium">
                {user.name?.split(' ')[0] || "User"}
              </span>
              
              <HiChevronDown className="text-white/70" />
            </motion.button>
            
            {/* Profile Dropdown */}
            <AnimatePresence>
              {profileOpen && (
                <>
                  {/* Backdrop to close dropdown when clicked outside */}
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-30" 
                    onClick={() => setProfileOpen(false)}
                  />
                  
                  {/* Dropdown Menu */}
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className="absolute right-0 mt-2 w-64 bg-gradient-to-b from-[#0A2A6E] to-[#001a4f] rounded-lg shadow-xl border border-white/10 overflow-hidden z-40"
                  >
                    {/* User Info Section */}
                    <div className="p-4 border-b border-white/10 bg-white/5">
                      <div className="flex items-center">
                        <div className="w-12 h-12 rounded-full overflow-hidden bg-gradient-to-br from-[#FFCA40] to-[#ffb700] flex items-center justify-center text-[#001D58] text-xl font-bold shadow">
                          {user.image ? (
                            <Image 
                              src={user.image} 
                              alt={user.name || "User"} 
                              width={48} 
                              height={48} 
                              className="object-cover w-full h-full"
                            />
                          ) : (
                            user.name?.charAt(0) || "G"
                          )}
                        </div>
                        <div className="ml-3">
                          <h3 className="font-medium text-base">{user.name}</h3>
                          <p className="text-xs text-gray-300 truncate">{user.email}</p>
                        </div>
                      </div>
                    </div>
                    
                    {/* Menu Items */}
                    <div className="py-1">
                      <Link href="/profile" className="flex items-center px-4 py-2 text-white/90 hover:bg-[#FFCA40]/10 hover:text-[#FFCA40] transition-colors">
                        <FiUser className="mr-2" />
                        Edit Profile
                      </Link>
                      <Link href="/settings" className="flex items-center px-4 py-2 text-white/90 hover:bg-[#FFCA40]/10 hover:text-[#FFCA40] transition-colors">
                        <FiSettings className="mr-2" />
                        Settings
                      </Link>
                      <button 
                        onClick={handleSignOut}
                        className="flex items-center w-full text-left px-4 py-2 text-white/90 hover:bg-red-500/20 hover:text-red-200 transition-colors"
                      >
                        <HiLogout className="mr-2" />
                        Sign out
                      </button>
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      {/* Sidebar - Updated with user information from session */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            {/* Backdrop overlay for mobile - closes sidebar when clicked */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
              className="md:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-10"
            />
            
            {/* Improved responsive sidebar */}
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="fixed top-16 left-0 bottom-0 z-20 w-[85%] max-w-[280px] bg-[#001a4f]/90 backdrop-blur-lg border-r border-white/10 shadow-xl"
            >
              {/* Navigation Section - directly at the top now */}
              <nav className="p-2 overflow-y-auto" style={{ maxHeight: 'calc(100% - 60px)' }}>
                <ul className="space-y-1">
                  {[
                    { icon: <BsChatDots size={18} />, label: "New Chat", active: true },
                    { icon: <BsClockHistory size={18} />, label: "Chat History" },
                    { icon: <BsCalendar size={18} />, label: "Appointments" },
                    { icon: <FaRobot size={18} />, label: "About Aika" },
                    { icon: <BsQuestionCircle size={18} />, label: "Help & Support" }
                  ].map((item, index) => (
                    <li key={index}>
                      <motion.a
                        whileHover={{ x: 5 }}
                        className={`flex items-center px-4 py-3 rounded-lg ${
                          item.active ? "bg-[#FFCA40]/20 text-[#FFCA40]" : "hover:bg-white/10"
                        } transition-colors`}
                        href={`/${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                      >
                        <span className="mr-3 flex-shrink-0">{item.icon}</span>
                        <span className="truncate">{item.label}</span>
                      </motion.a>
                    </li>
                  ))}
                </ul>
              </nav>
              
              {/* Footer Section */}
              <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-4 text-center text-xs text-gray-400 border-t border-white/10 bg-[#001a4f]/80 backdrop-blur-sm">
                <p>© 2025 UGM-AICare</p>
                <p className="hidden sm:block">Department of Electrical and Information Engineering</p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Content area - Now passing user ID to chat interface */}
      <motion.div 
        className="pt-16 h-screen flex flex-col"
        animate={{
          marginLeft: sidebarOpen ? "64px" : "0",
        }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      >
        {/* Chat container */}
        <div className="flex-1 mx-auto w-full max-w-5xl px-4 flex flex-col">
          {/* Mobile sidebar toggle for small screens */}
          {sidebarOpen && (
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
              className="md:hidden fixed z-30 bottom-4 left-6 p-3 bg-[#FFCA40] text-[#001D58] rounded-full shadow-lg"
            >
              <HiChevronLeft size={24} />
            </motion.button>
          )}

          {/* Welcome elements */}
          <motion.div 
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="relative mb-4 flex justify-center"
          >
            <div className="absolute top-8 w-24 h-24 bg-[#FFCA40]/20 rounded-full blur-3xl"></div>
            
          </motion.div>

          {/* Main chat component - Now with user ID */}
          <div className="flex-1 overflow-hidden bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 shadow-lg mb-4 mt-2 z-10">
            <ChatInterface userId={user.id ?? user.email ?? undefined} />
          </div>

          {/* Footer credit */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="py-3 text-center text-xs text-gray-300/70"
          >
            <p>Built with ❤️ by UGM AICare Team</p>
          </motion.div>
        </div>
      </motion.div>
    </main>
  );
}