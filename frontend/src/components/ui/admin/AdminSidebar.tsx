"use client";

import Image from 'next/image';
import Link from 'next/link';
import { signOut } from 'next-auth/react'; // Import signOut
import {
  FiGrid, FiUsers, FiMessageSquare, FiCalendar, FiBookOpen, 
  FiBarChart2, FiSettings, FiShield, FiLogOut, FiHelpCircle, FiFileText
} from 'react-icons/fi';
import SidebarLink from './SidebarLink'; // Assuming SidebarLink component exists

const mainNavItems = [
  { name: 'Dashboard', icon: <FiGrid size={18}/>, href: '/admin/dashboard' },
  { name: 'User Management', icon: <FiUsers size={18}/>, href: '/admin/users' },
  { name: 'AI Conversations', icon: <FiMessageSquare size={18}/>, href: '/admin/conversations' },
  { name: 'Appointments', icon: <FiCalendar size={18}/>, href: '/admin/appointments' },
  { name: 'Journal Insights', icon: <FiBookOpen size={18}/>, href: '/admin/journals' },
  { name: 'Content Resources', icon: <FiFileText size={18}/>, href: '/admin/content-resources' },
  { name: 'Survey Management', icon: <FiFileText size={18}/>, href: '/admin/surveys' },
  { name: 'Analytics', icon: <FiBarChart2 size={18}/>, href: '/admin/analytics' },
];

const secondaryNavItems = [
  { name: 'System Settings', icon: <FiSettings size={18}/>, href: '/admin/settings' },
  { name: 'Help & Support', icon: <FiHelpCircle size={18}/>, href: '/admin/support' },
];

export default function AdminSidebar() {
  // useRouter is not needed here if signOut is used directly with callbackUrl

  return (
    <aside className="w-64 bg-[#000c24] h-screen sticky top-0 flex-shrink-0 overflow-y-auto hidden md:flex flex-col border-r border-white/10">
      {/* Logo/Header */}
      <div className="p-4 border-b border-white/10 h-16 flex items-center shrink-0">
        <Link href="/admin/dashboard" className="flex items-center group">
          <Image
            src="/UGM_Lambang.png" 
            alt="UGM Logo"
            width={36}
            height={36}
            className="mr-2.5 group-hover:opacity-90 transition-opacity"
          />
          <div>
            <h2 className="font-semibold text-lg text-white leading-tight group-hover:text-[#FFCA40] transition-colors">AICare</h2>
            <p className="text-xs text-[#FFCA40] flex items-center">
              <FiShield className="mr-1" size={11} />
              Admin Panel
            </p>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto">
        {mainNavItems.map((item) => (
          <SidebarLink
            key={item.href}
            href={item.href}
            icon={item.icon}
            label={item.name}
          />
        ))}
        <hr className="my-3 border-white/10" />
        {secondaryNavItems.map((item) => (
          <SidebarLink
            key={item.href}
            href={item.href}
            icon={item.icon}
            label={item.name}
          />
        ))}
      </nav>

      {/* Footer / Sign Out */}
      <div className="p-3 border-t border-white/10 mt-auto shrink-0">
        <button
          onClick={() => signOut({ callbackUrl: '/admin' })} // Use signOut from next-auth
          className="flex items-center w-full px-3 py-2.5 rounded-md text-sm font-medium transition-colors duration-150 group text-white/70 hover:bg-red-500/15 hover:text-red-300"
        >
          <FiLogOut className="mr-3 flex-shrink-0 text-white/60 group-hover:text-red-300" size={18}/>
          <span className="truncate">Sign Out</span>
        </button>
      </div>
    </aside>
  );
}