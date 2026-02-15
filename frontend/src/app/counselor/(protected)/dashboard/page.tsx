'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  FiCalendar, 
  FiUsers, 
  FiClipboard, 
  FiTrendingUp,
  FiClock,
  FiAlertTriangle,
  FiCheckCircle,
  FiDollarSign
} from 'react-icons/fi';
import { apiCall } from '@/utils/adminApi';

interface DashboardStats {
  profile_completion_percentage: number;
  this_week_appointments: number;
  upcoming_appointments: number;
  total_revenue: number;
  average_rating: number;
  total_reviews: number;
  total_patients: number;
  total_completed_appointments: number;
}

interface TodayAppointment {
  id: number;
  user: {
    full_name: string;
    email: string;
  };
  scheduled_time: string;
  duration_minutes: number;
  status: string;
  notes?: string;
}

const StatCard: React.FC<{ 
  icon: React.ReactNode; 
  label: string; 
  value: string | number; 
  subtitle?: string;
  color?: 'gold' | 'blue' | 'green' | 'red';
}> = ({ icon, label, value, subtitle, color = 'gold' }) => {
  const colorClasses = {
    gold: 'from-[#FFCA40]/20 to-[#FFD55C]/10 border-[#FFCA40]/30',
    blue: 'from-blue-500/20 to-blue-600/10 border-blue-500/30',
    green: 'from-emerald-500/20 to-emerald-600/10 border-emerald-500/30',
    red: 'from-red-500/20 to-red-600/10 border-red-500/30',
  };

  return (
    <div className={`bg-gradient-to-br ${colorClasses[color]} backdrop-blur border rounded-2xl p-5`}>
      <div className="flex items-center gap-4">
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-[#FFCA40]/15 text-[#FFCA40]">
          {icon}
        </span>
        <div className="flex-1">
          <p className="text-xs uppercase tracking-wide text-white/60">{label}</p>
          <p className="text-2xl font-bold text-white">{value}</p>
          {subtitle && <p className="text-xs text-white/50 mt-1">{subtitle}</p>}
        </div>
      </div>
    </div>
  );
};

export default function CounselorDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [todayAppointments, setTodayAppointments] = useState<TodayAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [statsData, appointmentsData] = await Promise.all([
        apiCall<DashboardStats>('/api/counselor/stats'),
        apiCall<TodayAppointment[]>('/api/counselor/upcoming-today'),
      ]);
      
      setStats(statsData);
      setTodayAppointments(appointmentsData);
      setError(null);
    } catch (err) {
      console.error('Failed to load dashboard:', err);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#FFCA40] mb-4"></div>
          <p className="text-white/70">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-6 max-w-md text-center">
          <FiAlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-white mb-2">Error Loading Dashboard</h2>
          <p className="text-white/70 text-sm mb-4">{error}</p>
          <button
            onClick={loadDashboardData}
            className="px-4 py-2 bg-[#FFCA40] text-[#001d58] rounded-lg font-medium hover:bg-[#FFD55C] transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Dashboard</h1>
        <p className="text-white/60">Welcome to your counselor portal</p>
      </div>

      {/* Stats Grid */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard
            icon={<FiCalendar className="w-6 h-6" />}
            label="This Week"
            value={stats.this_week_appointments}
            subtitle="appointments"
            color="gold"
          />
          <StatCard
            icon={<FiClock className="w-6 h-6" />}
            label="Upcoming"
            value={stats.upcoming_appointments}
            subtitle="scheduled"
            color="blue"
          />
          <StatCard
            icon={<FiUsers className="w-6 h-6" />}
            label="Total Patients"
            value={stats.total_patients}
            subtitle={`${stats.total_completed_appointments} completed`}
            color="green"
          />
          <StatCard
            icon={<FiTrendingUp className="w-6 h-6" />}
            label="Rating"
            value={stats.average_rating.toFixed(1)}
            subtitle={`${stats.total_reviews} reviews`}
            color="gold"
          />
          <StatCard
            icon={<FiDollarSign className="w-6 h-6" />}
            label="Total Revenue"
            value={`Rp ${stats.total_revenue.toLocaleString()}`}
            subtitle="lifetime"
            color="green"
          />
        </div>
      )}

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's Appointments */}
        <div className="lg:col-span-2 bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold text-white">Today&apos;s Appointments</h2>
              <p className="text-sm text-white/60 mt-1">{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
            </div>
            <FiCalendar className="w-6 h-6 text-[#FFCA40]" />
          </div>

          {todayAppointments.length === 0 ? (
            <div className="text-center py-12">
              <FiCheckCircle className="w-12 h-12 text-white/30 mx-auto mb-3" />
              <p className="text-white/60">No appointments scheduled for today</p>
              <p className="text-white/40 text-sm mt-1">Enjoy your free time!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {todayAppointments.map((apt) => (
                <div 
                  key={apt.id}
                  className="bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/10 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-white">{apt.user.full_name}</h3>
                        <span className={`px-2 py-0.5 rounded text-xs ${
                          apt.status === 'scheduled' 
                            ? 'bg-blue-500/20 text-blue-300' 
                            : 'bg-gray-500/20 text-gray-300'
                        }`}>
                          {apt.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-white/60">
                        <span className="flex items-center gap-1">
                          <FiClock className="w-3 h-3" />
                          {formatTime(apt.scheduled_time)}
                        </span>
                        <span>{apt.duration_minutes} min</span>
                      </div>
                      {apt.notes && (
                        <p className="text-sm text-white/50 mt-2">{apt.notes}</p>
                      )}
                    </div>
                    <button 
                      onClick={() => router.push(`/counselor/appointments`)}
                      className="px-3 py-1.5 bg-[#FFCA40]/20 hover:bg-[#FFCA40]/30 border border-[#FFCA40]/30 rounded-lg text-sm font-medium text-[#FFCA40] transition-all">
                      View
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions & Stats */}
        <div className="space-y-6">
          {/* Profile Completion */}
          {stats && (
            <div className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Profile Completion</h3>
              <div className="relative pt-1">
                <div className="flex mb-2 items-center justify-between">
                  <div>
                    <span className="text-2xl font-bold text-white">
                      {Math.round(stats.profile_completion_percentage)}%
                    </span>
                  </div>
                </div>
                <div className="overflow-hidden h-3 text-xs flex rounded-full bg-white/10">
                  <div
                    style={{ width: `${stats.profile_completion_percentage}%` }}
                    className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-gradient-to-r from-[#FFCA40] to-[#FFD55C] transition-all duration-500"
                  />
                </div>
              </div>
              <p className="text-xs text-white/50 mt-3">
                Complete your profile to attract more patients
              </p>
            </div>
          )}

          {/* Quick Actions */}
          <div className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
            <div className="space-y-2">
              <a
                href="/counselor/cases"
                className="flex items-center gap-3 p-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-colors"
              >
                <FiClipboard className="w-5 h-5 text-[#FFCA40]" />
                <span className="text-sm text-white">View My Cases</span>
              </a>
              <a
                href="/counselor/appointments"
                className="flex items-center gap-3 p-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-colors"
              >
                <FiCalendar className="w-5 h-5 text-[#FFCA40]" />
                <span className="text-sm text-white">Manage Appointments</span>
              </a>
              <a
                href="/counselor/escalations"
                className="flex items-center gap-3 p-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-colors"
              >
                <FiAlertTriangle className="w-5 h-5 text-[#FFCA40]" />
                <span className="text-sm text-white">Check Escalations</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
