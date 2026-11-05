'use client';

/**
 * Peer Support inbox (counselor portal).
 *
 * Supporters see their active pairings and open the thread; supervisors see
 * the same view for pairings they supervise. Escalate hands the case up and
 * alerts the counselor pool. Uses the shared ChatThread component for the
 * golden-standard messaging UX.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { apiCall } from '@/utils/adminApi';
import ChatThread, { type ChatThreadMessage } from '@/components/ui/admin/ChatThread';

interface PairingItem {
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

export default function PeerSupportInboxPage() {
  const [pairings, setPairings] = useState<PairingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [messages, setMessages] = useState<ChatThreadMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);

  const loadPairings = useCallback(async () => {
    try {
      setLoading(true);
      const rows = await apiCall<PairingItem[]>('/api/v1/peer/assignments');
      setPairings(rows || []);
    } catch {
      toast.error('Failed to load peer assignments');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPairings();
  }, [loadPairings]);

  const loadThread = useCallback(async (pairingId: number) => {
    setMessagesLoading(true);
    try {
      interface BackendMessage {
        id: number;
        sender_id: number;
        content: string;
        created_at: string;
      }
      const rows = await apiCall<BackendMessage[]>(
        `/api/v1/peer/threads/pairing/${pairingId}/messages`,
      );
      setMessages(
        (rows || []).map((m) => ({
          id: m.id,
          senderId: m.sender_id,
          content: m.content,
          createdAt: m.created_at,
        })),
      );
    } catch {
      toast.error('Failed to load thread');
    } finally {
      setMessagesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedId === null) return;
    void loadThread(selectedId);
    // Gentle polling keeps the inbox fresh without SSE wiring here.
    const interval = window.setInterval(() => void loadThread(selectedId), 10000);
    return () => window.clearInterval(interval);
  }, [selectedId, loadThread]);

  useEffect(() => {
    if (messages.length > 0) {
      const el = document.getElementById('peer-inbox-bottom');
      el?.scrollIntoView({ block: 'end' });
    }
  }, [messages]);

  const handleSend = useCallback(
    async (content: string): Promise<ChatThreadMessage | null> => {
      if (selectedId === null) return null;
      try {
        interface BackendMessage {
          id: number;
          sender_id: number;
          content: string;
          created_at: string;
        }
        const sent = await apiCall<BackendMessage>(
          `/api/v1/peer/threads/pairing/${selectedId}/messages`,
          { method: 'POST', body: JSON.stringify({ content }) },
        );
        return {
          id: sent.id,
          senderId: sent.sender_id,
          content: sent.content,
          createdAt: sent.created_at,
        };
      } catch {
        toast.error('Failed to send');
        return null;
      }
    },
    [selectedId],
  );

  const escalate = async () => {
    if (selectedId === null) return;
    if (!confirm('Escalate this pairing to professional counselors? The thread will be closed.')) {
      return;
    }
    try {
      await apiCall(`/api/v1/peer/threads/pairing/${selectedId}/escalate`, { method: 'POST' });
      toast.success('Escalated to counselors');
      setSelectedId(null);
      setMessages([]);
      loadPairings();
    } catch {
      toast.error('Escalation failed');
    }
  };

  const active = pairings.filter((p) => p.status === 'active');
  const closed = pairings.filter((p) => p.status !== 'active');
  const selected = pairings.find((p) => p.id === selectedId) ?? null;

  const threadTitle = selected?.student_hashed || `Pairing #${selected?.id ?? ''}`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Peer Support</h1>
        <p className="mt-1 text-sm text-white/60">
          Your 1-on-1 pairings. Conversations are supervised by the assigned counselor.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-white/20 border-t-[#FFCA40]" />
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Pairing list */}
          <div className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-white/50">
              Active ({active.length})
            </h2>
            {active.length === 0 ? (
              <p className="rounded-xl border border-white/10 bg-white/5 p-6 text-center text-sm text-white/50">
                No active pairings yet.
              </p>
            ) : (
              active.map((pairing) => (
                <button
                  key={pairing.id}
                  type="button"
                  onClick={() => setSelectedId(pairing.id)}
                  className={`w-full rounded-xl border p-4 text-left transition ${
                    selectedId === pairing.id
                      ? 'border-[#FFCA40] bg-[#FFCA40]/10'
                      : 'border-white/10 bg-white/5 hover:border-white/25'
                  }`}
                >
                  <p className="text-sm font-mono text-white/85">
                    {pairing.student_hashed || `Pairing #${pairing.id}`}
                  </p>
                  <p className="mt-1 text-xs text-white/50">
                    Since {new Date(pairing.created_at).toLocaleDateString()}
                  </p>
                </button>
              ))
            )}
            {closed.length > 0 && (
              <>
                <h2 className="pt-3 text-sm font-semibold uppercase tracking-wider text-white/50">
                  Closed ({closed.length})
                </h2>
                {closed.slice(0, 5).map((pairing) => (
                  <button
                    key={pairing.id}
                    type="button"
                    onClick={() => setSelectedId(pairing.id)}
                    className="w-full rounded-xl border border-white/10 bg-white/5 p-3 text-left text-xs transition hover:border-white/25"
                  >
                    <span className="font-mono text-white/60">
                      {pairing.student_hashed || `#${pairing.id}`}
                    </span>
                    <span className="ml-2 text-white/40">{pairing.status}</span>
                  </button>
                ))}
              </>
            )}
          </div>

          {/* Thread */}
          <div className="lg:col-span-2">
            {selected === null ? (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-12 text-center text-sm text-white/50">
                Select a pairing to open the conversation.
              </div>
            ) : (
              <div className="flex h-[70vh] flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#001A4D]">
                <div className="flex items-center justify-between border-b border-white/10 px-5 py-3">
                  <p className="text-sm font-semibold text-white">
                    {threadTitle}
                    <span className="ml-2 text-xs font-normal text-white/50">{selected.status}</span>
                  </p>
                  {selected.status === 'active' && (
                    <button
                      type="button"
                      onClick={escalate}
                      className="rounded-lg border border-orange-500/40 bg-orange-500/10 px-3 py-1.5 text-xs font-semibold text-orange-300 transition hover:bg-orange-500/20"
                    >
                      Escalate to counselor
                    </button>
                  )}
                </div>
                <div className="min-h-0 flex-1">
                  <ChatThread
                    messages={messages}
                    currentUserId={undefined}
                    onSend={handleSend}
                    composerDisabled={selected.status !== 'active'}
                    composerPlaceholder="Reply as peer supporter…"
                    emptyTitle="No messages yet."
                    emptyHint="Messages between you and the student appear here."
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      </div>
  );
}
