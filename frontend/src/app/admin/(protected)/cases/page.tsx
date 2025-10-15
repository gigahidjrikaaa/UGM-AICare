'use client';

import { useEffect, useMemo, useState } from 'react';
import { authenticatedFetch, handleApiResponse } from '@/utils/adminApi';

type CaseItem = {
  id: string;
  created_at: string;
  updated_at: string;
  status: 'new' | 'in_progress' | 'waiting' | 'closed';
  severity: 'low' | 'med' | 'high' | 'critical';
  assigned_to?: string | null;
  user_hash: string;
  session_id?: string | null;
  summary_redacted?: string | null;
  sla_breach_at?: string | null;
};

type CaseListResponse = { cases: CaseItem[] };

export default function CasesPage() {
  const [items, setItems] = useState<CaseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [openNotesCaseId, setOpenNotesCaseId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, { loading: boolean; items: { id: number; case_id: string; created_at: string; author_id?: number | null; note: string }[] }>>({});
  const [newNote, setNewNote] = useState('');

  const baseUrl = useMemo(() => (typeof window === 'undefined' ? process.env.INTERNAL_API_URL : process.env.NEXT_PUBLIC_API_URL) || '', []);

  useEffect(() => {
    (async () => {
      try {
        const url = new URL(baseUrl + '/api/agents/sda/cases');
        if (statusFilter) url.searchParams.set('status', statusFilter);
        const res = await authenticatedFetch(url.toString());
        const data = await handleApiResponse<CaseListResponse>(res);
        setItems(data.cases);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to load cases';
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    })();
  }, [statusFilter, baseUrl]);

  const assign = async (caseId: string, assignee: string) => {
    const res = await authenticatedFetch(baseUrl + '/api/agents/sda/cases/assign', {
      method: 'POST',
      body: JSON.stringify({ case_id: caseId, assignee_id: assignee }),
    });
    await handleApiResponse(res);
    // refresh
    setItems((prev) => prev.map((c) => (c.id === caseId ? { ...c, assigned_to: assignee, status: c.status === 'new' || c.status === 'waiting' ? 'in_progress' : c.status } : c)));
  };

  const closeCase = async (caseId: string) => {
    const reason = prompt('Closure reason (optional)') || undefined;
    const res = await authenticatedFetch(baseUrl + '/api/agents/sda/cases/close', {
      method: 'POST',
      body: JSON.stringify({ case_id: caseId, closure_reason: reason }),
    });
    await handleApiResponse(res);
    setItems((prev) => prev.map((c) => (c.id === caseId ? { ...c, status: 'closed' } : c)));
  };

  const toggleNotes = async (caseId: string) => {
    if (openNotesCaseId === caseId) {
      setOpenNotesCaseId(null);
      return;
    }
    setOpenNotesCaseId(caseId);
    if (!notes[caseId]) {
      setNotes((prev) => ({ ...prev, [caseId]: { loading: true, items: [] } }));
      try {
        const res = await authenticatedFetch(`${baseUrl}/api/v1/admin/cases/${caseId}/notes`);
        const data = await handleApiResponse<{ items: { id: number; case_id: string; created_at: string; author_id?: number | null; note: string }[] }>(res);
        setNotes((prev) => ({ ...prev, [caseId]: { loading: false, items: data.items } }));
      } catch {
        setNotes((prev) => ({ ...prev, [caseId]: { loading: false, items: [] } }));
      }
    }
  };

  const addNote = async (caseId: string) => {
    if (!newNote.trim()) return;
    const res = await authenticatedFetch(`${baseUrl}/api/v1/admin/cases/${caseId}/notes`, {
      method: 'POST',
      body: JSON.stringify({ note: newNote.trim() }),
    });
    const item = await handleApiResponse<{ id: number; case_id: string; created_at: string; author_id?: number | null; note: string }>(res);
    setNewNote('');
    setNotes((prev) => ({
      ...prev,
      [caseId]: { loading: false, items: [item, ...(prev[caseId]?.items || [])] },
    }));
  };

  if (loading) return <div className="p-6 text-white/70">Loading cases…</div>;
  if (error) return <div className="p-6 text-red-300">{error}</div>;

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-white text-lg font-semibold">Case Management</h1>
        <div className="flex items-center gap-2">
          <label className="text-white/70 text-sm">Status</label>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="bg-white/5 text-white/90 text-sm border border-white/10 rounded px-2 py-1">
            <option value="">All</option>
            <option value="new">New</option>
            <option value="in_progress">In Progress</option>
            <option value="waiting">Waiting</option>
            <option value="closed">Closed</option>
          </select>
        </div>
      </div>
      <div className="overflow-x-auto border border-white/10 rounded-lg">
        <table className="min-w-full text-sm">
          <thead className="bg-white/5 text-white/70">
            <tr>
              <th className="text-left p-2">Case ID</th>
              <th className="text-left p-2">Status</th>
              <th className="text-left p-2">Severity</th>
              <th className="text-left p-2">Assigned</th>
              <th className="text-left p-2">Created</th>
              <th className="text-left p-2">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {items.map((c) => (
              <>
              <tr key={c.id} className="text-white/90">
                <td className="p-2 font-mono text-xs truncate max-w-[240px]">{c.id}</td>
                <td className="p-2">
                  <span className="px-2 py-0.5 rounded bg-white/10 border border-white/10">{c.status}</span>
                </td>
                <td className="p-2">{c.severity}</td>
                <td className="p-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      defaultValue={c.assigned_to || ''}
                      placeholder="counselor-id"
                      className="bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-white/90 w-36"
                      onBlur={(e) => {
                        const val = e.target.value.trim();
                        if (val && val !== c.assigned_to) assign(c.id, val);
                      }}
                    />
                  </div>
                </td>
                <td className="p-2 text-white/70">{new Date(c.created_at).toLocaleString()}</td>
                <td className="p-2">
                  <div className="flex gap-2">
                    <button onClick={() => toggleNotes(c.id)} className="text-xs text-[#FFCA40] hover:underline">Notes</button>
                    {c.status !== 'closed' && (
                      <button onClick={() => closeCase(c.id)} className="text-xs text-red-300 hover:underline">Close</button>
                    )}
                  </div>
                </td>
              </tr>
              {openNotesCaseId === c.id && (
                <tr>
                  <td colSpan={6} className="bg-white/5">
                    <div className="p-3 space-y-3">
                      <div className="flex items-center gap-2">
                        <textarea value={newNote} onChange={(e) => setNewNote(e.target.value)} placeholder="Add a note..." className="flex-1 bg-white/5 border border-white/10 rounded px-2 py-1 text-sm text-white/90" />
                        <button onClick={() => addNote(c.id)} className="px-3 py-1.5 text-sm rounded bg-[#FFCA40] text-black font-medium">Add</button>
                      </div>
                      <div className="divide-y divide-white/10 rounded border border-white/10">
                        {(notes[c.id]?.items || []).length === 0 ? (
                          <div className="p-2 text-white/60 text-sm">No notes yet</div>
                        ) : (
                          notes[c.id].items.map((n) => (
                            <div key={n.id} className="p-2 text-white/80 text-sm">
                              <div className="text-white/60 text-xs">{new Date(n.created_at).toLocaleString()} • {n.author_id ?? 'admin'}</div>
                              <div>{n.note}</div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              )}
              </>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
