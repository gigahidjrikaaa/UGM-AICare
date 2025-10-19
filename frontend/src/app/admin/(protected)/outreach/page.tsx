'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { authenticatedFetch, handleApiResponse } from '@/utils/adminApi';

type Campaign = {
  id: number;
  campaign_type: string;
  title: string;
  description?: string | null;
  status: string;
  priority: string;
  target_audience_size: number;
  executions_delivered: number;
  executions_failed: number;
  created_at: string;
  updated_at: string;
};

type CampaignList = { items: Campaign[]; total: number };

export default function OutreachPage() {
  const [items, setItems] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openNew, setOpenNew] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState('message');
  const [newPriority, setNewPriority] = useState('medium');

  const baseUrl = useMemo(() => (typeof window === 'undefined' ? process.env.INTERNAL_API_URL : process.env.NEXT_PUBLIC_API_URL) || '', []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await authenticatedFetch(baseUrl + '/api/v1/admin/interventions/campaigns');
      const data = await handleApiResponse<CampaignList>(res);
      setItems(data.items);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load campaigns';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [baseUrl]);

  useEffect(() => {
    load();
  }, [load]);

  const create = async () => {
    try {
      const res = await authenticatedFetch(baseUrl + '/api/v1/admin/interventions/campaigns', {
        method: 'POST',
        body: JSON.stringify({
          campaign_type: newType,
          title: newTitle,
          priority: newPriority,
          status: 'draft',
          content: { message: 'Hello from SCA' },
        }),
      });
      await handleApiResponse(res);
      setOpenNew(false);
      setNewTitle('');
      await load();
    } catch {
      // Error handling could be added here if needed
    }
  };

  if (loading) return <div className="p-6 text-white/70">Loading campaigns…</div>;
  if (error) return <div className="p-6 text-red-300">{error}</div>;

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-white text-lg font-semibold">Proactive Outreach</h1>
        <button onClick={() => setOpenNew(true)} className="px-3 py-1.5 text-sm rounded bg-[#FFCA40] text-black font-medium">New Campaign</button>
      </div>

      {openNew && (
        <div className="bg-white/5 border border-white/10 rounded-lg p-4 space-y-3">
          <div className="flex gap-3">
            <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Title" className="bg-white/5 border border-white/10 rounded px-2 py-1 text-sm text-white/90" aria-label="Campaign title" />
            <select value={newType} onChange={(e) => setNewType(e.target.value)} className="bg-white/5 border border-white/10 rounded px-2 py-1 text-sm text-white/90" aria-label="Campaign type">
              <option value="message">Message</option>
              <option value="email">Email</option>
              <option value="notification">Notification</option>
            </select>
            <select value={newPriority} onChange={(e) => setNewPriority(e.target.value)} className="bg-white/5 border border-white/10 rounded px-2 py-1 text-sm text-white/90" aria-label="Campaign priority">
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button onClick={create} disabled={!newTitle} className="px-3 py-1.5 text-sm rounded bg-[#FFCA40] text-black font-medium disabled:opacity-50">Create</button>
            <button onClick={() => setOpenNew(false)} className="px-3 py-1.5 text-sm rounded border border-white/10 text-white/80">Cancel</button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto border border-white/10 rounded-lg">
        <table className="min-w-full text-sm">
          <thead className="bg-white/5 text-white/70">
            <tr>
              <th className="text-left p-2">Title</th>
              <th className="text-left p-2">Type</th>
              <th className="text-left p-2">Status</th>
              <th className="text-left p-2">Priority</th>
              <th className="text-left p-2">Delivered</th>
              <th className="text-left p-2">Failed</th>
              <th className="text-left p-2">Updated</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {items.map((c) => (
              <tr key={c.id} className="text-white/90">
                <td className="p-2">{c.title}</td>
                <td className="p-2">{c.campaign_type}</td>
                <td className="p-2">{c.status}</td>
                <td className="p-2">{c.priority}</td>
                <td className="p-2">{c.executions_delivered}</td>
                <td className="p-2">{c.executions_failed}</td>
                <td className="p-2 text-white/70">{new Date(c.updated_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

