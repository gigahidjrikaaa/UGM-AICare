'use client';

import { useState, useEffect } from 'react';
import {
  useAdminCounselors,
  useCreateCounselor,
  useUpdateCounselor,
  useToggleCounselorAvailabilityAdmin,
  useDeleteCounselor,
} from '@/hooks/useCounselors';
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

const WEEK_DAYS: api.TimeSlot['day'][] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
];

const HOURS = Array.from({ length: 24 }, (_, hour) => hour);

function formatDayLabel(day: api.TimeSlot['day']): string {
  return `${day.charAt(0).toUpperCase()}${day.slice(1)}`;
}

function createEmptyTimeSlots(): api.TimeSlot[] {
  const slots: api.TimeSlot[] = [];
  WEEK_DAYS.forEach((day) => {
    HOURS.forEach((hour) => {
      slots.push({ day, hour, available: false });
    });
  });
  return slots;
}

function normalizeDay(value: string): api.TimeSlot['day'] | null {
  const lower = value.toLowerCase() as api.TimeSlot['day'];
  return WEEK_DAYS.includes(lower) ? lower : null;
}

function parseHourFromTime(value?: string | null): number | null {
  if (!value) {
    return null;
  }
  const [hourPart] = value.split(':');
  const parsed = Number.parseInt(hourPart, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function buildSlotsFromSchedule(
  schedule?: api.AvailabilitySchedule[],
): api.TimeSlot[] {
  const slots = createEmptyTimeSlots();
  if (!schedule || schedule.length === 0) {
    return slots;
  }

  const availableKeys = new Set<string>();
  schedule.forEach((entry) => {
    const day = normalizeDay(entry.day);
    if (!day) {
      return;
    }
    const startHour = parseHourFromTime(entry.start_time);
    const endHour = parseHourFromTime(entry.end_time);
    if (startHour === null || endHour === null) {
      return;
    }

    for (let hour = startHour; hour < endHour; hour += 1) {
      if (hour >= 0 && hour < 24) {
        availableKeys.add(`${day}-${hour}`);
      }
    }
  });

  return slots.map((slot) =>
    availableKeys.has(`${slot.day}-${slot.hour}`)
      ? { ...slot, available: true }
      : slot,
  );
}

function buildScheduleFromSlots(
  slots: api.TimeSlot[],
): api.AvailabilitySchedule[] {
  const schedule: api.AvailabilitySchedule[] = [];

  WEEK_DAYS.forEach((day) => {
    const activeHours = slots
      .filter((slot) => slot.day === day && slot.available)
      .map((slot) => slot.hour)
      .sort((a, b) => a - b);

    if (activeHours.length === 0) {
      return;
    }

    let start = activeHours[0];
    let previous = activeHours[0];

    for (let index = 1; index < activeHours.length; index += 1) {
      const current = activeHours[index];
      if (current === previous + 1) {
        previous = current;
        continue;
      }

      schedule.push({
        day: formatDayLabel(day),
        start_time: `${start.toString().padStart(2, '0')}:00:00`,
        end_time: `${(previous + 1).toString().padStart(2, '0')}:00:00`,
        is_available: true,
      });

      start = current;
      previous = current;
    }

    schedule.push({
      day: formatDayLabel(day),
      start_time: `${start.toString().padStart(2, '0')}:00:00`,
      end_time: `${(previous + 1).toString().padStart(2, '0')}:00:00`,
      is_available: true,
    });
  });

  return schedule;
}

function toggleSlotAvailability(
  slots: api.TimeSlot[],
  day: api.TimeSlot['day'],
  hour: number,
): api.TimeSlot[] {
  return slots.map((slot) =>
    slot.day === day && slot.hour === hour
      ? { ...slot, available: !slot.available }
      : slot,
  );
}

function toggleDayAvailability(
  slots: api.TimeSlot[],
  day: api.TimeSlot['day'],
): api.TimeSlot[] {
  const daySlots = slots.filter((slot) => slot.day === day);
  const shouldEnable = !daySlots.every((slot) => slot.available);

  return slots.map((slot) =>
    slot.day === day ? { ...slot, available: shouldEnable } : slot,
  );
}

function toggleHourAvailability(
  slots: api.TimeSlot[],
  hour: number,
): api.TimeSlot[] {
  const hourSlots = slots.filter((slot) => slot.hour === hour);
  const shouldEnable = !hourSlots.every((slot) => slot.available);

  return slots.map((slot) =>
    slot.hour === hour ? { ...slot, available: shouldEnable } : slot,
  );
}

interface AvailabilityGridProps {
  slots: api.TimeSlot[];
  onToggleSlot: (day: api.TimeSlot['day'], hour: number) => void;
  onToggleDay: (day: api.TimeSlot['day']) => void;
  onToggleHour: (hour: number) => void;
}

function AvailabilityGrid({
  slots,
  onToggleSlot,
  onToggleDay,
  onToggleHour,
}: AvailabilityGridProps) {
  const totalActive = slots.filter((slot) => slot.available).length;

  return (
    <div className="space-y-3">
      <div className="flex gap-1 overflow-x-auto pb-2">
        <div className="w-14 shrink-0" aria-hidden />
        {WEEK_DAYS.map((day) => {
          const availableCount = slots.filter(
            (slot) => slot.day === day && slot.available,
          ).length;
          return (
            <button
              key={day}
              type="button"
              onClick={() => onToggleDay(day)}
              className="text-xs text-white/60 bg-white/5 border border-white/10 rounded px-2 py-1 hover:text-[#FFCA40] hover:border-[#FFCA40]/60 transition-colors"
              title={`Toggle all ${formatDayLabel(day)} slots (${availableCount}/24 available)`}
            >
              {formatDayLabel(day).slice(0, 3)}
              <span className="block text-[10px] text-white/40">
                {availableCount}/24
              </span>
            </button>
          );
        })}
      </div>

      <div className="space-y-1">
        {HOURS.map((hour) => {
          const availableCount = slots.filter(
            (slot) => slot.hour === hour && slot.available,
          ).length;

          return (
            <div key={hour} className="grid grid-cols-8 gap-1">
              <button
                type="button"
                onClick={() => onToggleHour(hour)}
                className="text-xs text-white/50 hover:text-[#FFCA40] text-center py-1 rounded transition-colors bg-white/5 hover:bg-white/10"
                title={`Toggle ${hour.toString().padStart(2, '0')}:00 for all days (${availableCount}/7 available)`}
              >
                {hour.toString().padStart(2, '0')}:00
              </button>

              {WEEK_DAYS.map((day) => {
                const slot = slots.find(
                  (item) => item.day === day && item.hour === hour,
                );
                const isAvailable = slot?.available ?? false;

                return (
                  <button
                    key={`${day}-${hour}`}
                    type="button"
                    onClick={() => onToggleSlot(day, hour)}
                    className={`py-2 rounded transition-all ${
                      isAvailable
                        ? 'bg-green-500/30 border border-green-400/50 hover:bg-green-500/40'
                        : 'bg-white/5 border border-white/10 hover:bg-white/10'
                    }`}
                    title={`${formatDayLabel(day)} ${hour
                      .toString()
                      .padStart(2, '0')}:00 - ${
                      isAvailable ? 'Available' : 'Unavailable'
                    }`}
                  />
                );
              })}
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-4 mt-4 pt-4 border-t border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-500/30 border border-green-400/50 rounded" />
          <span className="text-xs text-white/60">Available</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-white/5 border border-white/10 rounded" />
          <span className="text-xs text-white/60">Unavailable</span>
        </div>
        <div className="ml-auto text-xs text-white/50">
          {totalActive} / {slots.length} slots available
        </div>
      </div>
    </div>
  );
}

interface LanguagesAndCredentialsFieldsProps {
  languages: string[];
  languageInput: string;
  onLanguageInputChange: (value: string) => void;
  onAddLanguage: () => void;
  onRemoveLanguage: (language: string) => void;
  educationEntries: api.Education[];
  onEducationFieldChange: (
    index: number,
    field: keyof api.Education,
    value: string,
  ) => void;
  onAddEducation: () => void;
  onRemoveEducation: (index: number) => void;
  certificationEntries: api.Certification[];
  onCertificationFieldChange: (
    index: number,
    field: keyof api.Certification,
    value: string,
  ) => void;
  onAddCertification: () => void;
  onRemoveCertification: (index: number) => void;
}

function LanguagesAndCredentialsFields({
  languages,
  languageInput,
  onLanguageInputChange,
  onAddLanguage,
  onRemoveLanguage,
  educationEntries,
  onEducationFieldChange,
  onAddEducation,
  onRemoveEducation,
  certificationEntries,
  onCertificationFieldChange,
  onAddCertification,
  onRemoveCertification,
}: LanguagesAndCredentialsFieldsProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <h4 className="text-lg font-semibold text-white flex items-center gap-2">
          <span role="img" aria-label="languages">
            🌐
          </span>
          Languages
        </h4>
        {languages.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {languages.map((language) => (
              <span
                key={language}
                className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-sm text-white/80"
              >
                {language}
                <button
                  type="button"
                  onClick={() => onRemoveLanguage(language)}
                  className="text-white/50 hover:text-white transition-colors"
                  aria-label={`Remove ${language}`}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        ) : (
          <p className="text-white/50 text-sm">
            No languages added yet. Add at least one to help match counselors
            with clients.
          </p>
        )}

        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={languageInput}
            onChange={(event) => onLanguageInputChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                onAddLanguage();
              }
            }}
            className="flex-1 px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:ring-2 focus:ring-[#FFCA40] focus:border-transparent transition-all"
            placeholder="e.g. English, Bahasa Indonesia"
            title="Add language"
          />
          <button
            type="button"
            onClick={onAddLanguage}
            disabled={languageInput.trim().length === 0}
            className="px-4 py-2.5 bg-[#FFCA40] text-[#001D58] font-semibold rounded-lg hover:bg-[#FFD666] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            Add language
          </button>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-lg font-semibold text-white flex items-center gap-2">
              <span role="img" aria-label="education">
                🎓
              </span>
              Education &amp; Training
            </h4>
            <p className="text-white/50 text-sm">
              Record degrees, institutions, and areas of study.
            </p>
          </div>
          <button
            type="button"
            onClick={onAddEducation}
            className="px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-sm text-white/80 hover:bg-white/15 transition-all"
          >
            Add education
          </button>
        </div>

        {educationEntries.length === 0 ? (
          <p className="text-white/50 text-sm">
            No education entries yet. Add at least one credential to showcase
            the counselor&apos;s qualifications.
          </p>
        ) : (
          <div className="space-y-3">
            {educationEntries.map((entry, index) => (
              <div
                key={`education-${index}`}
                className="bg-white/5 border border-white/10 rounded-lg p-4 space-y-3"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-white/70 mb-1">
                      Degree / Program
                    </label>
                    <input
                      type="text"
                      value={entry.degree || ''}
                      onChange={(event) =>
                        onEducationFieldChange(
                          index,
                          'degree',
                          event.target.value,
                        )
                      }
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:ring-2 focus:ring-[#FFCA40] focus:border-transparent transition-all"
                      placeholder="e.g. M.Psi Clinical Psychology"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-white/70 mb-1">
                      Institution
                    </label>
                    <input
                      type="text"
                      value={entry.institution || ''}
                      onChange={(event) =>
                        onEducationFieldChange(
                          index,
                          'institution',
                          event.target.value,
                        )
                      }
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:ring-2 focus:ring-[#FFCA40] focus:border-transparent transition-all"
                      placeholder="e.g. Universitas Gadjah Mada"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-white/70 mb-1">
                      Graduation Year
                    </label>
                    <input
                      type="number"
                      min="1900"
                      max="2100"
                      value={entry.year ?? ''}
                      onChange={(event) =>
                        onEducationFieldChange(
                          index,
                          'year',
                          event.target.value,
                        )
                      }
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:ring-2 focus:ring-[#FFCA40] focus:border-transparent transition-all"
                      placeholder="e.g. 2020"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-white/70 mb-1">
                      Field of Study
                    </label>
                    <input
                      type="text"
                      value={entry.field_of_study || ''}
                      onChange={(event) =>
                        onEducationFieldChange(
                          index,
                          'field_of_study',
                          event.target.value,
                        )
                      }
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:ring-2 focus:ring-[#FFCA40] focus:border-transparent transition-all"
                      placeholder="e.g. Cognitive Behavioral Therapy"
                    />
                  </div>
                </div>
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => onRemoveEducation(index)}
                    className="px-3 py-2 text-sm text-red-300 hover:text-red-200 bg-red-500/10 border border-red-500/20 rounded-lg transition-colors"
                  >
                    Remove education
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-lg font-semibold text-white flex items-center gap-2">
              <span role="img" aria-label="certifications">
                📜
              </span>
              Certifications &amp; Licenses
            </h4>
            <p className="text-white/50 text-sm">
              Capture relevant certifications and professional memberships.
            </p>
          </div>
          <button
            type="button"
            onClick={onAddCertification}
            className="px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-sm text-white/80 hover:bg-white/15 transition-all"
          >
            Add certification
          </button>
        </div>

        {certificationEntries.length === 0 ? (
          <p className="text-white/50 text-sm">
            No certifications recorded yet. Add licenses, trainings, or
            memberships relevant to this counselor.
          </p>
        ) : (
          <div className="space-y-3">
            {certificationEntries.map((entry, index) => (
              <div
                key={`certification-${index}`}
                className="bg-white/5 border border-white/10 rounded-lg p-4 space-y-3"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-white/70 mb-1">
                      Certification Name
                    </label>
                    <input
                      type="text"
                      value={entry.name || ''}
                      onChange={(event) =>
                        onCertificationFieldChange(
                          index,
                          'name',
                          event.target.value,
                        )
                      }
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:ring-2 focus:ring-[#FFCA40] focus:border-transparent transition-all"
                      placeholder="e.g. Licensed Clinical Psychologist"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-white/70 mb-1">
                      Issuing Organization
                    </label>
                    <input
                      type="text"
                      value={entry.issuing_organization || ''}
                      onChange={(event) =>
                        onCertificationFieldChange(
                          index,
                          'issuing_organization',
                          event.target.value,
                        )
                      }
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:ring-2 focus:ring-[#FFCA40] focus:border-transparent transition-all"
                      placeholder="e.g. HIMPSI"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-white/70 mb-1">
                      Issued Year
                    </label>
                    <input
                      type="number"
                      min="1900"
                      max="2100"
                      value={entry.year ?? ''}
                      onChange={(event) =>
                        onCertificationFieldChange(
                          index,
                          'year',
                          event.target.value,
                        )
                      }
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:ring-2 focus:ring-[#FFCA40] focus:border-transparent transition-all"
                      placeholder="e.g. 2021"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-white/70 mb-1">
                      Expiry Date
                    </label>
                    <input
                      type="date"
                      value={entry.expiry_date ?? ''}
                      onChange={(event) =>
                        onCertificationFieldChange(
                          index,
                          'expiry_date',
                          event.target.value,
                        )
                      }
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:ring-2 focus:ring-[#FFCA40] focus:border-transparent transition-all"
                    />
                  </div>
                </div>
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => onRemoveCertification(index)}
                    className="px-3 py-2 text-sm text-red-300 hover:text-red-200 bg-red-500/10 border border-red-500/20 rounded-lg transition-colors"
                  >
                    Remove certification
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminCounselorsPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [isAvailableFilter, setIsAvailableFilter] = useState<boolean | undefined>(undefined);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedCounselor, setSelectedCounselor] = useState<api.CounselorResponse | null>(null);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Counselor Management</h1>
          <p className="text-white/70">Manage counselor profiles, availability, and assignments</p>
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
            Add Counselor
          </button>
        </div>
      </motion.div>

      {/* counselors Table */}
      <CounselorsTable
        search={search}
        page={page}
        isAvailable={isAvailableFilter}
        onPageChange={setPage}
        onEdit={(counselor) => {
          setSelectedCounselor(counselor);
          setShowEditModal(true);
        }}
      />

      {/* Create Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <CreateCounselorModal onClose={() => setShowCreateModal(false)} />
        )}
      </AnimatePresence>

      {/* Edit Modal */}
      <AnimatePresence>
        {showEditModal && selectedCounselor && (
          <EditCounselorModal
            counselor={selectedCounselor}
            onClose={() => {
              setShowEditModal(false);
              setSelectedCounselor(null);
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
  const { data } = useAdminCounselors({ page: 1, page_size: 1 });

  const stats = [
    {
      label: 'Total counselors',
      value: data?.total || 0,
      icon: Users,
      color: 'from-blue-500 to-cyan-500',
    },
    {
      label: 'Available',
      value: data?.counselors?.filter(p => p.is_available).length || 0,
      icon: Activity,
      color: 'from-green-500 to-emerald-500',
    },
    {
      label: 'Average Rating',
      value: data?.counselors?.length 
        ? (data.counselors.reduce((acc, p) => acc + p.rating, 0) / data.counselors.length).toFixed(1)
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
// counselors Table Component
// ========================================

function CounselorsTable({
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
  onEdit: (counselor: api.CounselorResponse) => void;
}) {
  const { data, isLoading, error } = useAdminCounselors({
    page,
    page_size: 10,
    search: search || undefined,
    is_available: isAvailable,
  });

  // Debug logging
  useEffect(() => {
    if (data) {
      console.log('≡ƒöì [counselors Table] Data received:', data);
      console.log('≡ƒöì [counselors Table] counselors count:', data.counselors?.length);
      console.log('≡ƒöì [counselors Table] Total:', data.total);
      console.log('≡ƒöì [counselors Table] Current filters:', { page, search, isAvailable });
    }
  }, [data, page, search, isAvailable]);

  const toggleAvailability = useToggleCounselorAvailabilityAdmin();
  const deletecounselor = useDeleteCounselor();

  if (isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-12 text-center"
      >
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FFCA40] mx-auto"></div>
        <p className="mt-4 text-white/70">Loading counselors...</p>
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
        <p className="text-red-400">Error loading counselors: {error.message}</p>
      </motion.div>
    );
  }

  if (!data || !data.counselors || data.counselors.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-12 text-center"
      >
        <Users className="w-16 h-16 text-white/20 mx-auto mb-4" />
        <p className="text-white/70 text-lg">No counselors found</p>
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
                counselor
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
            {data.counselors.map((counselor, index) => (
              <motion.tr
                key={counselor.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="hover:bg-white/5 transition-colors"
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10">
                      {counselor.image_url ? (
                        <>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            className="h-10 w-10 rounded-full object-cover ring-2 ring-white/10"
                            src={counselor.image_url}
                            alt={counselor.name}
                          />
                        </>
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center ring-2 ring-white/10">
                          <span className="text-white font-semibold">
                            {counselor.name.charAt(0)}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-white">{counselor.name}</div>
                      <div className="text-sm text-white/50">{counselor.user?.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-white/80">{counselor.specialization || '-'}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-white/80">
                    {counselor.years_of_experience
                      ? `${counselor.years_of_experience} years`
                      : '-'}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-white/80">
                    {counselor.consultation_fee
                      ? `Rp ${counselor.consultation_fee.toLocaleString()}`
                      : '-'}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <Star className="w-4 h-4 text-yellow-400 mr-1 fill-current" />
                    <span className="text-sm text-white/80">
                      {counselor.rating.toFixed(1)} ({counselor.total_reviews})
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <button
                    onClick={() =>
                      toggleAvailability.mutate({
                        id: counselor.id,
                        is_available: !counselor.is_available,
                      })
                    }
                    disabled={toggleAvailability.isPending}
                    className={`px-3 py-1.5 inline-flex text-xs font-semibold rounded-lg transition-all ${
                      counselor.is_available
                        ? 'bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30'
                        : 'bg-gray-500/20 text-gray-400 border border-gray-500/30 hover:bg-gray-500/30'
                    }`}
                  >
                    {counselor.is_available ? 'Available' : 'Unavailable'}
                  </button>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => onEdit(counselor)}
                      className="p-2 text-blue-400 hover:bg-blue-500/20 rounded-lg transition-all"
                      title="Edit"
                    >
                      <Edit2 className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm('Are you sure you want to delete this counselor profile?')) {
                          deletecounselor.mutate(counselor.id);
                        }
                      }}
                      disabled={deletecounselor.isPending}
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
// Create counselor Modal
// ========================================

function CreateCounselorModal({ onClose }: { onClose: () => void }) {
  const createMutation = useCreateCounselor();
  const [counselorUsers, setCounselorUsers] = useState<api.CounselorUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [availabilitySlots, setAvailabilitySlots] = useState<api.TimeSlot[]>(() =>
    createEmptyTimeSlots(),
  );
  const [languages, setLanguages] = useState<string[]>([]);
  const [languageInput, setLanguageInput] = useState('');
  const [educationEntries, setEducationEntries] = useState<api.Education[]>([]);
  const [certificationEntries, setCertificationEntries] = useState<
    api.Certification[]
  >([]);
  
  const [formData, setFormData] = useState<api.CounselorCreate>({
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

  const handleUserSelect = (userId: number) => {
    const user = counselorUsers.find((u) => u.id === userId);
    if (!user) {
      return;
    }

    setSelectedUserId(userId);
    setFormData((previous) => ({
      ...previous,
      user_id: userId,
      name: user.name || user.email || previous.name,
    }));
  };

  const toggleTimeSlot = (day: api.TimeSlot['day'], hour: number) => {
    setAvailabilitySlots((previous) =>
      toggleSlotAvailability(previous, day, hour),
    );
  };

  const toggleDayColumn = (day: api.TimeSlot['day']) => {
    setAvailabilitySlots((previous) => toggleDayAvailability(previous, day));
  };

  const toggleHourRow = (hour: number) => {
    setAvailabilitySlots((previous) => toggleHourAvailability(previous, hour));
  };

  const addLanguage = () => {
    const trimmed = languageInput.trim();
    if (!trimmed) {
      return;
    }

    setLanguages((previous) => {
      const exists = previous.some(
        (language) => language.toLowerCase() === trimmed.toLowerCase(),
      );
      if (exists) {
        return previous;
      }
      return [...previous, trimmed];
    });
    setLanguageInput('');
  };

  const removeLanguage = (language: string) => {
    setLanguages((previous) =>
      previous.filter(
        (item) => item.toLowerCase() !== language.toLowerCase(),
      ),
    );
  };

  const addEducationEntry = () => {
    setEducationEntries((previous) => [
      ...previous,
      { degree: '', institution: '' },
    ]);
  };

  const removeEducationEntry = (index: number) => {
    setEducationEntries((previous) =>
      previous.filter((_, entryIndex) => entryIndex !== index),
    );
  };

  const handleEducationFieldChange = (
    index: number,
    field: keyof api.Education,
    value: string,
  ) => {
    setEducationEntries((previous) =>
      previous.map((entry, entryIndex) => {
        if (entryIndex !== index) {
          return entry;
        }
        const updated = { ...entry };
        if (field === 'degree') {
          updated.degree = value;
        } else if (field === 'institution') {
          updated.institution = value;
        } else if (field === 'field_of_study') {
          updated.field_of_study = value;
        } else if (field === 'year') {
          const numeric = value ? Number.parseInt(value, 10) : undefined;
          updated.year = Number.isFinite(numeric) ? numeric : undefined;
        }
        return updated;
      }),
    );
  };

  const addCertificationEntry = () => {
    setCertificationEntries((previous) => [
      ...previous,
      { name: '', issuing_organization: '' },
    ]);
  };

  const removeCertificationEntry = (index: number) => {
    setCertificationEntries((previous) =>
      previous.filter((_, entryIndex) => entryIndex !== index),
    );
  };

  const handleCertificationFieldChange = (
    index: number,
    field: keyof api.Certification,
    value: string,
  ) => {
    setCertificationEntries((previous) =>
      previous.map((entry, entryIndex) => {
        if (entryIndex !== index) {
          return entry;
        }
        const updated = { ...entry };
        if (field === 'name') {
          updated.name = value;
        } else if (field === 'issuing_organization') {
          updated.issuing_organization = value;
        } else if (field === 'expiry_date') {
          updated.expiry_date = value || undefined;
        } else if (field === 'year') {
          const numeric = value ? Number.parseInt(value, 10) : undefined;
          updated.year = Number.isFinite(numeric) ? numeric : undefined;
        }
        return updated;
      }),
    );
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedUserId) {
      toast.error('Please select a counselor user');
      return;
    }

    const availabilitySchedule = buildScheduleFromSlots(availabilitySlots);

    const normalizedLanguages = languages
      .map((language) => language.trim())
      .filter((language, index, self) => {
        if (!language) {
          return false;
        }
        const firstIndex = self.findIndex(
          (item) => item.toLowerCase() === language.toLowerCase(),
        );
        return firstIndex === index;
      });

    const normalizedEducation = educationEntries
      .map((entry) => ({
        degree: entry.degree?.trim() ?? '',
        institution: entry.institution?.trim() ?? '',
        field_of_study: entry.field_of_study?.trim() || undefined,
        year: entry.year,
      }))
      .filter((entry) => entry.degree !== '' || entry.institution !== '');

    const normalizedCertifications = certificationEntries
      .map((entry) => ({
        name: entry.name?.trim() ?? '',
        issuing_organization: entry.issuing_organization?.trim() ?? '',
        year: entry.year,
        expiry_date: entry.expiry_date || undefined,
      }))
      .filter(
        (entry) => entry.name !== '' && entry.issuing_organization !== '',
      );

    const payload: api.CounselorCreate = {
      ...formData,
      user_id: selectedUserId,
      availability_schedule: availabilitySchedule.length
        ? availabilitySchedule
        : undefined,
      languages: normalizedLanguages.length ? normalizedLanguages : undefined,
      education: normalizedEducation.length ? normalizedEducation : undefined,
      certifications: normalizedCertifications.length
        ? normalizedCertifications
        : undefined,
    };

    createMutation.mutate(payload, {
      onSuccess: () => {
        toast.success('✅ Counselor profile created successfully!');
        onClose();
      },
      onError: (error: unknown) => {
        const message =
          error instanceof Error ? error.message : 'Failed to create profile';
        toast.error(`❌ ${message}`);
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
                <span className="text-4xl">≡ƒ⌐║</span>
                Create counselor profile
              </h2>
              <p className="text-white/60 text-sm mt-2">
                Add a new counselor to the system with detailed information and availability schedule
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
                  {selectedUserId ? 'Γ£ô' : '1'}
                </div>
                <span className={selectedUserId ? 'text-green-400' : 'text-white/50'}>Select Counselor</span>
              </div>
              <div className="flex-1 h-px bg-white/10"></div>
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${formData.name ? 'bg-green-500' : 'bg-white/10'} transition-colors`}>
                  {formData.name ? 'Γ£ô' : '2'}
                </div>
                <span className={formData.name ? 'text-green-400' : 'text-white/50'}>Profile Info</span>
              </div>
              <div className="flex-1 h-px bg-white/10"></div>
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${availabilitySlots.some(s => s.available) ? 'bg-green-500' : 'bg-white/10'} transition-colors`}>
                  {availabilitySlots.some(s => s.available) ? 'Γ£ô' : '3'}
                </div>
                <span className={availabilitySlots.some(s => s.available) ? 'text-green-400' : 'text-white/50'}>Availability</span>
              </div>
            </div>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto max-h-[calc(95vh-200px)] custom-scrollbar">
          <form id="create-counselor-form" onSubmit={handleSubmit} className="p-6 space-y-8">
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
                <option value="">≡ƒæñ Select a counselor...</option>
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
                    Γ£ô Counselor selected: {counselorUsers.find(u => u.id === selectedUserId)?.name || counselorUsers.find(u => u.id === selectedUserId)?.email}
                  </p>
                </motion.div>
              )}
              </>
            )}
            <p className="mt-2 text-xs text-white/50">
              ≡ƒÆí Only users with counselor role are shown. Name field will auto-populate upon selection.
            </p>
          </div>

          <LanguagesAndCredentialsFields
            languages={languages}
            languageInput={languageInput}
            onLanguageInputChange={setLanguageInput}
            onAddLanguage={addLanguage}
            onRemoveLanguage={removeLanguage}
            educationEntries={educationEntries}
            onEducationFieldChange={handleEducationFieldChange}
            onAddEducation={addEducationEntry}
            onRemoveEducation={removeEducationEntry}
            certificationEntries={certificationEntries}
            onCertificationFieldChange={handleCertificationFieldChange}
            onAddCertification={addCertificationEntry}
            onRemoveCertification={removeCertificationEntry}
          />
          </div>

          {/* Section 2: Profile Information */}
          <div className="bg-white/5 rounded-xl p-6 border border-white/10 space-y-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-[#FFCA40]/20 flex items-center justify-center">
                <span className="text-[#FFCA40] text-xl font-bold">2</span>
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Profile Information</h3>
                <p className="text-white/50 text-sm">Enter counselor details and credentials</p>
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
                ≡ƒôà Years of Experience
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
                ≡ƒÆ░ Consultation Fee (Rp)
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
                ≡ƒÆí <strong>How to use:</strong> Click individual blocks to toggle availability, or click day headers / hour labels to toggle entire columns/rows at once.
              </p>
            </div>

          <AvailabilityGrid
            slots={availabilitySlots}
            onToggleSlot={toggleTimeSlot}
            onToggleDay={toggleDayColumn}
            onToggleHour={toggleHourRow}
          />
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
              Γ£ô Mark as available for appointments immediately
            </label>
          </div>
          <p className="mt-2 text-xs text-white/50 ml-4">
            ≡ƒÆí You can toggle availability later from the counselor list
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
              Γ£ò Cancel
            </button>
            <button
              type="submit"
              form="create-counselor-form"
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
                  Γ£ô Create Profile
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
// Edit counselor Modal
// ========================================

function EditCounselorModal({
  counselor,
  onClose,
}: {
  counselor: api.CounselorResponse;
  onClose: () => void;
}) {
  const updateMutation = useUpdateCounselor();
  const [formData, setFormData] = useState<api.CounselorUpdate>({
    name: counselor.name,
    specialization: counselor.specialization,
    bio: counselor.bio,
    years_of_experience: counselor.years_of_experience,
    consultation_fee: counselor.consultation_fee,
    is_available: counselor.is_available,
  });
  const [languages, setLanguages] = useState<string[]>(counselor.languages ?? []);
  const [languageInput, setLanguageInput] = useState('');
  const [educationEntries, setEducationEntries] = useState<api.Education[]>(
    counselor.education ?? [],
  );
  const [certificationEntries, setCertificationEntries] = useState<
    api.Certification[]
  >(counselor.certifications ?? []);
  const [availabilitySlots, setAvailabilitySlots] = useState<api.TimeSlot[]>(() =>
    buildSlotsFromSchedule(counselor.availability_schedule),
  );

  useEffect(() => {
    setFormData({
      name: counselor.name,
      specialization: counselor.specialization,
      bio: counselor.bio,
      years_of_experience: counselor.years_of_experience,
      consultation_fee: counselor.consultation_fee,
      is_available: counselor.is_available,
    });
    setLanguages(counselor.languages ?? []);
    setEducationEntries(counselor.education ?? []);
    setCertificationEntries(counselor.certifications ?? []);
    setAvailabilitySlots(buildSlotsFromSchedule(counselor.availability_schedule));
  }, [counselor]);

  const toggleTimeSlot = (day: api.TimeSlot['day'], hour: number) => {
    setAvailabilitySlots((previous) =>
      toggleSlotAvailability(previous, day, hour),
    );
  };

  const toggleDayColumn = (day: api.TimeSlot['day']) => {
    setAvailabilitySlots((previous) => toggleDayAvailability(previous, day));
  };

  const toggleHourRow = (hour: number) => {
    setAvailabilitySlots((previous) => toggleHourAvailability(previous, hour));
  };

  const addLanguage = () => {
    const trimmed = languageInput.trim();
    if (!trimmed) {
      return;
    }
    setLanguages((previous) => {
      const exists = previous.some(
        (language) => language.toLowerCase() === trimmed.toLowerCase(),
      );
      if (exists) {
        return previous;
      }
      return [...previous, trimmed];
    });
    setLanguageInput('');
  };

  const removeLanguage = (language: string) => {
    setLanguages((previous) =>
      previous.filter(
        (item) => item.toLowerCase() !== language.toLowerCase(),
      ),
    );
  };

  const addEducationEntry = () => {
    setEducationEntries((previous) => [
      ...previous,
      { degree: '', institution: '' },
    ]);
  };

  const removeEducationEntry = (index: number) => {
    setEducationEntries((previous) =>
      previous.filter((_, entryIndex) => entryIndex !== index),
    );
  };

  const handleEducationFieldChange = (
    index: number,
    field: keyof api.Education,
    value: string,
  ) => {
    setEducationEntries((previous) =>
      previous.map((entry, entryIndex) => {
        if (entryIndex !== index) {
          return entry;
        }
        const updated = { ...entry };
        if (field === 'degree') {
          updated.degree = value;
        } else if (field === 'institution') {
          updated.institution = value;
        } else if (field === 'field_of_study') {
          updated.field_of_study = value;
        } else if (field === 'year') {
          const numeric = value ? Number.parseInt(value, 10) : undefined;
          updated.year = Number.isFinite(numeric) ? numeric : undefined;
        }
        return updated;
      }),
    );
  };

  const addCertificationEntry = () => {
    setCertificationEntries((previous) => [
      ...previous,
      { name: '', issuing_organization: '' },
    ]);
  };

  const removeCertificationEntry = (index: number) => {
    setCertificationEntries((previous) =>
      previous.filter((_, entryIndex) => entryIndex !== index),
    );
  };

  const handleCertificationFieldChange = (
    index: number,
    field: keyof api.Certification,
    value: string,
  ) => {
    setCertificationEntries((previous) =>
      previous.map((entry, entryIndex) => {
        if (entryIndex !== index) {
          return entry;
        }
        const updated = { ...entry };
        if (field === 'name') {
          updated.name = value;
        } else if (field === 'issuing_organization') {
          updated.issuing_organization = value;
        } else if (field === 'expiry_date') {
          updated.expiry_date = value || undefined;
        } else if (field === 'year') {
          const numeric = value ? Number.parseInt(value, 10) : undefined;
          updated.year = Number.isFinite(numeric) ? numeric : undefined;
        }
        return updated;
      }),
    );
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    const availabilitySchedule = buildScheduleFromSlots(availabilitySlots);

    const normalizedLanguages = languages
      .map((language) => language.trim())
      .filter((language, index, self) => {
        if (!language) {
          return false;
        }
        const firstIndex = self.findIndex(
          (item) => item.toLowerCase() === language.toLowerCase(),
        );
        return firstIndex === index;
      });

    const normalizedEducation = educationEntries
      .map((entry) => ({
        degree: entry.degree?.trim() ?? '',
        institution: entry.institution?.trim() ?? '',
        field_of_study: entry.field_of_study?.trim() || undefined,
        year: entry.year,
      }))
      .filter((entry) => entry.degree !== '' || entry.institution !== '');

    const normalizedCertifications = certificationEntries
      .map((entry) => ({
        name: entry.name?.trim() ?? '',
        issuing_organization: entry.issuing_organization?.trim() ?? '',
        year: entry.year,
        expiry_date: entry.expiry_date || undefined,
      }))
      .filter(
        (entry) => entry.name !== '' && entry.issuing_organization !== '',
      );

    const payload: api.CounselorUpdate = {
      ...formData,
      languages: normalizedLanguages.length ? normalizedLanguages : undefined,
      education: normalizedEducation.length ? normalizedEducation : undefined,
      certifications: normalizedCertifications.length
        ? normalizedCertifications
        : undefined,
      availability_schedule: availabilitySchedule.length
        ? availabilitySchedule
        : undefined,
    };

    updateMutation.mutate(
      { id: counselor.id, data: payload },
      {
        onSuccess: () => {
          toast.success('Counselor profile updated successfully');
          onClose();
        },
        onError: (error: Error) => {
          toast.error(`Failed to update profile: ${error.message}`);
        },
      },
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
          <h2 className="text-2xl font-bold text-white">Edit counselor profile</h2>
          <p className="text-white/60 text-sm mt-1">Update counselor information</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="bg-white/5 rounded-xl border border-white/10 p-5 space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-white">Profile Information</h3>
              <p className="text-white/50 text-sm">
                Edit the counselor&apos;s headline details, credentials, and pricing.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-white/90 mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  value={formData.name || ''}
                  onChange={(event) =>
                    setFormData({ ...formData, name: event.target.value })
                  }
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:ring-2 focus:ring-[#FFCA40] focus:border-transparent transition-all"
                  placeholder="Counselor full name"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-white/90 mb-2">
                  Specialization
                </label>
                <input
                  type="text"
                  value={formData.specialization || ''}
                  onChange={(event) =>
                    setFormData({ ...formData, specialization: event.target.value })
                  }
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:ring-2 focus:ring-[#FFCA40] focus:border-transparent transition-all"
                  placeholder="Areas of focus or modalities"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-white/90 mb-2">
                Professional Bio
              </label>
              <textarea
                value={formData.bio || ''}
                onChange={(event) =>
                  setFormData({ ...formData, bio: event.target.value })
                }
                rows={4}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:ring-2 focus:ring-[#FFCA40] focus:border-transparent transition-all resize-none"
                placeholder="Summarize experience, therapeutic style, and focus areas."
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
                  value={formData.years_of_experience ?? ''}
                  onChange={(event) =>
                    setFormData({
                      ...formData,
                      years_of_experience: event.target.value
                        ? Number.parseInt(event.target.value, 10)
                        : undefined,
                    })
                  }
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:ring-2 focus:ring-[#FFCA40] focus:border-transparent transition-all"
                  placeholder="e.g. 5"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-white/90 mb-2">
                  💰 Consultation Fee (Rp)
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.consultation_fee ?? ''}
                  onChange={(event) =>
                    setFormData({
                      ...formData,
                      consultation_fee: event.target.value
                        ? Number.parseFloat(event.target.value)
                        : undefined,
                    })
                  }
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:ring-2 focus:ring-[#FFCA40] focus:border-transparent transition-all"
                  placeholder="e.g. 150000"
                />
              </div>
            </div>

            <LanguagesAndCredentialsFields
              languages={languages}
              languageInput={languageInput}
              onLanguageInputChange={setLanguageInput}
              onAddLanguage={addLanguage}
              onRemoveLanguage={removeLanguage}
              educationEntries={educationEntries}
              onEducationFieldChange={handleEducationFieldChange}
              onAddEducation={addEducationEntry}
              onRemoveEducation={removeEducationEntry}
              certificationEntries={certificationEntries}
              onCertificationFieldChange={handleCertificationFieldChange}
              onAddCertification={addCertificationEntry}
              onRemoveCertification={removeCertificationEntry}
            />
          </div>

          <div className="bg-white/5 rounded-xl border border-white/10 p-5 space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-white">Weekly Availability</h3>
              <p className="text-white/50 text-sm">
                Adjust availability blocks to control when the counselor can be booked.
              </p>
            </div>
            <p className="text-xs text-white/60 bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
              💡 Click individual cells to toggle availability or use the row/column headers
              to bulk enable time slots.
            </p>
            <AvailabilityGrid
              slots={availabilitySlots}
              onToggleSlot={toggleTimeSlot}
              onToggleDay={toggleDayColumn}
              onToggleHour={toggleHourRow}
            />
          </div>

          <div className="bg-white/5 rounded-xl border border-white/10 p-5 space-y-3">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="edit_is_available"
                checked={formData.is_available ?? false}
                onChange={(event) =>
                  setFormData({ ...formData, is_available: event.target.checked })
                }
                className="w-4 h-4 text-[#FFCA40] bg-white/5 border-white/20 rounded focus:ring-[#FFCA40]"
              />
              <label htmlFor="edit_is_available" className="ml-3 text-sm text-white/80">
                Available for new appointments
              </label>
            </div>
            <p className="text-xs text-white/50">
              Disable availability to temporarily hide this counselor from scheduling flows.
            </p>
          </div>

          <div className="flex justify-end gap-3">
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


