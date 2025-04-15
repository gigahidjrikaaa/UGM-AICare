// frontend/src/components/layout/AppHeader.tsx (Updated)
"use client";

import React from 'react';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import Image from 'next/image';
import { FiMenu, FiUser, FiLogOut, FiSettings, FiChevronDown } from 'react-icons/fi'; // Use appropriate icons
import { Menu, Transition } from '@headlessui/react'; // Using Headless UI for dropdown consistency
import { motion } from 'framer-motion';
import { Fragment } from 'react';

interface AppHeaderProps {
    toggleSidebar: () => void; // Function to toggle mobile sidebar
}

export default function AppHeader({ toggleSidebar }: AppHeaderProps) {
    const { data: session, status } = useSession();
    const user = session?.user; // Can be null if not authenticated

    const handleSignOut = async () => {
        await signOut({ callbackUrl: '/signin' }); // Redirect to signin after logout
    };

    return (
        // Using styling similar to your /aika header
        <header className="sticky top-0 left-0 right-0 z-20 bg-[#001D58]/80 backdrop-blur-md border-b border-white/10 shadow-md transition-all duration-300">
            <div className="flex items-center justify-between px-3 sm:px-4 py-2 h-16"> {/* Fixed height */}
                {/* Left Section: Mobile Toggle + Logo/Title */}
                <div className="flex items-center flex-shrink-0">
                    {/* Mobile Menu Button */}
                    <button
                        type="button"
                        className="p-2.5 text-gray-300 hover:text-white md:hidden mr-2" // Show only on mobile
                        onClick={toggleSidebar}
                        aria-label="Open sidebar"
                    >
                        <FiMenu className="h-6 w-6" aria-hidden="true" />
                    </button>

                    {/* Logo and Title */}
                    <Link href="/" className="flex items-center group flex-shrink-0">
                        <motion.div
                            initial={{ rotate: 0 }}
                            whileHover={{ rotate: 10, scale: 1.05 }}
                            transition={{ type: "spring", stiffness: 300 }}
                            className="flex-shrink-0"
                        >
                            <Image
                                src="/UGM_Lambang.png" // Make sure this path is correct from /public
                                alt="UGM Logo"
                                width={32}
                                height={32}
                                className="mr-2 sm:mr-3" // Always show logo if space permits
                                priority
                            />
                        </motion.div>
                        {/* Hide title text on very small screens if needed */}
                        <div className="hidden xs:block">
                            <h1 className="font-bold text-base sm:text-lg md:text-xl text-white">UGM-AICare</h1>
                            {/* Removed subtitle to save space, or keep if desired */}
                            {/* <p className="text-[#FFCA40] text-xs md:text-sm font-medium truncate max-w-[150px] sm:max-w-none">Aika - Your Mental Health Companion</p> */}
                        </div>
                    </Link>
                </div>

                {/* Right Section: User Profile Dropdown */}
                <div className="ml-auto">
                    {status === 'authenticated' && user ? (
                        <Menu as="div" className="relative">
                            {/* Button triggering the dropdown */}
                            <Menu.Button className="flex items-center space-x-1 sm:space-x-2 bg-white/10 hover:bg-white/15 rounded-full pl-1 pr-2 sm:pl-2 sm:pr-3 py-1 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-[#FFCA40]">
                                {/* User Avatar */}
                                <div className="w-8 h-8 rounded-full overflow-hidden bg-gradient-to-br from-[#FFCA40] to-[#ffb700] flex items-center justify-center text-[#001D58] text-sm font-bold shadow flex-shrink-0">
                                    {user.image ? (
                                        <Image
                                            src={user.image}
                                            alt={user.name || "User"}
                                            width={32} height={32}
                                            className="object-cover w-full h-full"
                                        />
                                    ) : ( user.name?.charAt(0).toUpperCase() || "U" )}
                                </div>
                                {/* User Name */}
                                <span className="hidden md:inline text-sm font-medium text-white truncate">
                                    {user.name?.split(' ')[0] || 'User'}
                                </span>
                                <FiChevronDown className="text-white/70 hidden md:inline" size={16}/>
                            </Menu.Button>

                            {/* Dropdown Panel */}
                            <Transition
                                as={Fragment}
                                enter="transition ease-out duration-100"
                                enterFrom="transform opacity-0 scale-95"
                                enterTo="transform opacity-100 scale-100"
                                leave="transition ease-in duration-75"
                                leaveFrom="transform opacity-100 scale-100"
                                leaveTo="transform opacity-0 scale-95"
                            >
                                <Menu.Items className="absolute right-0 mt-2 w-60 origin-top-right rounded-lg shadow-xl bg-gradient-to-b from-[#0A2A6E] to-[#001a4f] border border-white/10 focus:outline-none z-50">
                                    {/* User Info Header */}
                                    <div className="p-4 border-b border-white/10">
                                         <div className="flex items-center">
                                             {/* Avatar inside dropdown */}
                                             <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-[#FFCA40] to-[#ffb700] flex items-center justify-center text-[#001D58] text-lg font-bold shadow flex-shrink-0">
                                                 {user.image ? <Image src={user.image} alt={user.name || "User"} width={40} height={40} className="object-cover w-full h-full" /> : (user.name?.charAt(0).toUpperCase() || "U")}
                                             </div>
                                             <div className="ml-3 overflow-hidden">
                                                 <h3 className="font-medium text-sm text-white truncate">{user.name || 'User'}</h3>
                                                 <p className="text-xs text-gray-300 truncate">{user.email || 'No Email'}</p>
                                             </div>
                                         </div>
                                     </div>
                                     {/* Menu Links */}
                                     <div className="py-1">
                                         <Menu.Item>
                                            {({ active }) => ( <Link href="/profile" className={`${active ? 'bg-[#FFCA40]/10 text-[#FFCA40]' : 'text-white/90'} flex items-center px-4 py-2 text-sm transition-colors`}> <FiUser className="mr-2" aria-hidden="true"/> Your Profile </Link> )}
                                         </Menu.Item>
                                         <Menu.Item>
                                             {({ active }) => ( <Link href="/profile#settings" className={`${active ? 'bg-[#FFCA40]/10 text-[#FFCA40]' : 'text-white/90'} flex items-center px-4 py-2 text-sm transition-colors`}> <FiSettings className="mr-2" aria-hidden="true"/> Settings </Link> )}
                                         </Menu.Item>
                                         <Menu.Item>
                                             {({ active }) => ( <button onClick={handleSignOut} className={`${active ? 'bg-red-500/20 text-red-200' : 'text-white/90'} flex items-center w-full text-left px-4 py-2 text-sm transition-colors`}> <FiLogOut className="mr-2" aria-hidden="true"/> Sign out </button> )}
                                         </Menu.Item>
                                     </div>
                                </Menu.Items>
                            </Transition>
                        </Menu>
                    ) : status === 'loading' ? (
                         <div className="h-8 w-24 bg-white/10 rounded-full animate-pulse"></div>
                    ) : (
                        <Link href="/signin" className="text-sm font-medium text-white hover:text-[#FFCA40] px-3 py-1.5 bg-white/10 rounded-md">
                            Sign In
                        </Link>
                    )}
                </div>
            </div>
        </header>
    );
}