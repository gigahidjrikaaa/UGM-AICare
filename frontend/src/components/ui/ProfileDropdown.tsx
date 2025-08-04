// frontend/src/components/ui/ProfileDropdown.tsx
"use client";

import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import type { Session } from 'next-auth'; // Import Session type
import { 
  FiLogOut, 
  FiUser, 
  FiSettings, 
  FiHelpCircle, 
  FiActivity,
  BsChatDots, 
  BsCalendar 
} from "@/icons";

// Define props for the component
interface ProfileDropdownProps {
  isOpen: boolean;
  user: NonNullable<Session['user']>; // Ensure user is not null/undefined when passed
  onClose: () => void; // Function to close the dropdown (e.g., on backdrop click)
  onSignOut: () => void; // Function to handle sign out
}

export default function ProfileDropdown({ isOpen, user, onClose, onSignOut }: ProfileDropdownProps) {

  // Menu items configuration
  const menuItems = [
    { href: "/profile", label: "Profile", icon: <FiUser className="mr-2" /> },
    { href: "/aika", label: "Chat with Aika", icon: <BsChatDots className="mr-2" /> },
    { href: "/journaling", label: "Journaling", icon: <FiActivity className="mr-2" /> },
    { href: "/appointments", label: "Appointments", icon: <BsCalendar className="mr-2" /> },
    // Add other relevant links here
    { href: "/settings", label: "Settings", icon: <FiSettings className="mr-2" /> },
    { href: "/help", label: "Help Center", icon: <FiHelpCircle className="mr-2" /> },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop to close dropdown when clicked outside */}
          <motion.div
            key="profile-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-30" // Ensure backdrop is behind menu but covers page
            onClick={onClose} // Use the onClose prop here
            aria-hidden="true"
          />

          {/* Dropdown Menu Container - Enhanced iOS Glassmorphism */}
          <motion.div
            key="profile-menu"
            initial={{ opacity: 0, y: -15, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -15, scale: 0.9 }}
            transition={{ 
              duration: 0.25, 
              ease: [0.25, 0.46, 0.45, 0.94], // iOS-like easing
              scale: { duration: 0.2 }
            }}
            className="absolute right-0 mt-3 w-72 bg-white/10 backdrop-blur-2xl rounded-3xl shadow-2xl border border-white/20 overflow-hidden z-40"
            role="menu"
            aria-orientation="vertical"
            aria-labelledby="user-menu-button"
          >
            {/* User Info Section - Enhanced */}
            <div className="p-6 border-b border-white/10 bg-white/5">
               <div className="flex items-center">
                  <div className="relative h-12 w-12 rounded-2xl overflow-hidden border-2 border-[#FFCA40]/30 flex-shrink-0 shadow-lg">
                    <Image
                      src={user.image || "/default-avatar.png"}
                      alt={user.name || "User"}
                      fill
                      className="object-cover"
                      priority
                    />
                  </div>
                  <div className="ml-4 overflow-hidden">
                    <p className="text-white font-semibold text-base truncate">{user.name}</p>
                    <p className="text-white/60 text-sm truncate">{user.email}</p>
                    <div className="flex items-center mt-1">
                      <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                      <span className="text-green-300 text-xs font-medium">Online</span>
                    </div>
                  </div>
              </div>
            </div>

            {/* Menu Items - Enhanced with better spacing and hover effects */}
            <div className="py-2" role="none">
              {menuItems.map((item) => (
                 <motion.div key={item.href}>
                   <Link
                      href={item.href}
                      onClick={onClose}
                      className="flex items-center px-6 py-3 text-sm text-white/80 hover:text-white hover:bg-white/10 transition-all duration-200 group"
                      role="menuitem"
                   >
                     <motion.div 
                       className="text-white/60 group-hover:text-[#FFCA40] transition-colors duration-200"
                       whileHover={{ scale: 1.1 }}
                     >
                       {item.icon}
                     </motion.div>
                     <span className="font-medium">{item.label}</span>
                     <motion.div
                       className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                       initial={{ x: -10 }}
                       whileHover={{ x: 0 }}
                     >
                       <svg className="w-4 h-4 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                       </svg>
                     </motion.div>
                   </Link>
                 </motion.div>
              ))}
              
              {/* Divider */}
              <div className="mx-6 my-2 h-px bg-white/10"></div>
              
              {/* Sign Out Button - Enhanced */}
               <motion.button
                    onClick={onSignOut}
                    whileHover={{ backgroundColor: "rgba(239, 68, 68, 0.15)" }}
                    whileTap={{ scale: 0.98 }}
                    className="flex items-center w-full text-left px-6 py-3 text-sm text-white/80 hover:text-red-300 transition-all duration-200 group"
                    role="menuitem"
                >
                 <motion.div 
                   className="text-white/60 group-hover:text-red-400 transition-colors duration-200 mr-3"
                   whileHover={{ scale: 1.1 }}
                 >
                   <FiLogOut />
                 </motion.div>
                 <span className="font-medium">Sign out</span>
               </motion.button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}