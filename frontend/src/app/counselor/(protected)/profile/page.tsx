'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FiUser,
  FiMail,
  FiBriefcase,
  FiAward,
  FiEdit,
  FiSave,
  FiX,
  FiCalendar,
  FiClock,
  FiAlertTriangle,
  FiPlus,
  FiTrash2,
} from 'react-icons/fi';
import { apiCall } from '@/utils/adminApi';
import toast from 'react-hot-toast';
import UserAvatar from '@/components/ui/profile/UserAvatar';

// Matches backend CounselorResponse (app/schemas/counselor.py).
interface EducationEntry {
  degree: string;
  institution: string;
  year?: number;
  field_of_study?: string;
}

interface CertificationEntry {
  name: string;
  issuing_organization: string;
  year?: number;
  expiry_date?: string;
}

interface ScheduleSlot {
  day: string;
  start_time: string;
  end_time: string;
  is_available?: boolean;
}

interface CounselorProfile {
  id: number;
  user_id?: number | null;
  name: string;
  specialization?: string | null;
  image_url?: string | null;
  is_available: boolean;
  bio?: string | null;
  years_of_experience?: number | null;
  languages?: string[] | null;
  consultation_fee?: number | null;
  rating: number;
  total_reviews: number;
  education?: EducationEntry[] | null;
  certifications?: CertificationEntry[] | null;
  availability_schedule?: ScheduleSlot[] | null;
  created_at: string;
  updated_at: string;
  user?: { id: number; email: string; name?: string | null; role: string; is_active: boolean } | null;
}

interface CaseStats {
  total_cases: number;
  open_cases: number;
  in_progress_cases: number;
  closed_cases: number;
}

const WEEK_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
// Hourly slots from 07:00 to 20:00 start times (21:00 end) — matches the
// admin availability grid contract.
const SCHEDULE_HOURS = Array.from({ length: 15 }, (_, index) => 7 + index);

/** Key format used by the availabilitySlots state: "Monday-9". */
const slotKey = (day: string, hour: number) => `${day}-${hour}`;

const parseHourFromTime = (time: string): number | null => {
  const parsed = Number.parseInt(time.split(':')[0] ?? '', 10);
  return Number.isFinite(parsed) ? parsed : null;
};

const buildSlotsFromSchedule = (
  schedule: ScheduleSlot[] | null | undefined,
): Record<string, boolean> => {
  const slots: Record<string, boolean> = {};
  for (const entry of schedule ?? []) {
    if (entry.is_available === false) continue;
    const start = parseHourFromTime(entry.start_time ?? '');
    const end = parseHourFromTime(entry.end_time ?? '');
    if (start == null || end == null) continue;
    for (let hour = start; hour < end; hour += 1) {
      slots[slotKey(entry.day, hour)] = true;
    }
  }
  return slots;
};

/** Contiguous active hourly ranges per day → the admin schedule contract. */
const buildScheduleFromSlots = (
  slots: Record<string, boolean>,
): ScheduleSlot[] => {
  const schedule: ScheduleSlot[] = [];
  for (const day of WEEK_DAYS) {
    const activeHours = SCHEDULE_HOURS.filter((hour) => slots[slotKey(day, hour)]);
    if (activeHours.length === 0) continue;
    let start = activeHours[0];
    let previous = activeHours[0];
    const pushRange = (rangeStart: number, rangeEnd: number) => {
      schedule.push({
        day,
        start_time: `${String(rangeStart).padStart(2, '0')}:00:00`,
        end_time: `${String(rangeEnd).padStart(2, '0')}:00:00`,
        is_available: true,
      });
    };
    for (const hour of activeHours.slice(1)) {
      if (hour === previous + 1) {
        previous = hour;
        continue;
      }
      pushRange(start, previous + 1);
      start = hour;
      previous = hour;
    }
    pushRange(start, previous + 1);
  }
  return schedule;
};

const inputClass =
  'w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-sm text-white placeholder:text-white/30 focus:border-[#FFCA40] focus:ring-1 focus:ring-[#FFCA40] focus:outline-none';

const formatTime = (value: string) => value.slice(0, 5);

const formatFee = (fee: number | null | undefined) =>
  fee == null ? 'Not set' : `Rp ${fee.toLocaleString('id-ID')}`;

export default function CounselorProfilePage() {
  const [profile, setProfile] = useState<CounselorProfile | null>(null);
  const [stats, setStats] = useState<CaseStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isTogglingAvailability, setIsTogglingAvailability] = useState(false);

  // Editable fields (held flat; entry lists cloned on edit start).
  const [name, setName] = useState('');
  const [specialization, setSpecialization] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [yearsOfExperience, setYearsOfExperience] = useState('');
  const [consultationFee, setConsultationFee] = useState('');
  const [bio, setBio] = useState('');
  const [languagesText, setLanguagesText] = useState('');
  const [education, setEducation] = useState<EducationEntry[]>([]);
  const [certifications, setCertifications] = useState<CertificationEntry[]>([]);
  const [availabilitySlots, setAvailabilitySlots] = useState<Record<string, boolean>>({});

  const loadProfile = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiCall<CounselorProfile>('/api/v1/counselor/profile');
      if (!data) {
        throw new Error('No profile data returned');
      }
      setProfile(data);
      setAvailabilitySlots(buildSlotsFromSchedule(data.availability_schedule));
      setError(null);
    } catch (err) {
      console.error('Failed to load profile:', err);
      setError('Failed to load profile');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadStats = useCallback(async () => {
    try {
      const data = await apiCall<CaseStats>('/api/v1/counselor/cases/stats');
      setStats(data ?? null);
    } catch {
      // Stats are supplementary — the profile page stays useful without them.
      setStats(null);
    }
  }, []);

  useEffect(() => {
    loadProfile();
    loadStats();
  }, [loadProfile, loadStats]);

  const startEditing = () => {
    if (!profile) return;
    setName(profile.name);
    setSpecialization(profile.specialization ?? '');
    setImageUrl(profile.image_url ?? '');
    setYearsOfExperience(profile.years_of_experience?.toString() ?? '');
    setConsultationFee(profile.consultation_fee?.toString() ?? '');
    setBio(profile.bio ?? '');
    setLanguagesText((profile.languages ?? []).join(', '));
    setEducation((profile.education ?? []).map((entry) => ({ ...entry })));
    setCertifications((profile.certifications ?? []).map((entry) => ({ ...entry })));
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (!profile) return;
    if (!name.trim()) {
      toast.error('Name cannot be empty');
      return;
    }

    const languages = languagesText
      .split(',')
      .map((lang) => lang.trim())
      .filter(Boolean);

    const trimmedImageUrl = imageUrl.trim();
    if (trimmedImageUrl) {
      try {
        if (new URL(trimmedImageUrl).protocol !== 'https:') {
          throw new Error('not https');
        }
      } catch {
        toast.error('Photo URL must be a valid https:// link');
        return;
      }
    }

    const parsedYears = yearsOfExperience.trim() ? Number(yearsOfExperience) : null;
    if (parsedYears != null && (!Number.isFinite(parsedYears) || parsedYears < 0 || parsedYears > 70)) {
      toast.error('Years of experience must be between 0 and 70');
      return;
    }

    const parsedFee = consultationFee.trim() ? Number(consultationFee) : null;
    if (parsedFee != null && (!Number.isFinite(parsedFee) || parsedFee < 0)) {
      toast.error('Consultation fee must be a positive number');
      return;
    }

    try {
      setIsSaving(true);
      const updated = await apiCall<CounselorProfile>('/api/v1/counselor/profile', {
        method: 'PUT',
        body: JSON.stringify({
          name: name.trim(),
          specialization: specialization.trim() || null,
          image_url: trimmedImageUrl || null,
          bio: bio.trim() || null,
          years_of_experience: parsedYears,
          consultation_fee: parsedFee,
          languages,
          education,
          certifications,
          availability_schedule: buildScheduleFromSlots(availabilitySlots),
        }),
      });
      if (updated) {
        setProfile(updated);
      } else {
        await loadProfile();
      }
      setIsEditing(false);
      toast.success('Profile updated');
    } catch (err) {
      console.error('Failed to save profile:', err);
      toast.error('Failed to save profile changes');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleAvailability = async () => {
    if (!profile) return;
    const next = !profile.is_available;
    try {
      setIsTogglingAvailability(true);
      const updated = await apiCall<CounselorProfile>('/api/v1/counselor/profile/availability', {
        method: 'PATCH',
        body: JSON.stringify({ is_available: next }),
      });
      if (updated) {
        setProfile(updated);
      } else {
        await loadProfile();
      }
      toast.success(next ? 'You are now available' : 'You are now unavailable');
    } catch (err) {
      console.error('Failed to toggle availability:', err);
      toast.error('Failed to update availability');
    } finally {
      setIsTogglingAvailability(false);
    }
  };

  const scheduleByDay = useMemo(() => {
    const grouped = new Map<string, ScheduleSlot[]>();
    for (const slot of profile?.availability_schedule ?? []) {
      const slots = grouped.get(slot.day) ?? [];
      slots.push(slot);
      grouped.set(slot.day, slots);
    }
    const known = WEEK_DAYS.filter((day) => grouped.has(day));
    const extras = [...grouped.keys()].filter((day) => !WEEK_DAYS.includes(day));
    return [...known, ...extras].map((day) => ({ day, slots: grouped.get(day) ?? [] }));
  }, [profile]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#FFCA40] mb-4"></div>
          <p className="text-white/70">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="text-red-400 mb-4">
            <FiAlertTriangle className="w-12 h-12 mx-auto" />
          </div>
          <p className="text-red-300 font-semibold mb-2">Failed to load profile</p>
          <p className="text-red-300/70 text-sm mb-4">{error}</p>
          <button
            onClick={() => loadProfile()}
            className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 rounded-lg text-sm text-red-300 transition-all"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">My Profile</h1>
          <p className="text-white/60">Manage your professional information</p>
        </div>
        <div className="flex items-center gap-3">
          {isEditing ? (
            <>
              <button
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/20 rounded-lg text-sm text-white/70 hover:text-white transition-all flex items-center gap-2"
              >
                <FiX className="w-4 h-4" />
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-4 py-2 bg-[#FFCA40]/20 hover:bg-[#FFCA40]/30 border border-[#FFCA40]/30 rounded-lg text-sm font-medium text-[#FFCA40] transition-all flex items-center gap-2 disabled:opacity-50"
              >
                <FiSave className="w-4 h-4" />
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </>
          ) : (
            <button
              onClick={startEditing}
              className="px-4 py-2 bg-[#FFCA40]/20 hover:bg-[#FFCA40]/30 border border-[#FFCA40]/30 rounded-lg text-sm font-medium text-[#FFCA40] transition-all flex items-center gap-2"
            >
              <FiEdit className="w-4 h-4" />
              Edit Profile
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Profile Card */}
        <div className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-6">
          <div className="text-center mb-6">
            <div className="relative h-24 w-24 rounded-full overflow-hidden border-2 border-[#FFCA40]/30 bg-[#FFCA40]/10 mx-auto mb-4">
              <UserAvatar
                src={isEditing ? imageUrl : profile.image_url}
                name={profile.name}
                initialsClassName="text-3xl"
              />
            </div>
            <h2 className="text-xl font-bold text-white mb-1">{profile.name}</h2>
            {profile.specialization ? (
              <p className="text-sm text-white/60">{profile.specialization}</p>
            ) : null}

            <div className="mt-4 flex items-center justify-center gap-2">
              <div
                className={`w-2 h-2 rounded-full ${profile.is_available ? 'bg-green-400' : 'bg-gray-400'}`}
              ></div>
              <span className="text-xs text-white/70">
                {profile.is_available ? 'Available' : 'Unavailable'}
              </span>
              <button
                onClick={toggleAvailability}
                disabled={isTogglingAvailability}
                className="ml-2 px-2.5 py-1 bg-white/5 hover:bg-white/10 border border-white/20 rounded-lg text-[11px] text-white/70 hover:text-white transition-all disabled:opacity-50"
              >
                {profile.is_available ? 'Set unavailable' : 'Set available'}
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="space-y-3 pt-6 border-t border-white/10">
            <div className="flex items-center justify-between">
              <span className="text-sm text-white/60">Total Cases</span>
              <span className="text-sm font-semibold text-white">{stats?.total_cases ?? '—'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-white/60">Open / In Progress</span>
              <span className="text-sm font-semibold text-white">
                {stats ? `${stats.open_cases} / ${stats.in_progress_cases}` : '—'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-white/60">Closed Cases</span>
              <span className="text-sm font-semibold text-white">{stats?.closed_cases ?? '—'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-white/60">Experience</span>
              <span className="text-sm font-semibold text-white">
                {profile.years_of_experience != null ? `${profile.years_of_experience} years` : 'Not set'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-white/60">Consultation Fee</span>
              <span className="text-sm font-semibold text-white">{formatFee(profile.consultation_fee)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-white/60">Rating</span>
              <span className="text-sm font-semibold text-[#FFCA40]">
                ⭐ {profile.rating.toFixed(1)}
                <span className="text-white/50"> ({profile.total_reviews})</span>
              </span>
            </div>
          </div>
        </div>

        {/* Right Column: Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Professional Information */}
          <div className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <FiBriefcase className="w-5 h-5 text-[#FFCA40]" />
              Professional Information
            </h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-white/60 block mb-1">Full Name</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className={inputClass}
                  />
                ) : (
                  <div className="flex items-center gap-2">
                    <FiUser className="w-4 h-4 text-white/40" />
                    <span className="text-sm text-white">{profile.name}</span>
                  </div>
                )}
              </div>
              <div>
                <label className="text-xs text-white/60 block mb-1">Email (account)</label>
                <div className="flex items-center gap-2">
                  <FiMail className="w-4 h-4 text-white/40" />
                  <span className="text-sm text-white">{profile.user?.email ?? '—'}</span>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-white/60 block mb-1">Specialization</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={specialization}
                      onChange={(e) => setSpecialization(e.target.value)}
                      placeholder="e.g. Clinical Psychology"
                      className={inputClass}
                    />
                  ) : (
                    <span className="text-sm text-white">{profile.specialization || 'Not set'}</span>
                  )}
                </div>
                <div>
                  <label className="text-xs text-white/60 block mb-1">Languages (comma-separated)</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={languagesText}
                      onChange={(e) => setLanguagesText(e.target.value)}
                      placeholder="e.g. Indonesian, English"
                      className={inputClass}
                    />
                  ) : (
                    <span className="text-sm text-white">
                      {(profile.languages ?? []).length > 0 ? profile.languages!.join(', ') : 'Not set'}
                    </span>
                  )}
                </div>
                <div>
                  <label className="text-xs text-white/60 block mb-1">Years of Experience</label>
                  {isEditing ? (
                    <input
                      type="number"
                      min={0}
                      max={70}
                      value={yearsOfExperience}
                      onChange={(e) => setYearsOfExperience(e.target.value)}
                      className={inputClass}
                    />
                  ) : (
                    <span className="text-sm text-white">
                      {profile.years_of_experience != null ? `${profile.years_of_experience} years` : 'Not set'}
                    </span>
                  )}
                </div>
                <div>
                  <label className="text-xs text-white/60 block mb-1">Consultation Fee (Rp)</label>
                  {isEditing ? (
                    <input
                      type="number"
                      min={0}
                      value={consultationFee}
                      onChange={(e) => setConsultationFee(e.target.value)}
                      className={inputClass}
                    />
                  ) : (
                    <span className="text-sm text-white">{formatFee(profile.consultation_fee)}</span>
                  )}
                </div>
              </div>
              <div>
                <label className="text-xs text-white/60 block mb-1">Photo URL (https)</label>
                {isEditing ? (
                  <input
                    type="url"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="https://example.com/photo.jpg"
                    className={inputClass}
                  />
                ) : (
                  <span className="text-sm text-white break-all">
                    {profile.image_url || 'Not set'}
                  </span>
                )}
              </div>
              <div>
                <label className="text-xs text-white/60 block mb-1">Bio</label>
                {isEditing ? (
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    rows={4}
                    placeholder="Your professional bio"
                    className={`${inputClass} resize-none`}
                  />
                ) : (
                  <p className="text-sm text-white/80">{profile.bio || 'No bio set'}</p>
                )}
              </div>
            </div>
          </div>

          {/* Education */}
          <div className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <FiAward className="w-5 h-5 text-[#FFCA40]" />
                Education
              </h3>
              {isEditing && (
                <button
                  onClick={() => setEducation([...education, { degree: '', institution: '' }])}
                  className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/20 rounded-lg text-xs text-white/70 hover:text-white transition-all flex items-center gap-1.5"
                >
                  <FiPlus className="w-3.5 h-3.5" />
                  Add education
                </button>
              )}
            </div>
            {education.length === 0 && !isEditing ? (
              <p className="text-sm text-white/40">No education entries yet.</p>
            ) : (
              <div className="space-y-3">
                {education.map((entry, index) => (
                  <div
                    key={`education-${index}`}
                    className="p-3 rounded-xl border border-white/10 bg-white/5 space-y-2"
                  >
                    {isEditing ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={entry.degree}
                          onChange={(e) => {
                            const next = [...education];
                            next[index] = { ...entry, degree: e.target.value };
                            setEducation(next);
                          }}
                          placeholder="Degree (e.g. S1 Psikologi)"
                          className={inputClass}
                        />
                        <input
                          type="text"
                          value={entry.institution}
                          onChange={(e) => {
                            const next = [...education];
                            next[index] = { ...entry, institution: e.target.value };
                            setEducation(next);
                          }}
                          placeholder="Institution"
                          className={inputClass}
                        />
                        <input
                          type="text"
                          value={entry.field_of_study ?? ''}
                          onChange={(e) => {
                            const next = [...education];
                            next[index] = { ...entry, field_of_study: e.target.value || undefined };
                            setEducation(next);
                          }}
                          placeholder="Field of study (optional)"
                          className={inputClass}
                        />
                        <input
                          type="number"
                          value={entry.year ?? ''}
                          onChange={(e) => {
                            const next = [...education];
                            next[index] = {
                              ...entry,
                              year: e.target.value ? Number(e.target.value) : undefined,
                            };
                            setEducation(next);
                          }}
                          placeholder="Year (optional)"
                          className={inputClass}
                        />
                        <button
                          onClick={() => setEducation(education.filter((_, i) => i !== index))}
                          className="sm:col-span-2 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-lg text-xs text-red-300 transition-all flex items-center justify-center gap-1.5"
                        >
                          <FiTrash2 className="w-3.5 h-3.5" />
                          Remove entry
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-white">
                            {entry.degree || 'Degree not set'}
                            {entry.year ? <span className="text-white/50"> · {entry.year}</span> : null}
                          </p>
                          <p className="text-xs text-white/60">
                            {[entry.institution, entry.field_of_study].filter(Boolean).join(' · ') || '—'}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Certifications */}
          <div className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <FiAward className="w-5 h-5 text-[#FFCA40]" />
                Certifications
              </h3>
              {isEditing && (
                <button
                  onClick={() =>
                    setCertifications([...certifications, { name: '', issuing_organization: '' }])
                  }
                  className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/20 rounded-lg text-xs text-white/70 hover:text-white transition-all flex items-center gap-1.5"
                >
                  <FiPlus className="w-3.5 h-3.5" />
                  Add certification
                </button>
              )}
            </div>
            {certifications.length === 0 && !isEditing ? (
              <p className="text-sm text-white/40">No certifications recorded yet.</p>
            ) : (
              <div className="space-y-3">
                {certifications.map((entry, index) => (
                  <div
                    key={`certification-${index}`}
                    className="p-3 rounded-xl border border-white/10 bg-white/5 space-y-2"
                  >
                    {isEditing ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={entry.name}
                          onChange={(e) => {
                            const next = [...certifications];
                            next[index] = { ...entry, name: e.target.value };
                            setCertifications(next);
                          }}
                          placeholder="Certification name"
                          className={inputClass}
                        />
                        <input
                          type="text"
                          value={entry.issuing_organization}
                          onChange={(e) => {
                            const next = [...certifications];
                            next[index] = { ...entry, issuing_organization: e.target.value };
                            setCertifications(next);
                          }}
                          placeholder="Issuing organization"
                          className={inputClass}
                        />
                        <input
                          type="number"
                          value={entry.year ?? ''}
                          onChange={(e) => {
                            const next = [...certifications];
                            next[index] = {
                              ...entry,
                              year: e.target.value ? Number(e.target.value) : undefined,
                            };
                            setCertifications(next);
                          }}
                          placeholder="Year (optional)"
                          className={inputClass}
                        />
                        <button
                          onClick={() => setCertifications(certifications.filter((_, i) => i !== index))}
                          className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-lg text-xs text-red-300 transition-all flex items-center justify-center gap-1.5"
                        >
                          <FiTrash2 className="w-3.5 h-3.5" />
                          Remove entry
                        </button>
                      </div>
                    ) : (
                      <div>
                        <p className="text-sm font-medium text-white">
                          {entry.name || 'Certification not set'}
                          {entry.year ? <span className="text-white/50"> · {entry.year}</span> : null}
                        </p>
                        <p className="text-xs text-white/60">{entry.issuing_organization || '—'}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Availability Schedule (weekly grid; editable in edit mode) */}
          <div className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <FiCalendar className="w-5 h-5 text-[#FFCA40]" />
              Weekly Availability
            </h3>
            {isEditing ? (
              <div>
                <p className="mb-3 text-xs leading-relaxed text-white/40">
                  Click hour cells to toggle when students can book you. Saved with the profile.
                </p>
                <div className="overflow-x-auto">
                  <table className="border-collapse">
                    <thead>
                      <tr>
                        <th className="sticky left-0 z-10 bg-[#0a1c3f] pr-2 text-left text-[10px] font-medium uppercase tracking-wide text-white/40">
                          Day
                        </th>
                        {SCHEDULE_HOURS.map((hour) => (
                          <th
                            key={hour}
                            className="px-0.5 pb-1 text-[9px] font-medium text-white/40"
                            title={`${hour}:00`}
                          >
                            {hour}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {WEEK_DAYS.map((day) => (
                        <tr key={day}>
                          <td className="sticky left-0 z-10 bg-[#0a1c3f] pr-2 text-xs font-medium text-white/80">
                            {day.slice(0, 3)}
                          </td>
                          {SCHEDULE_HOURS.map((hour) => {
                            const active = Boolean(availabilitySlots[slotKey(day, hour)]);
                            return (
                              <td key={`${day}-${hour}`} className="px-0.5 pb-0.5">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setAvailabilitySlots((prev) => ({
                                      ...prev,
                                      [slotKey(day, hour)]: !active,
                                    }))
                                  }
                                  aria-pressed={active}
                                  aria-label={`${day} ${hour}:00 ${active ? 'available' : 'unavailable'}`}
                                  className={`h-5 w-5 rounded transition-colors ${
                                    active
                                      ? 'bg-[#FFCA40] hover:bg-[#ffd45c]'
                                      : 'bg-white/10 hover:bg-white/25'
                                  }`}
                                />
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : scheduleByDay.length === 0 ? (
              <p className="text-sm text-white/40">
                No availability slots configured. Use Edit profile to set your weekly hours.
              </p>
            ) : (
              <div className="space-y-3">
                {scheduleByDay.map(({ day, slots }) => (
                  <div key={day} className="flex items-start gap-3">
                    <div className="w-24 pt-1">
                      <span className="text-sm font-medium text-white">{day}</span>
                    </div>
                    <div className="flex-1 flex flex-wrap gap-2">
                      {slots.map((slot, index) => (
                        <span
                          key={`${day}-${index}`}
                          className="px-3 py-1 bg-white/10 border border-white/20 rounded-lg text-xs text-white/80 flex items-center gap-1.5"
                        >
                          <FiClock className="w-3 h-3 text-[#FFCA40]" />
                          {formatTime(slot.start_time)}–{formatTime(slot.end_time)}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
