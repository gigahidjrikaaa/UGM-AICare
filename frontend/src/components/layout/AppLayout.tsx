// frontend/src/components/layout/AppLayout.tsx
"use client";

import React, { useState } from 'react';
import { useSession } from 'next-auth/react';
import Header from '@/components/ui/Header'; // The unified header
import AppSidebar from '@/components/ui/AppSidebar'; // The unified sidebar
import Footer from '@/components/ui/Footer'; // Your existing Footer

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const { status } = useSession(); // Get session status
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  // Determine if the sidebar should be rendered based on auth status
  const shouldRenderSidebar = status === 'authenticated';

  // Handle loading state globally here if preferred, or let pages handle it
   if (status === "loading") {
      // Consider a less intrusive loading state or rely on Suspense in RootLayout
     return (
         <div className="min-h-screen bg-gradient-to-b from-[#001D58] to-[#00308F] flex items-center justify-center">
             <div className="animate-pulse flex flex-col items-center">
                 <div className="h-12 w-12 rounded-full bg-white/20 mb-4"></div>
                 <div className="h-4 w-40 bg-white/20 rounded mb-2"></div>
                 <div className="h-3 w-24 bg-white/10 rounded"></div>
             </div>
         </div>
     );
   }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Render Sidebar only if authenticated */}
      {shouldRenderSidebar && (
        <AppSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      )}

      {/* Main content area */}
      <div className="flex-1 flex flex-col overflow-auto min-h-full">
        {/* Pass the toggle function to the Header */}
        {/* Header might be conditionally rendered too, or always present */}
        <Header onToggleSidebar={toggleSidebar} />

        {/* Content area - allow scrolling */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto min-h-fit bg-gradient-to-br from-[#001d58]/95 via-[#0a2a6e]/95 to-[#173a7a]/95">
          {/* Render page content */}
          {children}
        </main>

        {/* Footer (optional, depending on if you want it on pages with sidebar) */}
        <Footer />
      </div>
    </div>
  );
}