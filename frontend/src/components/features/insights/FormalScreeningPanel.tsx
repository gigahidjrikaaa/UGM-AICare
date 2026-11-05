'use client';

/**
 * FormalScreeningPanel — self-serve administered instruments (PHQ-9 / GAD-7).
 *
 * Flow: pick an instrument → answer every item → server-scored result card
 * (band, interpretation, recommendation, disclaimer) → history. A flagged
 * crisis gateway item (PHQ-9 item 9) shows the hotline block prominently and
 * independently of the total score.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { FiAlertTriangle, FiChevronLeft, FiClock, FiFileText } from 'react-icons/fi';
import {
  fetchFormalInstruments,
  fetchInstrumentHistory,
  submitFormalInstrument,
  type FormalInstrument,
  type InstrumentSubmitResult,
  type InstrumentSubmission,
} from '@/services/formalScreeningApi';

type Stage = 'pick' | 'questions' | 'result';

const BAND_STYLES: Record<string, { chip: string; bar: string }> = {
  minimal: { chip: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30', bar: 'bg-emerald-500' },
  mild: { chip: 'bg-blue-500/15 text-blue-300 border-blue-500/30', bar: 'bg-blue-500' },
  moderate: { chip: 'bg-yellow-500/15 text-yellow-300 border-yellow-500/30', bar: 'bg-yellow-500' },
  moderately_severe: { chip: 'bg-orange-500/15 text-orange-300 border-orange-500/30', bar: 'bg-orange-500' },
  severe: { chip: 'bg-red-500/15 text-red-300 border-red-500/30', bar: 'bg-red-500' },
};

const formatDate = (iso: string) => {
  try {
    return new Date(iso).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
};

export default function FormalScreeningPanel() {
  const [instruments, setInstruments] = useState<FormalInstrument[]>([]);
  const [history, setHistory] = useState<InstrumentSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState(false);

  const [stage, setStage] = useState<Stage>('pick');
  const [activeInstrument, setActiveInstrument] = useState<FormalInstrument | null>(null);
  const [answers, setAnswers] = useState<number[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<InstrumentSubmitResult | null>(null);

  const loadHistory = useCallback(async () => {
    try {
      const data = await fetchInstrumentHistory();
      setHistory(data.submissions);
    } catch {
      /* history is supplementary */
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const [instrumentData] = await Promise.all([fetchFormalInstruments(), loadHistory()]);
        setInstruments(instrumentData.instruments);
      } catch {
        setUnavailable(true);
      } finally {
        setLoading(false);
      }
    })();
  }, [loadHistory]);

  const startInstrument = (instrument: FormalInstrument) => {
    setActiveInstrument(instrument);
    setAnswers(new Array(instrument.items.length).fill(-1));
    setResult(null);
    setStage('questions');
  };

  const answeredAll = useMemo(
    () => activeInstrument != null && answers.every((value) => value >= 0),
    [activeInstrument, answers],
  );

  const handleSubmit = async () => {
    if (!activeInstrument || !answeredAll) return;
    setSubmitting(true);
    try {
      const data = await submitFormalInstrument(activeInstrument.code, answers);
      setResult(data.result);
      setStage('result');
      await loadHistory();
    } catch (error) {
      const message =
        typeof error === 'object' && error !== null && 'response' in error
          ? String(
              (error as { response?: { data?: { detail?: string } } }).response?.data?.detail ?? '',
            )
          : '';
      toast.error(message || 'Gagal menyimpan hasil. Coba lagi nanti.');
    } finally {
      setSubmitting(false);
    }
  };

  const reset = () => {
    setStage('pick');
    setActiveInstrument(null);
    setResult(null);
  };

  if (loading) {
    return (
      <section className="mt-8 rounded-2xl border border-border bg-card p-6">
        <h2 className="text-lg font-semibold text-foreground">Screening kesehatan</h2>
        <p className="mt-3 text-sm text-muted-foreground">Memuat…</p>
      </section>
    );
  }

  if (unavailable || instruments.length === 0) {
    return null;
  }

  return (
    <section className="mt-8 rounded-2xl border border-border bg-card p-6">
      <h2 className="text-lg font-semibold text-foreground">Screening kesehatan</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Instrumen skrining standar (PHQ-9, GAD-7) yang dipakai secara klinis. Hasilnya bukan
        diagnosis, tetapi membantu kamu — dan konselor, kalau kamu memilihnya — memahami kondisimu.
      </p>

      {stage === 'pick' && (
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {instruments.map((instrument) => (
            <button
              key={instrument.code}
              type="button"
              onClick={() => startInstrument(instrument)}
              className="rounded-xl border border-border bg-background/60 p-4 text-left transition hover:border-[#FFCA40]/60"
            >
              <p className="text-sm font-semibold text-foreground">{instrument.code}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{instrument.name}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                {instrument.items.length} pertanyaan · ~2 menit
              </p>
            </button>
          ))}
        </div>
      )}

      {stage === 'questions' && activeInstrument && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-5">
          <button
            type="button"
            onClick={reset}
            className="flex items-center gap-1 text-xs text-muted-foreground transition hover:text-foreground"
          >
            <FiChevronLeft className="h-3.5 w-3.5" /> Kembali
          </button>
          <p className="mt-3 text-sm font-medium text-foreground">
            {activeInstrument.code} — {activeInstrument.timeframe}
          </p>

          <div className="mt-4 space-y-4">
            {activeInstrument.items.map((item, index) => (
              <div key={index} className="rounded-xl border border-border bg-background/60 p-4">
                <p className="text-sm text-foreground/90">
                  <span className="mr-1.5 font-semibold text-muted-foreground">{index + 1}.</span>
                  {item.text}
                </p>
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {activeInstrument.options.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() =>
                        setAnswers((prev) =>
                          prev.map((value, i) => (i === index ? option.value : value)),
                        )
                      }
                      className={`rounded-lg border px-2 py-2 text-xs transition ${
                        answers[index] === option.value
                          ? 'border-[#FFCA40] bg-[#FFCA40]/10 font-semibold text-[#FFCA40]'
                          : 'border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={!answeredAll || submitting}
            className="mt-6 rounded-full bg-[#FFCA40] px-6 py-3 text-sm font-semibold text-[#00153a] transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {submitting ? 'Mengirim…' : answeredAll ? 'Kirim jawaban' : 'Jawab semua pertanyaan'}
          </button>
        </motion.div>
      )}

      {stage === 'result' && result && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-5">
          <div className="rounded-xl border border-border bg-background/60 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">
                  {result.instrument}
                </p>
                <p className="mt-1 text-2xl font-bold text-foreground">
                  {result.total} <span className="text-sm font-normal text-muted-foreground">/ {result.max}</span>
                </p>
              </div>
              <span
                className={`rounded-full border px-4 py-1.5 text-sm font-semibold ${
                  BAND_STYLES[result.band]?.chip ?? 'border-border text-foreground'
                }`}
              >
                {result.band_label}
              </span>
            </div>

            <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-border">
              <div
                className={`h-full ${BAND_STYLES[result.band]?.bar ?? 'bg-foreground'}`}
                style={{ width: `${Math.min(100, (result.total / result.max) * 100)}%` }}
              />
            </div>

            <p className="mt-4 text-sm text-foreground/90">{result.interpretation}</p>
            <p className="mt-2 text-sm text-muted-foreground">{result.recommendation}</p>

            {result.crisis_flag && (
              <div className="mt-4 rounded-xl border border-red-500/40 bg-red-500/10 p-4">
                <p className="flex items-center gap-2 text-sm font-semibold text-red-300">
                  <FiAlertTriangle className="h-4 w-4" /> Penting
                </p>
                <p className="mt-1.5 text-sm text-red-200/90">{result.crisis_resources_note}</p>
              </div>
            )}

            <p className="mt-4 border-t border-border pt-3 text-xs text-muted-foreground">
              {result.disclaimer}
            </p>
          </div>

          <button
            type="button"
            onClick={reset}
            className="mt-4 rounded-full border border-border px-5 py-2 text-xs font-semibold text-muted-foreground transition hover:text-foreground"
          >
            Selesai
          </button>
        </motion.div>
      )}

      {history.length > 0 && stage === 'pick' && (
        <div className="mt-6 border-t border-border pt-4">
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <FiClock className="h-3.5 w-3.5" /> Riwayat
          </p>
          <ul className="mt-3 space-y-2">
            {history.slice(0, 5).map((submission) => (
              <li
                key={submission.id}
                className="flex items-center justify-between rounded-lg bg-background/60 px-4 py-2.5"
              >
                <span className="flex items-center gap-2 text-sm text-foreground">
                  <FiFileText className="h-3.5 w-3.5 text-muted-foreground" />
                  {submission.instrument}
                  {submission.crisis_flag && (
                    <FiAlertTriangle className="h-3.5 w-3.5 text-red-400" aria-label="Perlu perhatian" />
                  )}
                </span>
                <span className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>
                    {submission.total_score}/{submission.max_score} · {submission.severity_label}
                  </span>
                  <span>{formatDate(submission.created_at)}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
