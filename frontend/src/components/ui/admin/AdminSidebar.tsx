// frontend/src/components/ui/admin/AdminSidebar.tsx (MODIFIED)
"use client";

import Image from 'next/image';
import { useRouter } from 'next/navigation';
// Removed usePathname here as it's now in SidebarLink
import {
  FiActivity,
  FiSettings, FiLogOut
} from 'react-icons/fi';
import SidebarLink from './SidebarLink'; // Import the new component

const navItems = [
  { name: 'Dashboard', icon: <FiActivity />, href: '/admin/dashboard' },
  // ... other items
  { name: 'Settings', icon: <FiSettings />, href: '/admin/settings' },
];

export default function AdminSidebar() {
  const router = useRouter();
  // pathname is no longer needed here if SidebarLink handles active state

  return (
    <aside className="w-64 bg-[#000c24] h-screen sticky top-0 overflow-y-auto hidden md:block">
      {/* ... Header part ... */}
       <div className="p-4 border-b border-white/10">
           <div className="flex items-center">
             <Image
               src="/UGM_Lambang.png"
               alt="UGM Logo"
               width={40}
               height={40}
               className="mr-2"
             />
             <div>
               <h2 className="font-bold">UGM-AICare</h2>
               <p className="text-xs text-[#FFCA40]">Admin Dashboard</p>
             </div>
           </div>
       </div>


      <nav className="p-4">
        <ul className="space-y-2">
          {/* Use the new component in the map */}
          {navItems.map((item) => (
            <SidebarLink
              key={item.name}
              href={item.href}
              icon={item.icon}
              label={item.name}
            />
          ))}
        </ul>
      </nav>

      {/* ... Footer / Sign Out part ... */}
       <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/10">
         <button
           onClick={() => router.push('/api/auth/signout')} // Or use signOut from next-auth/react
           className="flex items-center w-full p-2 rounded-lg hover:bg-white/10 transition-colors text-gray-300"
         >
           <FiLogOut className="mr-3" />
           Sign Out
         </button>
       </div>
    </aside>
  );
}