'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiCall } from '@/utils/adminApi';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';

interface FlagItem {
  id: number;
  session_id: string;
  user_id?: number | null;
  reason?: string | null;
  status: string;
  flagged_by_admin_id?: number | null;
  created_at: string;
  updated_at: string;
  tags?: string[] | null;
  notes?: string | null;
}

export default function FlagsPage() {
  const [flags, setFlags] = useState<FlagItem[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Record<number, boolean>>({});

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const q = statusFilter ? `?status_filter=${encodeURIComponent(statusFilter)}` : '';
      const data = await apiCall<FlagItem[]>(`/api/v1/admin/flags${q}`);
      setFlags(data);
      // reset selection on new data
      setSelected({});
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { void load(); }, [load]);

  const updateFlag = async (id: number, payload: Partial<FlagItem>) => {
    await apiCall<FlagItem>(`/api/v1/admin/flags/${id}`, { method: 'PUT', body: JSON.stringify({ status: payload.status, reason: payload.reason, tags: payload.tags, notes: payload.notes }) });
    await load();
  };

  const selectedIds = useMemo(() => Object.entries(selected).filter(([, v]) => v).map(([k]) => Number(k)), [selected]);
  const allSelected = flags.length > 0 && selectedIds.length === flags.length;
  const anySelected = selectedIds.length > 0;

  const toggleAll = (value: boolean) => {
    const next: Record<number, boolean> = {};
    if (value) flags.forEach(f => { next[f.id] = true; });
    setSelected(next);
  };

  const bulkClose = async () => {
    if (!anySelected) return;
    if (!confirm(`Close ${selectedIds.length} selected flag(s) as resolved?`)) return;
    await apiCall<FlagItem[]>(`/api/v1/admin/flags/bulk-close`, { method: 'POST', body: JSON.stringify({ ids: selectedIds, status: 'resolved' }) });
    await load();
  };

  const bulkAddTag = async () => {
    if (!anySelected) return;
    const tag = prompt('Tag to add to selected flags:')?.trim();
    if (!tag) return;
    await apiCall<FlagItem[]>(`/api/v1/admin/flags/bulk-tag`, { method: 'POST', body: JSON.stringify({ ids: selectedIds, tags: [tag], mode: 'add' }) });
    await load();
  };

  if (loading) return <div className="text-gray-300 px-3 sm:px-4">Loading…</div>;

  return (
    <div className="space-y-4 sm:space-y-6 px-3 sm:px-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <h1 className="text-2xl sm:text-3xl font-bold text-white">Flagged Sessions</h1>
        <div className="flex items-center gap-2 flex-wrap">
          <label htmlFor="flag-status-filter" className="sr-only">Filter flags by status</label>
          <select id="flag-status-filter" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2 bg-white/10 border border-white/20 rounded-md text-white text-sm">
            <option value="" className="bg-gray-800">All</option>
            <option value="open" className="bg-gray-800">Open</option>
            <option value="reviewing" className="bg-gray-800">Reviewing</option>
            <option value="resolved" className="bg-gray-800">Resolved</option>
          </select>
          <Button variant="outline" className="text-white text-sm" onClick={() => { void load(); }}>Refresh</Button>
        </div>
      </div>

      {/* Bulk actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between bg-white/5 border border-white/10 rounded-lg p-3 gap-3">
        <div className="flex items-center gap-3">
          <label className="inline-flex items-center gap-2 text-xs sm:text-sm text-gray-200">
            <input type="checkbox" checked={allSelected} onChange={(e) => toggleAll(e.target.checked)} />
            Select all
          </label>
          {anySelected && (
            <span className="text-xs sm:text-sm text-gray-300">{selectedIds.length} selected</span>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" className="text-white text-xs sm:text-sm" disabled={!anySelected} onClick={bulkClose}>Close Selected</Button>
          <Button variant="outline" className="text-white text-xs sm:text-sm" disabled={!anySelected} onClick={bulkAddTag}>Add Tag to Selected</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {flags.length === 0 && (
          <div className="text-gray-400 col-span-full">No flags found.</div>
        )}
        {flags.map((f) => (
          <div key={f.id} className="bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 p-3 sm:p-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
              <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                <input
                  id={`flag-select-${f.id}`}
                  type="checkbox"
                  checked={!!selected[f.id]}
                  onChange={(e) => setSelected(prev => ({ ...prev, [f.id]: e.target.checked }))}
                  aria-label={`Select flag ${f.id}`}
                />
                <div className="text-white font-mono text-xs sm:text-sm">Session …{f.session_id.slice(-8)}</div>
                <div className="text-[10px] sm:text-xs text-gray-300">Flag #{f.id} • {new Date(f.created_at).toLocaleString()}</div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <label htmlFor={`flag-status-${f.id}`} className="sr-only">Update status for flag {f.id}</label>
                <select id={`flag-status-${f.id}`} value={f.status} onChange={(e) => updateFlag(f.id, { status: e.target.value })} className="px-2 py-1 bg-white/10 border border-white/20 rounded-md text-white text-xs sm:text-sm">
                  <option value="open" className="bg-gray-800">Open</option>
                  <option value="reviewing" className="bg-gray-800">Reviewing</option>
                  <option value="resolved" className="bg-gray-800">Resolved</option>
                </select>
                <Link className="text-[#FFCA40] text-xs sm:text-sm" href={`/admin/conversations/session/${f.session_id}`}>View Session</Link>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-3">
              <div>
                <label htmlFor={`flag-reason-${f.id}`} className="block text-[10px] sm:text-xs text-gray-300 mb-1">Reason</label>
                <textarea id={`flag-reason-${f.id}`} defaultValue={f.reason || ''} onBlur={(e) => updateFlag(f.id, { reason: e.target.value })} className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-md text-white text-xs sm:text-sm" />
              </div>
              <div>
                <label htmlFor={`flag-notes-${f.id}`} className="block text-[10px] sm:text-xs text-gray-300 mb-1">Notes</label>
                <textarea id={`flag-notes-${f.id}`} defaultValue={f.notes || ''} onBlur={(e) => updateFlag(f.id, { notes: e.target.value })} className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-md text-white text-xs sm:text-sm" />
              </div>
            </div>
            <div className="mt-3">
              <label className="block text-[10px] sm:text-xs text-gray-300 mb-1" htmlFor={`flag-tags-input-${f.id}`}>Tags</label>
              <TagEditor inputId={`flag-tags-input-${f.id}`} initial={f.tags || []} onChange={(tags) => updateFlag(f.id, { tags })} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TagEditor({ initial, onChange, inputId }: { initial: string[]; onChange: (tags: string[]) => void; inputId?: string; }) {
  const [value, setValue] = useState('');
  const [tags, setTags] = useState<string[]>(initial);
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {tags.map((t) => (
        <span key={t} className="inline-flex items-center gap-1 px-2 py-1 text-[10px] sm:text-xs rounded-md bg-white/10 border border-white/20 text-white">
          {t}
          <button className="text-red-400" onClick={() => { const next = tags.filter(x => x !== t); setTags(next); onChange(next); }}>×</button>
        </span>
      ))}
  <input id={inputId} value={value} onChange={(e) => setValue(e.target.value)} placeholder="Add tag" className="px-2 py-1 bg-white/10 border border-white/20 rounded-md text-white text-[10px] sm:text-xs" />
      <Button variant="outline" className="text-white text-[10px] sm:text-xs" onClick={() => { const v = value.trim(); if (!v) return; if (!tags.includes(v)) { const next = [...tags, v]; setTags(next); onChange(next); } setValue(''); }}>Add</Button>
    </div>
  );
}
