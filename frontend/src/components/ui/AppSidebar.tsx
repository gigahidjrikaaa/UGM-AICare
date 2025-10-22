// frontend/src/components/ui/AppSidebar.tsx
"use client";

import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  BsChatDots, 
  BsCalendar, 
  BsQuestionCircle,
  FiActivity, 
  FiUsers, 
  FiPieChart, 
  FiSettings, 
  FiBookOpen, 
  FiUser,
  FiGrid,
  HiX
} from '@/icons';
import AccountLinker from '@/components/AccountLinker';

// Interface for navigation items, adding optional admin flag
interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  adminOnly?: boolean; // Flag for admin-specific links
}

// Define Navigation Items (Combine user and admin, mark admin ones)
const sidebarNavItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: <FiGrid size={18} /> },
  { href: "/aika", label: "Talk to Aika", icon: <BsChatDots size={18} /> },
  { href: "/journaling", label: "Journaling", icon: <FiActivity size={18} /> },
  { href: "/appointments", label: "Appointments", icon: <BsCalendar size={18} /> },
  { href: "/profile", label: "Profile", icon: <FiUser size={18} /> },
  { href: "/resources", label: "Resources", icon: <FiBookOpen size={18} /> },
  // --- Admin Specific Links ---
  { href: "/admin/dashboard", label: "Admin Dashboard", icon: <FiPieChart size={18} />, adminOnly: true },
  { href: "/admin/users", label: "Manage Users", icon: <FiUsers size={18} />, adminOnly: true }, // Example admin link
  { href: "/admin/settings", label: "Admin Settings", icon: <FiSettings size={18} />, adminOnly: true }, // Example admin link
  // --- General Links ---
  { href: "/help", label: "Help & Support", icon: <BsQuestionCircle size={18} /> }
];


interface AppSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenFeedback?: () => void; // Add feedback handler
}

export default function AppSidebar({ isOpen, onClose, onOpenFeedback }: AppSidebarProps) {
  const pathname = usePathname();
  const { data: session } = useSession(); // Get session to check role
  const isAdmin = session?.user?.role === 'admin';

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop for closing */}
          <motion.div
            key="sidebar-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[80]" // z-80 is below sidebar (z-90)
            aria-hidden="true"
          />

          {/* Sidebar */}
          <motion.div
            key="app-sidebar"
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            // --- CHANGE HERE: Use 'fixed' positioning, remove lg:sticky ---
            className="fixed top-0 left-0 bottom-0 z-[90] w-[85%] max-w-[280px] bg-gradient-to-b from-[#001a4f]/95 to-[#00112e]/95 backdrop-blur-xl border-r border-white/10 shadow-xl flex flex-col"
            // --- No more lg:sticky, lg:translate-x-0, etc. ---
            role="navigation"
            aria-label="Main navigation"
          >
            {/* Sidebar Header (with Close button for mobile) */}
            <div className="flex justify-between items-center p-4 border-b border-white/10">
              <h2 className="text-lg font-semibold text-white">Menu</h2>
              <button
                onClick={onClose}
                className="p-2 rounded-full text-gray-300 hover:bg-white/10 hover:text-white transition-colors"
                aria-label="Close menu"
              >
                <HiX size={24} />
              </button>
            </div>

            {/* Navigation Links */}
            <nav className="flex-1 p-4 overflow-y-auto">
              <ul className="space-y-1">
                {sidebarNavItems.map((item) => {
                  // Skip admin links if user is not admin
                  if (item.adminOnly && !isAdmin) {
                    return null;
                  }

                  const isActive = pathname === item.href;

                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={onClose} // Close on mobile after click
                        className={`flex items-center px-3 py-3 rounded-lg transition-colors duration-150 ${
                          isActive
                            ? 'bg-[#FFCA40]/20 text-[#FFCA40] font-medium'
                            : 'text-white/80 hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        <span className="mr-3 flex-shrink-0 w-5">{item.icon}</span>
                        <span className="truncate">{item.label}</span>
                        {item.adminOnly && ( // Optional: Visual indicator for admin links
                           <span className="ml-auto text-[10px] uppercase bg-blue-500/30 text-blue-300 px-1.5 py-0.5 rounded">Admin</span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>

            {/* Feedback Button - Visually Appealing */}
            {onOpenFeedback && (
              <div className="px-4 pb-3">
                <motion.button
                  onClick={() => {
                    onOpenFeedback();
                    onClose(); // Close sidebar when opening feedback
                  }}
                  className="w-full relative overflow-hidden group"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {/* Gradient Background with Animation */}
                  <div className="absolute inset-0 bg-gradient-to-r from-[#FFCA40] via-[#FFE08C] to-[#FFCA40] bg-[length:200%_100%] [background-position:0%_50%] group-hover:animate-shimmer" />
                  
                  {/* Button Content */}
                  <div className="relative flex items-center justify-center gap-3 px-4 py-3 rounded-lg">
                    {/* Icon with pulse animation */}
                    <motion.span
                      className="text-2xl"
                      animate={{ 
                        scale: [1, 1.2, 1],
                      }}
                      transition={{ 
                        repeat: Infinity, 
                        duration: 2,
                        ease: "easeInOut"
                      }}
                    >
                      💬
                    </motion.span>
                    
                    {/* Text */}
                    <div className="flex flex-col items-start">
                      <span className="text-[#001D58] font-semibold text-sm">
                        Share Feedback
                      </span>
                      <span className="text-[#001D58]/70 text-xs">
                        Help us improve
                      </span>
                    </div>
                    
                    {/* Arrow Icon */}
                    <motion.span 
                      className="ml-auto text-[#001D58]"
                      initial={{ x: 0 }}
                      whileHover={{ x: 3 }}
                      transition={{ duration: 0.2 }}
                    >
                      →
                    </motion.span>
                  </div>
                  
                  {/* Shine effect overlay */}
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                    initial={{ x: '-100%' }}
                    animate={{ x: '200%' }}
                    transition={{
                      repeat: Infinity,
                      duration: 3,
                      ease: "linear",
                      repeatDelay: 2
                    }}
                  />
                </motion.button>
              </div>
            )}

            {/* Account Linker (optional, place where needed) */}
            <div className="p-4 border-t border-white/10 mt-auto">
              <AccountLinker />
            </div>

          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}