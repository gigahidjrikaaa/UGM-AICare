'use client';

import { useState, useEffect } from 'react';
import {
  usePsychologists,
  useCreatePsychologist,
  useUpdatePsychologist,
  useTogglePsychologistAvailability,
  useDeletePsychologist,
} from '@/hooks/usePsychologists';
import * as api from '@/lib/appointments-api';
import { 
  FiPlus as Plus, 
  FiSearch as Search, 
  FiEdit as Edit2, 
  FiTrash2 as Trash2, 
  FiUsers as Users, 
  FiStar as Star,
  FiFilter as Filter,
  FiActivity as Activity,
  FiX,
  FiRefreshCw,
} from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

export default function AdminPsychologistsPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [isAvailableFilter, setIsAvailableFilter] = useState<boolean | undefined>(undefined);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedPsychologist, setSelectedPsychologist] = useState<api.PsychologistResponse | null>(null);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Psychologist Management</h1>
          <p className="text-white/70">Manage psychologist profiles, availability, and assignments</p>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="flex items-center gap-2 px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white/80 hover:bg-white/10 hover:text-white transition-all group"
          title="Refresh data"
        >
          <FiRefreshCw className="w-5 h-5 group-hover:rotate-180 transition-transform duration-500" />
          Refresh
        </button>
      </div>

      {/* Stats Cards */}
      <StatsCards />

      {/* Actions Bar */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-4"
      >
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/40 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by name or specialization..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:ring-2 focus:ring-[#FFCA40] focus:border-transparent transition-all"
              />
            </div>
          </div>

          {/* Availability Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-white/60" />
            <label htmlFor="availability-filter" className="sr-only">Filter by availability</label>
            <select
              id="availability-filter"
              value={isAvailableFilter === undefined ? '' : isAvailableFilter.toString()}
              onChange={(e) =>
                setIsAvailableFilter(e.target.value === '' ? undefined : e.target.value === 'true')
              }
              className="px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-[#FFCA40] focus:border-transparent"
            >
              <option value="">All Status</option>
              <option value="true">Available</option>
              <option value="false">Unavailable</option>
            </select>
          </div>

          {/* Create Button */}
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-6 py-2.5 bg-[#FFCA40] text-[#001D58] font-semibold rounded-lg hover:bg-[#FFD666] transition-all shadow-lg hover:shadow-xl"
          >
            <Plus className="w-5 h-5" />
            Add Psychologist
          </button>
        </div>
      </motion.div>

      {/* Psychologists Table */}
      <PsychologistsTable
        search={search}
        page={page}
        isAvailable={isAvailableFilter}
        onPageChange={setPage}
        onEdit={(psychologist) => {
          setSelectedPsychologist(psychologist);
          setShowEditModal(true);
        }}
      />

      {/* Create Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <CreatePsychologistModal onClose={() => setShowCreateModal(false)} />
        )}
      </AnimatePresence>

      {/* Edit Modal */}
      <AnimatePresence>
        {showEditModal && selectedPsychologist && (
          <EditPsychologistModal
            psychologist={selectedPsychologist}
            onClose={() => {
              setShowEditModal(false);
              setSelectedPsychologist(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ========================================
// Stats Cards Component
// ========================================

function StatsCards() {
  const { data } = usePsychologists({ page: 1, page_size: 1 });

  const stats = [
    {
      label: 'Total Psychologists',
      value: data?.total || 0,
      icon: Users,
      color: 'from-blue-500 to-cyan-500',
    },
    {
      label: 'Available',
      value: data?.psychologists?.filter(p => p.is_available).length || 0,
      icon: Activity,
      color: 'from-green-500 to-emerald-500',
    },
    {
      label: 'Average Rating',
      value: data?.psychologists?.length 
        ? (data.psychologists.reduce((acc, p) => acc + p.rating, 0) / data.psychologists.length).toFixed(1)
        : '0.0',
      icon: Star,
      color: 'from-yellow-500 to-orange-500',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {stats.map((stat, index) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6 hover:bg-white/10 transition-all group"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-white/70 text-sm mb-1">{stat.label}</p>
              <p className="text-3xl font-bold text-white">{stat.value}</p>
            </div>
            <div className={`p-3 rounded-lg bg-gradient-to-br ${stat.color} group-hover:scale-110 transition-transform`}>
              <stat.icon className="w-6 h-6 text-white" />
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

// ========================================
// Psychologists Table Component
// ========================================

function PsychologistsTable({
  search,
  page,
  isAvailable,
  onPageChange,
  onEdit,
}: {
  search: string;
  page: number;
  isAvailable?: boolean;
  onPageChange: (page: number) => void;
  onEdit: (psychologist: api.PsychologistResponse) => void;
}) {
  const { data, isLoading, error } = usePsychologists({
    page,
    page_size: 10,
    search: search || undefined,
    is_available: isAvailable,
  });

  // Debug logging
  useEffect(() => {
    if (data) {
      console.log('🔍 [Psychologists Table] Data received:', data);
      console.log('🔍 [Psychologists Table] Psychologists count:', data.psychologists?.length);
      console.log('🔍 [Psychologists Table] Total:', data.total);
      console.log('🔍 [Psychologists Table] Current filters:', { page, search, isAvailable });
    }
  }, [data, page, search, isAvailable]);

  const toggleAvailability = useTogglePsychologistAvailability();
  const deletePsychologist = useDeletePsychologist();

  if (isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-12 text-center"
      >
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FFCA40] mx-auto"></div>
        <p className="mt-4 text-white/70">Loading psychologists...</p>
      </motion.div>
    );
  }

  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="bg-red-500/10 backdrop-blur-sm rounded-xl border border-red-500/20 p-8 text-center"
      >
        <p className="text-red-400">Error loading psychologists: {error.message}</p>
      </motion.div>
    );
  }

  if (!data || !data.psychologists || data.psychologists.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-12 text-center"
      >
        <Users className="w-16 h-16 text-white/20 mx-auto mb-4" />
        <p className="text-white/70 text-lg">No psychologists found</p>
        <p className="text-white/50 text-sm mt-2">Try adjusting your search or filters</p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 overflow-hidden"
    >
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-white/10">
          <thead className="bg-white/5">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold text-white/70 uppercase tracking-wider">
                Psychologist
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-white/70 uppercase tracking-wider">
                Specialization
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-white/70 uppercase tracking-wider">
                Experience
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-white/70 uppercase tracking-wider">
                Fee
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-white/70 uppercase tracking-wider">
                Rating
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-white/70 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-4 text-right text-xs font-semibold text-white/70 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {data.psychologists.map((psychologist, index) => (
              <motion.tr
                key={psychologist.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="hover:bg-white/5 transition-colors"
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10">
                      {psychologist.image_url ? (
                        <>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            className="h-10 w-10 rounded-full object-cover ring-2 ring-white/10"
                            src={psychologist.image_url}
                            alt={psychologist.name}
                          />
                        </>
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center ring-2 ring-white/10">
                          <span className="text-white font-semibold">
                            {psychologist.name.charAt(0)}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-white">{psychologist.name}</div>
                      <div className="text-sm text-white/50">{psychologist.user?.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-white/80">{psychologist.specialization || '-'}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-white/80">
                    {psychologist.years_of_experience
                      ? `${psychologist.years_of_experience} years`
                      : '-'}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-white/80">
                    {psychologist.consultation_fee
                      ? `Rp ${psychologist.consultation_fee.toLocaleString()}`
                      : '-'}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <Star className="w-4 h-4 text-yellow-400 mr-1 fill-current" />
                    <span className="text-sm text-white/80">
                      {psychologist.rating.toFixed(1)} ({psychologist.total_reviews})
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <button
                    onClick={() =>
                      toggleAvailability.mutate({
                        id: psychologist.id,
                        is_available: !psychologist.is_available,
                      })
                    }
                    disabled={toggleAvailability.isPending}
                    className={`px-3 py-1.5 inline-flex text-xs font-semibold rounded-lg transition-all ${
                      psychologist.is_available
                        ? 'bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30'
                        : 'bg-gray-500/20 text-gray-400 border border-gray-500/30 hover:bg-gray-500/30'
                    }`}
                  >
                    {psychologist.is_available ? 'Available' : 'Unavailable'}
                  </button>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => onEdit(psychologist)}
                      className="p-2 text-blue-400 hover:bg-blue-500/20 rounded-lg transition-all"
                      title="Edit"
                    >
                      <Edit2 className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm('Are you sure you want to delete this psychologist profile?')) {
                          deletePsychologist.mutate(psychologist.id);
                        }
                      }}
                      disabled={deletePsychologist.isPending}
                      className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-all disabled:opacity-50"
                      title="Delete"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {data.total_pages > 1 && (
        <div className="bg-white/5 px-6 py-4 flex items-center justify-between border-t border-white/10">
          <div className="text-sm text-white/70">
            Showing page {data.page} of {data.total_pages} ({data.total} total)
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => onPageChange(page - 1)}
              disabled={page === 1}
              className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm font-medium text-white/80 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              Previous
            </button>
            <button
              onClick={() => onPageChange(page + 1)}
              disabled={page === data.total_pages}
              className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm font-medium text-white/80 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
}

// ========================================
// Create Psychologist Modal
// ========================================

function CreatePsychologistModal({ onClose }: { onClose: () => void }) {
  const createMutation = useCreatePsychologist();
  const [counselorUsers, setCounselorUsers] = useState<api.CounselorUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [availabilitySlots, setAvailabilitySlots] = useState<api.TimeSlot[]>([]);
  
  const [formData, setFormData] = useState<api.PsychologistCreate>({
    user_id: 0,
    name: '',
    specialization: '',
    is_available: true,
  });

  // Fetch counselor users on mount
  useEffect(() => {
    const fetchCounselors = async () => {
      try {
        const users = await api.getCounselorUsers();
        setCounselorUsers(users);
      } catch (error) {
        toast.error('Failed to load counselor users');
        console.error(error);
      } finally {
        setLoadingUsers(false);
      }
    };
    fetchCounselors();
  }, []); // Empty dependency array - run once on mount

  // Initialize availability slots (all unavailable by default)
  useEffect(() => {
    const days: api.TimeSlot['day'][] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const slots: api.TimeSlot[] = [];
    days.forEach(day => {
      for (let hour = 0; hour < 24; hour++) {
        slots.push({ day, hour, available: false });
      }
    });
    setAvailabilitySlots(slots);
  }, []); // Empty dependency array - run once on mount

  const handleUserSelect = (userId: number) => {
    const user = counselorUsers.find(u => u.id === userId);
    if (user) {
      setSelectedUserId(userId);
      setFormData({
        ...formData,
        user_id: userId,
        name: user.name || user.email,
      });
    }
  };

  const toggleTimeSlot = (day: api.TimeSlot['day'], hour: number) => {
    setAvailabilitySlots(prev =>
      prev.map(slot =>
        slot.day === day && slot.hour === hour
          ? { ...slot, available: !slot.available }
          : slot
      )
    );
  };

  const toggleDayColumn = (day: api.TimeSlot['day']) => {
    const daySlots = availabilitySlots.filter(s => s.day === day);
    const allAvailable = daySlots.every(s => s.available);
    
    setAvailabilitySlots(prev =>
      prev.map(slot =>
        slot.day === day ? { ...slot, available: !allAvailable } : slot
      )
    );
  };

  const toggleHourRow = (hour: number) => {
    const hourSlots = availabilitySlots.filter(s => s.hour === hour);
    const allAvailable = hourSlots.every(s => s.available);
    
    setAvailabilitySlots(prev =>
      prev.map(slot =>
        slot.hour === hour ? { ...slot, available: !allAvailable } : slot
      )
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate that a counselor is selected
    if (!selectedUserId) {
      toast.error('Please select a counselor user');
      return;
    }
    
    // Convert time slots to availability schedule
    const schedule: api.AvailabilitySchedule[] = [];
    const days: api.TimeSlot['day'][] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    
    days.forEach(day => {
      const daySlots = availabilitySlots.filter(s => s.day === day && s.available);
      if (daySlots.length > 0) {
        const hours = daySlots.map(s => s.hour).sort((a, b) => a - b);
        const startHour = Math.min(...hours);
        const endHour = Math.max(...hours) + 1; // +1 because end time is exclusive
        
        schedule.push({
          day: day.charAt(0).toUpperCase() + day.slice(1),
          start_time: `${startHour.toString().padStart(2, '0')}:00:00`,
          end_time: `${endHour.toString().padStart(2, '0')}:00:00`,
          is_available: true,
        });
      }
    });
    
    const dataToSubmit = {
      ...formData,
      availability_schedule: schedule.length > 0 ? schedule : undefined,
    };
    
    createMutation.mutate(dataToSubmit, {
      onSuccess: () => {
        toast.success('✅ Psychologist profile created successfully!');
        onClose();
        // No need for page reload - React Query will handle cache invalidation
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      onError: (error: any) => {
        const errorMessage = error?.response?.data?.detail || error?.message || 'Failed to create profile';
        toast.error(`❌ ${errorMessage}`);
      },
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-gradient-to-br from-[#001D58] via-[#00246F] to-[#00308F] rounded-2xl max-w-6xl w-full max-h-[95vh] overflow-hidden border border-white/20 shadow-2xl"
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-gradient-to-r from-[#001D58] to-[#00308F] border-b border-white/10 backdrop-blur-sm">
          <div className="p-6 flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold text-white flex items-center gap-3">
                <span className="text-4xl">🩺</span>
                Create Psychologist Profile
              </h2>
              <p className="text-white/60 text-sm mt-2">
                Add a new psychologist to the system with detailed information and availability schedule
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors group"
              aria-label="Close modal"
            >
              <FiX size={24} className="text-white/60 group-hover:text-white transition-colors" />
            </button>
          </div>

          {/* Progress indicator */}
          <div className="px-6 pb-4">
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${selectedUserId ? 'bg-green-500' : 'bg-white/10'} transition-colors`}>
                  {selectedUserId ? '✓' : '1'}
                </div>
                <span className={selectedUserId ? 'text-green-400' : 'text-white/50'}>Select Counselor</span>
              </div>
              <div className="flex-1 h-px bg-white/10"></div>
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${formData.name ? 'bg-green-500' : 'bg-white/10'} transition-colors`}>
                  {formData.name ? '✓' : '2'}
                </div>
                <span className={formData.name ? 'text-green-400' : 'text-white/50'}>Profile Info</span>
              </div>
              <div className="flex-1 h-px bg-white/10"></div>
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${availabilitySlots.some(s => s.available) ? 'bg-green-500' : 'bg-white/10'} transition-colors`}>
                  {availabilitySlots.some(s => s.available) ? '✓' : '3'}
                </div>
                <span className={availabilitySlots.some(s => s.available) ? 'text-green-400' : 'text-white/50'}>Availability</span>
              </div>
            </div>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto max-h-[calc(95vh-200px)] custom-scrollbar">
          <form id="create-psychologist-form" onSubmit={handleSubmit} className="p-6 space-y-8">
          {/* Section 1: Counselor Selection */}
          <div className="bg-white/5 rounded-xl p-6 border border-white/10 space-y-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-[#FFCA40]/20 flex items-center justify-center">
                <span className="text-[#FFCA40] text-xl font-bold">1</span>
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Select Counselor User</h3>
                <p className="text-white/50 text-sm">Choose from users with counselor role</p>
              </div>
            </div>

          {/* Counselor User Selector */}
          <div>
            <label className="block text-sm font-semibold text-white/90 mb-2">
              Counselor User <span className="text-red-400">*</span>
            </label>
            {loadingUsers ? (
              <div className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white/50 text-center flex items-center justify-center gap-2">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#FFCA40]"></div>
                Loading counselors...
              </div>
            ) : (
              <>
              <select
                required
                value={selectedUserId || ''}
                onChange={(e) => handleUserSelect(parseInt(e.target.value))}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-[#FFCA40] focus:border-transparent transition-all"
                title="Select counselor user"
              >
                <option value="">👤 Select a counselor...</option>
                {counselorUsers.map(user => (
                  <option key={user.id} value={user.id}>
                    {user.name || user.email} ({user.email})
                  </option>
                ))}
              </select>
              {selectedUserId && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-3 p-3 bg-green-500/10 border border-green-500/20 rounded-lg"
                >
                  <p className="text-green-400 text-sm flex items-center gap-2">
                    ✓ Counselor selected: {counselorUsers.find(u => u.id === selectedUserId)?.name || counselorUsers.find(u => u.id === selectedUserId)?.email}
                  </p>
                </motion.div>
              )}
              </>
            )}
            <p className="mt-2 text-xs text-white/50">
              💡 Only users with counselor role are shown. Name field will auto-populate upon selection.
            </p>
          </div>
          </div>

          {/* Section 2: Profile Information */}
          <div className="bg-white/5 rounded-xl p-6 border border-white/10 space-y-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-[#FFCA40]/20 flex items-center justify-center">
                <span className="text-[#FFCA40] text-xl font-bold">2</span>
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Profile Information</h3>
                <p className="text-white/50 text-sm">Enter psychologist details and credentials</p>
              </div>
            </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
            <label className="block text-sm font-semibold text-white/90 mb-2">
              Full Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:ring-2 focus:ring-[#FFCA40] focus:border-transparent transition-all"
              placeholder="Dr. John Doe"
              title="Full name"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-white/90 mb-2">Specialization</label>
            <input
              type="text"
              value={formData.specialization || ''}
              onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:ring-2 focus:ring-[#FFCA40] focus:border-transparent transition-all"
              placeholder="Clinical Psychology, CBT, etc."
              title="Specialization"
            />
          </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-white/90 mb-2">Professional Bio</label>
            <textarea
              value={formData.bio || ''}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              rows={4}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:ring-2 focus:ring-[#FFCA40] focus:border-transparent transition-all resize-none"
              placeholder="Brief professional biography, approach to therapy, areas of expertise..."
              title="Professional bio"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-white/90 mb-2">
                📅 Years of Experience
              </label>
              <input
                type="number"
                min="0"
                max="70"
                value={formData.years_of_experience || ''}
                onChange={(e) =>
                  setFormData({ ...formData, years_of_experience: parseInt(e.target.value) })
                }
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:ring-2 focus:ring-[#FFCA40] focus:border-transparent transition-all"
                placeholder="e.g. 5"
                title="Years of experience"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-white/90 mb-2">
                💰 Consultation Fee (Rp)
              </label>
              <input
                type="number"
                min="0"
                value={formData.consultation_fee || ''}
                onChange={(e) =>
                  setFormData({ ...formData, consultation_fee: parseFloat(e.target.value) })
                }
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:ring-2 focus:ring-[#FFCA40] focus:border-transparent transition-all"
                placeholder="e.g. 150000"
                title="Consultation fee"
              />
            </div>
          </div>
          </div>

          {/* Section 3: Weekly Availability Calendar */}
          <div className="bg-white/5 rounded-xl p-6 border border-white/10 space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-full bg-[#FFCA40]/20 flex items-center justify-center">
                <span className="text-[#FFCA40] text-xl font-bold">3</span>
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Weekly Availability Schedule</h3>
                <p className="text-white/50 text-sm">Set up hourly availability blocks for the week</p>
              </div>
            </div>

          {/* Weekly Availability Calendar */}
          <div className="space-y-3">
            <div>
              <p className="text-xs text-white/60 mb-3 bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                💡 <strong>How to use:</strong> Click individual blocks to toggle availability, or click day headers / hour labels to toggle entire columns/rows at once.
              </p>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-lg p-4 overflow-x-auto">
              <div className="min-w-[800px]">
                {/* Header with day names */}
                <div className="grid grid-cols-8 gap-1 mb-1">
                  <div className="text-xs font-semibold text-white/40 text-center py-2">Hour</div>
                  {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day, idx) => {
                    const dayKey: api.TimeSlot['day'] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'][idx] as api.TimeSlot['day'];
                    const daySlots = availabilitySlots.filter(s => s.day === dayKey);
                    const availableCount = daySlots.filter(s => s.available).length;
                    
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => toggleDayColumn(dayKey)}
                        className="text-xs font-semibold text-white/70 hover:text-[#FFCA40] text-center py-2 px-1 rounded transition-colors bg-white/5 hover:bg-white/10"
                        title={`Toggle all ${day} (${availableCount}/24 available)`}
                      >
                        {day.substring(0, 3)}
                        <span className="block text-[10px] text-white/40">{availableCount}/24</span>
                      </button>
                    );
                  })}
                </div>

                {/* Time grid (00:00 to 23:00) */}
                <div className="space-y-1">
                  {Array.from({ length: 24 }, (_, hour) => {
                    const hourSlots = availabilitySlots.filter(s => s.hour === hour);
                    const availableCount = hourSlots.filter(s => s.available).length;
                    
                    return (
                      <div key={hour} className="grid grid-cols-8 gap-1">
                        {/* Hour label */}
                        <button
                          type="button"
                          onClick={() => toggleHourRow(hour)}
                          className="text-xs text-white/50 hover:text-[#FFCA40] text-center py-1 rounded transition-colors bg-white/5 hover:bg-white/10"
                          title={`Toggle ${hour}:00 for all days (${availableCount}/7 available)`}
                        >
                          {hour.toString().padStart(2, '0')}:00
                        </button>

                        {/* Day slots */}
                        {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map(day => {
                          const slot = availabilitySlots.find(s => s.day === day && s.hour === hour);
                          const isAvailable = slot?.available || false;

                          return (
                            <button
                              key={`${day}-${hour}`}
                              type="button"
                              onClick={() => toggleTimeSlot(day as api.TimeSlot['day'], hour)}
                              className={`py-2 rounded transition-all ${
                                isAvailable
                                  ? 'bg-green-500/30 border border-green-400/50 hover:bg-green-500/40'
                                  : 'bg-white/5 border border-white/10 hover:bg-white/10'
                              }`}
                              title={`${day.charAt(0).toUpperCase() + day.slice(1)} ${hour}:00 - ${isAvailable ? 'Available' : 'Unavailable'}`}
                            />
                          );
                        })}
                      </div>
                    );
                  })}
                </div>

                {/* Legend */}
                <div className="flex items-center gap-4 mt-4 pt-4 border-t border-white/10">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-green-500/30 border border-green-400/50 rounded"></div>
                    <span className="text-xs text-white/60">Available</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-white/5 border border-white/10 rounded"></div>
                    <span className="text-xs text-white/60">Unavailable</span>
                  </div>
                  <div className="ml-auto text-xs text-white/50">
                    {availabilitySlots.filter(s => s.available).length} / {availabilitySlots.length} slots available
                  </div>
                </div>
              </div>
            </div>
          </div>
          </div>

          {/* Section 4: Global Settings */}
          <div className="bg-white/5 rounded-xl p-6 border border-white/10">
          <div className="flex items-center p-4 bg-white/5 rounded-lg border border-white/10">
            <input
              type="checkbox"
              id="is_available"
              checked={formData.is_available}
              onChange={(e) => setFormData({ ...formData, is_available: e.target.checked })}
              className="w-4 h-4 text-[#FFCA40] bg-white/5 border-white/20 rounded focus:ring-[#FFCA40]"
            />
            <label htmlFor="is_available" className="ml-3 text-sm font-medium text-white/80">
              ✓ Mark as available for appointments immediately
            </label>
          </div>
          <p className="mt-2 text-xs text-white/50 ml-4">
            💡 You can toggle availability later from the psychologist list
          </p>
          </div>
          </form>
        </div>

        {/* Footer with buttons */}
        <div className="sticky bottom-0 bg-gradient-to-r from-[#001D58] to-[#00308F] border-t border-white/10 p-6 backdrop-blur-sm">
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-8 py-3 bg-white/5 border border-white/10 rounded-lg text-white/80 hover:bg-white/10 transition-all font-medium"
            >
              ✕ Cancel
            </button>
            <button
              type="submit"
              form="create-psychologist-form"
              disabled={createMutation.isPending || !selectedUserId}
              className="px-8 py-3 bg-gradient-to-r from-[#FFCA40] to-[#FFD666] text-[#001D58] font-bold rounded-lg hover:shadow-lg hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 transition-all shadow-md flex items-center gap-2"
            >
              {createMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#001D58]"></div>
                  Creating...
                </>
              ) : (
                <>
                  ✓ Create Profile
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ========================================
// Edit Psychologist Modal
// ========================================

function EditPsychologistModal({
  psychologist,
  onClose,
}: {
  psychologist: api.PsychologistResponse;
  onClose: () => void;
}) {
  const updateMutation = useUpdatePsychologist();
  const [formData, setFormData] = useState<api.PsychologistUpdate>({
    name: psychologist.name,
    specialization: psychologist.specialization,
    bio: psychologist.bio,
    years_of_experience: psychologist.years_of_experience,
    consultation_fee: psychologist.consultation_fee,
    is_available: psychologist.is_available,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(
      { id: psychologist.id, data: formData },
      {
        onSuccess: () => {
          toast.success('Psychologist profile updated successfully');
          onClose();
        },
        onError: (error) => {
          toast.error(`Failed to update profile: ${error.message}`);
        },
      }
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-[#001D58] rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-white/10 shadow-2xl"
      >
        <div className="p-6 border-b border-white/10">
          <h2 className="text-2xl font-bold text-white">Edit Psychologist Profile</h2>
          <p className="text-white/60 text-sm mt-1">Update psychologist information</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label htmlFor="psychologist-name" className="block text-sm font-medium text-white/90 mb-2">Full Name</label>
            <input
              id="psychologist-name"
              type="text"
              value={formData.name || ''}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:ring-2 focus:ring-[#FFCA40] focus:border-transparent transition-all"
            />
          </div>

          <div>
            <label htmlFor="psychologist-specialization" className="block text-sm font-medium text-white/90 mb-2">Specialization</label>
            <input
              id="psychologist-specialization"
              type="text"
              value={formData.specialization || ''}
              onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
              className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:ring-2 focus:ring-[#FFCA40] focus:border-transparent transition-all"
            />
          </div>

          <div>
            <label htmlFor="psychologist-bio" className="block text-sm font-medium text-white/90 mb-2">Bio</label>
            <textarea
              id="psychologist-bio"
              value={formData.bio || ''}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              rows={4}
              className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:ring-2 focus:ring-[#FFCA40] focus:border-transparent transition-all resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="psychologist-experience" className="block text-sm font-medium text-white/90 mb-2">
                Years of Experience
              </label>
              <input
                id="psychologist-experience"
                type="number"
                min="0"
                max="70"
                value={formData.years_of_experience || ''}
                onChange={(e) =>
                  setFormData({ ...formData, years_of_experience: parseInt(e.target.value) })
                }
                className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:ring-2 focus:ring-[#FFCA40] focus:border-transparent transition-all"
              />
            </div>

            <div>
              <label htmlFor="psychologist-fee" className="block text-sm font-medium text-white/90 mb-2">
                Consultation Fee (Rp)
              </label>
              <input
                id="psychologist-fee"
                type="number"
                min="0"
                value={formData.consultation_fee || ''}
                onChange={(e) =>
                  setFormData({ ...formData, consultation_fee: parseFloat(e.target.value) })
                }
                className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:ring-2 focus:ring-[#FFCA40] focus:border-transparent transition-all"
              />
            </div>
          </div>

          <div className="flex items-center p-4 bg-white/5 rounded-lg border border-white/10">
            <input
              type="checkbox"
              id="edit_is_available"
              checked={formData.is_available}
              onChange={(e) => setFormData({ ...formData, is_available: e.target.checked })}
              className="w-4 h-4 text-[#FFCA40] bg-white/5 border-white/20 rounded focus:ring-[#FFCA40]"
            />
            <label htmlFor="edit_is_available" className="ml-3 text-sm text-white/80">
              Available for appointments
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white/80 hover:bg-white/10 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={updateMutation.isPending}
              className="px-6 py-2.5 bg-[#FFCA40] text-[#001D58] font-semibold rounded-lg hover:bg-[#FFD666] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg"
            >
              {updateMutation.isPending ? 'Updating...' : 'Update Profile'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}
