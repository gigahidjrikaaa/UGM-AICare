'use client';

/**
 * Supervision (counselor portal) — read-only oversight of the peer-support
 * pairings this counselor supervises. Transcripts load per pairing; cases
 * link into the counselor case list.
 */

import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { apiCall } from '@/utils/adminApi';

interface SupervisedPairing {
  id: number;
  status: string;
  created_at: string;
  student_hashed?: string | null;
  case_id?: string | null;
  close_reason?: string | null;
}

interface ThreadMessage {
  id: number;
  sender_id: number;
  content: string;
  created_at: string;
}

export default function SupervisionPage() {
  const [pairings, setPairings] = useState<SupervisedPairing[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [messages, setMessages] = useState<ThreadMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const rows = await apiCall<SupervisedPairing[]>('/api/v1/peer/supervision');
      setPairings(rows || []);
    } catch {
      toast.error('Failed to load supervised pairings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (selectedId === null) return;
    setMessagesLoading(true);
    apiCall<ThreadMessage[]>(`/api/v1/peer/threads/pairing/${selectedId}/messages`)
      .then((rows) => setMessages(rows || []))
      .catch(() => toast.error('Failed to load transcript'))
      .finally(() => setMessagesLoading(false));
  }, [selectedId]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Supervision</h1>
        <p className="mt-1 text-sm text-white/60">
          Read-only oversight of the peer-support pairings you supervise.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-white/20 border-t-[#FFCA40]" />
        </div>
      ) : pairings.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-12 text-center text-sm text-white/50">
          No supervised pairings yet. Pairings appear here when peer supporters are assigned
          to students.
        </div>
      ) : (
        <div className="space-y-4">
          {pairings.map((pairing) => (
            <div key={pairing.id} className="rounded-2xl border border-white/10 bg-white/5">
              <button
                type="button"
                onClick={() => setSelectedId(selectedId === pairing.id ? null : pairing.id)}
                className="flex w-full flex-wrap items-center justify-between gap-3 p-5 text-left"
              >
                <div>
                  <p className="text-sm font-mono text-white/85">
                    {pairing.student_hashed || `Pairing #${pairing.id}`}
                  </p>
                  <p className="mt-1 text-xs text-white/50">
                    Started {new Date(pairing.created_at).toLocaleDateString()} ·{' '}
                    {pairing.status}
                    {pairing.case_id && (
                      <>
                        {' · '}
                        <a
                          href={`/counselor/cases?highlight=${pairing.case_id}`}
                          className="text-[#FFCA40] underline-offset-2 hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          linked case
                        </a>
                      </>
                    )}
                  </p>
                </div>
                <span className="text-xs text-white/40">
                  {selectedId === pairing.id ? 'Hide transcript' : 'Show transcript'}
                </span>
              </button>

              {selectedId === pairing.id && (
                <div className="space-y-3 border-t border-white/10 p-5">
                  {messagesLoading ? (
                    <p className="text-sm text-white/50">Loading transcript…</p>
                  ) : messages.length === 0 ? (
                    <p className="text-sm text-white/40">No messages in this thread.</p>
                  ) : (
                    messages.map((message) => (
                      <div
                        key={message.id}
                        className="rounded-xl border border-white/10 bg-black/20 p-3"
                      >
                        <p className="whitespace-pre-wrap text-sm text-white/85">
                          {message.content}
                        </p>
                        <p className="mt-1 text-[10px] text-white/40">
                          {new Date(message.created_at).toLocaleString()}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
