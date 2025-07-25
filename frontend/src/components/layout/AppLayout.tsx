// frontend/src/components/layout/AppLayout.tsx
"use client";

import React, { useState, useEffect } from 'react'; // Import useEffect
import { useSession } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import Header from '@/components/ui/Header';
import AppSidebar from '@/components/ui/AppSidebar';
import Footer from '@/components/ui/Footer';
import FeedbackForm from '@/components/features/feedback/FeedBackForm';
import { cn } from '@/lib/utils';

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
  const { data: session, status } = useSession();
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [isFeedbackOpen, setFeedbackOpen] = useState(false); // Add feedback modal state

  const toggleSidebar = () => {
    setSidebarOpen(!isSidebarOpen);
  };

  // This effect can be used to show a toast message on session status change
  useEffect(() => {
    if (status === 'authenticated' && session?.user) {
      // Example: toast.success(`Welcome back, ${session.user.name}!`);
      toast.success(`Welcome back, ${session.user.name}!`);
    }
  }, [status, session]);

  if (status === 'loading') {
    return <AppLoadingIndicator />;
  }

  return (
    // Use a relative container to position fixed elements relative to it if needed,
    // but for sidebar/feedback button, positioning relative to viewport is fine.
    <div className="flex h-screen overflow-hidden"> {/* Ensure h-screen here */}

      {/* Render Sidebar only if authenticated */}
      {status === 'authenticated' && (
        <AppSidebar isOpen={isSidebarOpen} onClose={() => setSidebarOpen(false)} />
      )}

      {/* Main content area wrapper */}
      {/* Apply conditional blur and pointer-events here */}
      <div
        className={cn(
            "flex-1 flex flex-col overflow-y-auto transition-filter duration-300", // Allow vertical scrolling
            isSidebarOpen ? "blur-sm pointer-events-none" : ""
        )}
        >
        {/* Header */}
        <Header onToggleSidebar={toggleSidebar}/>

        {/* Content area - allow scrolling with padding-top for fixed header */}
        <main className="flex-grow bg-gradient-to-br from-[#001d58]/95 via-[#0a2a6e]/95 to-[#173a7a]/95 relative z-10 pt-20">
            {/* Particle Background can go here or in RootLayout */}
            {/* <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
                 <ParticleBackground ... />
             </div> */}
            <div className="w-full h-full">
                {children}
            </div>
        </main>

        {/* Footer */}
        <Footer />
      </div>

      {/* Floating Feedback Button & Modal - Render only if authenticated */}
      {status === 'authenticated' && (
        <>
          {/* Floating Button to open Feedback Form */}
          {!isFeedbackOpen && (
            <button
              type="button"
              aria-label="Open feedback form"
              className="fixed bottom-5 right-5 z-50 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg p-4 focus:outline-none focus:ring-2 focus:ring-blue-400"
              onClick={() => setFeedbackOpen(true)}
            >
              {/* You can use an icon here */}
              <span className="sr-only">Open feedback form</span>
              📝
            </button>
          )}
          {/* Feedback Form Modal */}
          <AnimatePresence>
            {isFeedbackOpen && (
              <motion.div
                className="fixed bottom-5 right-5 z-50"
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 50 }}
              >
                <FeedbackForm
                  onClose={() => setFeedbackOpen(false)}
                  onSubmitSuccess={() => {
                    toast.success("Thank you for your feedback!");
                    setFeedbackOpen(false);
                  }}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </div>
  );
}