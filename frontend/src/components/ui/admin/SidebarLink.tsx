"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { ReactElement } from 'react';
import { EASE } from '@/components/admin/dashboard/primitives';

interface SidebarLinkProps {
  href: string;
  icon: ReactElement;
  label: string;
  /** Unique per nav container — scopes the shared layoutId so the active
   * pill only morphs within its own sidebar (desktop vs mobile drawer). */
  groupId?: string;
}

export default function SidebarLink({ href, icon, label, groupId = 'default' }: SidebarLinkProps) {
  const pathname = usePathname();
  const isActive = pathname === href || (href !== '/admin/dashboard' && pathname.startsWith(href) && href.split('/').length <= pathname.split('/').length);


  return (
    <li>
      <Link
        href={href}
        className={`relative flex items-center px-3 py-2.5 text-sm font-medium transition-colors duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group ${
          isActive ? 'text-[#FFCA40]' : 'text-white/65 hover:text-white'
        }`}
      >
        {isActive && (
          <motion.span
            layoutId={`nav-active-pill-${groupId}`}
            transition={{ duration: 0.55, ease: EASE }}
            className="absolute inset-0 rounded-2xl bg-[#FFCA40]/12 ring-1 ring-[#FFCA40]/20"
          />
        )}
        <span className={`relative mr-3 shrink-0 transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:translate-x-0.5 ${isActive ? 'text-[#FFCA40]' : 'text-white/50 group-hover:text-white/85'}`}>
          {icon}
        </span>
        <span className="relative truncate">{label}</span>
      </Link>
    </li>
  );
}
