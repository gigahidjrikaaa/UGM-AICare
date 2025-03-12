"use client";

import { useState, useEffect } from 'react';
import ChatInterface from '@/components/chat/ChatInterface';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { HiMenu, HiX, HiChevronLeft } from 'react-icons/hi';
import { BsChatDots, BsCalendar, BsQuestionCircle, BsClockHistory } from 'react-icons/bs';
import { FaRobot, FaUserCircle } from 'react-icons/fa';

// Dummy user data (replace with actual auth data)
const user = {
  name: "Guest User",
  image: null,
  email: "guest@example.com"
};

// Floating animation for background elements
const FloatingElement = ({ children, delay = 0, duration = 10, x = 20, y = 20 }) => (
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
  
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null; // Prevents hydration errors

  return (
    <main className="h-screen w-screen overflow-hidden bg-gradient-to-br from-[#001d58]/95 via-[#0a2a6e]/95 to-[#173a7a]/95 text-white">
      {/* Background decorative elements */}
      <div className="fixed inset-0 overflow-hidden -z-10">
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

      {/* Header - Fixed at top */}
      <header className="fixed top-0 left-0 right-0 z-10 bg-[#001D58]/80 backdrop-blur-md border-b border-white/10 shadow-md">
        <div className="flex items-center justify-between px-4 py-2">
          <div className="flex items-center">
            <button 
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="mr-3 p-2 rounded-full hover:bg-white/10 transition-all"
              aria-label="Toggle sidebar"
            >
              {sidebarOpen ? <HiX size={24} /> : <HiMenu size={24} />}
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
                  width={40} 
                  height={40} 
                  className="mr-3" 
                />
              </motion.div>
              <div>
                <h1 className="font-bold text-lg md:text-xl">UGM-AICare</h1>
                <p className="text-[#FFCA40] text-xs md:text-sm font-medium">Aika - Your Mental Health Companion</p>
              </div>
            </Link>
          </div>
          
          <motion.div 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <div className="flex items-center bg-white/10 rounded-full px-3 py-1 hover:bg-white/20 transition cursor-pointer">
              <div className="w-7 h-7 bg-[#FFCA40]/20 rounded-full flex items-center justify-center mr-2">
                <FaUserCircle className="text-[#FFCA40]" size={20} />
              </div>
              <span className="text-sm">{user.name}</span>
            </div>
          </motion.div>
        </div>
      </header>

      {/* Sidebar - Fixed position, animated */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ x: -300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -300, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed top-16 left-0 bottom-0 z-20 w-64 bg-[#001a4f]/90 backdrop-blur-lg border-r border-white/10 shadow-xl"
          >
            {/* User Profile Section */}
            <div className="p-5 border-b border-white/10">
              <div className="flex items-center justify-center mb-4">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#FFCA40] to-[#ffb700] flex items-center justify-center text-[#001D58] text-3xl font-bold shadow-lg">
                  {user.name?.charAt(0) || "G"}
                </div>
              </div>
              <h3 className="text-center font-medium text-lg">{user.name}</h3>
              <p className="text-center text-sm text-gray-300">{user.email}</p>
              <div className="mt-3 text-center">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="text-sm px-3 py-1 bg-white/10 hover:bg-white/20 rounded-full"
                >
                  Edit Profile
                </motion.button>
              </div>
            </div>
            
            {/* Navigation Section */}
            <nav className="p-3">
              <ul className="space-y-1">
                {[
                  { icon: <BsChatDots />, label: "New Chat", active: true },
                  { icon: <BsClockHistory />, label: "Chat History" },
                  { icon: <BsCalendar />, label: "Appointments" },
                  { icon: <FaRobot />, label: "About Aika" },
                  { icon: <BsQuestionCircle />, label: "Help & Support" }
                ].map((item, index) => (
                  <li key={index}>
                    <motion.a
                      whileHover={{ x: 5 }}
                      className={`flex items-center px-4 py-3 rounded-lg ${
                        item.active ? "bg-[#FFCA40]/20 text-[#FFCA40]" : "hover:bg-white/10"
                      }`}
                      href="#"
                    >
                      <span className="mr-3">{item.icon}</span>
                      {item.label}
                    </motion.a>
                  </li>
                ))}
              </ul>
            </nav>
            
            {/* Footer Section */}
            <div className="absolute bottom-0 left-0 right-0 p-4 text-center text-xs text-gray-400 border-t border-white/10">
              <p>© 2025 UGM-AICare</p>
              <p>Department of Electrical and Information Engineering</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content area with Chat Interface - Adjusts based on sidebar state */}
      <motion.div 
        className="pt-16 h-screen flex flex-col"
        animate={{
          marginLeft: sidebarOpen ? "64px" : "0",
        }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      >
        {/* Chat container with backdrop blur and glass effect */}
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

          {/* Welcome elements that appear at the top of the chat */}
          <motion.div 
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="relative mb-4 flex justify-center"
          >
            <div className="absolute top-8 w-24 h-24 bg-[#FFCA40]/20 rounded-full blur-3xl"></div>
            <Image
              src="/aika-avatar.png" 
              alt="Aika" 
              width={100}
              height={100}
              className="object-contain z-10"
              onError={(e) => {
                e.currentTarget.src = "https://via.placeholder.com/100?text=Aika";
              }}
            />
          </motion.div>

          {/* Main chat component */}
          <div className="flex-1 overflow-hidden bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 shadow-lg mb-4">
            <ChatInterface />
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