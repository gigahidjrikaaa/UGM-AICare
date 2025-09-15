'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { FiCalendar, FiEye, FiEdit, FiTrash2 } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { apiCall } from '@/utils/adminApi';
import { Button } from '@/components/ui/Button';
import Tooltip from '@/components/ui/Tooltip';

interface User {
  id: number;
  email: string | null;
}

interface Psychologist {
  id: number;
  name: string;
  specialization: string | null;
  is_available: boolean;
  schedules: TherapistSchedule[];
}

interface TherapistSchedule {
  id: number;
  day_of_week: string;
  start_time: string;
  end_time: string;
  is_available: boolean;
  reason: string | null;
}

interface Appointment {
  id: number;
  user: User;
  psychologist: Psychologist;
  appointment_type: string;
  appointment_datetime: string;
  notes: string | null;
  status: string;
  created_at: string;
}

export default function AppointmentManagementPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [psychologists, setPsychologists] = useState<Psychologist[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('appointments');
  // Filters & selection
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [quick, setQuick] = useState<'all' | 'today' | 'upcoming'>('all');
  const [selected, setSelected] = useState<Record<number, boolean>>({});
  const [viewAppt, setViewAppt] = useState<Appointment | null>(null);
  const [selectedTherapist, setSelectedTherapist] = useState<Psychologist | null>(null);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [newSchedule, setNewSchedule] = useState({
    day_of_week: 'Monday',
    start_time: '09:00',
    end_time: '17:00',
    is_available: true,
    reason: '',
  });

  const fetchAppointments = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiCall<Appointment[]>('/api/v1/admin/appointments');
      setAppointments(data);
      setSelected({});
    } catch (error) {
      console.error('Error fetching appointments:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to load appointments');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchPsychologists = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiCall<Psychologist[]>('/api/v1/admin/psychologists');
      setPsychologists(data);
    } catch (error) {
      console.error('Error fetching psychologists:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to load psychologists');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Initialize tab from query param (?tab=therapists)
    const tab = searchParams?.get('tab');
    if (tab === 'therapists') setActiveTab('therapists');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setTabAndUrl = (tab: 'appointments' | 'therapists') => {
    setActiveTab(tab);
    try {
      const current = new URLSearchParams(searchParams?.toString());
      current.set('tab', tab);
      router.replace(`/admin/appointments?${current.toString()}`);
    } catch (e) {
      // no-op
    }
  };

  useEffect(() => {
    if (activeTab === 'appointments') {
      fetchAppointments();
    } else {
      fetchPsychologists();
    }
  }, [activeTab, fetchAppointments, fetchPsychologists]);

  const filteredAppointments = useMemo(() => {
    let list = [...appointments];
    const q = searchTerm.trim().toLowerCase();
    if (q) {
      list = list.filter(a =>
        (a.user.email || '').toLowerCase().includes(q) ||
        (a.psychologist.name || '').toLowerCase().includes(q) ||
        (a.appointment_type || '').toLowerCase().includes(q)
      );
    }
    if (statusFilter) {
      list = list.filter(a => a.status === statusFilter);
    }
    if (dateFrom) {
      const from = new Date(dateFrom);
      list = list.filter(a => new Date(a.appointment_datetime) >= from);
    }
    if (dateTo) {
      const to = new Date(dateTo);
      list = list.filter(a => new Date(a.appointment_datetime) <= new Date(to.getTime() + 86400000 - 1));
    }
    if (quick === 'today') {
      const today = new Date();
      list = list.filter(a => {
        const d = new Date(a.appointment_datetime);
        return d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth() && d.getDate() === today.getDate();
      });
    } else if (quick === 'upcoming') {
      const now = new Date();
      list = list.filter(a => new Date(a.appointment_datetime) >= now);
    }
    // Sort by date desc
    list.sort((a,b) => +new Date(b.appointment_datetime) - +new Date(a.appointment_datetime));
    return list;
  }, [appointments, searchTerm, statusFilter, dateFrom, dateTo, quick]);

  const allSelected = filteredAppointments.length > 0 && filteredAppointments.every(a => selected[a.id]);
  const toggleSelectAll = (value: boolean) => {
    const next: Record<number, boolean> = { ...selected };
    filteredAppointments.forEach(a => { next[a.id] = value; });
    setSelected(next);
  };
  const selectedIds = useMemo(() => Object.entries(selected).filter(([,v])=>v).map(([k]) => Number(k)), [selected]);

  const updateStatus = async (id: number, status: string) => {
    try {
      await apiCall(`/api/v1/admin/appointments/${id}`, { method: 'PUT', body: JSON.stringify({ status }) });
      toast.success('Status updated');
      fetchAppointments();
    } catch (e:any) {
      toast.error(e?.message || 'Failed to update status');
    }
  };

  const bulkUpdate = async (status: string) => {
    if (!selectedIds.length) return;
    try {
      await Promise.all(selectedIds.map(id => apiCall(`/api/v1/admin/appointments/${id}`, { method: 'PUT', body: JSON.stringify({ status }) })));
      toast.success(`Updated ${selectedIds.length} appointments`);
      fetchAppointments();
    } catch (e:any) {
      toast.error(e?.message || 'Bulk update failed');
    }
  };

  const bulkDelete = async () => {
    if (!selectedIds.length) return;
    if (!confirm(`Delete ${selectedIds.length} appointments? This cannot be undone.`)) return;
    try {
      await Promise.all(selectedIds.map(id => apiCall(`/api/v1/admin/appointments/${id}`, { method: 'DELETE' })));
      toast.success('Deleted selected');
      fetchAppointments();
    } catch (e:any) {
      toast.error(e?.message || 'Bulk delete failed');
    }
  };

  const exportCSV = (rows: Appointment[]) => {
    const header = ['ID','Patient Email','Therapist','Type','DateTime','Status','Created At','Notes'];
    const lines = rows.map(a => [a.id, a.user.email || 'N/A', a.psychologist.name, a.appointment_type, new Date(a.appointment_datetime).toISOString(), a.status, a.created_at, (a.notes || '').replace(/\n/g,' ')].join(','));
    const csv = [header.join(','), ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `appointments_${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const handleScheduleModalOpen = async (therapistId: number) => {
    try {
      const data = await apiCall<TherapistSchedule[]>(`/api/v1/admin/therapists/${therapistId}/schedule`);
      const therapist = psychologists.find(p => p.id === therapistId);
      if (therapist) {
        setSelectedTherapist({ ...therapist, schedules: data });
        setIsScheduleModalOpen(true);
      }
    } catch (error) {
      console.error('Error fetching therapist schedule:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to load schedule');
    }
  };
  const handleScheduleModalClose = () => {
    setSelectedTherapist(null);
    setIsScheduleModalOpen(false);
  };

  const handleNewScheduleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setNewSchedule((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleCreateSchedule = async () => {
    if (!selectedTherapist) return;
    try {
      await apiCall(`/api/v1/admin/therapists/${selectedTherapist.id}/schedule`, {
        method: 'POST',
        body: JSON.stringify(newSchedule),
      });
      toast.success('Schedule created successfully');
      handleScheduleModalOpen(selectedTherapist.id); // Refresh the schedule
    } catch (error) {
      console.error('Error creating schedule:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create schedule');
    }
  };

  const handleDeleteSchedule = async (scheduleId: number) => {
    if (!selectedTherapist) return;
    if (!confirm('Are you sure you want to delete this schedule?')) return;
    try {
      await apiCall(`/api/v1/admin/therapists/schedule/${scheduleId}`, {
        method: 'DELETE',
      });
      toast.success('Schedule deleted successfully');
      handleScheduleModalOpen(selectedTherapist.id); // Refresh the schedule
    } catch (error) {
      console.error('Error deleting schedule:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete schedule');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-white">Appointment Management</h1>
      </div>

      <div className="flex border-b border-white/20">
        <button
          onClick={() => setTabAndUrl('appointments')}
          className={`px-4 py-2 text-sm font-medium ${
            activeTab === 'appointments'
              ? 'text-[#FFCA40] border-b-2 border-[#FFCA40]'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Appointments
        </button>
        <button
          onClick={() => setTabAndUrl('therapists')}
          className={`px-4 py-2 text-sm font-medium ${
            activeTab === 'therapists'
              ? 'text-[#FFCA40] border-b-2 border-[#FFCA40]'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Therapists
        </button>
      </div>

      {/* Filters Toolbar */}
      {activeTab === 'appointments' && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col md:flex-row gap-3 md:items-end md:justify-between">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 w-full">
            <div>
              <label className="block text-xs text-gray-300 mb-1">Search</label>
              <input value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} placeholder="Email, therapist, type" className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-md text-white text-sm" />
            </div>
            <div>
              <label className="block text-xs text-gray-300 mb-1">Status</label>
              <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-md text-white text-sm">
                <option value="">All</option>
                <option value="scheduled">Scheduled</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-300 mb-1">From</label>
              <input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)} className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-md text-white text-sm" />
            </div>
            <div>
              <label className="block text-xs text-gray-300 mb-1">To</label>
              <input type="date" value={dateTo} onChange={e=>setDateTo(e.target.value)} className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-md text-white text-sm" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={()=>{setQuick('today')}} className={quick==='today' ? 'border-[#FFCA40]' : ''}>Today</Button>
            <Button variant="outline" onClick={()=>{setQuick('upcoming')}} className={quick==='upcoming' ? 'border-[#FFCA40]' : ''}>Upcoming</Button>
            <Button variant="outline" onClick={()=>{setQuick('all')}} className={quick==='all' ? 'border-[#FFCA40]' : ''}>All</Button>
            <Button variant="outline" onClick={()=>exportCSV(filteredAppointments)}>Export</Button>
            <Button onClick={fetchAppointments}>Refresh</Button>
          </div>
        </div>
      )}

      {/* Bulk actions bar */}
      {activeTab === 'appointments' && selectedIds.length > 0 && (
        <div className="bg-yellow-500/10 border border-yellow-400/30 rounded-xl p-3 flex items-center justify-between">
          <div className="text-sm text-yellow-100">{selectedIds.length} selected</div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={()=>bulkUpdate('completed')}>Mark Completed</Button>
            <Button variant="outline" onClick={()=>bulkUpdate('cancelled')}>Cancel</Button>
            <Button variant="outline" onClick={()=>exportCSV(appointments.filter(a=>selected[a.id]))}>Export</Button>
            <Button variant="outline" onClick={bulkDelete}>Delete</Button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center p-8">
          <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-white/20"></div>
        </div>
      ) : (
        <>
          {activeTab === 'appointments' && (
            <div className="bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-white/20">
                  <thead className="bg-white/5">
                    <tr>
                      <th className="px-3 py-3">
                        <input type="checkbox" checked={allSelected} onChange={e=>toggleSelectAll(e.target.checked)} />
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Patient</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Therapist</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Date & Time</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Notes</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-transparent divide-y divide-white/20">
                    {filteredAppointments.map((appointment) => (
                      <tr key={appointment.id}>
                        <td className="px-3 py-4 whitespace-nowrap text-sm">
                          <input type="checkbox" checked={!!selected[appointment.id]} onChange={e=>setSelected(prev=>({...prev,[appointment.id]: e.target.checked}))} />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">{appointment.user.email}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">{appointment.psychologist.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">{new Date(appointment.appointment_datetime).toLocaleString()}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <select value={appointment.status} onChange={e=>updateStatus(appointment.id, e.target.value)} className="bg-white/10 border border-white/20 rounded px-2 py-1 text-sm">
                            <option value="scheduled">Scheduled</option>
                            <option value="completed">Completed</option>
                            <option value="cancelled">Cancelled</option>
                          </select>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400 max-w-[240px]">
                          {appointment.notes ? (
                            <Tooltip title={appointment.notes}>
                              <span className="line-clamp-1 inline-block align-middle">{appointment.notes}</span>
                            </Tooltip>
                          ) : (
                            <span className="text-gray-500">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button title="View Details" onClick={()=>setViewAppt(appointment)} className="text-white hover:text-gray-300 transition-colors mr-4">
                            <FiEye className="h-4 w-4" />
                          </button>
                          <button title="Edit Appointment" className="text-blue-400 hover:text-blue-300 transition-colors mr-4">
                            <FiEdit className="h-4 w-4" />
                          </button>
                          <button title="Delete Appointment" onClick={async()=>{ if (confirm('Delete this appointment?')) { try { await apiCall(`/api/v1/admin/appointments/${appointment.id}`, { method: 'DELETE' }); toast.success('Deleted'); fetchAppointments(); } catch(e:any){ toast.error(e?.message || 'Delete failed'); } } }} className="text-red-400 hover:text-red-300 transition-colors">
                            <FiTrash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'therapists' && (
            <div className="bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-white/20">
                  <thead className="bg-white/5">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Specialization</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-transparent divide-y divide-white/20">
                    {psychologists.map((psychologist) => (
                      <tr key={psychologist.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">{psychologist.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">{psychologist.specialization}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {psychologist.is_available ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-500/20 text-green-400">
                              Available
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-500/20 text-gray-400">
                              Unavailable
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button title="View Details" onClick={() => handleScheduleModalOpen(psychologist.id)} className="text-white hover:text-gray-300 transition-colors mr-4">
                            <FiCalendar className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      <AnimatePresence>
        {isScheduleModalOpen && selectedTherapist && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
            onClick={handleScheduleModalClose}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-6 py-4 border-b border-white/20">
                <h3 className="text-lg font-medium text-white">Schedule for {selectedTherapist.name}</h3>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {selectedTherapist.schedules.map((schedule) => (
                    <div key={schedule.id} className="p-4 border border-white/20 rounded-lg flex justify-between items-center">
                      <div>
                        <p className="text-sm font-medium text-white">{schedule.day_of_week}</p>
                        <p className="text-xs text-gray-400">{schedule.start_time} - {schedule.end_time}</p>
                        <p className={`text-xs ${schedule.is_available ? 'text-green-400' : 'text-red-400'}`}>
                          {schedule.is_available ? 'Available' : 'Unavailable'} {schedule.reason && `(${schedule.reason})`}
                        </p>
                      </div>
                      <button title="Delete Schedule" onClick={() => handleDeleteSchedule(schedule.id)} className="text-red-400 hover:text-red-300">
                        <FiTrash2 />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="mt-6">
                  <h4 className="text-md font-medium text-white mb-2">Add New Schedule</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <select aria-label="Day of the week" name="day_of_week" value={newSchedule.day_of_week} onChange={handleNewScheduleChange} className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:ring-2 focus:ring-[#FFCA40] focus:border-[#FFCA40] transition-colors">
                      <option>Monday</option>
                      <option>Tuesday</option>
                      <option>Wednesday</option>
                      <option>Thursday</option>
                      <option>Friday</option>
                      <option>Saturday</option>
                      <option>Sunday</option>
                    </select>
                    <input aria-label="Start Time" type="time" name="start_time" value={newSchedule.start_time} onChange={handleNewScheduleChange} className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:ring-2 focus:ring-[#FFCA40] focus:border-[#FFCA40] transition-colors" />
                    <input aria-label="End Time" type="time" name="end_time" value={newSchedule.end_time} onChange={handleNewScheduleChange} className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:ring-2 focus:ring-[#FFCA40] focus:border-[#FFCA40] transition-colors" />
                  </div>
                  <div className="mt-4">
                    <label className="flex items-center">
                      <input aria-label="Available" type="checkbox" name="is_available" checked={newSchedule.is_available} onChange={handleNewScheduleChange} className="h-4 w-4 text-[#FFCA40] focus:ring-[#FFCA40] bg-white/10 border-white/20 rounded" />
                      <span className="ml-2 text-sm text-gray-300">Available</span>
                    </label>
                  </div>
                  {!newSchedule.is_available && (
                    <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-300 mb-2">Reason for Unavailability</label>
                      <input type="text" title='Delete Schedule' name="reason" value={newSchedule.reason} onChange={handleNewScheduleChange} className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-[#FFCA40] focus:border-[#FFCA40] transition-colors" />
                    </div>
                  )}
                  <div className="mt-4">
                    <button onClick={handleCreateSchedule} className="inline-flex items-center px-4 py-2 bg-[#FFCA40] hover:bg-[#ffda63] text-black rounded-lg text-sm font-medium transition-colors">
                      Add Schedule
                    </button>
                  </div>
                </div>
              </div>
              <div className="px-6 py-4 border-t border-white/20 flex justify-end">
                <button onClick={handleScheduleModalClose} className="px-4 py-2 bg-gray-500/20 text-gray-300 rounded-lg hover:bg-gray-500/30">Close</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* View details slide-over */}
      {viewAppt && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/50" onClick={()=>setViewAppt(null)} />
          <div className="absolute right-0 top-0 h-full w-full sm:w-[520px] bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700 shadow-xl overflow-y-auto">
            <div className="p-5 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Appointment #{viewAppt.id}</h3>
              <Button variant="outline" size="sm" onClick={()=>setViewAppt(null)}>Close</Button>
            </div>
            <div className="p-5 space-y-3 text-sm">
              <div>
                <div className="text-gray-500">Patient</div>
                <div className="font-medium">{viewAppt.user.email || 'Unknown'}</div>
              </div>
              <div>
                <div className="text-gray-500">Therapist</div>
                <div className="font-medium">{viewAppt.psychologist.name}</div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-gray-500">Date & Time</div>
                  <div className="font-medium">{new Date(viewAppt.appointment_datetime).toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-gray-500">Status</div>
                  <div className="font-medium capitalize">{viewAppt.status}</div>
                </div>
              </div>
              <div>
                <div className="text-gray-500">Type</div>
                <div className="font-medium">{viewAppt.appointment_type}</div>
              </div>
              <div>
                <div className="text-gray-500">Created</div>
                <div className="font-medium">{new Date(viewAppt.created_at).toLocaleString()}</div>
              </div>
              <div>
                <div className="text-gray-500">Notes</div>
                <div className="font-medium whitespace-pre-wrap break-words">{viewAppt.notes || '—'}</div>
              </div>
            </div>
            <div className="p-5 border-t border-gray-200 dark:border-gray-700 flex items-center justify-end gap-2">
              <Button variant="outline" onClick={()=>exportCSV([viewAppt])}>Export CSV</Button>
              <Button onClick={()=>{ updateStatus(viewAppt.id, viewAppt.status === 'cancelled' ? 'scheduled' : 'cancelled'); }}>Toggle Cancel</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
