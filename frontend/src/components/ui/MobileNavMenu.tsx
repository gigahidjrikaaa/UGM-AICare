// frontend/src/components/ui/MobileNavMenu.tsx
"use client";

import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { HiX } from 'react-icons/hi';
import { BsChatDots, BsCalendar, BsQuestionCircle } from 'react-icons/bs';
import { FiActivity, FiBookOpen, FiInfo } from 'react-icons/fi'; // Assuming FiInfo for About
import AccountLinker from '@/components/AccountLinker'; //

// Define props for the component
interface MobileNavMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

// Define navigation items (you can adjust these based on your actual needs)
const mobileNavItems = [
    { href: "/aika", label: "Talk to Aika", icon: <BsChatDots size={18} /> },
    { href: "/journaling", label: "Journaling", icon: <FiActivity size={18} /> }, // Assuming FiActivity for Journaling
    { href: "/appointments", label: "Appointments", icon: <BsCalendar size={18} /> },
    { href: "/resources", label: "Resources", icon: <FiBookOpen size={18} /> }, // Assuming FiBookOpen for Resources
    { href: "/about", label: "About Aika", icon: <FiInfo size={18} /> },
    { href: "/help", label: "Help & Support", icon: <BsQuestionCircle size={18} /> }
];


export default function MobileNavMenu({ isOpen, onClose }: MobileNavMenuProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop overlay for mobile - closes sidebar when clicked */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose} // Use the onClose prop
            className="md:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-40" // Ensure z-index allows interaction
            aria-hidden="true" // Hide from accessibility tree when closed conceptually
          />

          {/* Sidebar container */}
          <motion.div
            key="mobile-nav-menu" // Added key for AnimatePresence
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="md:hidden fixed top-0 left-0 bottom-0 z-50 w-[85%] max-w-[280px] bg-gradient-to-b from-[#001a4f]/95 to-[#00112e]/95 backdrop-blur-lg border-r border-white/10 shadow-xl flex flex-col"
            role="dialog" // Announce as dialog
            aria-modal="true" // Indicate it's modal
            aria-label="Main menu"
          >
            {/* Header within the sidebar */}
            <div className="flex justify-between items-center p-4 border-b border-white/10">
              <h2 className="text-lg font-semibold text-white">Menu</h2>
              <button
                onClick={onClose} // Use the onClose prop
                className="p-2 rounded-full text-gray-300 hover:bg-white/10 hover:text-white transition-colors"
                aria-label="Close menu"
              >
                <HiX size={24} />
              </button>
            </div>

            {/* Navigation Links */}
            <nav className="flex-1 p-4 overflow-y-auto">
              <ul className="space-y-1">
                {mobileNavItems.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onClose} // Close menu on link click
                      className="flex items-center px-3 py-3 rounded-lg text-white/90 hover:bg-[#FFCA40]/10 hover:text-[#FFCA40] transition-colors"
                    >
                      <span className="mr-3 flex-shrink-0">{item.icon}</span>
                      <span className="truncate">{item.label}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

             {/* Account Linker Section at the bottom */}
             <div className="p-4 border-t border-white/10 mt-auto">
                <AccountLinker />
             </div>

          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}