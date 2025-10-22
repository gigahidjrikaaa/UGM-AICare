"use client";

import { useSession } from 'next-auth/react';
import { FiBell, FiMenu } from 'react-icons/fi';
import { useState } from 'react';

export default function CounselorHeader() {
  const { data: session } = useSession();
  const [notificationCount] = useState(0);

  return (
    <header className="h-16 bg-white/5 backdrop-blur-sm border-b border-white/10 px-4 md:px-6 flex items-center justify-between sticky top-0 z-10">
      <div className="flex items-center gap-4">
        <button className="md:hidden text-white/80 hover:text-white">
          <FiMenu size={24} />
        </button>
        <div>
          <h1 className="text-sm font-medium text-white/60">Welcome back,</h1>
          <p className="text-lg font-semibold text-white">{session?.user?.name || 'Counselor'}</p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Notifications */}
        <button className="relative p-2 text-white/70 hover:text-white transition-colors">
          <FiBell size={20} />
          {notificationCount > 0 && (
            <span className="absolute top-0 right-0 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
              {notificationCount}
            </span>
          )}
        </button>

        {/* User Info */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-[#FFCA40] to-[#FFD55C] rounded-full flex items-center justify-center font-semibold text-[#001d58]">
            {session?.user?.name?.charAt(0) || 'C'}
          </div>
        </div>
      </div>
    </header>
  );
}
