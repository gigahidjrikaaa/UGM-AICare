// frontend/src/components/layout/AppHeader.tsx (New or Modified Header)
"use client";

import React from 'react';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import Image from 'next/image';
import { FiMenu, FiUser, FiLogOut } from 'react-icons/fi'; // Added FiMenu
import { Menu, Transition } from '@headlessui/react'; // Example using Headless UI for dropdown
import { Fragment } from 'react';

interface AppHeaderProps {
    toggleSidebar: () => void; // Function to toggle mobile sidebar
}

export default function AppHeader({ toggleSidebar }: AppHeaderProps) {
    const { data: session, status } = useSession();

    return (
        <header className="sticky top-0 z-10 flex h-16 flex-shrink-0 items-center justify-between border-b border-white/10 bg-[#001D58]/80 px-4 shadow-sm backdrop-blur-md sm:px-6 lg:px-8">
            {/* Mobile Menu Button */}
             <button
                 type="button"
                 className="p-2.5 text-gray-400 hover:text-white md:hidden" // Show only on mobile
                 onClick={toggleSidebar}
             >
                 <span className="sr-only">Open sidebar</span>
                 <FiMenu className="h-6 w-6" aria-hidden="true" />
             </button>

            {/* Optional: Spacer or Breadcrumbs on Desktop */}
            <div className="flex-1 hidden md:block">
                 {/* Can add breadcrumbs or page title here later */}
             </div>


            {/* User Profile Dropdown */}
            <div className="ml-auto">
                {status === 'authenticated' && session?.user ? (
                    <Menu as="div" className="relative">
                        <Menu.Button className="-m-1.5 flex items-center p-1.5">
                            <span className="sr-only">Open user menu</span>
                            <div className="relative h-8 w-8 rounded-full bg-gray-700 overflow-hidden">
                                 <Image
                                     src={session.user.image || '/default-avatar.png'}
                                     alt="User"
                                     fill
                                     className="object-cover"
                                 />
                             </div>
                            <span className="hidden lg:flex lg:items-center">
                                <span className="ml-3 text-sm font-semibold leading-6 text-white" aria-hidden="true">
                                     {session.user.name || 'User'}
                                 </span>
                                {/* <FiChevronDown className="ml-2 h-5 w-5 text-gray-400" aria-hidden="true" /> */}
                            </span>
                        </Menu.Button>
                        <Transition
                            as={Fragment}
                            enter="transition ease-out duration-100"
                            enterFrom="transform opacity-0 scale-95"
                            enterTo="transform opacity-100 scale-100"
                            leave="transition ease-in duration-75"
                            leaveFrom="transform opacity-100 scale-100"
                            leaveTo="transform opacity-0 scale-95"
                        >
                            <Menu.Items className="absolute right-0 z-10 mt-2.5 w-48 origin-top-right rounded-md bg-gray-800 py-2 shadow-lg ring-1 ring-gray-700 focus:outline-none">
                                <Menu.Item>
                                    {({ active }) => (
                                        <Link
                                            href="/profile"
                                            className={`${active ? 'bg-gray-700' : ''} flex items-center px-3 py-2 text-sm leading-6 text-white w-full`}
                                        >
                                            <FiUser className="mr-2" /> Your Profile
                                        </Link>
                                    )}
                                </Menu.Item>
                                {/* Add Settings link if needed */}
                                {/* <Menu.Item>...</Menu.Item> */}
                                 <Menu.Item>
                                    {({ active }) => (
                                        <button
                                            onClick={() => signOut({ callbackUrl: '/signin' })}
                                            className={`${active ? 'bg-gray-700' : ''} flex items-center px-3 py-2 text-sm leading-6 text-white w-full`}
                                        >
                                             <FiLogOut className="mr-2" /> Sign out
                                         </button>
                                    )}
                                </Menu.Item>
                            </Menu.Items>
                        </Transition>
                    </Menu>
                ) : (
                     // Optional: Show login button if not authenticated (though layout might protect)
                     <Link href="/signin" className="text-sm font-medium text-white hover:text-[#FFCA40]">Sign In</Link>
                 )}
            </div>
        </header>
    );
}