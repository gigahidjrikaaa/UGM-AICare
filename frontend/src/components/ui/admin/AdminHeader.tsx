"use client";

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { FiSearch } from 'react-icons/fi';

// Admin navigation items for mobile tabs
import { 
  FiCalendar, FiClock, FiUsers, FiActivity, 
  FiPieChart, FiSettings
} from 'react-icons/fi';

const navItems = [
  { name: 'Dashboard', icon: <FiActivity />, href: '/admin/dashboard' },
  { name: 'Appointments', icon: <FiCalendar />, href: '/admin/appointments' },
  { name: 'Counselors', icon: <FiUsers />, href: '/admin/counselors' },
  { name: 'Schedule', icon: <FiClock />, href: '/admin/schedule' },
  { name: 'Analytics', icon: <FiPieChart />, href: '/admin/analytics' },
  { name: 'Settings', icon: <FiSettings />, href: '/admin/settings' },
];

export default function AdminHeader() {
  const { data: session } = useSession();
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <header className="bg-[#000c24]/90 backdrop-blur-sm border-b border-white/10 sticky top-0 z-10">
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center md:hidden">
          <Image 
            src="/UGM_Lambang.png" 
            alt="UGM Logo" 
            width={32} 
            height={32} 
            className="mr-2"
          />
          <h2 className="font-bold">UGM-AICare</h2>
        </div>
        
        {/* Search */}
        <div className="hidden sm:flex items-center bg-white/10 rounded-lg px-3 py-2 flex-1 max-w-lg mx-4">
          <FiSearch className="text-gray-400 mr-2" />
          <input 
            type="text" 
            placeholder="Search appointments, counselors..." 
            className="bg-transparent border-none outline-none text-white placeholder-gray-400 w-full"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        {/* Admin Profile */}
        <div className="flex items-center">
          <div className="mr-4 text-right hidden sm:block">
            <p className="font-medium">{session?.user?.name || 'Administrator'}</p>
            <p className="text-xs text-gray-400">Administrator</p>
          </div>
          <div className="h-10 w-10 rounded-full bg-[#FFCA40]/20 flex items-center justify-center">
            {session?.user?.image ? (
              <Image 
                src={session.user.image} 
                alt={session.user.name || "Admin"} 
                width={40} 
                height={40} 
                className="rounded-full"
              />
            ) : (
              <span className="font-medium text-[#FFCA40]">
                {session?.user?.name?.charAt(0) || 'A'}
              </span>
            )}
          </div>
        </div>
      </div>
      
      {/* Mobile Navigation Tabs */}
      <div className="md:hidden overflow-x-auto">
        <div className="flex px-4 pb-2 space-x-4">
          {navItems.map((item, index) => {
            const isActive = typeof window !== 'undefined' && window.location.pathname === item.href;
            return (
              <Link
                key={index}
                href={item.href}
                className={`flex items-center py-2 whitespace-nowrap ${
                  isActive ? "text-[#FFCA40] border-b-2 border-[#FFCA40]" : "text-gray-300"
                }`}
              >
                <span className="mr-1">{item.icon}</span>
                {item.name}
              </Link>
            );
          })}
        </div>
      </div>
    </header>
  );
}