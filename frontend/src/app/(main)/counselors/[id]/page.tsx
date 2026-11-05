'use client';

/**
 * Counselor public profile (student-facing).
 *
 * Everything a student needs to decide whether — and with whom — to book:
 * photo, specialization, bio, credentials, languages, experience, rating,
 * and a direct path into the booking flow. Data comes from the public
 * counselor endpoint (/api/v1/appointments/counselors/{id}); no personal
 * contact details or internal schedules are exposed.
 */

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  FiArrowLeft,
  FiAward,
  FiCalendar,
  FiGlobe,
  FiStar,
  FiBriefcase,
} from 'react-icons/fi';
import UserAvatar from '@/components/ui/profile/UserAvatar';
import { getCounselorById, type Counselor } from '@/lib/appointments-api';

const formatFee = (fee: number | null | undefined) =>
  fee == null ? null : `Rp ${fee.toLocaleString('id-ID')}`;

const formatScheduleLabel = (entry: { day?: string; start_time?: string; end_time?: string }) => {
  const start = (entry.start_time ?? '').slice(0, 5);
  const end = (entry.end_time ?? '').slice(0, 5);
  return [entry.day, start && end ? `${start}–${end}` : null].filter(Boolean).join(' · ');
};

export default function CounselorProfilePage() {
  const params = useParams<{ id: string }>();
  const counselorId = Number(params?.id);

  const [counselor, setCounselor] = useState<Counselor | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!Number.isFinite(counselorId)) {
      setError('Counselor not found');
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const data = await getCounselorById(counselorId);
      setCounselor(data);
    } catch {
      setError('Counselor not found');
    } finally {
      setLoading(false);
    }
  }, [counselorId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="inline-block h-12 w-12 animate-spin rounded-full border-b-2 border-[#FFCA40]" />
      </div>
    );
  }

  if (error || !counselor) {
    return (
      <div className="mx-auto max-w-2xl px-4 pt-32 pb-16 text-center">
        <p className="text-white/70">{error ?? 'Counselor not found'}</p>
        <Link
          href="/appointments"
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#FFCA40] px-6 py-2 text-sm font-semibold text-[#001D58] transition hover:bg-[#ffd45c]"
        >
          <FiArrowLeft className="h-4 w-4" /> Back to appointments
        </Link>
      </div>
    );
  }

  const fee = formatFee(counselor.consultation_fee);
  const languages = (counselor.languages ?? []).filter(Boolean);

  return (
    <div className="mx-auto max-w-4xl px-4 pt-24 pb-16">
      <Link
        href="/appointments"
        className="inline-flex items-center gap-2 text-sm text-white/60 transition hover:text-[#FFCA40]"
      >
        <FiArrowLeft className="h-4 w-4" /> Back to appointments
      </Link>

      <motion.header
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-6 rounded-3xl border border-white/10 bg-linear-to-br from-white/10 to-white/5 p-8 shadow-2xl backdrop-blur"
      >
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
          <div className="relative h-28 w-28 shrink-0 rounded-full overflow-hidden border-2 border-[#FFCA40]/40 bg-white/10">
            <UserAvatar
              src={counselor.image_url}
              name={counselor.name}
              initialsClassName="text-4xl"
            />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-3xl font-bold text-white">{counselor.name}</h1>
            <p className="mt-1 text-sm text-white/70">
              {counselor.specialization || 'Counselor'}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
              {counselor.is_available ? (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-green-500/30 bg-green-500/15 px-3 py-1 font-medium text-green-400">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-400" />
                  Available for booking
                </span>
              ) : (
                <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1 font-medium text-white/50">
                  Currently unavailable
                </span>
              )}
              {(counselor.rating ?? 0) > 0 && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-[#FFCA40]/30 bg-[#FFCA40]/10 px-3 py-1 font-medium text-[#FFCA40]">
                  <FiStar className="h-3 w-3" />
                  {Number(counselor.rating).toFixed(1)}
                  <span className="text-white/50">({counselor.total_reviews ?? 0})</span>
                </span>
              )}
              {counselor.years_of_experience != null && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-white/70">
                  <FiBriefcase className="h-3 w-3" />
                  {counselor.years_of_experience} years experience
                </span>
              )}
              {fee && (
                <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-white/70">
                  {fee} / session
                </span>
              )}
            </div>
          </div>
          {counselor.is_available && (
            <Link
              href={`/appointments/book?counselor=${counselor.id}`}
              className="inline-flex shrink-0 items-center gap-2 rounded-full bg-[#FFCA40] px-6 py-3 text-sm font-semibold text-[#001D58] shadow-lg transition hover:bg-[#ffd45c]"
            >
              <FiCalendar className="h-4 w-4" />
              Book with {counselor.name.split(' ')[0]}
            </Link>
          )}
        </div>
      </motion.header>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur">
            <h2 className="text-lg font-semibold text-white">About</h2>
            <p className="mt-3 text-sm leading-relaxed text-white/80">
              {counselor.bio || 'This counselor has not written a bio yet.'}
            </p>
          </section>

          {(counselor.education?.length ?? 0) > 0 && (
            <section className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
                <FiAward className="h-5 w-5 text-[#FFCA40]" />
                Education
              </h2>
              <ul className="mt-4 space-y-3">
                {counselor.education!.map((entry, index) => (
                  <li
                    key={`education-${index}`}
                    className="rounded-xl border border-white/10 bg-white/5 p-4"
                  >
                    <p className="text-sm font-semibold text-white">
                      {entry.degree || 'Degree'}
                      {entry.year ? (
                        <span className="ml-2 text-xs font-normal text-white/50">{entry.year}</span>
                      ) : null}
                    </p>
                    <p className="mt-0.5 text-xs text-white/60">
                      {[entry.institution, entry.field_of_study].filter(Boolean).join(' · ')}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {(counselor.certifications?.length ?? 0) > 0 && (
            <section className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
                <FiAward className="h-5 w-5 text-[#FFCA40]" />
                Certifications
              </h2>
              <ul className="mt-4 space-y-3">
                {counselor.certifications!.map((entry, index) => (
                  <li
                    key={`certification-${index}`}
                    className="rounded-xl border border-white/10 bg-white/5 p-4"
                  >
                    <p className="text-sm font-semibold text-white">
                      {entry.name || 'Certification'}
                      {entry.year ? (
                        <span className="ml-2 text-xs font-normal text-white/50">{entry.year}</span>
                      ) : null}
                    </p>
                    <p className="mt-0.5 text-xs text-white/60">{entry.issuing_organization}</p>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <aside className="space-y-6">
          <section className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur">
            <h2 className="text-lg font-semibold text-white">At a glance</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div>
                <dt className="text-xs uppercase tracking-wide text-white/50">Specialization</dt>
                <dd className="mt-0.5 text-white/85">{counselor.specialization || 'General practice'}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-white/50">Languages</dt>
                <dd className="mt-0.5 flex items-center gap-1.5 text-white/85">
                  <FiGlobe className="h-3.5 w-3.5 text-white/40" />
                  {languages.length > 0 ? languages.join(', ') : 'Not listed'}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-white/50">Consultation fee</dt>
                <dd className="mt-0.5 text-white/85">{fee ?? 'Contact the clinic'}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-white/50">Availability</dt>
                <dd className="mt-0.5 text-white/85">
                  {counselor.is_available
                    ? 'Accepting appointments'
                    : 'Not accepting appointments right now'}
                </dd>
              </div>
            </dl>
            {counselor.is_available && (
              <Link
                href={`/appointments/book?counselor=${counselor.id}`}
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-full border border-[#FFCA40]/40 bg-[#FFCA40]/10 px-4 py-2.5 text-sm font-semibold text-[#FFCA40] transition hover:bg-[#FFCA40]/20"
              >
                <FiCalendar className="h-4 w-4" />
                Schedule a session
              </Link>
            )}
          </section>

          <p className="px-2 text-xs leading-relaxed text-white/40">
            All counselors at AICare work under UGM's student-support guidelines. Everything
            you discuss stays confidential, with safety exceptions explained during your first
            session.
          </p>
        </aside>
      </div>
    </div>
  );
}
