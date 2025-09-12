'use client';

import { useEffect, useState } from 'react';
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

  const load = async () => {
    try {
      setLoading(true);
      const q = statusFilter ? `?status_filter=${encodeURIComponent(statusFilter)}` : '';
      const data = await apiCall<FlagItem[]>(`/api/v1/admin/flags${q}`);
      setFlags(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [statusFilter]);

  const updateFlag = async (id: number, payload: Partial<FlagItem>) => {
    await apiCall<FlagItem>(`/api/v1/admin/flags/${id}`, { method: 'PUT', body: JSON.stringify({ status: payload.status, reason: payload.reason, tags: payload.tags, notes: payload.notes }) });
    await load();
  };

  if (loading) return <div className="text-gray-300">Loading…</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-white">Flagged Sessions</h1>
        <div className="flex items-center gap-2">
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2 bg-white/10 border border-white/20 rounded-md text-white">
            <option value="" className="bg-gray-800">All</option>
            <option value="open" className="bg-gray-800">Open</option>
            <option value="reviewing" className="bg-gray-800">Reviewing</option>
            <option value="resolved" className="bg-gray-800">Resolved</option>
          </select>
          <Button variant="outline" className="text-white" onClick={() => load()}>Refresh</Button>
        </div>
      </div>

      <div className="space-y-4">
        {flags.length === 0 && (
          <div className="text-gray-400">No flags found.</div>
        )}
        {flags.map((f) => (
          <div key={f.id} className="bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-white font-mono text-sm">Session …{f.session_id.slice(-8)}</div>
                <div className="text-xs text-gray-300">Flag #{f.id} • {new Date(f.created_at).toLocaleString()}</div>
              </div>
              <div className="flex items-center gap-2">
                <select value={f.status} onChange={(e) => updateFlag(f.id, { status: e.target.value })} className="px-2 py-1 bg-white/10 border border-white/20 rounded-md text-white text-sm">
                  <option value="open" className="bg-gray-800">Open</option>
                  <option value="reviewing" className="bg-gray-800">Reviewing</option>
                  <option value="resolved" className="bg-gray-800">Resolved</option>
                </select>
                <Link className="text-[#FFCA40] text-sm" href={`/admin/conversations/session/${f.session_id}`}>View Session</Link>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-300 mb-1">Reason</label>
                <textarea defaultValue={f.reason || ''} onBlur={(e) => updateFlag(f.id, { reason: e.target.value })} className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-md text-white text-sm" />
              </div>
              <div>
                <label className="block text-xs text-gray-300 mb-1">Notes</label>
                <textarea defaultValue={f.notes || ''} onBlur={(e) => updateFlag(f.id, { notes: e.target.value })} className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-md text-white text-sm" />
              </div>
            </div>
            <div className="mt-3">
              <label className="block text-xs text-gray-300 mb-1">Tags</label>
              <TagEditor initial={f.tags || []} onChange={(tags) => updateFlag(f.id, { tags })} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TagEditor({ initial, onChange }: { initial: string[]; onChange: (tags: string[]) => void; }) {
  const [value, setValue] = useState('');
  const [tags, setTags] = useState<string[]>(initial);
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {tags.map((t) => (
        <span key={t} className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md bg-white/10 border border-white/20 text-white">
          {t}
          <button className="text-red-400" onClick={() => { const next = tags.filter(x => x !== t); setTags(next); onChange(next); }}>×</button>
        </span>
      ))}
      <input value={value} onChange={(e) => setValue(e.target.value)} placeholder="Add tag" className="px-2 py-1 bg-white/10 border border-white/20 rounded-md text-white text-xs" />
      <Button variant="outline" className="text-white text-xs" onClick={() => { const v = value.trim(); if (!v) return; if (!tags.includes(v)) { const next = [...tags, v]; setTags(next); onChange(next); } setValue(''); }}>Add</Button>
    </div>
  );
}

