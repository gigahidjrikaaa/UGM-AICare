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
              <Button variant="outline" className="text-white" onClick={async () => {
                const reason = prompt('Reason to flag this session? (optional)') || '';
                try {
                  await apiCall(`/api/v1/admin/conversation-session/${sessionId}/flag`, { method: 'POST', body: JSON.stringify({ reason }) });
                  alert('Session flagged');
                } catch (e: any) {
                  alert(e?.message || 'Failed to flag');
                }
              }}>Flag Session</Button>
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
    </div>
  );
}
