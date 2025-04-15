// frontend/src/components/layout/AppSidebar.tsx (Updated with Animation/Style)
"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion'; // Import motion and AnimatePresence
import { mainNavItems } from '@/lib/navigationConfig';
import AccountLinker from '@/components/AccountLinker';

interface AppSidebarProps {
    isOpen: boolean;
    toggleSidebar: () => void; // Need this to close on mobile link click
}

export default function AppSidebar({ isOpen, toggleSidebar }: AppSidebarProps) {
    const pathname = usePathname();

    const isActive = (href: string) => {
        // Basic active state logic (adjust if needed for nested routes)
        return pathname === href || (href !== "/" && pathname.startsWith(href));
    };

    const sidebarVariants = {
        open: { x: 0 },
        closed: { x: "-100%" }
    };

    const transition = { type: "spring", stiffness: 300, damping: 30 };

    return (
        <>
            {/* Static Sidebar for Medium+ Screens */}
            <aside className="hidden md:flex md:flex-col md:w-60 md:flex-shrink-0 bg-gradient-to-b from-[#001D58]/90 to-[#0a2a6e]/90 border-r border-white/10">
                {/* Sidebar Header (Optional) */}
                <div className="p-4 h-16 flex items-center justify-center border-b border-white/10 flex-shrink-0">
                    <span className="text-lg font-semibold text-white">Navigation</span>
                </div>
                {/* Navigation */}
                <nav className="p-2 flex-grow overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
                    <ul className="space-y-1">
                        {mainNavItems.map((item) => (
                                <Link key={item.href} href={item.href} className={`flex items-center px-4 py-3 rounded-lg text-sm font-medium ${ isActive(item.href) ? 'bg-[#FFCA40]/20 text-[#FFCA40]' : 'text-gray-300 hover:bg-white/10 hover:text-white'} transition-colors`} >
                                    <span className="mr-3 flex-shrink-0">{item.icon && React.createElement(item.icon)}</span>
                                    <span className="truncate">{item.label}</span>
                                </Link>
                        ))}
                    </ul>
                </nav>
                {/* Footer Account Linker */}
                 <div className="p-4 border-t border-white/10 flex-shrink-0">
                    <AccountLinker />
                 </div>
            </aside>

            {/* Animated Sidebar for Mobile (Overlay) */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        key="mobile-sidebar"
                        variants={sidebarVariants}
                        initial="closed"
                        animate="open"
                        exit="closed"
                        transition={transition}
                        className="fixed inset-y-0 left-0 z-40 w-[85%] max-w-[280px] bg-gradient-to-b from-[#001D58]/95 to-[#0a2a6e]/95 backdrop-blur-lg border-r border-white/10 shadow-xl flex flex-col md:hidden" // Hide on medium+ screens
                        aria-modal="true"
                     >
                         {/* Sidebar Header (Optional on mobile too) */}
                         <div className="p-4 h-16 flex items-center justify-center border-b border-white/10 flex-shrink-0">
                             <span className="text-lg font-semibold text-white">Navigation</span>
                         </div>
                         {/* Navigation */}
                         <nav className="p-2 flex-grow overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
                             <ul className="space-y-1">
                                 {mainNavItems.map((item) => (
                                         <Link key={item.href} href={item.href} onClick={toggleSidebar} className={`flex items-center px-4 py-3 rounded-lg text-sm font-medium ${isActive(item.href) ? 'bg-[#FFCA40]/20 text-[#FFCA40]' : 'text-gray-300 hover:bg-white/10 hover:text-white'} transition-colors`} >
                                             <span className="mr-3 flex-shrink-0">{item.icon && React.createElement(item.icon)}</span>
                                             <span className="truncate">{item.label}</span>
                                         </Link>
                                 ))}
                             </ul>
                         </nav>
                         {/* Footer Account Linker */}
                          <div className="p-4 border-t border-white/10 flex-shrink-0">
                             <AccountLinker />
                          </div>
                     </motion.div>
                 )}
             </AnimatePresence>
         </>
     );
 }