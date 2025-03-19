"use client";

import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { usePathname } from 'next/navigation';
import { 
  FiCalendar, FiClock, FiUsers, FiActivity, 
  FiPieChart, FiSettings, FiLogOut
} from 'react-icons/fi';

const navItems = [
  { name: 'Dashboard', icon: <FiActivity />, href: '/admin/dashboard' },
  { name: 'Appointments', icon: <FiCalendar />, href: '/admin/appointments' },
  { name: 'Counselors', icon: <FiUsers />, href: '/admin/counselors' },
  { name: 'Schedule', icon: <FiClock />, href: '/admin/schedule' },
  { name: 'Analytics', icon: <FiPieChart />, href: '/admin/analytics' },
  { name: 'Settings', icon: <FiSettings />, href: '/admin/settings' },
];

export default function AdminSidebar() {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-[#000c24] h-screen sticky top-0 overflow-y-auto hidden md:block">
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
          {navItems.map((item, index) => (
            <li key={index}>
              <Link 
                href={item.href}
                className={`flex items-center p-2 rounded-lg hover:bg-white/10 transition-colors ${
                  pathname === item.href ? 'bg-[#FFCA40]/20 text-[#FFCA40]' : 'text-gray-300'
                }`}
              >
                <span className="mr-3">{item.icon}</span>
                {item.name}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      
      <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/10">
        <button 
          onClick={() => router.push('/api/auth/signout')}
          className="flex items-center w-full p-2 rounded-lg hover:bg-white/10 transition-colors text-gray-300"
        >
          <FiLogOut className="mr-3" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}