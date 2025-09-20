'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import {
  FiEye,
  FiEdit,
  FiTrash2,
  FiMail,
  FiPhone,
  FiCopy,
  FiMessageCircle,
  FiMessageSquare,
  FiDownload,
  FiChevronDown,
  FiChevronUp,
  FiSend,
} from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { apiCall } from '@/utils/adminApi';
import { Button } from '@/components/ui/Button';
import Tooltip from '@/components/ui/Tooltip';

interface User {
  id: number;
  email: string | null;
  avatar_url?: string | null;
}

interface TherapistSchedule {
  id: number;
  day_of_week: string;
  start_time: string;
  end_time: string;
  is_available: boolean;
  reason: string | null;
}

interface TherapistApiResponse {
  id: number;
  email: string | null;
  name: string | null;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  specialization: string | null;
  is_available: boolean;
  allow_email_checkins: boolean;
  total_appointments: number;
  upcoming_schedules: TherapistSchedule[];
  image_url?: string | null;
  avatar_url?: string | null;
}

interface AppointmentTherapist {
  id: number;
  name: string;
  specialization: string | null;
  is_available: boolean;
  image_url?: string | null;
}

interface Therapist extends TherapistApiResponse {
  displayName: string;
  upcoming_schedules: TherapistSchedule[];
  schedules: TherapistSchedule[];
}

interface Appointment {
  id: number;
  user: User;
  psychologist: AppointmentTherapist;
  appointment_type: string;
  appointment_datetime: string;
  notes: string | null;
  status: string;
  created_at: string;
}

const DAY_ORDER = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

const getDayPosition = (day: string) => {
  const index = DAY_ORDER.indexOf(day);
  return index === -1 ? DAY_ORDER.length : index;
};

const groupScheduleByDay = (schedule: TherapistSchedule[]) => {
  const buckets = new Map<string, TherapistSchedule[]>();
  schedule.forEach((slot) => {
    const key = slot.day_of_week || 'Unspecified';
    const existing = buckets.get(key) ?? [];
    existing.push(slot);
    buckets.set(key, existing);
  });

  return Array.from(buckets.entries())
    .sort((a, b) => getDayPosition(a[0]) - getDayPosition(b[0]))
    .map(([day, slots]) => ({
      day,
      slots: [...slots].sort((slotA, slotB) => slotA.start_time.localeCompare(slotB.start_time)),
    }));
};

const getNextAvailableSlot = (schedule: TherapistSchedule[]) =>
  schedule.find((slot) => slot.is_available) ?? schedule[0];

export default function AppointmentManagementPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [psychologists, setPsychologists] = useState<Therapist[]>([]);
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
  const [selectedTherapist, setSelectedTherapist] = useState<Therapist | null>(null);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [newSchedule, setNewSchedule] = useState({
    day_of_week: 'Monday',
    start_time: '09:00',
    end_time: '17:00',
    is_available: true,
    reason: '',
  });
  const [therapistSchedules, setTherapistSchedules] = useState<Record<number, TherapistSchedule[]>>({});
  const [expandedTherapists, setExpandedTherapists] = useState<Record<number, boolean>>({});
  const [scheduleLoadingMap, setScheduleLoadingMap] = useState<Record<number, boolean>>({});

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
      const data = await apiCall<TherapistApiResponse[]>('/api/v1/admin/psychologists');
      const mapped: Therapist[] = data.map((item) => {
        const nameFromParts = [item.first_name, item.last_name]
          .filter((part) => part && part.trim().length)
          .join(' ')
          .trim();
        const displayName =
          (item.name && item.name.trim()) ||
          nameFromParts ||
          item.email ||
          'Therapist';
        const imageUrl = item.image_url ?? item.avatar_url ?? null;
        const avatarUrl = item.avatar_url ?? imageUrl ?? null;

        return {
          ...item,
          image_url: imageUrl,
          avatar_url: avatarUrl,
          displayName,
          upcoming_schedules: item.upcoming_schedules ?? [],
          schedules: item.upcoming_schedules ?? [],
        };
      });
      setPsychologists(mapped);
    } catch (error) {
      console.error('Error fetching psychologists:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to load therapists');
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

  const handleCopyToClipboard = async (value: string, successMessage: string) => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = value;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      toast.success(successMessage);
    } catch (err) {
      console.error('Copy failed', err);
      toast.error('Unable to copy value');
    }
  };

  const sanitizePhoneNumber = (value: string) => value.replace(/[^+\d]/g, '');

  const handleEmailTherapist = (email: string) => {
    if (!email) {
      toast.error('No email available for this therapist');
      return;
    }
    window.open(`mailto:${email}`, '_blank', 'noopener');
  };

  const handleCallTherapist = (phone: string) => {
    if (!phone) {
      toast.error('No phone number available for this therapist');
      return;
    }
    window.open(`tel:${sanitizePhoneNumber(phone)}`);
  };

  const handleWhatsAppTherapist = (phone: string) => {
    const digits = sanitizePhoneNumber(phone);
    if (!digits) {
      toast.error('No valid phone number available for WhatsApp');
      return;
    }
    window.open(`https://wa.me/${digits}`, '_blank', 'noopener');
  };

  const handleSmsTherapist = (phone: string) => {
    const digits = sanitizePhoneNumber(phone);
    if (!digits) {
      toast.error('No valid phone number available for SMS');
      return;
    }
    window.open(`sms:${digits}`);
  };

  const handleDownloadContactCard = (therapist: Therapist) => {
    const lines = [
      'BEGIN:VCARD',
      'VERSION:3.0',
      `FN:${therapist.displayName}`,
    ];
    if (therapist.last_name || therapist.first_name) {
      lines.push(
        `N:${therapist.last_name || ''};${therapist.first_name || ''};;;`
      );
    }
    if (therapist.specialization) {
      lines.push(`TITLE:${therapist.specialization}`);
    }
    if (therapist.email) {
      lines.push(`EMAIL;TYPE=WORK:${therapist.email}`);
    }
    if (therapist.phone) {
      lines.push(`TEL;TYPE=CELL:${sanitizePhoneNumber(therapist.phone)}`);
    }
    lines.push('END:VCARD');

    const blob = new Blob([lines.join('\n')], { type: 'text/vcard;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${therapist.displayName.replace(/\s+/g, '_').toLowerCase()}_contact.vcf`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    toast.success('Downloaded contact card');
  };

  const handleCheckInEmail = (therapist: Therapist) => {
    if (!therapist.email) {
      toast.error('No email available for this therapist');
      return;
    }

    const schedule = therapistSchedules[therapist.id] ?? therapist.upcoming_schedules ?? [];
    const nextSlot = getNextAvailableSlot(schedule) ?? null;
    const greeting = therapist.first_name || therapist.displayName || 'there';
    const subject = encodeURIComponent('Quick availability check-in');
    const slotDetails = nextSlot
      ? `I noticed your next availability is listed as ${nextSlot.day_of_week} from ${nextSlot.start_time} to ${nextSlot.end_time}.`
      : 'I wanted to make sure we have the latest view of your availability.';
    const body = encodeURIComponent(
      `Hi ${greeting},\n\n${slotDetails}\n\nLet me know if there are any updates or times that work best for you.\n\nThanks!\nAdmin Team`
    );

    window.open(`mailto:${therapist.email}?subject=${subject}&body=${body}`, '_blank', 'noopener');
  };

  const handleToggleSchedule = async (therapist: Therapist) => {
    if (expandedTherapists[therapist.id]) {
      setExpandedTherapists((prev) => ({ ...prev, [therapist.id]: false }));
      return;
    }

    if (!therapistSchedules[therapist.id]) {
      setScheduleLoadingMap((prev) => ({ ...prev, [therapist.id]: true }));
      let loaded = false;
      try {
        const data = await apiCall<TherapistSchedule[]>(`/api/v1/admin/therapists/${therapist.id}/schedule`);
        setTherapistSchedules((prev) => ({ ...prev, [therapist.id]: data }));
        loaded = true;
      } catch (error) {
        console.error('Error fetching therapist schedule:', error);
        toast.error(error instanceof Error ? error.message : 'Failed to load schedule');
      } finally {
        setScheduleLoadingMap((prev) => ({ ...prev, [therapist.id]: false }));
      }

      if (!loaded) {
        return;
      }
    }

    setExpandedTherapists((prev) => ({ ...prev, [therapist.id]: true }));
  };

  const handleScheduleModalOpen = async (therapistId: number) => {
    try {
      const data = await apiCall<TherapistSchedule[]>(`/api/v1/admin/therapists/${therapistId}/schedule`);
      setTherapistSchedules((prev) => ({ ...prev, [therapistId]: data }));
      const therapist = psychologists.find(p => p.id === therapistId);
      if (therapist) {
        setSelectedTherapist({ ...therapist, schedules: data, upcoming_schedules: data });
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
      await fetchPsychologists();
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
      await fetchPsychologists();
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
                    {filteredAppointments.map((appointment) => {
                      const patientAvatar = appointment.user.avatar_url || null;
                      const patientInitial = (appointment.user.email || 'U').charAt(0).toUpperCase();
                      const therapistAvatar = appointment.psychologist.image_url || null;
                      const therapistInitial = (appointment.psychologist.name || 'T').charAt(0).toUpperCase();

                      return (
                        <tr key={appointment.id}>
                          <td className="px-3 py-4 whitespace-nowrap text-sm">
                            <input
                              type="checkbox"
                              checked={!!selected[appointment.id]}
                              onChange={(e) =>
                                setSelected((prev) => ({ ...prev, [appointment.id]: e.target.checked }))
                              }
                            />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <div className="flex items-center gap-3">
                              <div className="relative h-10 w-10 rounded-full overflow-hidden border border-white/15 bg-white/5">
                                {patientAvatar ? (
                                  <Image
                                    src={patientAvatar}
                                    alt={`Avatar for ${appointment.user.email || 'user'}`}
                                    fill
                                    sizes="40px"
                                    className="object-cover"
                                  />
                                ) : (
                                  <div className="flex h-full w-full items-center justify-center bg-[#FFCA40]/10 text-sm font-semibold text-[#FFCA40]">
                                    {patientInitial}
                                  </div>
                                )}
                              </div>
                              <div>
                                <div className="text-sm font-medium text-white">
                                  {appointment.user.email || 'Unknown user'}
                                </div>
                                <div className="text-xs text-white/60">User #{appointment.user.id}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <div className="flex items-center gap-3 text-gray-400">
                              <div className="relative h-10 w-10 rounded-full overflow-hidden border border-white/15 bg-white/5">
                                {therapistAvatar ? (
                                  <Image
                                    src={therapistAvatar}
                                    alt={`Avatar for ${appointment.psychologist.name}`}
                                    fill
                                    sizes="40px"
                                    className="object-cover"
                                  />
                                ) : (
                                  <div className="flex h-full w-full items-center justify-center bg-white/10 text-sm font-semibold text-white/70">
                                    {therapistInitial}
                                  </div>
                                )}
                              </div>
                              <div>
                                <div className="text-sm font-medium text-white">
                                  {appointment.psychologist.name}
                                </div>
                                <div className="text-xs text-white/60">
                                  {appointment.psychologist.specialization || 'General practice'}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                            {new Date(appointment.appointment_datetime).toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <select
                              value={appointment.status}
                              onChange={(e) => updateStatus(appointment.id, e.target.value)}
                              className="bg-white/10 border border-white/20 rounded px-2 py-1 text-sm"
                            >
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
                            <button
                              title="View Details"
                              onClick={() => setViewAppt(appointment)}
                              className="text-white hover:text-gray-300 transition-colors mr-4"
                            >
                              <FiEye className="h-4 w-4" />
                            </button>
                            <button title="Edit Appointment" className="text-blue-400 hover:text-blue-300 transition-colors mr-4">
                              <FiEdit className="h-4 w-4" />
                            </button>
                            <button
                              title="Delete Appointment"
                              onClick={async () => {
                                if (confirm('Delete this appointment?')) {
                                  try {
                                    await apiCall(`/api/v1/admin/appointments/${appointment.id}`, { method: 'DELETE' });
                                    toast.success('Deleted');
                                    fetchAppointments();
                                  } catch (e: any) {
                                    toast.error(e?.message || 'Delete failed');
                                  }
                                }
                              }}
                              className="text-red-400 hover:text-red-300 transition-colors"
                            >
                              <FiTrash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'therapists' && (
            <div className="space-y-4">
              {psychologists.length === 0 ? (
                <div className="rounded-xl border border-white/15 bg-white/5 p-6 text-center text-sm text-white/60">
                  No therapists found. Invite your therapists to create accounts with the therapist role to manage schedules here.
                </div>
              ) : (
                psychologists.map((therapist) => {
                  const cachedSchedule = therapistSchedules[therapist.id];
                  const scheduleSource = cachedSchedule ?? therapist.upcoming_schedules ?? [];
                  const previewSchedule = scheduleSource.slice(0, 5);
                  const isExpanded = !!expandedTherapists[therapist.id];
                  const isLoadingSchedule = !!scheduleLoadingMap[therapist.id];
                  const groupedSchedule: ReturnType<typeof groupScheduleByDay> = isExpanded
                    ? groupScheduleByDay(scheduleSource)
                    : [];
                  const nextSlot = getNextAvailableSlot(scheduleSource) ?? null;
                  const sanitizedPhone = therapist.phone ? sanitizePhoneNumber(therapist.phone) : '';
                  const therapistPhoto = therapist.image_url || therapist.avatar_url || null;
                  const therapistInitial = therapist.displayName.charAt(0).toUpperCase();

                  const quickActions: Array<{
                    key: string;
                    label: string;
                    icon: JSX.Element;
                    onClick: () => void;
                    tone?: 'accent' | 'success';
                  }> = [];

                  if (therapist.email) {
                    quickActions.push(
                      {
                        key: 'email',
                        label: 'Email',
                        icon: <FiMail className="h-4 w-4" />,
                        onClick: () => handleEmailTherapist(therapist.email!),
                        tone: 'accent',
                      },
                      {
                        key: 'checkin-email',
                        label: 'Check-in email',
                        icon: <FiSend className="h-4 w-4" />,
                        onClick: () => handleCheckInEmail(therapist),
                        tone: 'accent',
                      },
                    );
                  }

                  if (therapist.phone) {
                    quickActions.push(
                      {
                        key: 'call',
                        label: 'Call',
                        icon: <FiPhone className="h-4 w-4" />,
                        onClick: () => handleCallTherapist(therapist.phone!),
                      },
                      {
                        key: 'sms',
                        label: 'SMS',
                        icon: <FiMessageSquare className="h-4 w-4" />,
                        onClick: () => handleSmsTherapist(therapist.phone!),
                      },
                      {
                        key: 'whatsapp',
                        label: 'WhatsApp',
                        icon: <FiMessageCircle className="h-4 w-4" />,
                        onClick: () => handleWhatsAppTherapist(therapist.phone!),
                        tone: 'success',
                      },
                    );
                  }

                  if (therapist.phone || therapist.email) {
                    quickActions.push({
                      key: 'save-contact',
                      label: 'Save contact',
                      icon: <FiDownload className="h-4 w-4" />,
                      onClick: () => handleDownloadContactCard(therapist),
                    });
                  }

                  const actionClassName = (tone?: 'accent' | 'success') => {
                    const base = 'inline-flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors border text-center';
                    if (tone === 'accent') {
                      return `${base} border-[#FFCA40]/40 bg-[#FFCA40]/10 text-[#FFCA40] hover:bg-[#FFCA40]/20`;
                    }
                    if (tone === 'success') {
                      return `${base} border-[#25D366]/50 text-[#25D366] hover:border-[#25D366]/70 hover:text-[#25D366]`;
                    }
                    return `${base} border-white/15 text-white/80 hover:border-white/40 hover:text-white`;
                  };

                  const contactRows = [
                    {
                      label: 'Email',
                      value: therapist.email ?? 'No email on record',
                      href: therapist.email ? `mailto:${therapist.email}` : undefined,
                      canCopy: !!therapist.email,
                      copyValue: therapist.email ?? '',
                      copyMessage: 'Email copied to clipboard',
                    },
                    {
                      label: 'Phone',
                      value: therapist.phone ?? 'No phone on record',
                      href: therapist.phone ? `tel:${sanitizedPhone}` : undefined,
                      canCopy: !!therapist.phone,
                      copyValue: therapist.phone ?? '',
                      copyMessage: 'Phone number copied to clipboard',
                    },
                  ];

                  return (
                    <div
                      key={therapist.id}
                      className="rounded-xl border border-white/15 bg-white/5 p-6 text-white/90 shadow-sm backdrop-blur"
                    >
                      <div className="space-y-6">
                        <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between md:gap-8">
                          <div className="flex items-start gap-4 md:gap-6">
                            <div className="relative h-20 w-20 md:h-24 md:w-24 rounded-2xl overflow-hidden border border-white/15 bg-white/5 flex-shrink-0">
                              {therapistPhoto ? (
                                <Image
                                  src={therapistPhoto}
                                  alt={`${therapist.displayName} avatar`}
                                  fill
                                  sizes="(max-width: 768px) 80px, 96px"
                                  className="object-cover"
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center bg-[#FFCA40]/10 text-2xl font-semibold text-[#FFCA40]">
                                  {therapistInitial}
                                </div>
                              )}
                            </div>
                            <div className="min-w-0 space-y-3">
                              <div className="flex flex-wrap items-center gap-3">
                                <h3 className="text-xl font-semibold text-white break-words leading-snug">
                                  {therapist.displayName}
                                </h3>
                                <span
                                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${therapist.is_available
                                    ? 'bg-green-500/20 text-green-300'
                                    : 'bg-gray-500/20 text-gray-300'}`}
                                >
                                  {therapist.is_available ? 'Available' : 'Unavailable'}
                                </span>
                              </div>
                              <p className="text-sm text-white/60 break-words">
                                {therapist.specialization || 'No specialization provided'}
                              </p>
                              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-white/60">
                                <span className="inline-flex items-center rounded-full border border-white/15 px-2.5 py-1">
                                  <span className="font-semibold text-white/80">{therapist.total_appointments}</span>
                                  <span className="ml-2">appointments handled</span>
                                </span>
                                {therapist.allow_email_checkins ? (
                                  <span className="inline-flex items-center rounded-full border border-[#FFCA40]/30 px-2.5 py-1 text-[#FFCA40]">
                                    Email check-ins enabled
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center rounded-full border border-white/10 px-2.5 py-1 text-white/50">
                                    Email check-ins disabled
                                  </span>
                                )}
                              </div>
                              {nextSlot && (
                                <div className="mt-2 text-xs text-white/60">
                                  Next slot:
                                  <span className="ml-1 text-white/90 break-words">
                                    {nextSlot.day_of_week} {nextSlot.start_time} - {nextSlot.end_time}
                                  </span>
                                  {!nextSlot.is_available && (
                                    <span className="ml-1 text-red-300">
                                      ({nextSlot.reason ? `Unavailable - ${nextSlot.reason}` : 'Unavailable'})
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>

                          {quickActions.length > 0 && (
                            <div className="w-full max-w-xl">
                              <div className="text-xs font-semibold uppercase tracking-wide text-white/60">
                                Reach out
                              </div>
                              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                                {quickActions.map((action) => (
                                  <button
                                    key={action.key}
                                    type="button"
                                    onClick={action.onClick}
                                    className={actionClassName(action.tone)}
                                  >
                                    {action.icon}
                                    <span>{action.label}</span>
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </header>

                        <div className="grid gap-4 md:grid-cols-3">
                          <section className="space-y-3 rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm">
                            <div className="text-xs font-semibold uppercase tracking-wide text-white/60">Contact details</div>
                            <dl className="space-y-3">
                              {contactRows.map((row) => (
                                <div key={row.label} className="flex items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <dt className="text-xs uppercase tracking-wide text-white/40">{row.label}</dt>
                                    <dd className="mt-1 text-sm">
                                      {row.href ? (
                                        <a href={row.href} className="text-white hover:text-[#FFCA40] break-words">
                                          {row.value}
                                        </a>
                                      ) : (
                                        <span className={`${row.canCopy ? 'text-white' : 'text-white/50'} break-words`}>
                                          {row.value}
                                        </span>
                                      )}
                                    </dd>
                                  </div>
                                  {row.canCopy && (
                                    <button
                                      type="button"
                                      onClick={() => handleCopyToClipboard(row.copyValue, row.copyMessage)}
                                      className="text-white/60 transition hover:text-white"
                                      aria-label={`Copy ${row.label.toLowerCase()}`}
                                    >
                                      <FiCopy className="h-4 w-4" />
                                    </button>
                                  )}
                                </div>
                              ))}
                            </dl>
                          </section>

                          <section className="space-y-3 rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm">
                            <div className="text-xs font-semibold uppercase tracking-wide text-white/60">Notes</div>
                            <p className="text-white/70">
                              Use the quick actions to reach out and confirm availability changes before manually adjusting schedules.
                            </p>
                            {therapist.allow_email_checkins ? (
                              <p className="rounded-md border border-[#FFCA40]/30 bg-[#FFCA40]/5 p-3 text-xs text-[#FFCA40]">
                                This therapist has opted in to receive proactive check-in emails.
                              </p>
                            ) : (
                              <p className="rounded-md border border-white/15 bg-black/30 p-3 text-xs text-white/60">
                                Email check-ins are disabled for this therapist.
                              </p>
                            )}
                          </section>

                          <section className="space-y-3 rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm">
                            <div className="flex items-center justify-between">
                              <div className="text-xs font-semibold uppercase tracking-wide text-white/60">Availability</div>
                              <button
                                type="button"
                                onClick={() => handleToggleSchedule(therapist)}
                                className="inline-flex items-center gap-1 text-xs font-medium text-[#FFCA40] hover:text-[#ffda63]"
                              >
                                {isExpanded ? (
                                  <>
                                    <FiChevronUp className="h-3 w-3" />
                                    Hide full schedule
                                  </>
                                ) : (
                                  <>
                                    <FiChevronDown className="h-3 w-3" />
                                    View full schedule
                                  </>
                                )}
                              </button>
                            </div>
                              <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                                {previewSchedule.length ? (
                                  <ul className="space-y-1 text-white/80">
                                    {previewSchedule.map((slot) => (
                                      <li key={slot.id} className="flex flex-wrap items-center gap-2 text-sm">
                                        <span className="font-medium text-white">{slot.day_of_week}</span>
                                        <span className="text-white/60">&bull;</span>
                                        <span>{slot.start_time} - {slot.end_time}</span>
                                      {!slot.is_available && (
                                        <span className="inline-flex items-center rounded-full bg-red-500/20 px-2 py-0.5 text-xs text-red-300">
                                          Unavailable
                                        </span>
                                      )}
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <div className="text-white/60">No schedule published yet.</div>
                              )}
                            </div>
                            {isExpanded && (
                              <div className="rounded-lg border border-white/10 bg-black/30 px-3 py-3">
                                {isLoadingSchedule ? (
                                  <div className="text-white/60 text-sm">Loading full schedule...</div>
                                ) : groupedSchedule.length ? (
                                  <div className="space-y-3">
                                    {groupedSchedule.map(({ day, slots }) => (
                                      <div key={`${therapist.id}-${day}`}>
                                        <div className="text-xs font-semibold uppercase tracking-wide text-white/60">{day}</div>
                                        <ul className="mt-1 space-y-1 text-white/75">
                                          {slots.map((slot) => (
                                            <li key={slot.id} className="flex flex-wrap items-center gap-2 text-sm">
                                              <span className="font-medium text-white">{slot.start_time} - {slot.end_time}</span>
                                              <span
                                                className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs ${slot.is_available
                                                  ? 'bg-green-500/20 text-green-300'
                                                  : 'bg-red-500/20 text-red-300'}`}
                                              >
                                                {slot.is_available ? 'Available' : 'Unavailable'}
                                              </span>
                                              {!slot.is_available && slot.reason && (
                                                <span className="text-xs text-white/60">({slot.reason})</span>
                                              )}
                                            </li>
                                          ))}
                                        </ul>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="text-white/60 text-sm">No schedule published yet.</div>
                                )}
                              </div>
                            )}
                          </section>
                        </div>

                        <footer className="flex flex-col gap-2 border-t border-white/10 pt-4 text-sm text-white/70 md:flex-row md:items-center md:justify-between">
                          <div>
                            Keep this record up to date by confirming changes with the therapist before editing availability.
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <Button variant="outline" size="sm" onClick={fetchPsychologists}>
                              Refresh list
                            </Button>
                            <Button size="sm" onClick={() => handleScheduleModalOpen(therapist.id)}>
                              Manage schedule
                            </Button>
                          </div>
                        </footer>
                      </div>
                    </div>
                  );
                })
              )}
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
                <h3 className="text-lg font-medium text-white">Schedule for {selectedTherapist.displayName}</h3>
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
            <div className="p-5 space-y-4 text-sm">
              <div className="flex items-center gap-3">
                <div className="text-gray-500 min-w-[70px]">Patient</div>
                <div className="flex items-center gap-3">
                  <div className="relative h-12 w-12 rounded-full overflow-hidden border border-white/15 bg-white/5">
                    {viewAppt.user.avatar_url ? (
                      <Image
                        src={viewAppt.user.avatar_url}
                        alt={`Avatar for ${viewAppt.user.email || 'user'}`}
                        fill
                        sizes="48px"
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-[#FFCA40]/10 text-base font-semibold text-[#FFCA40]">
                        {(viewAppt.user.email || 'U').charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="font-medium text-white">{viewAppt.user.email || 'Unknown'}</div>
                    <div className="text-xs text-gray-500">User #{viewAppt.user.id}</div>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-gray-500 min-w-[70px]">Therapist</div>
                <div className="flex items-center gap-3">
                  <div className="relative h-12 w-12 rounded-full overflow-hidden border border-white/15 bg-white/5">
                    {viewAppt.psychologist.image_url ? (
                      <Image
                        src={viewAppt.psychologist.image_url}
                        alt={`Avatar for ${viewAppt.psychologist.name}`}
                        fill
                        sizes="48px"
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-white/10 text-base font-semibold text-white/70">
                        {(viewAppt.psychologist.name || 'T').charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="font-medium text-white">{viewAppt.psychologist.name}</div>
                    <div className="text-xs text-gray-500">
                      {viewAppt.psychologist.specialization || 'General practice'}
                    </div>
                  </div>
                </div>
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
