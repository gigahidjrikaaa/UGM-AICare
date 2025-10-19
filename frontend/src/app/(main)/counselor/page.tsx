'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  useCounselorProfile,
  useUpdateCounselorProfile,
  useToggleCounselorAvailability,
  useCounselorAppointments,
  useCounselorStats,
  useTodayAppointments,
} from '@/hooks/usePsychologists';
import * as api from '@/lib/appointments-api';
import {
  Calendar,
  Users,
  DollarSign,
  Star,
  Clock,
  Edit2,
  AlertCircle,
} from 'lucide-react';
import styles from './counselor.module.css';

export default function CounselorDashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [showEditModal, setShowEditModal] = useState(false);

  const { data: profile, isLoading: profileLoading } = useCounselorProfile();
  const { data: stats } = useCounselorStats();
  const { data: todayAppointments } = useTodayAppointments();
  const toggleAvailability = useToggleCounselorAvailability();

  // Check authentication and counselor role
  if (status === 'loading' || profileLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (status === 'unauthenticated' || !['counselor', 'admin'].includes(session?.user?.role || '')) {
    router.push('/');
    return null;
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
            <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Profile Not Found</h2>
            <p className="text-gray-600 mb-6">
              Your counselor profile hasn&apos;t been created yet. Please contact an administrator to set
              up your profile.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Counselor Dashboard</h1>
            <p className="mt-2 text-gray-600">Welcome back, {profile.name}</p>
          </div>
          <button
            onClick={() => setShowEditModal(true)}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Edit2 className="w-5 h-5" />
            Edit Profile
          </button>
        </div>

        {/* Profile Card */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-start gap-6">
            {/* Avatar */}
            <div className="flex-shrink-0">
              {profile.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.image_url}
                  alt={profile.name}
                  className="w-24 h-24 rounded-full object-cover"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-blue-100 flex items-center justify-center">
                  <span className="text-3xl font-bold text-blue-600">
                    {profile.name.charAt(0)}
                  </span>
                </div>
              )}
            </div>

            {/* Profile Info */}
            <div className="flex-1">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{profile.name}</h2>
                  <p className="text-gray-600 mt-1">{profile.specialization || 'General Counseling'}</p>
                  {profile.bio && <p className="text-gray-600 mt-2 max-w-2xl">{profile.bio}</p>}
                </div>

                {/* Availability Toggle */}
                <button
                  onClick={() => toggleAvailability.mutate(!profile.is_available)}
                  disabled={toggleAvailability.isPending}
                  className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                    profile.is_available
                      ? 'bg-green-100 text-green-800 hover:bg-green-200'
                      : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                  }`}
                >
                  {profile.is_available ? 'Available' : 'Unavailable'}
                </button>
              </div>

              <div className="grid grid-cols-3 gap-4 mt-6">
                <div>
                  <p className="text-sm text-gray-500">Experience</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {profile.years_of_experience
                      ? `${profile.years_of_experience} years`
                      : 'Not set'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Consultation Fee</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {profile.consultation_fee
                      ? `Rp ${profile.consultation_fee.toLocaleString()}`
                      : 'Not set'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Rating</p>
                  <p className="text-lg font-semibold text-gray-900 flex items-center gap-1">
                    <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                    {profile.rating.toFixed(1)} ({profile.total_reviews} reviews)
                  </p>
                </div>
              </div>

              {/* Profile Completion */}
              {stats && stats.profile_completion_percentage < 100 && (
                <div className="mt-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600">Profile Completion</span>
                    <span className="text-sm font-semibold text-gray-900">
                      {stats.profile_completion_percentage.toFixed(0)}%
                    </span>
                  </div>

                  {/* Use semantic progress element instead of inline-styled div */}
                  <div className="w-full">
                    <progress
                      className={`w-full ${styles.progress}`}
                      value={Math.round(stats.profile_completion_percentage)}
                      max={100}
                      aria-label="Profile completion progress"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            <StatCard
              icon={<Calendar className="w-6 h-6" />}
              title="This Week"
              value={stats.this_week_appointments}
              subtitle="appointments"
              color="blue"
            />
            <StatCard
              icon={<Clock className="w-6 h-6" />}
              title="Upcoming"
              value={stats.upcoming_appointments}
              subtitle="appointments"
              color="green"
            />
            <StatCard
              icon={<Users className="w-6 h-6" />}
              title="Total Patients"
              value={stats.total_patients}
              subtitle="unique patients"
              color="purple"
            />
            <StatCard
              icon={<DollarSign className="w-6 h-6" />}
              title="Total Revenue"
              value={`Rp ${stats.total_revenue.toLocaleString()}`}
              subtitle="from completed sessions"
              color="green"
            />
          </div>
        )}

        {/* Today's Appointments */}
        {todayAppointments && todayAppointments.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Today&apos;s Appointments</h3>
            <div className="space-y-4">
              {todayAppointments.map((appointment) => (
                <div
                  key={appointment.id}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <Calendar className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {new Date(appointment.appointment_datetime).toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                      <p className="text-sm text-gray-600">{appointment.appointment_type.name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(
                        appointment.status
                      )}`}
                    >
                      {appointment.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Appointments */}
        <RecentAppointmentsSection />

        {/* Edit Profile Modal */}
        {showEditModal && profile && (
          <EditProfileModal profile={profile} onClose={() => setShowEditModal(false)} />
        )}
      </div>
    </div>
  );
}

// ========================================
// Stat Card Component
// ========================================

function StatCard({
  icon,
  title,
  value,
  subtitle,
  color,
}: {
  icon: React.ReactNode;
  title: string;
  value: string | number;
  subtitle: string;
  color: 'blue' | 'green' | 'purple';
}) {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    purple: 'bg-purple-100 text-purple-600',
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className={`w-12 h-12 rounded-lg ${colorClasses[color]} flex items-center justify-center mb-4`}>
        {icon}
      </div>
      <p className="text-sm text-gray-600 mb-1">{title}</p>
      <p className="text-2xl font-bold text-gray-900 mb-1">{value}</p>
      <p className="text-xs text-gray-500">{subtitle}</p>
    </div>
  );
}

// ========================================
// Recent Appointments Section
// ========================================

function RecentAppointmentsSection() {
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  const { data: appointments, isLoading } = useCounselorAppointments({
    status: statusFilter,
    page: 1,
    page_size: 10,
  });

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-gray-900">Recent Appointments</h3>
        <label htmlFor="status-filter" className="sr-only">Filter by status</label>
        <select
          id="status-filter"
          value={statusFilter || ''}
          onChange={(e) => setStatusFilter(e.target.value || undefined)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">All Status</option>
          <option value="scheduled">Scheduled</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {!appointments || appointments.length === 0 ? (
        <div className="text-center py-8">
          <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No appointments found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {appointments.map((appointment) => (
            <div
              key={appointment.id}
              className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              <div className="flex-1">
                <div className="flex items-center gap-4">
                  <div>
                    <p className="font-medium text-gray-900">
                      {new Date(appointment.appointment_datetime).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}{' '}
                      at{' '}
                      {new Date(appointment.appointment_datetime).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                    <p className="text-sm text-gray-600">{appointment.appointment_type.name}</p>
                    {appointment.notes && (
                      <p className="text-sm text-gray-500 mt-1 line-clamp-2">{appointment.notes}</p>
                    )}
                  </div>
                </div>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(appointment.status)}`}>
                {appointment.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ========================================
// Edit Profile Modal
// ========================================

function EditProfileModal({
  profile,
  onClose,
}: {
  profile: api.PsychologistResponse;
  onClose: () => void;
}) {
  const updateMutation = useUpdateCounselorProfile();
  const [formData, setFormData] = useState<api.PsychologistUpdate>({
    name: profile.name,
    specialization: profile.specialization,
    bio: profile.bio,
    image_url: profile.image_url,
    years_of_experience: profile.years_of_experience,
    consultation_fee: profile.consultation_fee,
    languages: profile.languages,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(formData, {
      onSuccess: () => onClose(),
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">Edit Your Profile</h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label htmlFor="edit-name" className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
            <input
              id="edit-name"
              type="text"
              value={formData.name || ''}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Your full name"
            />
          </div>

          <div>
            <label htmlFor="edit-specialization" className="block text-sm font-medium text-gray-700 mb-2">Specialization</label>
            <input
              id="edit-specialization"
              type="text"
              value={formData.specialization || ''}
              onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., Clinical Psychology, CBT"
            />
          </div>

          <div>
            <label htmlFor="edit-bio" className="block text-sm font-medium text-gray-700 mb-2">Bio</label>
            <textarea
              id="edit-bio"
              value={formData.bio || ''}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Tell patients about yourself and your approach..."
            />
          </div>

          <div>
            <label htmlFor="edit-image" className="block text-sm font-medium text-gray-700 mb-2">Profile Image URL</label>
            <input
              id="edit-image"
              type="url"
              value={formData.image_url || ''}
              onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="https://example.com/your-photo.jpg"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="edit-years" className="block text-sm font-medium text-gray-700 mb-2">
                Years of Experience
              </label>
              <input
                id="edit-years"
                type="number"
                min="0"
                max="70"
                value={formData.years_of_experience || ''}
                onChange={(e) =>
                  setFormData({ ...formData, years_of_experience: parseInt(e.target.value) })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., 5"
              />
            </div>

            <div>
              <label htmlFor="edit-fee" className="block text-sm font-medium text-gray-700 mb-2">
                Consultation Fee (Rp)
              </label>
              <input
                id="edit-fee"
                type="number"
                min="0"
                value={formData.consultation_fee || ''}
                onChange={(e) =>
                  setFormData({ ...formData, consultation_fee: parseFloat(e.target.value) })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., 150000"
              />
            </div>
          </div>

          <div>
            <label htmlFor="edit-languages" className="block text-sm font-medium text-gray-700 mb-2">
              Languages (comma-separated)
            </label>
            <input
              id="edit-languages"
              type="text"
              value={(formData.languages || []).join(', ')}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  languages: e.target.value.split(',').map((lang) => lang.trim()),
                })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="English, Indonesian, Javanese"
            />
          </div>

          <div className="flex justify-end gap-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={updateMutation.isPending}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ========================================
// Helper Functions
// ========================================

function getStatusColor(status: string): string {
  switch (status) {
    case 'scheduled':
      return 'bg-blue-100 text-blue-800';
    case 'completed':
      return 'bg-green-100 text-green-800';
    case 'cancelled':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}
