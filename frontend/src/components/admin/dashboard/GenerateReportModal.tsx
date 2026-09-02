'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  XMarkIcon,
  SparklesIcon,
  CalendarIcon,
  ClockIcon,
  CpuChipIcon,
} from '@heroicons/react/24/outline';
import { EASE } from './primitives';

interface GenerateReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (params: GenerateReportParams) => Promise<void>;
}

export interface GenerateReportParams {
  report_type: 'weekly' | 'monthly' | 'ad_hoc';
  period_start?: string; // ISO datetime
  period_end?: string; // ISO datetime
  use_llm?: boolean; // Whether to use Gemini LLM for intelligent analysis
}

export function GenerateReportModal({ isOpen, onClose, onGenerate }: GenerateReportModalProps) {
  const [reportType, setReportType] = useState<'weekly' | 'monthly' | 'ad_hoc'>('ad_hoc');
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [useLLM, setUseLLM] = useState(true); // Default to using LLM
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsGenerating(true);

    try {
      const params: GenerateReportParams = {
        report_type: reportType,
        use_llm: useLLM,
      };

      // Add dates if provided (for ad_hoc or overriding defaults)
      if (periodStart) {
        params.period_start = new Date(periodStart).toISOString();
      }
      if (periodEnd) {
        params.period_end = new Date(periodEnd).toISOString();
      }

      await onGenerate(params);

      // Reset form and close
      setReportType('ad_hoc');
      setPeriodStart('');
      setPeriodEnd('');
      setUseLLM(true);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate report');
    } finally {
      setIsGenerating(false);
    }
  };

  // Get default date ranges based on report type
  const getDefaultDates = () => {
    const now = new Date();
    const start = new Date();

    if (reportType === 'weekly') {
      start.setDate(now.getDate() - 7);
    } else if (reportType === 'monthly') {
      start.setDate(now.getDate() - 30);
    } else {
      start.setDate(now.getDate() - 7);
    }

    return {
      start: start.toISOString().split('T')[0],
      end: now.toISOString().split('T')[0],
    };
  };

  const defaultDates = getDefaultDates();

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: EASE }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md"
          />

          {/* Modal */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 24, filter: 'blur(8px)' }}
              animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, scale: 0.97, y: 16, filter: 'blur(4px)' }}
              transition={{ duration: 0.6, ease: EASE }}
              className="w-full max-w-lg overflow-hidden rounded-[2rem] bg-white/[0.05] p-1.5 ring-1 ring-white/12"
            >
              <div className="max-h-[85vh] overflow-y-auto rounded-[calc(2rem-0.375rem)] bg-[#020b22]/95 shadow-[inset_0_1px_1px_rgba(255,255,255,0.08)]">
                {/* Header */}
                <div className="flex items-start justify-between gap-4 border-b border-white/[0.06] px-6 pb-4 pt-5">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#FFCA40]/10 text-[#FFCA40] ring-1 ring-[#FFCA40]/25">
                      <SparklesIcon className="h-5 w-5" />
                    </span>
                    <div>
                      <h2 className="text-base font-semibold tracking-tight text-white">Generate IA Report</h2>
                      <p className="text-xs text-white/45">AI-powered Insights Agent analysis</p>
                    </div>
                  </div>
                  <button
                    onClick={onClose}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-white/45 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-white/[0.06] hover:text-white active:scale-[0.94]"
                    disabled={isGenerating}
                    aria-label="Close report modal"
                  >
                    <XMarkIcon className="h-4 w-4" />
                  </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-6 p-6">
                  {/* Report Type — fluid island */}
                  <div>
                    <label className="mb-3 block text-[10px] font-semibold uppercase tracking-[0.2em] text-white/40">
                      Report Type
                    </label>
                    <div className="flex items-center rounded-full bg-white/[0.05] p-1 ring-1 ring-white/10">
                      {(['weekly', 'monthly', 'ad_hoc'] as const).map((type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setReportType(type)}
                          className={`relative flex-1 rounded-full px-3 py-2 text-xs font-medium transition-colors duration-500 ${
                            reportType === type ? 'text-[#00153a]' : 'text-white/55 hover:text-white'
                          }`}
                        >
                          {reportType === type && (
                            <motion.span
                              layoutId="report-type-pill"
                              transition={{ duration: 0.6, ease: EASE }}
                              className="absolute inset-0 rounded-full bg-[#FFCA40]"
                            />
                          )}
                          <span className="relative">
                            {type === 'ad_hoc' ? 'Custom' : type.charAt(0).toUpperCase() + type.slice(1)}
                          </span>
                        </button>
                      ))}
                    </div>
                    <p className="mt-2 text-xs text-white/40">
                      {reportType === 'weekly' && 'Analyze data from the last 7 days'}
                      {reportType === 'monthly' && 'Analyze data from the last 30 days'}
                      {reportType === 'ad_hoc' && 'Create a custom report with your own date range'}
                    </p>
                  </div>

                  {/* LLM Toggle */}
                  <div className="rounded-2xl bg-white/[0.03] p-4 ring-1 ring-white/[0.08]">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-purple-500/10 text-purple-300 ring-1 ring-purple-500/25">
                          <CpuChipIcon className="h-4 w-4" />
                        </span>
                        <div>
                          <label htmlFor="use-llm" className="cursor-pointer text-sm font-medium text-white">
                            Gemini AI Analysis
                          </label>
                          <p className="text-xs leading-snug text-white/45">
                            Intelligent summaries, pattern recognition, and recommendations
                          </p>
                        </div>
                      </div>
                      <button
                        id="use-llm"
                        type="button"
                        role="switch"
                        aria-checked={useLLM}
                        onClick={() => setUseLLM(!useLLM)}
                        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${
                          useLLM ? 'bg-purple-500' : 'bg-white/15'
                        }`}
                      >
                        <motion.span
                          animate={{ x: useLLM ? 20 : 2 }}
                          transition={{ duration: 0.5, ease: EASE }}
                          className="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm"
                        />
                      </button>
                    </div>
                  </div>

                  {/* Date Range */}
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="period-start" className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.2em] text-white/40">
                        <span className="flex items-center gap-2">
                          <CalendarIcon className="h-3.5 w-3.5" />
                          Period Start Date
                        </span>
                      </label>
                      <input
                        id="period-start"
                        type="date"
                        value={periodStart || defaultDates.start}
                        onChange={(e) => setPeriodStart(e.target.value)}
                        className="w-full rounded-2xl bg-white/[0.04] px-4 py-2.5 text-sm text-white ring-1 ring-white/10 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] [color-scheme:dark] placeholder:text-white/30 focus:outline-none focus:ring-[#FFCA40]/40"
                      />
                      <p className="mt-1.5 text-xs text-white/35">
                        Leave blank to use default ({reportType === 'weekly' ? '7' : reportType === 'monthly' ? '30' : '7'} days ago)
                      </p>
                    </div>

                    <div>
                      <label htmlFor="period-end" className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.2em] text-white/40">
                        <span className="flex items-center gap-2">
                          <CalendarIcon className="h-3.5 w-3.5" />
                          Period End Date
                        </span>
                      </label>
                      <input
                        id="period-end"
                        type="date"
                        value={periodEnd || defaultDates.end}
                        onChange={(e) => setPeriodEnd(e.target.value)}
                        className="w-full rounded-2xl bg-white/[0.04] px-4 py-2.5 text-sm text-white ring-1 ring-white/10 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] [color-scheme:dark] placeholder:text-white/30 focus:outline-none focus:ring-[#FFCA40]/40"
                      />
                      <p className="mt-1.5 text-xs text-white/35">
                        Leave blank to use current date/time
                      </p>
                    </div>
                  </div>

                  {/* Preview Info */}
                  <div className="flex items-start gap-3 rounded-2xl bg-[#FFCA40]/[0.05] p-4 ring-1 ring-[#FFCA40]/15">
                    <ClockIcon className="mt-0.5 h-4 w-4 shrink-0 text-[#FFCA40]/80" />
                    <div className="flex-1">
                      <p className="mb-1 text-sm font-medium text-white/85">Report Preview</p>
                      <p className="text-xs leading-relaxed text-white/55">
                        This will analyze <strong className="text-white/75">{reportType === 'weekly' ? '7' : reportType === 'monthly' ? '30' : 'custom'}</strong> days
                        of triage assessments, generate trending topics, calculate sentiment scores,
                        and identify high-risk cases.
                        {useLLM && (
                          <span className="mt-1 block text-purple-300/90">
                            Gemini will provide intelligent summaries, pattern recognition, and actionable recommendations.
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Error Message */}
                  {error && (
                    <div className="rounded-2xl bg-red-500/[0.07] p-4 ring-1 ring-red-500/20">
                      <p className="text-sm text-red-300">{error}</p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-3 pt-1">
                    <button
                      type="button"
                      onClick={onClose}
                      disabled={isGenerating}
                      className="flex-1 rounded-full bg-white/[0.05] px-4 py-3 text-sm font-medium text-white/75 ring-1 ring-white/10 transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-white/[0.09] hover:text-white active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isGenerating}
                      className="flex flex-1 items-center justify-center gap-2 rounded-full bg-[#FFCA40] px-4 py-3 text-sm font-semibold text-[#00153a] transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] hover:shadow-[0_8px_40px_-8px_rgba(255,202,64,0.5)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isGenerating ? (
                        <>
                          <span className="h-4 w-4 animate-spin rounded-full border-[1.5px] border-[#00153a]/30 border-t-[#00153a]" />
                          {useLLM ? 'AI Analyzing…' : 'Generating…'}
                        </>
                      ) : (
                        <>
                          <SparklesIcon className="h-4 w-4" />
                          Generate Report
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
