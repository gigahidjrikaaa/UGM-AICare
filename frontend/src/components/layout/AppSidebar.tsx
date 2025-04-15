// frontend/src/components/layout/AppSidebar.tsx
"use client"; // Needs client-side hooks

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { mainNavItems } from '@/lib/navigationConfig'; // Import config
import AccountLinker from '@/components/AccountLinker'; // Assuming you want this here
import React from 'react';

interface AppSidebarProps {
    isOpen: boolean; // To control visibility on mobile
    toggleSidebar?: () => void; // Optional function to close sidebar on mobile link click
}

export default function AppSidebar({ isOpen, toggleSidebar }: AppSidebarProps) {
    const pathname = usePathname();

    const isActive = (href: string) => {
        // Handle exact match for dashboard or base paths, broader match otherwise
        if (href === '/aika' || href === '/journaling' || href === '/profile' || href === '/resources') {
             return pathname === href;
        }
        // Handle nested routes - highlight parent if on a sub-route
        return pathname.startsWith(href);
    };

    return (
        // Basic styling - adjust width, background, positioning as needed
        // Handle mobile vs desktop visibility via classes passed from layout or here
         <aside className={`fixed inset-y-0 left-0 z-30 w-64 bg-gradient-to-b from-[#001D58]/90 to-[#0a2a6e]/90 backdrop-blur-md border-r border-white/10 transform ${isOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform duration-300 ease-in-out md:translate-x-0 md:static md:inset-y-auto md:left-auto md:z-auto md:w-60 flex-shrink-0 overflow-y-auto flex flex-col`}>
            {/* Optional: Logo/Header for Sidebar */}
            <div className="p-4 h-16 flex items-center justify-center border-b border-white/10 flex-shrink-0">
                {/* Maybe simplified Logo here */}
                <span className="text-lg font-semibold text-white">UGM-AICare</span>
            </div>

            {/* Navigation */}
            <nav className="p-2 flex-grow overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
                <ul className="space-y-1">
                    {mainNavItems.map((item) => (
                        <li key={item.label}>
                            <Link
                                href={item.href}
                                onClick={toggleSidebar} // Close sidebar on mobile after click
                                className={`flex items-center px-4 py-3 rounded-lg text-sm font-medium ${
                                    isActive(item.href)
                                        ? 'bg-[#FFCA40]/20 text-[#FFCA40]'
                                        : 'text-gray-300 hover:bg-white/10 hover:text-white'
                                 } transition-colors`}
                            >
                                <span className="mr-3 flex-shrink-0">{React.createElement(item.icon)}</span>
                                <span className="truncate">{item.label}</span>
                            </Link>
                        </li>
                    ))}
                </ul>
            </nav>

            {/* Optional: Footer section - Account Linker or other items */}
            <div className="p-4 border-t border-white/10 flex-shrink-0">
               <AccountLinker />
               {/* Add other footer items like Logout if needed */}
            </div>
        </aside>
    );
}