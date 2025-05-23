"use client";

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { FiSearch, FiBell, FiMenu, FiChevronDown, FiLogOut, FiUser, FiSettings, FiPieChart, FiCalendar, FiUsers } from 'react-icons/fi';
import { Popover, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { usePathname } from 'next/navigation';

// Admin navigation items for mobile tabs (can be same as sidebar or a subset)
const mobileNavItems = [
  { name: 'Dashboard', icon: <FiPieChart size={18}/>, href: '/admin/dashboard' },
  { name: 'Appointments', icon: <FiCalendar size={18}/>, href: '/admin/appointments' },
  { name: 'Users', icon: <FiUsers size={18}/>, href: '/admin/users' },
  { name: 'Settings', icon: <FiSettings size={18}/>, href: '/admin/settings' },
];

export default function AdminHeader() {
  const { data: session } = useSession();
  const [searchQuery, setSearchQuery] = useState('');
  const pathname = usePathname();
  // Add state for mobile sidebar toggle if you implement a drawer sidebar for mobile

  return (
    <header className="bg-[#000c24]/80 backdrop-blur-md border-b border-white/10 sticky top-0 z-30">
      <div className="flex items-center justify-between h-16 px-4 md:px-6">
        {/* Left side: Mobile Menu Toggle & Search (optional) */}
        <div className="flex items-center">
          {/* Placeholder for a mobile menu toggle button if needed */}
          <button className="mr-3 p-2 rounded-lg hover:bg-white/10 md:hidden" aria-label="Toggle mobile menu">
            <FiMenu className="text-white" size={20} />
          </button>
          <div className="hidden md:flex items-center bg-white/10 rounded-lg px-3 py-1.5 flex-1 max-w-xs">
            <FiSearch className="text-gray-400 mr-2" />
            <input 
              type="text" 
              placeholder="Search..." 
              className="bg-transparent border-none outline-none text-white placeholder-gray-400 text-sm w-full"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        
        {/* Right side - Notifications & Profile Dropdown */}
        <div className="flex items-center space-x-3 md:space-x-5">
          <button className="relative p-2 rounded-full hover:bg-white/10 transition-colors" aria-label="Notifications">
            <FiBell className="text-white" size={20} />
            {/* Example notification badge */}
            <span className="absolute top-1 right-1 h-2.5 w-2.5 bg-red-500 rounded-full border-2 border-[#000c24]"></span>
          </button>

          <Popover className="relative">
            {({ open }) => (
              <>
                <Popover.Button className="flex items-center p-1 rounded-full hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-opacity-75">
                  <div className="h-9 w-9 rounded-full bg-[#FFCA40]/30 flex items-center justify-center ring-1 ring-[#FFCA40]/50">
                    {session?.user?.image ? (
                        <Image src={session.user.image} alt="Admin" width={36} height={36} className="rounded-full" />
                    ) : (
                        <span className="font-medium text-sm text-[#FFCA40]">
                        {session?.user?.name?.charAt(0).toUpperCase() || 'A'}
                        </span>
                    )}
                  </div>
                  <span className="hidden md:inline-block ml-2 text-sm text-white/90">
                    {session?.user?.name || 'Administrator'}
                  </span>
                  <FiChevronDown className={`hidden md:inline-block ml-1 text-white/70 transition-transform duration-150 ${open ? 'transform rotate-180' : ''}`} size={16} />
                </Popover.Button>
                <Transition
                  as={Fragment}
                  enter="transition ease-out duration-100"
                  enterFrom="transform opacity-0 scale-95"
                  enterTo="transform opacity-100 scale-100"
                  leave="transition ease-in duration-75"
                  leaveFrom="transform opacity-100 scale-100"
                  leaveTo="transform opacity-0 scale-95"
                >
                  <Popover.Panel className="absolute right-0 mt-2 w-56 origin-top-right bg-[#00153A] border border-white/10 rounded-md shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none py-1">
                    <div className="px-4 py-3 border-b border-white/10">
                      <p className="text-sm font-medium text-white truncate">{session?.user?.name || 'Administrator'}</p>
                      <p className="text-xs text-gray-400 truncate">{session?.user?.email}</p>
                    </div>
                    <Link href="/admin/profile" className="w-full text-left flex items-center px-4 py-2 text-sm text-gray-300 hover:bg-white/10 hover:text-[#FFCA40] transition-colors">
                        <FiUser className="mr-2.5" size={16}/> Profile
                    </Link>
                    <Link href="/admin/settings" className="w-full text-left flex items-center px-4 py-2 text-sm text-gray-300 hover:bg-white/10 hover:text-[#FFCA40] transition-colors">
                        <FiSettings className="mr-2.5" size={16}/> Settings
                    </Link>
                    <button
                      onClick={() => signOut({ callbackUrl: '/admin' })}
                      className="w-full text-left flex items-center px-4 py-2 text-sm text-gray-300 hover:bg-red-500/20 hover:text-red-300 transition-colors"
                    >
                      <FiLogOut className="mr-2.5" size={16}/>
                      Sign Out
                    </button>
                  </Popover.Panel>
                </Transition>
              </>
            )}
          </Popover>
        </div>
      </div>
       {/* Mobile Navigation Tabs - shown on smaller screens */}
       <div className="md:hidden border-t border-white/10 overflow-x-auto">
        <nav className="flex px-2 space-x-1">
          {mobileNavItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/admin/dashboard' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex flex-col items-center justify-center px-3 py-2.5 rounded-t-md text-xs font-medium transition-colors duration-150 group whitespace-nowrap ${
                  isActive
                    ? 'bg-[#001030]/50 text-[#FFCA40]'
                    : 'text-white/70 hover:bg-white/5 hover:text-white'
                }`}
              >
                <span className={`mb-0.5 ${isActive ? 'text-[#FFCA40]' : 'text-white/60 group-hover:text-white/80'}`}>{item.icon}</span>
                {item.name}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}