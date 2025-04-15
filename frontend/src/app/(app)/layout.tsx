// frontend/src/app/(app)/layout.tsx (Updated)
"use client";

import React, { useState } from 'react';
import AppSidebar from '@/components/layout/AppSidebar';
import AppHeader from '@/components/layout/AppHeader';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // State to control mobile sidebar visibility
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleSidebar = () => {
     setSidebarOpen(!sidebarOpen);
  }

  return (
    // Base container using flexbox
    <div className="flex h-screen overflow-hidden bg-gray-900">
       {/* Sidebar Component (handles its own desktop/mobile visibility internally now) */}
       <AppSidebar isOpen={sidebarOpen} toggleSidebar={toggleSidebar}/>

       {/* Main Content Area */}
       <div className="flex flex-col flex-1 overflow-hidden">
         {/* Header Component (passes toggle function) */}
         <AppHeader toggleSidebar={toggleSidebar} />

         {/* Scrollable main content */}
         <main className="flex-1 overflow-y-auto bg-gradient-to-br from-[#001d58]/80 via-[#0a2a6e]/80 to-[#173a7a]/80">
           {/* Pages will render here. Apply padding within page.tsx files if needed */}
           {children}
         </main>
       </div>

       {/* Mobile Overlay - Shown when mobile sidebar is open */}
       {sidebarOpen && (
            <div
                aria-hidden="true"
                className="fixed inset-0 bg-black/60 z-30 md:hidden" // Only shown on mobile, below sidebar (z-40)
                onClick={toggleSidebar} // Close sidebar when overlay is clicked
            ></div>
       )}
    </div>
  )
}