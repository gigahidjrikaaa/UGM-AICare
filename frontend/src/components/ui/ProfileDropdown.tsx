// frontend/src/components/ui/ProfileDropdown.tsx
"use client";

import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import type { Session } from 'next-auth'; // Import Session type
import { FiLogOut, FiUser, FiSettings, FiHelpCircle, FiActivity } from "react-icons/fi"; // Add required icons
import { BsChatDots, BsCalendar } from 'react-icons/bs'; // Add required icons

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

          {/* Dropdown Menu Container */}
          <motion.div
            key="profile-menu"
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15, ease: "easeOut" }} // Faster transition
            className="absolute right-0 mt-2 w-64 bg-gradient-to-b from-[#0A2A6E]/95 to-[#001a4f]/95 backdrop-blur-lg rounded-lg shadow-xl border border-white/10 overflow-hidden z-40" // Ensure menu is above backdrop
            role="menu"
            aria-orientation="vertical"
            aria-labelledby="user-menu-button" // Assuming your button in Header has this id
          >
            {/* User Info Section */}
            <div className="p-4 border-b border-white/10 bg-white/5">
               <div className="flex items-center">
                  <div className="relative h-10 w-10 rounded-full overflow-hidden border border-[#FFCA40]/50 flex-shrink-0">
                    <Image
                      src={user.image || "/default-avatar.png"} // Use provided user image
                      alt={user.name || "User"}
                      fill
                      className="object-cover"
                      priority // Prioritize loading user image
                    />
                  </div>
                  <div className="ml-3 overflow-hidden">
                    <p className="text-white font-medium text-sm truncate">{user.name}</p>
                    <p className="text-white/70 text-xs truncate">{user.email}</p>
                  </div>
              </div>
            </div>

            {/* Menu Items */}
            <div className="py-1" role="none">
              {menuItems.map((item) => (
                 <Link
                    key={item.href}
                    href={item.href}
                    onClick={onClose} // Close dropdown on link click
                    className="flex items-center px-4 py-2.5 text-sm text-white/90 hover:bg-[#FFCA40]/10 hover:text-[#FFCA40] transition-colors"
                    role="menuitem"
                 >
                   {item.icon}
                   {item.label}
                 </Link>
              ))}
               <motion.button
                    onClick={onSignOut} // Use the onSignOut prop
                    whileHover={{ x: 2 }} // Subtle hover effect
                    whileTap={{ scale: 0.98 }}
                    className="flex items-center w-full text-left px-4 py-2.5 text-sm text-white/90 hover:bg-red-500/20 hover:text-red-200 transition-colors"
                    role="menuitem"
                >
                 <FiLogOut className="mr-2" />
                 Sign out
               </motion.button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}