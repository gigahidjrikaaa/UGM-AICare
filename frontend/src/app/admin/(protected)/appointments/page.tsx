'use client';

import { useState, useEffect, useCallback } from 'react';
import { FiCalendar, FiEye, FiEdit, FiTrash2 } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { apiCall } from '@/utils/adminApi';
import { useTranslations } from 'next-intl';

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
  const t = useTranslations('Appointments');
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [psychologists, setPsychologists] = useState<Psychologist[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('appointments');
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
    if (activeTab === 'appointments') {
      fetchAppointments();
    } else {
      fetchPsychologists();
    }
  }, [activeTab, fetchAppointments, fetchPsychologists]);

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
        <h1 className="text-3xl font-bold text-white">{t('title', { fallback: 'Appointment Management' })}</h1>
      </div>

      <div className="flex border-b border-white/20">
        <button
          onClick={() => setActiveTab('appointments')}
          className={`px-4 py-2 text-sm font-medium ${
            activeTab === 'appointments'
              ? 'text-[#FFCA40] border-b-2 border-[#FFCA40]'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          {t('tab.appointments', { fallback: 'Appointments' })}
        </button>
        <button
          onClick={() => setActiveTab('therapists')}
          className={`px-4 py-2 text-sm font-medium ${
            activeTab === 'therapists'
              ? 'text-[#FFCA40] border-b-2 border-[#FFCA40]'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          {t('tab.therapists', { fallback: 'Therapists' })}
        </button>
      </div>

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
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">{t('th.patient', { fallback: 'Patient' })}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">{t('th.therapist', { fallback: 'Therapist' })}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">{t('th.datetime', { fallback: 'Date & Time' })}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">{t('th.status', { fallback: 'Status' })}</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">{t('th.actions', { fallback: 'Actions' })}</th>
                    </tr>
                  </thead>
                  <tbody className="bg-transparent divide-y divide-white/20">
                    {appointments.map((appointment) => (
                      <tr key={appointment.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">{appointment.user.email}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">{appointment.psychologist.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">{new Date(appointment.appointment_datetime).toLocaleString()}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">{appointment.status}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button title={t('action.view', { fallback: 'View Details' })} className="text-white hover:text-gray-300 transition-colors mr-4">
                            <FiEye className="h-4 w-4" />
                          </button>
                          <button title={t('action.edit', { fallback: 'Edit Appointment' })} className="text-blue-400 hover:text-blue-300 transition-colors mr-4">
                            <FiEdit className="h-4 w-4" />
                          </button>
                          <button title={t('action.delete', { fallback: 'Delete Appointment' })} className="text-red-400 hover:text-red-300 transition-colors">
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
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">{t('th.name', { fallback: 'Name' })}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">{t('th.specialization', { fallback: 'Specialization' })}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">{t('th.status', { fallback: 'Status' })}</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">{t('th.actions', { fallback: 'Actions' })}</th>
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
                              {t('available', { fallback: 'Available' })}
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-500/20 text-gray-400">
                              {t('unavailable', { fallback: 'Unavailable' })}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button title={t('action.view', { fallback: 'View Details' })} onClick={() => handleScheduleModalOpen(psychologist.id)} className="text-white hover:text-gray-300 transition-colors mr-4">
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
                <h3 className="text-lg font-medium text-white">{t('scheduleFor', { fallback: 'Schedule for' })} {selectedTherapist.name}</h3>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {selectedTherapist.schedules.map((schedule) => (
                    <div key={schedule.id} className="p-4 border border-white/20 rounded-lg flex justify-between items-center">
                      <div>
                        <p className="text-sm font-medium text-white">{schedule.day_of_week}</p>
                        <p className="text-xs text-gray-400">{schedule.start_time} - {schedule.end_time}</p>
                        <p className={`text-xs ${schedule.is_available ? 'text-green-400' : 'text-red-400'}`}>
                          {schedule.is_available ? t('available', { fallback: 'Available' }) : t('unavailable', { fallback: 'Unavailable' })} {schedule.reason && `(${schedule.reason})`}
                        </p>
                      </div>
                      <button title="Delete Schedule" onClick={() => handleDeleteSchedule(schedule.id)} className="text-red-400 hover:text-red-300">
                        <FiTrash2 />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="mt-6">
                  <h4 className="text-md font-medium text-white mb-2">{t('addSchedule', { fallback: 'Add New Schedule' })}</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <select aria-label="Day of the week" name="day_of_week" value={newSchedule.day_of_week} onChange={handleNewScheduleChange} className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:ring-2 focus:ring-[#FFCA40] focus:border-[#FFCA40] transition-colors">
                      <option>{t('day.monday', { fallback: 'Monday' })}</option>
                      <option>{t('day.tuesday', { fallback: 'Tuesday' })}</option>
                      <option>{t('day.wednesday', { fallback: 'Wednesday' })}</option>
                      <option>{t('day.thursday', { fallback: 'Thursday' })}</option>
                      <option>{t('day.friday', { fallback: 'Friday' })}</option>
                      <option>{t('day.saturday', { fallback: 'Saturday' })}</option>
                      <option>{t('day.sunday', { fallback: 'Sunday' })}</option>
                    </select>
                    <input aria-label="Start Time" type="time" name="start_time" value={newSchedule.start_time} onChange={handleNewScheduleChange} className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:ring-2 focus:ring-[#FFCA40] focus:border-[#FFCA40] transition-colors" />
                    <input aria-label="End Time" type="time" name="end_time" value={newSchedule.end_time} onChange={handleNewScheduleChange} className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:ring-2 focus:ring-[#FFCA40] focus:border-[#FFCA40] transition-colors" />
                  </div>
                  <div className="mt-4">
                    <label className="flex items-center">
                      <input aria-label="Available" type="checkbox" name="is_available" checked={newSchedule.is_available} onChange={handleNewScheduleChange} className="h-4 w-4 text-[#FFCA40] focus:ring-[#FFCA40] bg-white/10 border-white/20 rounded" />
                      <span className="ml-2 text-sm text-gray-300">{t('available', { fallback: 'Available' })}</span>
                    </label>
                  </div>
                  {!newSchedule.is_available && (
                    <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-300 mb-2">{t('unavailableReason', { fallback: 'Reason for Unavailability' })}</label>
                      <input type="text" title='Delete Schedule' name="reason" value={newSchedule.reason} onChange={handleNewScheduleChange} className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-[#FFCA40] focus:border-[#FFCA40] transition-colors" />
                    </div>
                  )}
                  <div className="mt-4">
                    <button onClick={handleCreateSchedule} className="inline-flex items-center px-4 py-2 bg-[#FFCA40] hover:bg-[#ffda63] text-black rounded-lg text-sm font-medium transition-colors">
                      {t('addSchedule', { fallback: 'Add Schedule' })}
                    </button>
                  </div>
                </div>
              </div>
              <div className="px-6 py-4 border-t border-white/20 flex justify-end">
                <button onClick={handleScheduleModalClose} className="px-4 py-2 bg-gray-500/20 text-gray-300 rounded-lg hover:bg-gray-500/30">{t('close', { fallback: 'Close' })}</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
