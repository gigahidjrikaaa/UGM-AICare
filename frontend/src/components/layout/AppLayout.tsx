// frontend/src/components/layout/AppLayout.tsx
"use client";

import React, { useState } from 'react';
import { useSession } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion'; // Import motion and AnimatePresence
import { toast } from 'react-hot-toast'; // Import toast
import Header from '@/components/ui/Header';
import AppSidebar from '@/components/ui/AppSidebar';
import Footer from '@/components/ui/Footer';
import FeedbackForm from '@/components/features/feedback/FeedBackForm';
import { cn } from '@/lib/utils'; // Import cn utility

interface AppLayoutProps {
  children: React.ReactNode;
}

// Simple Loading Component (optional, adjust styling as needed)
const AppLoadingIndicator = () => (
    <div className="min-h-screen bg-gradient-to-b from-[#001D58] to-[#00308F] flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center">
            <div className="h-12 w-12 rounded-full bg-white/20 mb-4"></div>
            <div className="h-4 w-40 bg-white/20 rounded mb-2"></div>
            <div className="h-3 w-24 bg-white/10 rounded"></div>
            <p className="text-white/50 text-sm mt-2">Loading...</p>
        </div>
    </div>
);

export default function AppLayout({ children }: AppLayoutProps) {
  const { status } = useSession();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false); // State for feedback modal

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  // Handler for successful feedback submission
  const handleFeedbackSuccess = () => {
    toast.success("Terima kasih atas feedback-nya!");
    setShowFeedbackModal(false);
  };


  // Determine if the sidebar should be rendered based on auth status
  const shouldRenderSidebar = status === 'authenticated';

  // Handle loading state
  if (status === "loading") {
    return <AppLoadingIndicator />;
  }

  return (
    // Use a relative container to position fixed elements relative to it if needed,
    // but for sidebar/feedback button, positioning relative to viewport is fine.
    <div className="flex h-screen overflow-hidden"> {/* Ensure h-screen here */}

      {/* Render Sidebar only if authenticated */}
      {shouldRenderSidebar && (
        // Ensure your AppSidebar handles its own visibility/animation based on isOpen
        // and uses appropriate z-index (e.g., z-40 or higher)
        <AppSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      )}

      {/* Main content area wrapper */}
      {/* Apply conditional blur and pointer-events here */}
      <div
        className={cn(
            "flex-1 flex flex-col overflow-x-hidden h-full transition-filter duration-300", // Use overflow-hidden on the wrapper
            isSidebarOpen ? "blur-sm pointer-events-none" : ""
        )}
        >
        {/* Header */}
        <Header onToggleSidebar={toggleSidebar}/>

        {/* Content area - allow scrolling */}
        <main className="flex-1 min-h-fit h-full overflow-hidden bg-gradient-to-br from-[#001d58]/95 via-[#0a2a6e]/95 to-[#173a7a]/95 relative z-10">
            {/* Particle Background can go here or in RootLayout */}
            {/* <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
                 <ParticleBackground ... />
             </div> */}
            {/* Render page content relatively positioned */}
            <div className="relative z-10">
                {children}
            </div>
        </main>

        {/* Footer */}
        <Footer />
      </div>

      {/* --- Global Feedback Button & Modal --- */}
      {/* Rendered outside the blurred container, visibility based on sidebar state */}
      <AnimatePresence>
          {isSidebarOpen && shouldRenderSidebar && ( // Show only if sidebar can be open (i.e., authenticated) and *is* open
              <motion.button
                  key="global-feedback-button"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.2 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowFeedbackModal(true)}
                  // Fixed position relative to viewport
                  className="fixed bottom-6 right-6 z-50 bg-ugm-gold text-ugm-blue-dark px-5 py-3 rounded-full shadow-lg hover:bg-opacity-90 transition-all font-semibold flex items-center space-x-2"
                  aria-label="Give Feedback"
              >
                  <span>Beri Feedback</span>
              </motion.button>
          )}
      </AnimatePresence>

      <AnimatePresence>
          {showFeedbackModal && (
              <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4" // High z-index for modal
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
      {/* --- End Feedback Button & Modal --- */}

    </div>
  );
}