'use client';

/**
 * CounselorEmailCompose — modal to compose + send a templated email to a
 * student, plus the recent send history. Used from the counselor patient
 * detail page. Server-side: scope-checked (caseload), rate-limited,
 * audited; student crisis/opt-in state surfaced in the result.
 */

import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { FiAlertTriangle, FiArrowLeft, FiEye, FiMail, FiRefreshCw, FiX } from 'react-icons/fi';
import {
  listEmailTemplates,
  listStudentEmailHistory,
  previewStudentEmail,
  sendStudentEmail,
  type CounselorEmailLog,
  type CounselorEmailTemplate,
  type EmailPreview,
  type SendEmailResult,
} from '@/services/counselorEmailApi';

type ComposeModalProps = {
  studentUserId: number;
  studentName: string;
  onClose: () => void;
  onSent?: () => void;
};

export function CounselorEmailComposeModal({
  studentUserId,
  studentName,
  onClose,
  onSent,
}: ComposeModalProps) {
  const [templates, setTemplates] = useState<CounselorEmailTemplate[]>([]);
  const [dailyLimit, setDailyLimit] = useState(30);
  const [selectedKey, setSelectedKey] = useState<string>('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<SendEmailResult | null>(null);
  const [preview, setPreview] = useState<EmailPreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewMode, setPreviewMode] = useState<'html' | 'plain'>('html');

  useEffect(() => {
    listEmailTemplates()
      .then((data) => {
        setTemplates(data.templates);
        setDailyLimit(data.daily_limit);
        if (data.templates.length > 0) setSelectedKey(data.templates[0].key);
      })
      .catch(() => toast.error('Gagal memuat template email'));
  }, []);

  const selected = templates.find((t) => t.key === selectedKey);

  const loadPreview = useCallback(
    async (templateKey: string, customMessage: string) => {
      setPreviewLoading(true);
      try {
        const data = await previewStudentEmail(studentUserId, {
          template_key: templateKey,
          custom_message: customMessage,
        });
        setPreview(data);
      } catch {
        toast.error('Gagal memuat pratinjau');
        setPreview(null);
      } finally {
        setPreviewLoading(false);
      }
    },
    [studentUserId],
  );

  // Keep the open preview in sync with template/message edits (debounced).
  useEffect(() => {
    if (preview === null || !selectedKey) return;
    const timer = setTimeout(() => {
      void loadPreview(selectedKey, message);
    }, 600);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedKey, message]);

  const handleSend = async () => {
    if (!selected) return;
    setSending(true);
    try {
      const result = await sendStudentEmail(studentUserId, {
        template_key: selected.key,
        custom_message: message,
      });
      setResult(result);
      setMessage('');
      onSent?.();
      if (result.delivered) {
        toast.success('Email terkirim');
      } else {
        toast.error('Email gagal terkirim — cek konfigurasi SMTP');
      }
    } catch (error) {
      const detail =
        typeof error === 'object' && error !== null && 'response' in error
          ? String(
              (error as { response?: { data?: { detail?: string } } }).response?.data?.detail ?? '',
            )
          : '';
      toast.error(detail || 'Gagal mengirim email');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-white/15 bg-[#001A4D] shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
            <FiMail className="text-[#FFCA40]" /> Email {studentName}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-white/60 transition hover:bg-white/10 hover:text-white"
            aria-label="Tutup"
          >
            <FiX className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 p-5">
          {preview === null ? (
            <>
              {templates.length > 0 && (
                <label className="block text-sm text-white/80">
                  Template
                  <select
                    value={selectedKey}
                    onChange={(e) => setSelectedKey(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#FFCA40]/40 [color-scheme:dark]"
                  >
                    {templates.map((t) => (
                      <option key={t.key} value={t.key} className="bg-[#001D58]">
                        {t.label}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              {selected && (
                <p className="text-xs text-white/40">{selected.description}</p>
              )}

              <label className="block text-sm text-white/80">
                Pesan tambahan (digabung ke template)
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={5}
                  maxLength={4000}
                  placeholder="Tulis pesan personal untuk mahasiswa…"
                  className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[#FFCA40]/40 resize-none [color-scheme:dark]"
                />
              </label>

              <p className="text-xs text-white/40">
                Email dikirim dengan branding AICare atas nama kamu, dan setiap pengiriman
                dicatat untuk akuntabilitas. Student tanpa opt-in email tetap bisa menerima
                email terkait perawatan. Balasan student lewat email masuk otomatis ke
                thread pesan AICare.
              </p>
            </>
          ) : (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white">
                    {previewLoading ? 'Memperbarui pratinjau…' : preview?.subject}
                  </p>
                  <p className="text-[11px] text-white/40">
                    {preview?.label ?? '—'} · apa yang diterima {studentName}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1 rounded-lg border border-white/10 bg-white/5 p-1">
                  {(['html', 'plain'] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setPreviewMode(mode)}
                      className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition ${
                        previewMode === mode
                          ? 'bg-[#FFCA40] text-[#001D58]'
                          : 'text-white/60 hover:text-white'
                      }`}
                    >
                      {mode === 'html' ? 'Tampilan email' : 'Teks polos'}
                    </button>
                  ))}
                </div>
              </div>

              {previewMode === 'html' ? (
                <iframe
                  title="Pratinjau email"
                  sandbox=""
                  srcDoc={preview?.html ?? ''}
                  className="h-[320px] w-full rounded-xl border border-white/10 bg-white"
                />
              ) : (
                <pre className="max-h-[320px] overflow-y-auto whitespace-pre-wrap rounded-xl border border-white/10 bg-white/5 p-4 font-sans text-sm text-white/80">
                  {preview?.plain ?? ''}
                </pre>
              )}

              <p className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200/90">
                <FiEye className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                {preview?.disclaimer}
              </p>
            </div>
          )}

          {result && (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-200">
              {result.delivered ? 'Email terkirim.' : 'Email gagal terkirim.'}{' '}
              ({result.sent_today}/{result.daily_limit} hari ini)
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-white/10 p-5">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-white/20 px-4 py-2 text-sm text-white/70 transition hover:bg-white/10 hover:text-white"
          >
            Selesai
          </button>
          {preview === null ? (
            <button
              type="button"
              onClick={() => selected && void loadPreview(selected.key, message)}
              disabled={!selected || previewLoading}
              className="inline-flex items-center gap-2 rounded-xl border border-white/20 px-4 py-2 text-sm text-white/80 transition hover:bg-white/10 disabled:opacity-50"
            >
              {previewLoading ? <FiRefreshCw className="h-4 w-4 animate-spin" /> : <FiEye className="h-4 w-4" />}
              Pratinjau
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setPreview(null)}
              className="inline-flex items-center gap-2 rounded-xl border border-white/20 px-4 py-2 text-sm text-white/80 transition hover:bg-white/10"
            >
              <FiArrowLeft className="h-4 w-4" />
              Kembali mengedit
            </button>
          )}
          <button
            type="button"
            onClick={handleSend}
            disabled={sending || !selected}
            className="inline-flex items-center gap-2 rounded-xl bg-[#FFCA40] px-5 py-2 text-sm font-semibold text-[#001D58] transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            <FiMail className="h-4 w-4" />
            {sending ? 'Mengirim…' : 'Kirim email'}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Recent counselor → student emails for one student (history list). */
export function CounselorEmailHistory({ studentUserId }: { studentUserId: number }) {
  const [emails, setEmails] = useState<CounselorEmailLog[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    listStudentEmailHistory(studentUserId)
      .then((data) => setEmails(data.emails))
      .catch(() => setEmails([]))
      .finally(() => setLoading(false));
  }, [studentUserId]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return <p className="text-sm text-white/50">Memuat riwayat email…</p>;
  }
  if (emails.length === 0) {
    return <p className="text-sm text-white/40">Belum ada email yang dikirim.</p>;
  }
  return (
    <ul className="space-y-2">
      {emails.map((log) => (
        <li
          key={log.id}
          className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 p-3"
        >
          <div className="min-w-0">
            <p className="truncate text-sm text-white/85">{log.subject}</p>
            <p className="text-[11px] text-white/40">
              {log.template_key} ·{' '}
              {new Date(log.created_at).toLocaleString('id-ID')}
            </p>
          </div>
          <span
            className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-medium ${
              log.status === 'sent'
                ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400'
                : 'border-red-500/20 bg-red-500/10 text-red-400'
            }`}
          >
            {log.status}
          </span>
        </li>
      ))}
    </ul>
  );
}

/** Small re-export so consumers can render the crisis notice without importing icons twice. */
export function EmailCrisisNotice() {
  return (
    <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3">
      <p className="flex items-center gap-2 text-xs font-semibold text-amber-300">
        <FiAlertTriangle className="h-3.5 w-3.5" /> Catatan
      </p>
      <p className="mt-1 text-xs text-amber-200/80">
        Email bukan kanal krisis. Jika mahasiswa menunjukkan bahasa krisis, gunakan
        escalasi kasus dan hubungi mereka langsung.
      </p>
    </div>
  );
}
