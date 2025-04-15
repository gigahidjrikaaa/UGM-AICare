// frontend/src/app/(app)/layout.tsx (New File)
"use client"; // Because we need state for sidebar toggle

import React, { useState } from 'react';
import AppSidebar from '@/components/layout/AppSidebar'; // Import shared sidebar
import AppHeader from '@/components/layout/AppHeader';   // Import shared header

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false); // State for mobile sidebar

  const toggleSidebar = () => {
     setSidebarOpen(!sidebarOpen);
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-900"> {/* Base background */}
       {/* Sidebar */}
       <AppSidebar isOpen={sidebarOpen} toggleSidebar={toggleSidebar}/>

       {/* Content Area */}
       <div className="flex flex-col flex-1 overflow-hidden">
         {/* Header */}
         <AppHeader toggleSidebar={toggleSidebar} />

         {/* Main Content - make it scrollable */}
         <main className="flex-1 overflow-y-auto bg-gradient-to-br from-[#001d58]/80 via-[#0a2a6e]/80 to-[#173a7a]/80">
           {/* Removed padding here, apply padding within individual pages */}
           {children}
         </main>
       </div>

       {/* Optional: Overlay for mobile when sidebar is open */}
       {sidebarOpen && (
            <div
                className="fixed inset-0 bg-black/50 z-20 md:hidden"
                onClick={toggleSidebar}
            ></div>
       )}
    </div>
  )
}