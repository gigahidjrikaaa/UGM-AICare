"use client";

import Image from 'next/image';
import Link from 'next/link';
import { signOut } from 'next-auth/react'; // Import signOut
import {
  FiUsers,
  FiMessageSquare,
  FiCalendar,
  FiSettings,
  FiShield,
  FiLogOut,
  FiHelpCircle,
  FiFileText,
  FiHeart,
  FiUser,
  FiCpu,
} from 'react-icons/fi';
import SidebarLink from './SidebarLink'; // Assuming SidebarLink component exists

// Grouped navigation structure for improved UX
const navGroups = [
  {
    label: 'People & Content',
    items: [
      { name: 'Users', icon: <FiUsers size={18}/>, href: '/admin/users' },
      { name: 'Appointments', icon: <FiCalendar size={18}/>, href: '/admin/appointments' },
      { name: 'Conversations', icon: <FiMessageSquare size={18}/>, href: '/admin/conversations' },
      { name: 'Content Resources', icon: <FiFileText size={18}/>, href: '/admin/content-resources' },
      { name: 'Surveys', icon: <FiFileText size={18}/>, href: '/admin/surveys' },
      { name: 'CBT Modules', icon: <FiHeart size={18}/>, href: '/admin/cbt-modules' },
    ]
  },
  {
    label: 'Agents & Intelligence',
    items: [
      { name: 'Dashboard', icon: <FiShield size={18}/>, href: '/admin/dashboard' },
      { name: 'Cases', icon: <FiShield size={18}/>, href: '/admin/cases' },
      { name: 'Outreach', icon: <FiCpu size={18}/>, href: '/admin/outreach' },
      { name: 'Agents Command Center', icon: <FiCpu size={18}/>, href: '/admin/agents-command-center' },
    ]
  }
];

const secondaryNavItems = [
  { name: 'My Profile', icon: <FiUser size={18}/>, href: '/admin/profile' },
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
      <nav className="flex-1 p-3 space-y-4 overflow-y-auto">
        {navGroups.map(group => (
          <div key={group.label}>
            <p className="px-2 mb-1 text-[10px] uppercase tracking-wider text-white/40 font-medium">{group.label}</p>
            <div className="space-y-1.5">
              {group.items.map(item => (
                <SidebarLink
                  key={item.href}
                  href={item.href}
                  icon={item.icon}
                  label={item.name}
                />
              ))}
            </div>
          </div>
        ))}
        <hr className="my-3 border-white/10" />
        <div>
          <p className="px-2 mb-1 text-[10px] uppercase tracking-wider text-white/40 font-medium">Account & System</p>
          <div className="space-y-1.5">
            {secondaryNavItems.map(item => (
              <SidebarLink
                key={item.href}
                href={item.href}
                icon={item.icon}
                label={item.name}
              />
            ))}
          </div>
        </div>
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


