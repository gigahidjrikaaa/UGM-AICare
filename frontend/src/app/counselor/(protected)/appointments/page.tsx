'use client';

import { useState, useEffect } from 'react';
import {
  FiCalendar,
  FiClock,
  FiUser,
  FiVideo,
  FiMapPin,
  FiCheckCircle,
  FiXCircle,
  FiEdit,
} from 'react-icons/fi';
import { apiCall } from '@/utils/adminApi';

interface Appointment {
  appointment_id: string;
  patient_id_hash: string;
  patient_name?: string;
  date: string;
  time: string;
  duration_minutes: number;
  type: 'in_person' | 'video_call' | 'phone_call';
  status: 'scheduled' | 'completed' | 'cancelled' | 'no_show';
  location?: string;
  notes?: string;
}

const statusColors = {
  scheduled: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  completed: 'bg-green-500/20 text-green-300 border-green-500/30',
  cancelled: 'bg-red-500/20 text-red-300 border-red-500/30',
  no_show: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
};

const typeIcons = {
  in_person: FiMapPin,
  video_call: FiVideo,
  phone_call: FiClock,
};

export default function CounselorAppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => {
    loadAppointments();
  }, []);

  const loadAppointments = async () => {
    try {
      setLoading(true);
      // TODO: Replace with actual API endpoint
      const data = await apiCall<Appointment[]>('/api/counselor/appointments');
      
      // Mock fallback if API fails
      const mockAppointments: Appointment[] = [
        {
          appointment_id: 'APT-001',
          patient_id_hash: 'user_abc123',
          patient_name: 'Patient A',
          date: '2025-10-22',
          time: '10:00',
          duration_minutes: 60,
          type: 'video_call',
          status: 'scheduled',
        },
        {
          appointment_id: 'APT-002',
          patient_id_hash: 'user_def456',
          patient_name: 'Patient B',
          date: '2025-10-22',
          time: '14:00',
          duration_minutes: 45,
          type: 'in_person',
          status: 'scheduled',
          location: 'Room 301',
        },
        {
          appointment_id: 'APT-003',
          patient_id_hash: 'user_ghi789',
          patient_name: 'Patient C',
          date: '2025-10-21',
          time: '09:00',
          duration_minutes: 60,
          type: 'video_call',
          status: 'completed',
        },
      ];
      
      setAppointments(data || mockAppointments);
    } catch (err) {
      console.error('Failed to load appointments:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredAppointments = appointments.filter((apt) => {
    const statusMatch = filterStatus === 'all' || apt.status === filterStatus;
    return statusMatch;
  });

  const todayAppointments = filteredAppointments.filter(
    (apt) => apt.date === new Date().toISOString().split('T')[0]
  );
  const upcomingAppointments = filteredAppointments.filter(
    (apt) => new Date(apt.date) > new Date()
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#FFCA40] mb-4"></div>
          <p className="text-white/70">Loading appointments...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
            <FiCalendar className="w-8 h-8 text-[#FFCA40]" />
            Appointments
          </h1>
          <p className="text-white/60">Manage your appointment schedule</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-sm text-white focus:border-[#FFCA40] focus:ring-1 focus:ring-[#FFCA40]"
            title="Filter appointments by status"
          >
            <option value="all" className="bg-[#001d58]">All Status</option>
            <option value="scheduled" className="bg-[#001d58]">Scheduled</option>
            <option value="completed" className="bg-[#001d58]">Completed</option>
            <option value="cancelled" className="bg-[#001d58]">Cancelled</option>
            <option value="no_show" className="bg-[#001d58]">No Show</option>
          </select>
          <div className="flex bg-white/10 rounded-lg p-1">
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 rounded text-sm transition-all ${
                viewMode === 'list'
                  ? 'bg-[#FFCA40] text-[#001d58] font-medium'
                  : 'text-white/70 hover:text-white'
              }`}
            >
              List
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`px-3 py-1.5 rounded text-sm transition-all ${
                viewMode === 'calendar'
                  ? 'bg-[#FFCA40] text-[#001d58] font-medium'
                  : 'text-white/70 hover:text-white'
              }`}
            >
              Calendar
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white/5 backdrop-blur border border-white/10 rounded-xl p-4">
          <div className="text-2xl font-bold text-white">{todayAppointments.length}</div>
          <div className="text-xs text-white/60 mt-1">Today</div>
        </div>
        <div className="bg-white/5 backdrop-blur border border-white/10 rounded-xl p-4">
          <div className="text-2xl font-bold text-white">{upcomingAppointments.length}</div>
          <div className="text-xs text-white/60 mt-1">Upcoming</div>
        </div>
        <div className="bg-white/5 backdrop-blur border border-white/10 rounded-xl p-4">
          <div className="text-2xl font-bold text-white">
            {appointments.filter((a) => a.status === 'completed').length}
          </div>
          <div className="text-xs text-white/60 mt-1">Completed</div>
        </div>
        <div className="bg-white/5 backdrop-blur border border-white/10 rounded-xl p-4">
          <div className="text-2xl font-bold text-white">
            {appointments.filter((a) => a.status === 'cancelled' || a.status === 'no_show').length}
          </div>
          <div className="text-xs text-white/60 mt-1">Cancelled/No-Show</div>
        </div>
      </div>

      {/* Appointments List */}
      {viewMode === 'list' && (
        <div className="space-y-4">
          {filteredAppointments.length === 0 ? (
            <div className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-12 text-center">
              <FiCalendar className="w-12 h-12 text-white/20 mx-auto mb-3" />
              <p className="text-white/60">No appointments found</p>
            </div>
          ) : (
            filteredAppointments.map((appointment) => {
              const TypeIcon = typeIcons[appointment.type];
              return (
                <div
                  key={appointment.appointment_id}
                  className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all"
                >
                  <div className="flex items-start justify-between gap-4">
                    {/* Left: Date/Time */}
                    <div className="flex-shrink-0 text-center bg-[#FFCA40]/10 rounded-xl p-4 min-w-[120px]">
                      <div className="text-2xl font-bold text-[#FFCA40]">
                        {new Date(appointment.date).getDate()}
                      </div>
                      <div className="text-xs text-white/70 uppercase">
                        {new Date(appointment.date).toLocaleDateString('en-US', { month: 'short' })}
                      </div>
                      <div className="mt-2 pt-2 border-t border-white/10">
                        <div className="text-sm font-medium text-white">{appointment.time}</div>
                        <div className="text-xs text-white/60">{appointment.duration_minutes}m</div>
                      </div>
                    </div>

                    {/* Middle: Details */}
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="text-sm font-mono text-white/90">{appointment.appointment_id}</span>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium border ${statusColors[appointment.status]}`}>
                          {appointment.status.replace('_', ' ')}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <FiUser className="w-4 h-4 text-white/40" />
                        <span className="text-sm text-white/90">{appointment.patient_name || appointment.patient_id_hash}</span>
                      </div>

                      <div className="flex items-center gap-4 flex-wrap">
                        <div className="flex items-center gap-2 text-sm text-white/70">
                          <TypeIcon className="w-4 h-4 text-[#FFCA40]" />
                          <span>{appointment.type.replace('_', ' ')}</span>
                        </div>
                        {appointment.location && (
                          <div className="flex items-center gap-2 text-sm text-white/70">
                            <FiMapPin className="w-4 h-4 text-[#FFCA40]" />
                            <span>{appointment.location}</span>
                          </div>
                        )}
                      </div>

                      {appointment.notes && (
                        <div className="bg-white/5 rounded-lg p-3">
                          <p className="text-sm text-white/70">{appointment.notes}</p>
                        </div>
                      )}
                    </div>

                    {/* Right: Actions */}
                    <div className="flex-shrink-0 flex flex-col gap-2">
                      {appointment.status === 'scheduled' && (
                        <>
                          <button className="px-4 py-2 bg-[#FFCA40]/20 hover:bg-[#FFCA40]/30 border border-[#FFCA40]/30 rounded-lg text-sm font-medium text-[#FFCA40] transition-all flex items-center gap-2 whitespace-nowrap">
                            <FiCheckCircle className="w-4 h-4" />
                            Complete
                          </button>
                          <button className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/20 rounded-lg text-sm text-white/70 hover:text-white transition-all flex items-center gap-2 whitespace-nowrap">
                            <FiEdit className="w-4 h-4" />
                            Reschedule
                          </button>
                          <button className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-lg text-sm text-red-300 transition-all flex items-center gap-2 whitespace-nowrap">
                            <FiXCircle className="w-4 h-4" />
                            Cancel
                          </button>
                        </>
                      )}
                      {appointment.status === 'completed' && (
                        <button className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/20 rounded-lg text-sm text-white/70 hover:text-white transition-all flex items-center gap-2 whitespace-nowrap">
                          View Notes
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Calendar View (Placeholder) */}
      {viewMode === 'calendar' && (
        <div className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-12 text-center">
          <FiCalendar className="w-16 h-16 text-white/20 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">Calendar View</h3>
          <p className="text-white/60 mb-4">Full calendar integration coming soon</p>
          <button
            onClick={() => setViewMode('list')}
            className="px-4 py-2 bg-[#FFCA40]/20 border border-[#FFCA40]/30 rounded-lg text-sm font-medium text-[#FFCA40]"
          >
            Switch to List View
          </button>
        </div>
      )}
    </div>
  );
}
