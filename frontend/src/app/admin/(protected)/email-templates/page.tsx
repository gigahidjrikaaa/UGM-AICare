'use client';

/**
 * Admin: outbound email templates — the DB rows counselors' emails are
 * rendered from. Editing here changes what counselors send without a deploy.
 * The `key` is immutable after creation (stable identifier used by the
 * counselor flow); body supports {student_name}, {counselor_name} and
 * {custom_message} placeholders.
 */

import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { FiEdit2, FiMail, FiPlus, FiTrash2 } from 'react-icons/fi';
import {
  AdminButton,
  AdminCard,
  AdminErrorBanner,
  AdminInput,
  AdminPageHeader,
  AdminTextarea,
  PageSpinner,
  SectionTitle,
  StatusChip,
} from '@/components/ui/admin/kit';
import {
  adminCreateEmailTemplate,
  adminDeleteEmailTemplate,
  adminListEmailTemplates,
  adminUpdateEmailTemplate,
  type AdminEmailTemplate,
} from '@/services/counselorEmailApi';

type EditorState = {
  id: number | null; // null = create
  key: string;
  label: string;
  subject: string;
  body_text: string;
  description: string;
  sort_order: number;
};

const EMPTY_EDITOR: EditorState = {
  id: null,
  key: '',
  label: '',
  subject: '',
  body_text: '',
  description: '',
  sort_order: 0,
};

export default function AdminEmailTemplatesPage() {
  const [templates, setTemplates] = useState<AdminEmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setError('');
    try {
      const data = await adminListEmailTemplates();
      setTemplates(data.templates);
    } catch {
      setError('Gagal memuat template email. Coba lagi.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleSave = async () => {
    if (!editor) return;
    if (!editor.key.trim() || !editor.label.trim() || !editor.subject.trim() || !editor.body_text.trim()) {
      toast.error('Key, label, subject, dan body wajib diisi');
      return;
    }
    setSaving(true);
    try {
      if (editor.id === null) {
        await adminCreateEmailTemplate({
          key: editor.key.trim(),
          label: editor.label.trim(),
          subject: editor.subject,
          body_text: editor.body_text,
          description: editor.description,
          sort_order: editor.sort_order,
        });
        toast.success('Template dibuat');
      } else {
        await adminUpdateEmailTemplate(editor.id, {
          label: editor.label.trim(),
          subject: editor.subject,
          body_text: editor.body_text,
          description: editor.description,
          sort_order: editor.sort_order,
        });
        toast.success('Template diperbarui');
      }
      setEditor(null);
      await load();
    } catch (err) {
      const detail =
        typeof err === 'object' && err !== null && 'response' in err
          ? String((err as { response?: { data?: { detail?: string } } }).response?.data?.detail ?? '')
          : '';
      toast.error(detail || 'Gagal menyimpan template');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (template: AdminEmailTemplate) => {
    try {
      await adminUpdateEmailTemplate(template.id, { is_active: !template.is_active });
      await load();
    } catch {
      toast.error('Gagal mengubah status template');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await adminDeleteEmailTemplate(id);
      toast.success('Template dihapus');
      setConfirmingDeleteId(null);
      await load();
    } catch {
      toast.error('Gagal menghapus template');
    }
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        icon={<FiMail />}
        title="Email Templates"
        subtitle="Template email yang dikirim counselor ke student — diedit di sini, langsung dipakai tanpa deploy"
        actions={
          <AdminButton
            variant="primary"
            onClick={() => setEditor({ ...EMPTY_EDITOR })}
          >
            <FiPlus className="h-4 w-4" /> Template baru
          </AdminButton>
        }
      />

      <div className="rounded-xl border border-[#FFCA40]/30 bg-linear-to-r from-[#FFCA40]/10 to-[#FFD700]/10 p-4 text-sm text-white/80">
        Placeholder yang tersedia di subject & body:{' '}
        <code className="rounded bg-white/10 px-1.5 py-0.5 text-[#FFCA40]">{'{student_name}'}</code>{' '}
        <code className="rounded bg-white/10 px-1.5 py-0.5 text-[#FFCA40]">{'{counselor_name}'}</code>{' '}
        <code className="rounded bg-white/10 px-1.5 py-0.5 text-[#FFCA40]">{'{custom_message}'}</code>
        . Email terkirim otomatis mendapat branding AICare, crisis-footer, dan alamat balasan
        yang masuk ke thread pesan AICare.
      </div>

      {loading ? (
        <PageSpinner label="Memuat template…" />
      ) : error ? (
        <AdminErrorBanner message={error} onRetry={() => void load()} />
      ) : templates.length === 0 ? (
        <AdminCard>
          <p className="text-sm text-white/60">
            Belum ada template di database — counselor memakai bawaan kode. Buat template
            untuk mengambil alih.
          </p>
        </AdminCard>
      ) : (
        <section>
          <SectionTitle>{templates.length} template</SectionTitle>
          <div className="grid gap-4 lg:grid-cols-2">
            {templates.map((template) => (
              <AdminCard key={template.id} className="flex flex-col gap-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-base font-semibold text-white">{template.label}</p>
                    <p className="mt-0.5 font-mono text-[11px] text-white/40">{template.key}</p>
                  </div>
                  <StatusChip
                    status={template.is_active ? 'active' : 'draft'}
                    label={template.is_active ? 'Aktif' : 'Nonaktif'}
                  />
                </div>

                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-white/40">Subject</p>
                  <p className="mt-1 text-sm text-white/85">{template.subject}</p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-white/40">Body</p>
                  <pre className="mt-1 max-h-32 overflow-y-auto whitespace-pre-wrap rounded-lg border border-white/10 bg-white/5 p-3 font-sans text-xs text-white/70">
                    {template.body_text}
                  </pre>
                </div>
                {template.description && (
                  <p className="text-xs text-white/40">{template.description}</p>
                )}

                <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-white/10 pt-3">
                  <AdminButton
                    size="sm"
                    onClick={() =>
                      setEditor({
                        id: template.id,
                        key: template.key,
                        label: template.label,
                        subject: template.subject,
                        body_text: template.body_text,
                        description: template.description ?? '',
                        sort_order: template.sort_order,
                      })
                    }
                  >
                    <FiEdit2 className="h-3.5 w-3.5" /> Edit
                  </AdminButton>
                  <AdminButton size="sm" onClick={() => void handleToggleActive(template)}>
                    {template.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                  </AdminButton>
                  {confirmingDeleteId === template.id ? (
                    <>
                      <AdminButton variant="danger" size="sm" onClick={() => void handleDelete(template.id)}>
                        Yakin hapus
                      </AdminButton>
                      <AdminButton size="sm" onClick={() => setConfirmingDeleteId(null)}>
                        Batal
                      </AdminButton>
                    </>
                  ) : (
                    <AdminButton
                      variant="danger"
                      size="sm"
                      onClick={() => setConfirmingDeleteId(template.id)}
                    >
                      <FiTrash2 className="h-3.5 w-3.5" /> Hapus
                    </AdminButton>
                  )}
                  <span className="ml-auto text-[11px] text-white/30">
                    urutan {template.sort_order}
                  </span>
                </div>
              </AdminCard>
            ))}
          </div>
        </section>
      )}

      {editor && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-white/15 bg-[#001A4D] shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <h2 className="text-lg font-semibold text-white">
                {editor.id === null ? 'Template baru' : `Edit: ${editor.key}`}
              </h2>
              <button
                type="button"
                onClick={() => setEditor(null)}
                className="rounded-lg px-2 py-1 text-white/60 transition hover:bg-white/10 hover:text-white"
                aria-label="Tutup"
              >
                ✕
              </button>
            </div>
            <div className="space-y-4 p-5">
              <label className="block text-sm text-white/80">
                Key {editor.id !== null && '(tidak bisa diubah)'}
                <AdminInput
                  value={editor.key}
                  disabled={editor.id !== null}
                  onChange={(e) => setEditor({ ...editor, key: e.target.value })}
                  placeholder="mis. exam_week_checkin"
                  className="mt-1 font-mono disabled:opacity-50"
                />
              </label>
              <label className="block text-sm text-white/80">
                Label (ditampilkan ke counselor)
                <AdminInput
                  value={editor.label}
                  onChange={(e) => setEditor({ ...editor, label: e.target.value })}
                  placeholder="mis. Check-in minggu ujian"
                  className="mt-1"
                />
              </label>
              <label className="block text-sm text-white/80">
                Subject
                <AdminInput
                  value={editor.subject}
                  onChange={(e) => setEditor({ ...editor, subject: e.target.value })}
                  placeholder="Halo {student_name}…"
                  className="mt-1"
                />
              </label>
              <label className="block text-sm text-white/80">
                Body (teks polos; dibungkus branding AICare otomatis)
                <AdminTextarea
                  value={editor.body_text}
                  rows={8}
                  onChange={(e) => setEditor({ ...editor, body_text: e.target.value })}
                  placeholder={'Halo {student_name},\n\n{custom_message}'}
                  className="mt-1 whitespace-pre-wrap font-mono text-xs"
                />
              </label>
              <label className="block text-sm text-white/80">
                Deskripsi (opsional)
                <AdminInput
                  value={editor.description}
                  onChange={(e) => setEditor({ ...editor, description: e.target.value })}
                  className="mt-1"
                />
              </label>
              <label className="block text-sm text-white/80">
                Urutan tampil
                <AdminInput
                  type="number"
                  value={editor.sort_order}
                  onChange={(e) => setEditor({ ...editor, sort_order: Number(e.target.value) || 0 })}
                  className="mt-1"
                />
              </label>
            </div>
            <div className="flex justify-end gap-2 border-t border-white/10 p-5">
              <AdminButton onClick={() => setEditor(null)}>Batal</AdminButton>
              <AdminButton variant="primary" disabled={saving} onClick={() => void handleSave()}>
                {saving ? 'Menyimpan…' : 'Simpan template'}
              </AdminButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
