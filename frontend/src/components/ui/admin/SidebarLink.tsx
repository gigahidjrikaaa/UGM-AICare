// frontend/src/components/ui/admin/SidebarLink.tsx
"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import React from 'react';

interface SidebarLinkProps {
  href: string;
  icon: React.ReactNode;
  label: string;
}

export default function SidebarLink({ href, icon, label }: SidebarLinkProps) {
  const pathname = usePathname();
  const isActive = pathname === href; // Active state logic

  return (
    <li>
      <Link
        href={href}
        className={`flex items-center p-2 rounded-lg transition-colors ${
          isActive
            ? 'bg-[#FFCA40]/20 text-[#FFCA40] font-medium' // Active state styles
            : 'text-gray-300 hover:bg-white/10' // Default state styles
        }`}
      >
        <span className="mr-3 flex-shrink-0 w-5 h-5 flex items-center justify-center">{icon}</span>
        <span>{label}</span>
      </Link>
    </li>
  );
}