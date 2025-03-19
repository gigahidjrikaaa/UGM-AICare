"use client";

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { format, startOfToday, addDays } from 'date-fns';
import { id } from 'date-fns/locale';
import AdminLayout from '@/components/layout/AdminLayout';
import { 
  FiCalendar, FiClock, FiUsers, 
  FiPieChart,
  FiCheck, FiX, FiChevronRight, FiEdit3, FiPlus
} from 'react-icons/fi';

// Mock data for today's appointments
const todayAppointments = [
  { 
    id: 1,
    patientName: 'Budi Setiawan',
    patientEmail: 'budi.setiawan@mail.ugm.ac.id',
    time: '09:00',
    counselor: 'Dr. Putri Handayani',
    type: 'Initial Consultation',
    status: 'confirmed'
  },
  { 
    id: 2,
    patientName: 'Siti Rahayu',
    patientEmail: 'siti.rahayu@mail.ugm.ac.id',
    time: '10:30',
    counselor: 'Dr. Budi Santoso',
    type: 'Follow-up Session',
    status: 'confirmed'
  },
  { 
    id: 3,
    patientName: 'Ahmad Rizal',
    patientEmail: 'ahmad.rizal@mail.ugm.ac.id',
    time: '13:00',
    counselor: 'Anita Wijaya, M.Psi',
    type: 'Crisis Intervention',
    status: 'cancelled'
  },
  { 
    id: 4,
    patientName: 'Maya Putri',
    patientEmail: 'maya.putri@mail.ugm.ac.id',
    time: '14:30',
    counselor: 'Dr. Putri Handayani',
    type: 'Follow-up Session',
    status: 'confirmed'
  },
];

// Mock data for statistics
const statsData = {
  totalAppointments: 124,
  completedAppointments: 98,
  cancellations: 11,
  noShows: 15,
  weeklyChange: '+12%'
};

export default function AdminDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  // Admin authentication check
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push('/signin?callbackUrl=/admin/dashboard');
    } else if (status === "authenticated") {
      // Check if user has admin role (this would come from your session data)
      // For now just checking for UGM email domain
      const isAdmin = session?.user?.email?.endsWith('@ugm.ac.id');
      if (!isAdmin) {
        router.push('/access-denied');
      }
    }
  }, [status, router, session]);
  
  if (status === "loading" || status === "unauthenticated") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#001D58] to-[#00308F] flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center">
          <div className="h-12 w-12 rounded-full bg-white/20 mb-4"></div>
          <div className="h-4 w-40 bg-white/20 rounded mb-2"></div>
          <div className="h-3 w-24 bg-white/10 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <AdminLayout>
      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        {/* Dashboard Content */}
        <main className="p-4 sm:p-6">
          {/* Page Title */}
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold">Dashboard Overview</h1>
            <p className="text-sm text-gray-300">
              {format(new Date(), 'EEEE, d MMMM yyyy', { locale: id })}
            </p>
          </div>
          
          {/* Quick Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
              className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/10"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Total Appointments</p>
                  <h3 className="text-2xl font-bold mt-1">{statsData.totalAppointments}</h3>
                </div>
                <div className="bg-blue-500/20 p-2 rounded-lg">
                  <FiCalendar className="text-blue-400" size={20} />
                </div>
              </div>
              <p className="text-xs text-green-400 mt-2 flex items-center">
                <span>{statsData.weeklyChange}</span>
                <span className="ml-1">from last week</span>
              </p>
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.2 }}
              className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/10"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Completed</p>
                  <h3 className="text-2xl font-bold mt-1">{statsData.completedAppointments}</h3>
                </div>
                <div className="bg-green-500/20 p-2 rounded-lg">
                  <FiCheck className="text-green-400" size={20} />
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-2">
                {Math.round((statsData.completedAppointments / statsData.totalAppointments) * 100)}% completion rate
              </p>
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.3 }}
              className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/10"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Cancellations</p>
                  <h3 className="text-2xl font-bold mt-1">{statsData.cancellations}</h3>
                </div>
                <div className="bg-yellow-500/20 p-2 rounded-lg">
                  <FiX className="text-yellow-400" size={20} />
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-2">
                {Math.round((statsData.cancellations / statsData.totalAppointments) * 100)}% cancellation rate
              </p>
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.4 }}
              className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/10"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-gray-400 text-sm">No-shows</p>
                  <h3 className="text-2xl font-bold mt-1">{statsData.noShows}</h3>
                </div>
                <div className="bg-red-500/20 p-2 rounded-lg">
                  <FiX className="text-red-400" size={20} />
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-2">
                {Math.round((statsData.noShows / statsData.totalAppointments) * 100)}% no-show rate
              </p>
            </motion.div>
          </div>
          
          {/* Today's Appointments */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold flex items-center">
                <FiCalendar className="mr-2" />
                Today&apos;s Appointments
              </h2>
              <Link href="/admin/appointments">
                <button className="text-sm text-[#FFCA40] hover:underline flex items-center">
                  View All
                  <FiChevronRight className="ml-1" size={16} />
                </button>
              </Link>
            </div>
            
            <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/10 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-white/10">
                  <thead className="bg-white/5">
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
                      <tr key={appointment.id} className="hover:bg-white/5">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="h-8 w-8 rounded-full bg-[#173a7a] flex items-center justify-center mr-3">
                              <span className="font-medium">{appointment.patientName.charAt(0)}</span>
                            </div>
                            <div>
                              <div className="font-medium">{appointment.patientName}</div>
                              <div className="text-sm text-gray-400">{appointment.patientEmail}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {appointment.time} WIB
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {appointment.counselor}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {appointment.type}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            appointment.status === 'confirmed' 
                              ? 'bg-green-500/20 text-green-300'
                              : appointment.status === 'cancelled'
                                ? 'bg-red-500/20 text-red-300'
                                : 'bg-yellow-500/20 text-yellow-300'
                          }`}>
                            {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button className="text-[#FFCA40] hover:text-[#ffb700] mr-3">
                            <FiEdit3 size={18} />
                          </button>
                          <button className="text-gray-300 hover:text-white">
                            <FiX size={18} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {todayAppointments.length === 0 && (
                <div className="py-8 text-center text-gray-300">
                  <p>No appointments scheduled for today</p>
                </div>
              )}
            </div>
          </div>
          
          {/* Quick Actions */}
          <div className="mb-8">
            <h2 className="text-xl font-bold mb-4">Quick Actions</h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Link href="/admin/appointments/new">
                <div className="bg-gradient-to-br from-[#173a7a] to-[#0a2a6e] hover:from-[#1f4796] hover:to-[#0c3486] rounded-lg p-4 border border-white/10 cursor-pointer transition-all flex items-center">
                  <div className="p-3 bg-white/10 rounded-lg mr-4">
                    <FiPlus className="text-white" size={20} />
                  </div>
                  <div>
                    <h3 className="font-medium">New Appointment</h3>
                    <p className="text-xs text-gray-300">Schedule directly</p>
                  </div>
                </div>
              </Link>
              
              <Link href="/admin/counselors">
                <div className="bg-white/10 hover:bg-white/15 rounded-lg p-4 border border-white/10 cursor-pointer transition-all flex items-center">
                  <div className="p-3 bg-[#FFCA40]/20 rounded-lg mr-4">
                    <FiUsers className="text-[#FFCA40]" size={20} />
                  </div>
                  <div>
                    <h3 className="font-medium">Manage Counselors</h3>
                    <p className="text-xs text-gray-300">Add or edit profiles</p>
                  </div>
                </div>
              </Link>
              
              <Link href="/admin/schedule">
                <div className="bg-white/10 hover:bg-white/15 rounded-lg p-4 border border-white/10 cursor-pointer transition-all flex items-center">
                  <div className="p-3 bg-blue-500/20 rounded-lg mr-4">
                    <FiClock className="text-blue-400" size={20} />
                  </div>
                  <div>
                    <h3 className="font-medium">Manage Schedule</h3>
                    <p className="text-xs text-gray-300">Set availability</p>
                  </div>
                </div>
              </Link>
              
              <Link href="/admin/analytics">
                <div className="bg-white/10 hover:bg-white/15 rounded-lg p-4 border border-white/10 cursor-pointer transition-all flex items-center">
                  <div className="p-3 bg-purple-500/20 rounded-lg mr-4">
                    <FiPieChart className="text-purple-400" size={20} />
                  </div>
                  <div>
                    <h3 className="font-medium">View Analytics</h3>
                    <p className="text-xs text-gray-300">Usage reports</p>
                  </div>
                </div>
              </Link>
            </div>
          </div>
          
          {/* Upcoming Week Preview */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Upcoming Week</h2>
              <Link href="/admin/schedule">
                <button className="text-sm text-[#FFCA40] hover:underline flex items-center">
                  Manage Schedule
                  <FiChevronRight className="ml-1" size={16} />
                </button>
              </Link>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-7 gap-4">
              {Array.from({ length: 7 }).map((_, index) => {
                const day = addDays(startOfToday(), index);
                const dayStr = format(day, 'EEE', { locale: id });
                const dateStr = format(day, 'd MMM');
                const isToday = index === 0;
                
                // Generate a random number of appointments for demonstration
                const apptCount = Math.floor(Math.random() * 6) + (isToday ? 4 : 0);
                
                return (
                  <div 
                    key={index}
                    className={`rounded-lg border p-4 ${
                      isToday 
                        ? 'bg-[#FFCA40]/20 border-[#FFCA40]/30' 
                        : 'bg-white/5 border-white/10'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className={`text-sm ${isToday ? 'text-[#FFCA40]' : 'text-gray-400'}`}>{dayStr}</p>
                        <p className="font-medium">{dateStr}</p>
                      </div>
                      {isToday && (
                        <span className="text-xs bg-[#FFCA40]/30 text-[#FFCA40] px-2 py-0.5 rounded-full">
                          Today
                        </span>
                      )}
                    </div>
                    <div className="h-20 overflow-hidden">
                      {apptCount > 0 ? (
                        <div>
                          <p className="text-sm font-medium">{apptCount} appointments</p>
                          <div className="space-y-1 mt-1">
                            {Array.from({ length: Math.min(3, apptCount) }).map((_, i) => (
                              <div key={i} className="flex items-center text-xs">
                                <div className="w-2 h-2 rounded-full bg-blue-500 mr-2"></div>
                                <span className="truncate">
                                  {['09:00', '10:30', '13:00', '14:30', '16:00'][i % 5]}
                                </span>
                              </div>
                            ))}
                            {apptCount > 3 && (
                              <p className="text-xs text-gray-400">
                                +{apptCount - 3} more
                              </p>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="h-full flex items-center justify-center">
                          <p className="text-sm text-gray-400">No appointments</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </main>
      </div>
    </AdminLayout>
  );
}