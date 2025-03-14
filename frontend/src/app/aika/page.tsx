"use client";

import { useState, useEffect, ReactNode } from 'react';
import ChatInterface from '@/components/chat/ChatInterface';
import ParticleBackground from '@/components/ui/ParticleBackground';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { HiMenu, HiX, HiChevronLeft, HiLogout } from 'react-icons/hi';
import { BsChatDots, BsCalendar, BsQuestionCircle, BsClockHistory } from 'react-icons/bs';
import { FaRobot, FaUserCircle } from 'react-icons/fa';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';

// Floating animation for background elements
const FloatingElement = ({ children, delay = 0, duration = 10, x = 20, y = 20 }: {
  children: ReactNode;
  delay?: number;
  duration?: number;
  x?: number;
  y?: number;
}) => (
  <motion.div
    animate={{
      y: [0, y, 0],
      x: [0, x, 0],
      opacity: [0.5, 0.8, 0.5],
    }}
    transition={{
      duration,
      repeat: Infinity,
      repeatType: "reverse",
      ease: "easeInOut",
      delay,
    }}
    className="absolute pointer-events-none"
  >
    {children}
  </motion.div>
);

export default function AikaChat() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { data: session, status } = useSession();
  const router = useRouter();

  // Get user from session or use guest fallback
  const user = session?.user || {
    name: "Guest User",
    image: null,
    email: "guest@example.com",
    id: "guest-user"
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
      
      {/* Background decorative elements */}
      <div className="fixed inset-0 overflow-hidden z-20 pointer-events-none">
        <div className="absolute inset-0 bg-[url('/wave-pattern.svg')] opacity-10"></div>
        
        <FloatingElement delay={0} duration={15} y={30} x={10}>
          <div className="w-40 h-40 rounded-full bg-[#FFCA40]/10 blur-3xl"></div>
        </FloatingElement>
        
        <FloatingElement delay={2} duration={18} y={-40} x={-20}>
          <div className="w-64 h-64 rounded-full bg-[#6A98F0]/10 blur-3xl"></div>
        </FloatingElement>
        
        <FloatingElement delay={4} duration={20} x={-30}>
          <div className="w-52 h-52 rounded-full bg-[#FFCA40]/5 blur-3xl"></div>
        </FloatingElement>
        
        <FloatingElement delay={5} duration={25} y={50}>
          <div className="w-72 h-72 rounded-full bg-[#4B6CB7]/10 blur-3xl"></div>
        </FloatingElement>
      </div>

      {/* Header - Fixed at top with conditional blur effect */}
      <header className={`fixed top-0 left-0 right-0 z-20 bg-[#001D58]${sidebarOpen ? '' : '/80 backdrop-blur-md'} border-b border-white/10 shadow-md transition-all duration-300`}>
        <div className="flex items-center justify-between px-3 sm:px-4 py-2">
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
                />
              </motion.div>
              <div>
                <h1 className="font-bold text-base sm:text-lg md:text-xl">UGM-AICare</h1>
                <p className="text-[#FFCA40] text-xs md:text-sm font-medium truncate max-w-[150px] sm:max-w-none">Aika - Your Mental Health Companion</p>
              </div>
            </Link>
          </div>
          
          {/* User profile dropdown - Now shows actual user data */}
          <motion.div 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="relative group"
          >
            <div className="flex items-center bg-white/10 rounded-full px-2 sm:px-3 py-1 hover:bg-white/20 transition cursor-pointer">
              <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center mr-1 sm:mr-2 overflow-hidden">
                {user.image ? (
                  <Image 
                    src={user.image} 
                    alt={user.name || "User"} 
                    width={28} 
                    height={28}
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-[#FFCA40]/20 flex items-center justify-center">
                    <FaUserCircle className="text-[#FFCA40]" size={18} />
                  </div>
                )}
              </div>
              <span className="text-xs sm:text-sm truncate max-w-[80px] sm:max-w-none">
                {user.name?.split(' ')[0] || "User"}
              </span>
            </div>
            
            {/* Dropdown menu */}
            <div className="absolute right-0 top-full mt-2 w-48 bg-[#001a4f] rounded-lg shadow-lg border border-white/10 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 transform origin-top-right">
              <div className="p-3 border-b border-white/10">
                <p className="text-sm font-medium">{user.name}</p>
                <p className="text-xs text-gray-300 truncate">{user.email}</p>
              </div>
              <div className="p-2">
                <button 
                  onClick={handleSignOut}
                  className="w-full text-left px-3 py-2 text-sm flex items-center rounded-md hover:bg-white/10 transition"
                >
                  <HiLogout className="mr-2" />
                  Sign Out
                </button>
              </div>
            </div>
          </motion.div>
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
              {/* User Profile Section - Now using session data */}
              <div className="p-4 border-b border-white/10">
                <div className="flex items-center">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full overflow-hidden bg-gradient-to-br from-[#FFCA40] to-[#ffb700] flex items-center justify-center text-[#001D58] text-xl sm:text-2xl font-bold shadow-lg">
                    {user.image ? (
                      <Image 
                        src={user.image} 
                        alt={user.name || "User"} 
                        width={64} 
                        height={64} 
                        className="object-cover w-full h-full"
                      />
                    ) : (
                      user.name?.charAt(0) || "G"
                    )}
                  </div>
                  <div className="ml-3">
                    <h3 className="font-medium text-base sm:text-lg">{user.name}</h3>
                    <p className="text-xs sm:text-sm text-gray-300 truncate max-w-[180px]">{user.email}</p>
                  </div>
                </div>
                <div className="mt-3 flex justify-between">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="text-xs sm:text-sm px-3 py-1 bg-white/10 hover:bg-white/20 rounded-full"
                  >
                    Edit Profile
                  </motion.button>
                  
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleSignOut}
                    className="text-xs sm:text-sm px-3 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-200 rounded-full flex items-center"
                  >
                    <HiLogout size={14} className="mr-1" />
                    Sign Out
                  </motion.button>
                </div>
              </div>
              
              {/* Navigation Section - Same as before */}
              <nav className="p-2 overflow-y-auto" style={{ maxHeight: 'calc(100% - 180px)' }}>
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
                        href="#"
                      >
                        <span className="mr-3 flex-shrink-0">{item.icon}</span>
                        <span className="truncate">{item.label}</span>
                      </motion.a>
                    </li>
                  ))}
                </ul>
              </nav>
              
              {/* Footer Section - Same as before */}
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