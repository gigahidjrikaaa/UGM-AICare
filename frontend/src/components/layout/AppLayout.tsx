// frontend/src/components/layout/AppLayout.tsx
"use client";

import React, { useState } from 'react';
import { useSession } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import Header from '@/components/ui/Header';
import AppSidebar from '@/components/ui/AppSidebar';
import Footer from '@/components/ui/Footer';
import FeedbackForm from '@/components/features/feedback/FeedBackForm';
import ParticleBackground from '@/components/ui/ParticleBackground';
import { cn } from '@/lib/utils';
import NoSsr from '@/components/layout/NoSsr';
import { useIsGrammarlyActive } from '@/hooks/useIsGrammarlyActive';

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
  const pathname = usePathname();
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [isFeedbackOpen, setFeedbackOpen] = useState(false); // Add feedback modal state
  const isGrammarlyActive = useIsGrammarlyActive();

  // Pages that don't need Footer (full-screen experiences like chat where footer would interfere)
  const fullScreenPages = ['/aika'];
  const isFullScreenPage = fullScreenPages.includes(pathname);

  const toggleSidebar = () => {
    setSidebarOpen(!isSidebarOpen);
  };

  

  if (status === 'loading' || isGrammarlyActive) {
    return <AppLoadingIndicator />;
  }

  return (
    // Use a relative container to position fixed elements relative to it if needed,
    // but for sidebar/feedback button, positioning relative to viewport is fine.
    <div className="flex h-screen overflow-hidden bg-gradient-to-br from-[#001d58] via-[#0a2a6e] to-[#173a7a]"> {/* Add gradient background */}

      {/* Particle Background - absolute positioned, behind everything */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <ParticleBackground />
      </div>

      {/* Render Sidebar only if authenticated */}
      {status === 'authenticated' && (
        <NoSsr>
          <AppSidebar isOpen={isSidebarOpen} onClose={() => setSidebarOpen(false)} />
        </NoSsr>
      )}

      {/* Main content area wrapper */}
      {/* Apply conditional blur and pointer-events here */}
      <div
        className={cn(
            "flex-1 flex flex-col overflow-hidden transition-filter duration-300 relative z-10", // Added z-10 to be above particles
            isSidebarOpen ? "blur-sm pointer-events-none" : ""
        )}
        >
        {/* Header */}
        <NoSsr>
          <Header onToggleSidebar={toggleSidebar}/>
        </NoSsr>

        {/* Content area with top padding for header */}
        <main className={cn(
          "flex-grow relative overflow-auto",
          // Add top padding for sticky header on standard pages, skip for full-screen pages
          !isFullScreenPage && "pt-16"
        )}>
            {children}
        </main>

        {/* Footer - Only show on non-full-screen pages */}
        {!isFullScreenPage && (
          <NoSsr>
            <Footer />
          </NoSsr>
        )}
      </div>

      {/* Floating Feedback Button & Modal - Render only if authenticated */}
      {status === 'authenticated' && (
        <NoSsr>
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
        </NoSsr>
      )}
    </div>
  );
}
