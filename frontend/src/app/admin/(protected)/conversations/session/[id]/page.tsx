'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { apiCall } from '@/utils/adminApi';

interface ConversationDetail {
  id: number;
  user_id_hash: string;
  session_id: string;
  conversation_id: string;
  message: string;
  response: string;
  timestamp: string;
}

interface SessionDetail {
  session_id: string;
  user_id_hash: string;
  user?: {
    id: number;
    email?: string | null;
    role?: string | null;
    is_active?: boolean | null;
    created_at?: string | null;
    last_login?: string | null;
    sentiment_score?: number | null;
  } | null;
  conversation_count: number;
  first_message_time: string;
  last_message_time: string;
  total_duration_minutes: number;
  conversations: ConversationDetail[];
  analysis: Record<string, any>;
}

export default function SessionDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const sessionId = params.id;
  const [data, setData] = useState<SessionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [flagOpen, setFlagOpen] = useState(false);
  const [flagReason, setFlagReason] = useState('');
  const [flagTags, setFlagTags] = useState('');

  const load = async () => {
    try {
      setLoading(true);
      const res = await apiCall<SessionDetail>(`/api/v1/admin/conversation-session/${sessionId}`);
      setData(res);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (sessionId) load(); }, [sessionId]);

  return (
    <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-white">Session Details</h1>
          <div className="flex gap-2">
            <Button variant="outline" className="text-white" onClick={async () => {
              const isServer = typeof window === 'undefined';
              const apiUrl = isServer ? (process.env.INTERNAL_API_URL as string) : (process.env.NEXT_PUBLIC_API_URL as string);
              const res = await fetch(`${apiUrl}/api/v1/admin/conversation-session/${sessionId}/export`, { credentials: 'include' });
              const text = await res.text();
              const blob = new Blob([text], { type: 'text/plain;charset=utf-8;' });
              const link = document.createElement('a');
              const url = URL.createObjectURL(blob);
              link.href = url;
              link.setAttribute('download', `session_${sessionId}.txt`);
              document.body.appendChild(link);
              link.click();
              link.parentNode?.removeChild(link);
              URL.revokeObjectURL(url);
            }}>Export TXT</Button>
            <Button variant="outline" className="text-white" onClick={() => router.back()}>Back</Button>
          </div>
        </div>
      {loading || !data ? (
        <div className="text-gray-300">Loading…</div>
      ) : (
        <>
          {/* Summary */}
          <div className="bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-white">
              <div>
                <div className="text-sm text-gray-300">Session</div>
                <div className="font-mono">{data.session_id.slice(-8)}</div>
              </div>
              <div>
                <div className="text-sm text-gray-300">Messages</div>
                <div className="font-semibold">{data.conversation_count}</div>
              </div>
              <div>
                <div className="text-sm text-gray-300">Duration</div>
                <div className="font-semibold">{data.total_duration_minutes.toFixed(1)} min</div>
              </div>
            </div>
          </div>

          {/* User Details */}
          <div className="bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 p-6">
            <h2 className="text-xl font-semibold text-white mb-3">User</h2>
            {data.user ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-white">
                <div>
                  <div className="text-sm text-gray-300">User ID</div>
                  <div className="font-mono">{data.user.id}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-300">Email</div>
                  <div className="font-semibold">{data.user.email || '—'}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-300">Role</div>
                  <div className="font-semibold">{data.user.role || 'user'}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-300">Active</div>
                  <div className="font-semibold">{data.user.is_active ? 'Yes' : 'No'}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-300">Created</div>
                  <div className="font-semibold">{data.user.created_at ? new Date(data.user.created_at).toLocaleString() : '—'}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-300">Last Login</div>
                  <div className="font-semibold">{data.user.last_login ? new Date(data.user.last_login).toLocaleString() : '—'}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-300">Sentiment</div>
                  <div className="font-semibold">{typeof data.user.sentiment_score === 'number' ? data.user.sentiment_score.toFixed(2) : '—'}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-300">User Hash</div>
                  <div className="font-mono">{data.user_id_hash}</div>
                </div>
              </div>
            ) : (
              <div className="text-gray-300">User details unavailable</div>
            )}
          </div>

          {/* Analysis */}
          <div className="bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 p-6">
            <h2 className="text-xl font-semibold text-white mb-3">Analysis</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-white">
              <div>
                <div className="text-sm text-gray-300">Avg User Len</div>
                <div className="font-semibold">{data.analysis.avg_user_message_length}</div>
              </div>
              <div>
                <div className="text-sm text-gray-300">Avg AI Len</div>
                <div className="font-semibold">{data.analysis.avg_ai_message_length}</div>
              </div>
              <div>
                <div className="text-sm text-gray-300">User Chars</div>
                <div className="font-semibold">{data.analysis.total_user_chars}</div>
              </div>
            </div>
            {Array.isArray(data.analysis.top_keywords) && data.analysis.top_keywords.length > 0 && (
              <div className="mt-4">
                <div className="text-sm text-gray-300 mb-2">Top Keywords</div>
                <div className="flex flex-wrap gap-2">
                  {data.analysis.top_keywords.map(([word, count]: [string, number]) => (
                    <span key={word} className="px-2 py-1 bg-white/10 border border-white/20 rounded-md text-xs text-white">{word} ({count})</span>
                  ))}
                </div>
              </div>
            )}
            <div className="mt-4">
              <Button variant="outline" className="text-white" onClick={() => { setFlagReason(''); setFlagTags(''); setFlagOpen(true); }}>Flag Session</Button>
              <Button variant="outline" className="text-white ml-2" onClick={async () => {
                const isServer = typeof window === 'undefined';
                const apiUrl = isServer ? (process.env.INTERNAL_API_URL as string) : (process.env.NEXT_PUBLIC_API_URL as string);
                const res = await fetch(`${apiUrl}/api/v1/admin/conversation-session/${sessionId}/export.csv`, { credentials: 'include' });
                const text = await res.text();
                const blob = new Blob([text], { type: 'text/csv;charset=utf-8;' });
                const link = document.createElement('a');
                const url = URL.createObjectURL(blob);
                link.href = url;
                link.setAttribute('download', `session_${sessionId}.csv`);
                document.body.appendChild(link);
                link.click();
                link.parentNode?.removeChild(link);
                URL.revokeObjectURL(url);
              }}>Export CSV</Button>
              <Button variant="outline" className="text-white ml-2" onClick={async () => {
                const isServer = typeof window === 'undefined';
                const apiUrl = isServer ? (process.env.INTERNAL_API_URL as string) : (process.env.NEXT_PUBLIC_API_URL as string);
                const res = await fetch(`${apiUrl}/api/v1/admin/conversation-session/${sessionId}`, { credentials: 'include' });
                const json = await res.json();
                const dataStr = JSON.stringify(json, null, 2);
                const blob = new Blob([dataStr], { type: 'application/json;charset=utf-8;' });
                const link = document.createElement('a');
                const url = URL.createObjectURL(blob);
                link.href = url;
                link.setAttribute('download', `session_${sessionId}.json`);
                document.body.appendChild(link);
                link.click();
                link.parentNode?.removeChild(link);
                URL.revokeObjectURL(url);
              }}>Export JSON</Button>
            </div>
          </div>

          {/* Full conversation */}
          <div className="bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 p-6">
            <h2 className="text-xl font-semibold text-white mb-3">Conversation</h2>
            <div className="space-y-4">
              {data.conversations.map((turn) => (
                <div key={turn.id} className="space-y-2">
                  <div className="text-xs text-gray-400">{new Date(turn.timestamp).toLocaleString()}</div>
                  <div className="p-3 rounded-lg bg-blue-900/30 border border-blue-800/30">
                    <div className="text-xs text-blue-300 mb-1">User</div>
                    <div className="text-white whitespace-pre-wrap">{turn.message}</div>
                  </div>
                  <div className="p-3 rounded-lg bg-green-900/20 border border-green-800/30">
                    <div className="text-xs text-green-300 mb-1">AI</div>
                    <div className="text-white whitespace-pre-wrap">{turn.response}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
      {flagOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setFlagOpen(false)} />
          <div className="relative bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 p-6 w-full max-w-lg mx-4">
            <h3 className="text-xl font-semibold text-white mb-4">Flag Session …{String(sessionId).slice(-8)}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-gray-300 mb-1">Reason</label>
                <textarea value={flagReason} onChange={(e) => setFlagReason(e.target.value)} rows={4} className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-md text-white text-sm" placeholder="Describe why this session is being flagged (optional)" />
              </div>
              <div>
                <label className="block text-xs text-gray-300 mb-1">Tags</label>
                <input value={flagTags} onChange={(e) => setFlagTags(e.target.value)} className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-md text-white text-sm" placeholder="Comma-separated tags (e.g., crisis, escalation)" />
              </div>
            </div>
            <div className="mt-5 flex items-center justify-end gap-2">
              <Button variant="outline" className="text-white" onClick={() => setFlagOpen(false)}>Cancel</Button>
              <Button className="text-white" onClick={async () => {
                try {
                  const tags = flagTags.split(',').map(t => t.trim()).filter(Boolean);
                  await apiCall(`/api/v1/admin/conversations/session/${sessionId}/flag`, { method: 'POST', body: JSON.stringify({ reason: flagReason || undefined, tags: tags.length ? tags : undefined }) });
                  setFlagOpen(false);
                  alert('Session flagged');
                } catch (e: any) {
                  alert(e?.message || 'Failed to flag');
                }
              }}>Flag Session</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
