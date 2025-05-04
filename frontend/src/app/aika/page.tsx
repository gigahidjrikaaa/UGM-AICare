// src/app/aika/page.tsx
'use client';

import { useState, useEffect } from 'react';
import ChatInterface from '@/components/features/chat/ChatInterface';
import ParticleBackground from '@/components/ui/ParticleBackground'; // Assuming this exists
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import FeedbackForm from '@/components/features/feedback/FeedBackForm'; // Assume this exists
import { Toaster, toast } from 'react-hot-toast'; // Import toast here

// Loading Component (Keep as before)
const LoadingIndicator = () => (
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

export default function AikaChatPage() {
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { status } = useSession();
  const router = useRouter();

  const handleFeedbackSuccess = () => {
    toast.success("Terima kasih atas feedback-nya!");
    setShowFeedbackModal(false);
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && status === 'unauthenticated') {
      router.push('/signin');
    }
  }, [mounted, status, router]);

  if (!mounted || status === 'loading') {
    return <LoadingIndicator />;
  }

  if (status === 'unauthenticated') {
     return <LoadingIndicator />; // Keep showing loader until redirect happens
  }

  // --- Main Render (Authenticated) ---
  return (
    <>
      <Toaster position="top-center" reverseOrder={false} />
      <main className="h-screen w-screen overflow-hidden bg-gradient-to-br from-[#001d58] via-[#0a2a6e] to-[#173a7a] text-white"> {/* Solid gradient */}
        {/* Particle Background */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
          <ParticleBackground count={70} colors={["#FFCA40", "#6A98F0", "#ffffff"]} minSize={2} maxSize={8} speed={1} />
        </div>

        {/* Content area - Centered */}
        <motion.div
          className="relative z-10 h-screen flex flex-col items-center justify-center p-4 md:p-6 lg:p-8" // Center content vertically/horizontally
        >
          {/* Main chat container with Glassmorphism */}
          <div className="w-full max-w-5xl h-[90vh] flex flex-col bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 shadow-xl overflow-hidden">
             {/* Chat Interface takes remaining space */}
             <div className="flex-1 overflow-hidden"> {/* Important for ChatWindow's scrolling */}
                <ChatInterface />
             </div>
          </div>

          {/* Footer credit - Moved outside main container for centering */}
          <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="pt-3 text-center text-xs text-gray-300/70"
            >
              <p>Disclaimer: Aika adalah AI dan bukan pengganti profesional medis.</p>
              <p className="mt-1">Built with ❤️ by UGM AICare Team</p>
          </motion.div>

        </motion.div> {/* End centered content area */}


        {/* Feedback button - remains fixed */}
        <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowFeedbackModal(true)}
            className="fixed bottom-6 right-6 z-50 bg-ugm-gold text-ugm-blue-dark px-5 py-3 rounded-full shadow-lg hover:bg-opacity-90 transition-all font-semibold flex items-center space-x-2"
            aria-label="Give Feedback"
        >
           <span>Beri Feedback</span>
        </motion.button>

        {/* Feedback Modal (Keep as before) */}
        <AnimatePresence>
           {showFeedbackModal && (
               <motion.div
                 initial={{ opacity: 0 }}
                 animate={{ opacity: 1 }}
                 exit={{ opacity: 0 }}
                 className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4"
                 onClick={() => setShowFeedbackModal(false)}
               >
                   <motion.div
                     initial={{ scale: 0.9, opacity: 0 }}
                     animate={{ scale: 1, opacity: 1 }}
                     exit={{ scale: 0.9, opacity: 0 }}
                     transition={{ type: 'spring', damping: 15, stiffness: 200 }}
                     onClick={(e) => e.stopPropagation()}
                     className='w-full max-w-2xl rounded-lg bg-white text-gray-800 shadow-2xl overflow-hidden'
                   >
                        <FeedbackForm
                          onClose={() => setShowFeedbackModal(false)}
                          onSubmitSuccess={handleFeedbackSuccess}
                        />
                   </motion.div>
               </motion.div>
           )}
        </AnimatePresence>

      </main>
    </>
  );
}