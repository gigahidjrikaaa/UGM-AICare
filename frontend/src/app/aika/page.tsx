"use client";

import { useState, useEffect } from 'react';
import ChatInterface from '@/components/chat/ChatInterface';
import ParticleBackground from '@/components/ui/ParticleBackground';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { HiChevronLeft } from 'react-icons/hi';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import FeedbackForm from '@/components/FeedbackForm';

export default function AikaChat() {
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { status } = useSession();
  const router = useRouter();

  const handleFeedbackSuccess = () => {
    alert("Feedback submitted successfully!");
    setShowFeedbackModal(false);

  }
  
  useEffect(() => {
    setMounted(true);
    
    // Redirect if not authenticated and not loading
    if (status === "unauthenticated") {
      router.push('/signin');
    }
    
  }, [status, router]);

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

  if (!mounted) return null; // Prevents hydration errors

  return (
    <main className="h-screen w-screen overflow-hidden bg-gradient-to-br from-[#001d58]/95 via-[#0a2a6e]/95 to-[#173a7a]/95 text-white">
      {/* Particle Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-10">
        <ParticleBackground count={70} colors={["#FFCA40", "#6A98F0", "#ffffff"]} minSize={2} maxSize={8} speed={1} />
      </div>

      {/* Content area - Now passing user ID to chat interface */}
      <motion.div 
        className="pt-0 h-screen flex flex-col"
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

          {/* Main chat component */}
          <div className="flex-1 overflow-hidden bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 shadow-lg mb-4 mt-2 z-10">
            <ChatInterface />
          </div>

          {/* Feedback button */}
          <motion.button
            onClick={() => {
              setShowFeedbackModal(true);
            }}
            className="fixed bottom-4 right-4 bg-[#FFCA40] text-[#001D58] p-4 rounded-full shadow-lg hover:bg-[#FFCA40]/80 transition-colors"
            aria-label="Give Feedback"
          >
            <p className="text-sm font-semibold text-[#001D58]">Give Feedback</p>
          </motion.button>

            
          {/* Feedback Modal */}
          <AnimatePresence>
                  {showFeedbackModal && (
                       // Render the modal overlay and the form
                       <motion.div 
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50 p-4" 
                          onClick={() => setShowFeedbackModal(false)} // Close on backdrop click
                       >
                           {/* Stop propagation prevents closing modal when clicking inside form */}
                           <div onClick={(e) => e.stopPropagation()} className='w-full max-w-5xl rounded-lg'> 
                               <FeedbackForm 
                                  // No sessionId prop needed for general feedback
                                  onClose={() => setShowFeedbackModal(false)} 
                                  onSubmitSuccess={handleFeedbackSuccess}
                               />
                           </div>
                       </motion.div>
                  )}
              </AnimatePresence>

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