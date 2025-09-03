'use client';

import React from 'react';

export default function SessionDetailPage({ params }: { params: { id: string } }) {
  return (
    <div>
      <h1 className="text-3xl font-bold text-white">Session Details</h1>
      <p className="text-gray-400 mt-1">Details for session ID: {params.id}</p>
    </div>
  );
}

/*
import { useSession } from 'next-auth/react';
import { apiCall } from '@/utils/adminApi';
import { ArrowLeft, MessageSquare, Clock, Hash, User } from 'lucide-react';
import Link from 'next/link';

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
}

type SessionDetailPageProps = {
  params: { id: string };
};

export default function SessionDetailPage({ params }: SessionDetailPageProps) {
  const { status } = useSession();
  const [sessionDetail, setSessionDetail] = useState<SessionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'authenticated' && params.id) {
      const fetchSession = async () => {
        try {
          setLoading(true);
          const data = await apiCall<SessionDetail>(`/api/v1/admin/conversations/session/${params.id}`);
          setSessionDetail(data);
        } catch (err) {
          console.error('Failed to load session:', err);
          setError('Failed to load session. Please try again later.');
        }
        finally {
          setLoading(false);
        }
      };
      fetchSession();
    }
  }, [status, params.id]);

  if (loading || status === 'loading') {
    return <div className="text-center p-8">Loading session...</div>;
  }

  if (error) {
    return <div className="text-center p-8 text-red-500">{error}</div>;
  }

  if (!sessionDetail) {
    return <div className="text-center p-8">Session not found.</div>;
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <Link href="/admin/conversations" className="flex items-center text-sm text-gray-400 hover:text-white">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Conversations
        </Link>
        <h1 className="text-3xl font-bold text-white mt-2">Session Detail</h1>
      </div>

      <div className="bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 p-6 mb-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-200">
            <div className="flex items-center gap-2">
                <Hash className="h-4 w-4" />
                <div><strong>Session ID:</strong> {sessionDetail.session_id}</div>
            </div>
            <div className="flex items-center gap-2">
                <User className="h-4 w-4" />
                <div><strong>User Hash:</strong> {sessionDetail.user_id_hash}</div>
            </div>
            <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                <div><strong>Conversations:</strong> {sessionDetail.conversation_count}</div>
            </div>
            <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <div><strong>Duration:</strong> {sessionDetail.total_duration_minutes.toFixed(2)} mins</div>
            </div>
        </div>
      </div>

      <div className="space-y-6">
        {sessionDetail.conversations.map((conversation, index) => (
            <div key={conversation.id} className="bg-white/5 p-4 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                    <div className="text-sm text-gray-400">Conversation #{index + 1}</div>
                    <div className="text-xs text-gray-500">{new Date(conversation.timestamp).toLocaleString()}</div>
                </div>
                <div className="space-y-4">
                    <div>
                        <h3 className="font-semibold text-white mb-1">User:</h3>
                        <p className="text-gray-300 whitespace-pre-wrap">{conversation.message}</p>
                    </div>
                    <div>
                        <h3 className="font-semibold text-white mb-1">AI:</h3>
                        <p className="text-gray-300 whitespace-pre-wrap">{conversation.response}</p>
                    </div>
                </div>
            </div>
        ))}
      </div>

    </div>
  );
}
*/