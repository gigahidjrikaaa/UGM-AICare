'use client';

/**
 * Wellness Insights — the user-facing JITAI surface.
 *
 * 1. "What works for you": the user's own measured intervention outcomes
 *    (aggregated by the backend from their intervention assignments).
 * 2. Weekly check-in: an optional 4-item PHQ-2 / GAD-2 self-report that feeds
 *    the longitudinal screening series (opt-in; separate consent).
 *
 * Backed by /api/v1/screening/* (gated server-side by JITAI_ENABLED).
 */

import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  fetchInsights,
  setPersonalizationConsent,
  setSelfReportConsent,
  submitSelfReport,
  type InsightItem,
} from '@/services/screeningApi';
import FormalScreeningPanel from '@/components/features/insights/FormalScreeningPanel';

const PHQ2_ITEMS = [
  'Sedikit minat atau kesenangan dalam melakukan sesuatu',
  'Merasa murung, tertekan, atau putus asa',
];
const GAD2_ITEMS = [
  'Merasa gugup, cemas, atau tegang',
  'Tidak mampu menghentikan atau mengendalikan rasa khawatir',
];
const SCALE = [
  { value: 0, label: 'Tidak sama sekali' },
  { value: 1, label: 'Beberapa hari' },
  { value: 2, label: 'Lebih dari separuh waktu' },
  { value: 3, label: 'Hampir setiap hari' },
];

function QuestionRow({
  text,
  value,
  onChange,
}: {
  text: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
      <span className="text-sm text-foreground/90">{text}</span>
      <select
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
      >
        {SCALE.map((option) => (
          <option key={option.value} value={option.value}>
            {option.value} — {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export default function InsightsPage() {
  const [insights, setInsights] = useState<InsightItem[]>([]);
  const [consent, setConsent] = useState(false);
  const [personalization, setPersonalization] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [phq2, setPhq2] = useState([0, 0]);
  const [gad2, setGad2] = useState([0, 0]);

  const load = useCallback(async () => {
    try {
      const data = await fetchInsights();
      setInsights(data.interventions);
      setConsent(data.self_report_consent);
      setPersonalization(data.personalization_consent);
    } catch {
      // Non-blocking: the surface still shows the check-in form.
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const toggleConsent = async () => {
    const next = !consent;
    try {
      const result = await setSelfReportConsent(next);
      setConsent(result.consent_self_report);
      toast.success(next ? 'Check-in mingguan diaktifkan' : 'Check-in mingguan dimatikan');
    } catch {
      toast.error('Gagal mengubah pengaturan. Coba lagi nanti.');
    }
  };

  const togglePersonalization = async () => {
    const next = !personalization;
    try {
      const result = await setPersonalizationConsent(next);
      setPersonalization(result.consent_personalization);
      toast.success(next ? 'Saran personalisasi diaktifkan' : 'Saran personalisasi dimatikan');
    } catch {
      toast.error('Gagal mengubah pengaturan. Coba lagi nanti.');
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const result = await submitSelfReport({ phq2, gad2 });
      if (result.result.positive_screen) {
        toast.success('Terima kasih. Kalau kamu mau, kita bisa bicara lebih lanjut dengan Aika.');
      } else {
        toast.success('Terima kasih sudah check-in!');
      }
    } catch {
      toast.error('Check-in belum tersedia saat ini.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-3xl px-4 py-10">
        <motion.header
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-foreground">Your Wellness Insights</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Apa yang berhasil untukmu, dan check-in mingguan singkat.
          </p>
        </motion.header>

        {/* What works for you */}
        <section className="mb-8 rounded-2xl border border-border bg-card p-6">
          <h2 className="text-lg font-semibold text-foreground">What works for you</h2>
          {loading ? (
            <p className="mt-3 text-sm text-muted-foreground">Memuat…</p>
          ) : insights.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">
              Belum ada cukup data. Setelah kamu mencoba beberapa aktivitas dan check-in,
              Aika akan menunjukkan apa yang paling membantu untukmu.
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {insights.map((item) => (
                <li
                  key={item.intervention_key}
                  className="flex items-center justify-between rounded-xl bg-background/60 px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">{item.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.improved}/{item.n} percobaan membaik
                    </p>
                  </div>
                  <span className="text-lg font-semibold text-emerald-400">
                    {Math.round(item.improvement_rate)}%
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Weekly check-in */}
        <section className="rounded-2xl border border-border bg-card p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Weekly check-in</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                4 pertanyaan singkat (~30 detik) untuk memahami perasaanmu.
              </p>
            </div>
            <button
              type="button"
              onClick={toggleConsent}
              className={`shrink-0 rounded-full px-4 py-2 text-xs font-semibold transition-colors ${
                consent
                  ? 'bg-emerald-500/15 text-emerald-300'
                  : 'bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              {consent ? 'Pengingat aktif' : 'Aktifkan pengingat'}
            </button>
          </div>

          <div className="mt-5 divide-y divide-border">
            {PHQ2_ITEMS.map((text, index) => (
              <QuestionRow
                key={text}
                text={text}
                value={phq2[index]}
                onChange={(value) =>
                  setPhq2((prev) => prev.map((v, i) => (i === index ? value : v)))
                }
              />
            ))}
            {GAD2_ITEMS.map((text, index) => (
              <QuestionRow
                key={text}
                text={text}
                value={gad2[index]}
                onChange={(value) =>
                  setGad2((prev) => prev.map((v, i) => (i === index ? value : v)))
                }
              />
            ))}
          </div>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="mt-6 rounded-full bg-[#FFCA40] px-6 py-3 text-sm font-semibold text-[#00153a] transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {submitting ? 'Mengirim…' : 'Kirim check-in'}
          </button>
        </section>

        {/* Formal instruments (PHQ-9 / GAD-7), server-scored */}
        <FormalScreeningPanel />

        {/* Personalization consent */}
        <section className="mt-8 rounded-2xl border border-border bg-card p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                Personalized suggestions
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Izinkan Aika menyesuaikan aktivitas yang disarankan berdasarkan apa yang
                berhasil untukmu. Kamu bisa mematikannya kapan saja.
              </p>
            </div>
            <button
              type="button"
              onClick={togglePersonalization}
              className={`shrink-0 rounded-full px-4 py-2 text-xs font-semibold transition-colors ${
                personalization
                  ? 'bg-emerald-500/15 text-emerald-300'
                  : 'bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              {personalization ? 'Aktif' : 'Aktifkan'}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
