'use client';

/**
 * Messages (counselor portal) — direct counselor ↔ student threads.
 *
 * The counselor's inbox: pick a thread, read the transcript, reply inline.
 * Unread badges show which students are waiting for a reply. Read receipts
 * are marked server-side when the thread is opened.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { FiSend } from 'react-icons/fi';
import ChatThread, { type ChatThreadMessage } from '@/components/ui/admin/ChatThread';
import { apiCall } from '@/utils/adminApi';

interface CounselorThreadItem {
  id: number;
  counselor_id: number;
  counselor_name: string | null;
  status: string;
  subject: string | null;
  created_at: string;
  last_message_at: string | null;
  unread_for_me: number;
}

interface ThreadMessage {
  id: number;
  sender_id: number;
  content: string;
  created_at: string;
}

export default function CounselorMessagesPage() {
  const [threads, setThreads] = useState<CounselorThreadItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [messages, setMessages] = useState<ChatThreadMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);

  // The counselor's own user id — messages with sender_id === me are "mine".
  // The backend serializes the counselor user id inside the thread payload,
  // but ChatThread just needs a stable comparison key; use the session via
  // apiCall-me instead: the thread's own sender messages come from the
  // counselor, so we resolve it once.
  const [myUserId, setMyUserId] = useState<number | undefined>(undefined);
  const bottomRef = useRef<HTMLDivElement>(null);

  const loadThreads = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiCall<{ threads: CounselorThreadItem[]; me?: number }>(
        '/api/v1/peer/counselor-threads/inbox',
      );
      setThreads(data.threads || []);
      if (data.me != null) setMyUserId(Number(data.me));
    } catch {
      toast.error('Failed to load message threads');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadThreads();
  }, [loadThreads]);

  const loadThread = useCallback(async (threadId: number) => {
    setMessagesLoading(true);
    try {
      // Opening the thread marks it read server-side; refresh the list so
      // unread badges clear.
      const rows = await apiCall<ThreadMessage[]>(
        `/api/v1/peer/threads/counseling/${threadId}/messages`,
      );
      setMessages(
        (rows || []).map((m) => ({
          id: m.id,
          senderId: m.sender_id,
          content: m.content,
          createdAt: m.created_at,
        })),
      );
      setThreads((prev) =>
        prev.map((t) => (t.id === threadId ? { ...t, unread_for_me: 0 } : t)),
      );
    } catch {
      toast.error('Failed to load messages');
    } finally {
      setMessagesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedId === null) return;
    void loadThread(selectedId);
    // Gentle polling keeps the thread fresh without SSE wiring here.
    const interval = window.setInterval(() => void loadThread(selectedId), 10000);
    return () => window.clearInterval(interval);
  }, [selectedId, loadThread]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [messages]);

  const handleSend = useCallback(
    async (content: string): Promise<ChatThreadMessage | null> => {
      if (selectedId === null) return null;
      try {
        const sent = await apiCall<ThreadMessage>(
          `/api/v1/peer/threads/counseling/${selectedId}/messages`,
          { method: 'POST', body: JSON.stringify({ content }) },
        );
        void loadThreads();
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
    [selectedId, loadThreads],
  );

  const active = threads.filter((t) => t.status === 'active');
  const closed = threads.filter((t) => t.status !== 'active');
  const selected = threads.find((t) => t.id === selectedId) ?? null;

  const sortedActive = [...active].sort((a, b) => {
    if (b.unread_for_me !== a.unread_for_me) return b.unread_for_me - a.unread_for_me;
    return (b.last_message_at ?? b.created_at).localeCompare(a.last_message_at ?? a.created_at);
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Messages</h1>
        <p className="mt-1 text-sm text-white/60">
          Direct conversations with students. Opening a thread marks it as read.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-white/20 border-t-[#FFCA40]" />
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Thread list */}
          <div className="space-y-4">
            <section>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-white/50">
                Active ({active.length})
              </h2>
              {sortedActive.length === 0 ? (
                <p className="rounded-xl border border-white/10 bg-white/5 p-6 text-center text-sm text-white/50">
                  No active threads yet.
                </p>
              ) : (
                <div className="space-y-2">
                  {sortedActive.map((thread) => (
                    <button
                      key={thread.id}
                      type="button"
                      onClick={() => setSelectedId(thread.id)}
                      className={`w-full rounded-xl border p-4 text-left transition ${
                        selectedId === thread.id
                          ? 'border-[#FFCA40] bg-[#FFCA40]/10'
                          : 'border-white/10 bg-white/5 hover:border-white/25'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium text-white/85">
                          {thread.counselor_name || `Counselor #${thread.counselor_id}`}
                        </p>
                        {thread.unread_for_me > 0 && (
                          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
                            {thread.unread_for_me}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-white/50">
                        Student thread ·{' '}
                        {new Date(
                          thread.last_message_at ?? thread.created_at,
                        ).toLocaleDateString()}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </section>

            {closed.length > 0 && (
              <section>
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-white/50">
                  Closed ({closed.length})
                </h2>
                <div className="space-y-2">
                  {closed.slice(0, 8).map((thread) => (
                    <button
                      key={thread.id}
                      type="button"
                      onClick={() => setSelectedId(thread.id)}
                      className="w-full rounded-xl border border-white/10 bg-white/5 p-3 text-left text-xs text-white/60 transition hover:border-white/25"
                    >
                      <span className="font-mono">
                        {thread.counselor_name || `#${thread.id}`}
                      </span>
                      <span className="ml-2">{thread.status}</span>
                    </button>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* Thread panel */}
          <div className="lg:col-span-2">
            {selected === null ? (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-12 text-center text-sm text-white/50">
                Select a thread to open the conversation.
              </div>
            ) : (
              <div className="flex h-[70vh] flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#001A4D]">
                <div className="flex items-center justify-between border-b border-white/10 px-5 py-3">
                  <p className="text-sm font-semibold text-white">
                    {selected.subject || 'Student conversation'}
                  </p>
                  <span className="text-xs font-normal text-white/50">{selected.status}</span>
                </div>
                <div className="min-h-0 flex-1">
                  <ChatThread
                    messages={messages}
                    currentUserId={myUserId}
                    onSend={handleSend}
                    emptyTitle="No messages yet."
                    emptyHint="Messages between the student and you appear here."
                    composerPlaceholder="Reply to student…"
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
