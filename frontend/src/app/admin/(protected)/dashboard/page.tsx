"use client";

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation'; 
import Link from 'next/link';
import { motion, Variants } from 'framer-motion';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
// AdminLayout import is no longer needed here as it's applied by Next.js file-system routing
import { 
  FiCalendar, FiClock, FiUsers, 
  FiPieChart,
  FiCheck, FiX, FiChevronRight, FiEdit3, FiPlus, FiActivity, FiTrendingUp, FiMessageSquare, FiShield
} from 'react-icons/fi';
import React from 'react';
import { apiCall } from '@/utils/adminApi';

// Mock data for today's appointments
const todayAppointments = [
  { 
    id: 1,
    patientName: 'Budi Setiawan',
    patientEmail: 'budi.s@mail.ugm.ac.id',
    time: '09:00',
    counselor: 'Dr. Putri Handayani',
    type: 'Initial Consultation',
    status: 'confirmed'
  },
  { 
    id: 2,
    patientName: 'Siti Rahayu',
    patientEmail: 'siti.r@mail.ugm.ac.id',
    time: '10:30',
    counselor: 'Dr. Budi Santoso',
    type: 'Follow-up Session',
    status: 'confirmed'
  },
  { 
    id: 3,
    patientName: 'Ahmad Rizal',
    patientEmail: 'ahmad.r@mail.ugm.ac.id',
    time: '13:00',
    counselor: 'Anita Wijaya, M.Psi',
    type: 'Crisis Intervention',
    status: 'cancelled'
  },
];

// Mock data for statistics
const statsData = {
  totalUsers: 1256,
  activeSessions: 42,
  newSignupsToday: 15,
  avgSessionDuration: '23 min',
  totalAppointmentsThisMonth: 124,
  completedAppointments: 98,
  cancellations: 11,
  satisfactionRate: '92%',
};

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i:number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.1,
      duration: 0.4,
      ease: "easeOut"
    }
  })
};

export default function AdminDashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter(); 
  const [flagsOpenCount, setFlagsOpenCount] = useState<number>(0);
  const [recentFlags, setRecentFlags] = useState<{ id: number; session_id: string; status: string; created_at: string; reason?: string | null; tags?: string[] | null; }[]>([]);

  // The AdminLayout (from layout.tsx) now primarily handles authentication and role checks.
  // This useEffect can be a secondary check or removed if AdminLayout is robust.
  useEffect(() => {
    if (status === "authenticated" && session?.user?.role !== 'admin') {
      router.push('/access-denied');
    }
  }, [status, session, router]);
  
  // Loading and unauthenticated states are handled by AdminLayout (layout.tsx)
  if (status === "loading" || (status === "authenticated" && session?.user?.role !== 'admin')) {
    // AdminLayout will show its own loading/redirecting state.
    return null; 
  }

  // Load flags summary
  useEffect(() => {
    const loadFlags = async () => {
      try {
        const data = await apiCall<{ open_count: number; recent: { id: number; session_id: string; status: string; created_at: string; reason?: string | null; tags?: string[] | null; }[] }>(`/api/v1/admin/flags/summary?limit=5`);
        setFlagsOpenCount(data.open_count);
        setRecentFlags(data.recent);
      } catch (e) {
        // ignore summary failures in dashboard
      }
    };
    loadFlags();
  }, []);

  // Remove the <AdminLayout> wrapper from here
  return (
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 max-w-7xl 2xl:max-w-[100rem] space-y-4 sm:space-y-6 md:space-y-8">
        {/* Page Title */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white">Admin Dashboard</h1>
            <p className="text-sm sm:text-md text-gray-400 mt-1">
              Overview of UGM-AICare Platform Activity
            </p>
          </div>
          <p className="text-xs sm:text-sm text-gray-300 mt-2 sm:mt-0">
            {format(new Date(), 'EEEE, d MMMM yyyy', { locale: id })}
          </p>
        </div>
        
        {/* Quick Stats - Row 1 (User & Session Focus) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
          {[
            { title: 'Total Users', value: statsData.totalUsers, icon: <FiUsers size={22}/>, color: 'blue', trend: '+5% this month' },
            { title: 'Active AI Sessions', value: statsData.activeSessions, icon: <FiMessageSquare size={22}/>, color: 'green', trend: 'Real-time' },
            { title: 'New Signups (Today)', value: statsData.newSignupsToday, icon: <FiPlus size={22}/>, color: 'yellow', trend: '+2 yesterday' },
            { title: 'Avg. Session Duration', value: statsData.avgSessionDuration, icon: <FiClock size={22}/>, color: 'purple', trend: 'Stable' },
          ].map((stat, i) => (
            <motion.div 
              key={stat.title}
              custom={i}
              variants={cardVariants}
              initial="hidden"
              animate="visible"
              className={`bg-white/5 backdrop-blur-md rounded-xl p-5 border border-white/10 shadow-lg hover:shadow-xl transition-shadow`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-gray-400 text-sm">{stat.title}</p>
                  <h3 className="text-3xl font-bold mt-1.5 text-white">{stat.value}</h3>
                </div>
                <div className={`p-3 rounded-lg bg-${stat.color}-500/20`}>
                  {React.cloneElement(stat.icon, { className: `text-${stat.color}-400`})}
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-3">{stat.trend}</p>
            </motion.div>
          ))}
        </div>

        {/* Flags Widget */}
        <div className="grid grid-cols-1 gap-4 sm:gap-6">
          <div className="bg-white/5 backdrop-blur-md rounded-xl border border-white/10 shadow-lg overflow-hidden">
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-white/10">
              <h2 className="text-xl font-semibold text-white flex items-center">
                <FiShield className="mr-3 text-[#FFCA40]" />
                Flags
              </h2>
              <Link href="/admin/flags" className="text-sm text-[#FFCA40] hover:underline flex items-center font-medium">
                Manage Flags
                <FiChevronRight className="ml-1" size={16} />
              </Link>
            </div>
            <div className="p-4 sm:p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="text-gray-300">Open Flags</div>
                <div className="text-2xl font-bold text-white">{flagsOpenCount}</div>
              </div>
              {recentFlags.length === 0 ? (
                <div className="text-gray-400">No recent flags</div>
              ) : (
                <ul className="divide-y divide-white/10">
                  {recentFlags.map((f) => (
                    <li key={f.id} className="py-3 flex items-center justify-between">
                      <div>
                        <div className="text-sm text-white">Session …{f.session_id.slice(-8)} <span className="ml-2 text-xs text-gray-400">#{f.id}</span></div>
                        <div className="text-xs text-gray-400">{new Date(f.created_at).toLocaleString()} • {f.reason || 'No reason'}</div>
                      </div>
                      <Link href={`/admin/conversations/session/${f.session_id}`} className="text-[#FFCA40] text-sm">View</Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>

        {/* Quick Stats - Row 2 (Appointments & Feedback Focus) */}
         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {[
            { title: 'Appointments (Month)', value: statsData.totalAppointmentsThisMonth, icon: <FiCalendar size={22}/>, color: 'indigo', trend: '+12% last month' },
            { title: 'Completed Appts.', value: statsData.completedAppointments, icon: <FiCheck size={22}/>, color: 'teal', trend: `${Math.round((statsData.completedAppointments / statsData.totalAppointmentsThisMonth) * 100)}% completion` },
            { title: 'Cancellations', value: statsData.cancellations, icon: <FiX size={22}/>, color: 'orange', trend: `${Math.round((statsData.cancellations / statsData.totalAppointmentsThisMonth) * 100)}% rate` },
            { title: 'User Satisfaction', value: statsData.satisfactionRate, icon: <FiTrendingUp size={22}/>, color: 'pink', trend: 'Based on feedback' },
          ].map((stat, i) => (
            <motion.div 
              key={stat.title}
              custom={i + 4} // Continue delay sequence
              variants={cardVariants}
              initial="hidden"
              animate="visible"
              className={`bg-white/5 backdrop-blur-md rounded-xl p-5 border border-white/10 shadow-lg hover:shadow-xl transition-shadow`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-gray-400 text-sm">{stat.title}</p>
                  <h3 className="text-3xl font-bold mt-1.5 text-white">{stat.value}</h3>
                </div>
                <div className={`p-3 rounded-lg bg-${stat.color}-500/20`}>
                  {React.cloneElement(stat.icon, { className: `text-${stat.color}-400`})}
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-3">{stat.trend}</p>
            </motion.div>
          ))}
        </div>
        
        {/* Today's Appointments */}
        <motion.div 
            custom={8} variants={cardVariants} initial="hidden" animate="visible"
            className="bg-white/5 backdrop-blur-md rounded-xl border border-white/10 shadow-lg overflow-hidden"
        >
          <div className="flex items-center justify-between p-5 border-b border-white/10">
            <h2 className="text-xl font-semibold text-white flex items-center">
              <FiCalendar className="mr-3 text-[#FFCA40]" />
              Today&apos;s Appointments
            </h2>
            <Link href="/admin/appointments" className="text-sm text-[#FFCA40] hover:underline flex items-center font-medium">
                View All
                <FiChevronRight className="ml-1" size={16} />
            </Link>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-white/10">
              <thead className="bg-white/10">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Patient</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Time</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Counselor</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {todayAppointments.map((appointment) => (
                  <tr key={appointment.id} className="hover:bg-white/[.02] transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-9 w-9 rounded-full bg-[#173a7a] flex items-center justify-center mr-3 border border-blue-400/50">
                          <span className="font-medium text-sm">{appointment.patientName.charAt(0)}</span>
                        </div>
                        <div>
                          <div className="font-medium text-white">{appointment.patientName}</div>
                          <div className="text-xs text-gray-400">{appointment.patientEmail}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-300">
                      {appointment.time} WIB
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-300">
                      {appointment.counselor}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-300">
                      {appointment.type}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                        appointment.status === 'confirmed' 
                          ? 'bg-green-500/20 text-green-300 ring-1 ring-green-400/30'
                          : appointment.status === 'cancelled'
                            ? 'bg-red-500/20 text-red-300 ring-1 ring-red-400/30'
                            : 'bg-yellow-500/20 text-yellow-300 ring-1 ring-yellow-400/30'
                      }`}>
                        {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-3">
                      <button title="Edit Appointment" className="text-[#FFCA40] hover:text-[#ffda63] transition-colors">
                        <FiEdit3 size={18} />
                      </button>
                      <button title="Cancel Appointment" className="text-gray-400 hover:text-red-400 transition-colors">
                        <FiX size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {todayAppointments.length === 0 && (
            <div className="py-10 text-center text-gray-400">
              <FiCalendar size={32} className="mx-auto mb-2 opacity-50" />
              <p>No appointments scheduled for today.</p>
            </div>
          )}
        </motion.div>
        
        {/* Quick Actions */}
        <motion.div custom={9} variants={cardVariants} initial="hidden" animate="visible">
          <h2 className="text-xl font-semibold text-white mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
            {[
              { title: 'New Appointment', desc: 'Schedule directly', icon: <FiPlus/>, href: '/admin/appointments/new', color: 'blue' },
              { title: 'Manage Counselors', desc: 'Add or edit profiles', icon: <FiUsers/>, href: '/admin/counselors', color: 'yellow' },
              { title: 'View Analytics', desc: 'Platform usage reports', icon: <FiPieChart/>, href: '/admin/analytics', color: 'purple' },
              { title: 'System Health', desc: 'Check system status', icon: <FiActivity/>, href: '/admin/system-health', color: 'green' },
            ].map(action => (
              <Link key={action.title} href={action.href}>
                <div className={`bg-white/5 hover:bg-white/10 backdrop-blur-md rounded-xl p-4 sm:p-5 border border-white/10 cursor-pointer transition-all duration-150 shadow-lg hover:shadow-xl flex items-center space-x-4 h-full`}>
                  <div className={`p-3 rounded-lg bg-${action.color}-500/20`}>
                     {React.cloneElement(action.icon, { className: `text-${action.color}-400`, size:20 })}
                  </div>
                  <div>
                    <h3 className="font-semibold text-white text-md">{action.title}</h3>
                    <p className="text-xs text-gray-400">{action.desc}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </motion.div>
      </div>
  );
}
