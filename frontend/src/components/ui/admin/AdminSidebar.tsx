"use client";

import Image from 'next/image';
import Link from 'next/link';
import { signOut } from 'next-auth/react';
import {
  FiUsers,
  FiMessageSquare,
  FiCalendar,
  FiSettings,
  FiShield,
  FiLogOut,
  FiHelpCircle,
  FiHeart,
  FiUser,
  FiUserCheck,
  FiSend,
  FiBarChart2,
  FiClipboard,
  FiActivity,
  FiBookOpen,
  FiTrendingUp,
  FiBriefcase,
  FiMonitor,
  FiTarget,
  FiZap,
  FiDatabase,
  FiEye,
  FiKey,
  FiFlag,
  FiTerminal,
  FiLink,
} from 'react-icons/fi';
import SidebarLink from './SidebarLink';

import MobileNavDrawer from '../MobileNavDrawer';

// Reorganized navigation: clearer operational categories for admin workflows
const navGroups = [
  {
    label: 'Overview',
    items: [
      { name: 'Dashboard', icon: <FiBarChart2 size={17} />, href: '/admin/dashboard' },
      { name: 'Insights Analytics', icon: <FiTrendingUp size={17} />, href: '/admin/insights' },
      { name: 'Retention Analytics', icon: <FiTarget size={17} />, href: '/admin/retention' },
    ],
  },
  {
    label: 'Care Operations',
    items: [
      { name: 'Cases', icon: <FiShield size={17} />, href: '/admin/cases' },
      { name: 'Quick Triage', icon: <FiBriefcase size={17} />, href: '/admin/quick-triage' },
      { name: 'Appointments', icon: <FiCalendar size={17} />, href: '/admin/appointments' },
      { name: 'Flagged Chats', icon: <FiFlag size={17} />, href: '/admin/flags' },
    ],
  },
  {
    label: 'People & Activity',
    items: [
      { name: 'Users', icon: <FiUsers size={17} />, href: '/admin/users' },
      { name: 'Counselors', icon: <FiUserCheck size={17} />, href: '/admin/counselors' },
      { name: 'Conversations', icon: <FiMessageSquare size={17} />, href: '/admin/conversations' },
      { name: 'Activities', icon: <FiActivity size={17} />, href: '/admin/activities' },
    ],
  },
  {
    label: 'Agentic & On-Chain',
    items: [
      { name: 'Agent Decisions', icon: <FiEye size={17} />, href: '/admin/agent-decisions' },
      { name: 'Autopilot Queue', icon: <FiZap size={17} />, href: '/admin/autopilot' },
      { name: 'Autopilot Policy', icon: <FiShield size={17} />, href: '/admin/policy' },
      { name: 'Blockchain Hub', icon: <FiLink size={17} />, href: '/admin/blockchain' },
    ],
  },
  {
    label: 'Programs & Content',
    items: [
      { name: 'Intervention Plans', icon: <FiClipboard size={17} />, href: '/admin/interventions' },
      { name: 'Outreach', icon: <FiSend size={17} />, href: '/admin/outreach' },
      { name: 'CBT Modules', icon: <FiHeart size={17} />, href: '/admin/cbt-modules' },
      { name: 'Quest Templates', icon: <FiZap size={17} />, href: '/admin/quests' },
      { name: 'Content Resources', icon: <FiBookOpen size={17} />, href: '/admin/content-resources' },
      { name: 'Surveys', icon: <FiHelpCircle size={17} />, href: '/admin/surveys' },
    ],
  },
  {
    label: 'Platform',
    items: [
      { name: 'LangGraph Monitoring', icon: <FiMonitor size={17} />, href: '/admin/langgraph' },
      { name: 'Testing Console', icon: <FiTerminal size={17} />, href: '/admin/testing' },
      { name: 'Database Viewer', icon: <FiDatabase size={17} />, href: '/admin/database' },
      { name: 'API Key Monitor', icon: <FiKey size={17} />, href: '/admin/api-keys' },
    ],
  },
];

const secondaryNavItems = [
  { name: 'My Profile', icon: <FiUser size={17} />, href: '/admin/profile' },
  { name: 'System Settings', icon: <FiSettings size={17} />, href: '/admin/settings' },
];

export default function AdminSidebar({
  isMobileOpen = false,
  onMobileClose = () => { },
}: {
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
}) {
  // groupId scopes the morphing active-pill layoutId per container
  // (desktop aside and mobile drawer are both mounted simultaneously).
  const renderSidebarContent = (groupId: string) => (
    <>
      {/* Logo/Header */}
      <div className="flex h-16 shrink-0 items-center border-b border-white/[0.07] px-5">
        <Link href="/admin/dashboard" className="group flex items-center">
          <Image
            src="/UGM_Lambang.png"
            alt="UGM Logo"
            width={34}
            height={34}
            className="mr-3 transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:scale-105"
          />
          <div>
            <h2 className="text-base font-semibold leading-tight tracking-tight text-white transition-colors duration-500 group-hover:text-[#FFCA40]">AICare</h2>
            <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#FFCA40]/80">
              <FiShield size={10} />
              Admin Panel
            </p>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-4 overflow-y-auto p-3">
        {navGroups.map(group => (
          <div key={group.label}>
            <p className="mb-1.5 px-3 text-[9px] font-semibold uppercase tracking-[0.22em] text-white/30">{group.label}</p>
            <ul className="space-y-0.5">
              {group.items.map(item => (
                <SidebarLink
                  key={item.href}
                  href={item.href}
                  icon={item.icon}
                  label={item.name}
                  groupId={groupId}
                />
              ))}
            </ul>
          </div>
        ))}
        <hr className="my-3 border-white/[0.07]" />
        <div>
          <p className="mb-1.5 px-3 text-[9px] font-semibold uppercase tracking-[0.22em] text-white/30">Account &amp; System</p>
          <ul className="space-y-0.5">
            {secondaryNavItems.map(item => (
              <SidebarLink
                key={item.href}
                href={item.href}
                icon={item.icon}
                label={item.name}
                groupId={groupId}
              />
            ))}
          </ul>
        </div>
      </nav>

      {/* Footer / Sign Out */}
      <div className="mt-auto shrink-0 border-t border-white/[0.07] p-3">
        <button
          onClick={() => signOut({ callbackUrl: '/admin' })}
          className="group flex w-full items-center rounded-2xl px-3 py-2.5 text-sm font-medium text-white/60 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-red-500/10 hover:text-red-300 active:scale-[0.98]"
        >
          <FiLogOut className="mr-3 shrink-0 text-white/45 transition-colors duration-500 group-hover:text-red-300" size={17} />
          <span className="truncate">Sign Out</span>
        </button>
      </div>
    </>
  );

  return (
    <>
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col overflow-y-auto border-r border-white/[0.07] bg-[#000c24]/60 backdrop-blur-2xl md:flex">
        {renderSidebarContent('desktop')}
      </aside>
      <MobileNavDrawer isOpen={isMobileOpen} onClose={onMobileClose}>
        {renderSidebarContent('mobile')}
      </MobileNavDrawer>
    </>
  );
}
