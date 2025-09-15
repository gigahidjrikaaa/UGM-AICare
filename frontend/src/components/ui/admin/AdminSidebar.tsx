"use client";

import Image from 'next/image';
import Link from 'next/link';
import { signOut } from 'next-auth/react'; // Import signOut
import {
  FiGrid, FiUsers, FiMessageSquare, FiCalendar, FiBookOpen, 
  FiBarChart2, FiSettings, FiShield, FiLogOut, FiHelpCircle, FiFileText, FiHeart
} from 'react-icons/fi';
import SidebarLink from './SidebarLink'; // Assuming SidebarLink component exists
import { useTranslations } from 'next-intl';

const mainNavItems = (tNav: (k: string)=>string) => ([
  { name: tNav('dashboard'), icon: <FiGrid size={18}/>, href: '/admin/dashboard' },
  { name: tNav('user_management'), icon: <FiUsers size={18}/>, href: '/admin/users' },
  { name: tNav('ai_conversations'), icon: <FiMessageSquare size={18}/>, href: '/admin/conversations' },
  { name: tNav('appointments'), icon: <FiCalendar size={18}/>, href: '/admin/appointments' },
  { name: tNav('journals'), icon: <FiBookOpen size={18}/>, href: '/admin/journals' },
  { name: tNav('content_resources'), icon: <FiFileText size={18}/>, href: '/admin/content-resources' },
  { name: tNav('cbt_modules'), icon: <FiHeart size={18}/>, href: '/admin/cbt-modules' },
  { name: tNav('surveys'), icon: <FiFileText size={18}/>, href: '/admin/surveys' },
  { name: tNav('analytics'), icon: <FiBarChart2 size={18}/>, href: '/admin/analytics' },
  { name: tNav('flags'), icon: <FiShield size={18}/>, href: '/admin/flags' },
]);

const secondaryNavItems = (tNav: (k: string)=>string) => ([
  { name: tNav('settings'), icon: <FiSettings size={18}/>, href: '/admin/settings' },
  { name: tNav('help_support'), icon: <FiHelpCircle size={18}/>, href: '/admin/support' },
]);

export default function AdminSidebar() {
  // useRouter is not needed here if signOut is used directly with callbackUrl
  const tNav = useTranslations('Nav');
  const tHeader = useTranslations('Header');

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
        {mainNavItems((k)=>tNav(k)).map((item) => (
          <SidebarLink
            key={item.href}
            href={item.href}
            icon={item.icon}
            label={item.name}
          />
        ))}
        <hr className="my-3 border-white/10" />
        {secondaryNavItems((k)=>tNav(k)).map((item) => (
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
          <span className="truncate">{tHeader('sign_out')}</span>
        </button>
      </div>
    </aside>
  );
}
