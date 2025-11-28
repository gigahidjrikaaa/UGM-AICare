"use client";

import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import type { Session } from "next-auth";
import { FiUser, FiLogOut, FiSettings, FiHelpCircle, FiZap } from "react-icons/fi";

interface ProfileDropdownProps {
  isOpen: boolean;
  user: NonNullable<Session["user"]>;
  onClose: () => void;
  onSignOut: () => void;
  // Removed wellness prop as we simplified the dropdown
  wellness?: any;
}

export default function ProfileDropdown({ isOpen, user, onClose, onSignOut }: ProfileDropdownProps) {

  const menuItems = [
    {
      href: "/profile",
      label: "My Profile",
      icon: <FiUser className="w-4 h-4" />,
    },
    {
      href: "/quests",
      label: "Quest Board",
      icon: <FiZap className="w-4 h-4" />,
    },
    {
      href: "/settings", // Assuming a settings page exists or will exist
      label: "Settings",
      icon: <FiSettings className="w-4 h-4" />,
    },
    {
      href: "/help",
      label: "Help Center",
      icon: <FiHelpCircle className="w-4 h-4" />,
    },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="profile-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[1px]"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Dropdown Menu */}
          <motion.div
            key="profile-menu"
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="absolute top-full right-0 mt-2 w-72 origin-top-right rounded-2xl border border-white/10 bg-[#001D58]/95 backdrop-blur-xl shadow-2xl z-50 overflow-hidden"
          >
            {/* User Header */}
            <div className="p-4 border-b border-white/10 bg-white/5">
              <div className="flex items-center gap-3">
                <div className="relative w-10 h-10 rounded-full overflow-hidden border border-white/20">
                  <Image
                    src={user.image || "/default-avatar.png"}
                    alt={user.name || "User"}
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">
                    {user.name}
                  </p>
                  <p className="text-xs text-white/60 truncate">
                    {user.email}
                  </p>
                </div>
              </div>
            </div>

            {/* Menu Items */}
            <div className="p-2 space-y-1">
              {menuItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className="flex items-center gap-3 px-3 py-2.5 text-sm text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-colors duration-200 group"
                >
                  <span className="text-white/60 group-hover:text-[#FFCA40] transition-colors">
                    {item.icon}
                  </span>
                  {item.label}
                </Link>
              ))}
            </div>

            {/* Divider */}
            <div className="h-px bg-white/10 mx-2 my-1" />

            {/* Sign Out */}
            <div className="p-2">
              <button
                onClick={onSignOut}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-red-300 hover:text-red-200 hover:bg-red-500/10 rounded-xl transition-colors duration-200"
              >
                <FiLogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
